import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPublicHttpUrl } from "@/lib/security/ssrf";

/* Which sites will a browser actually let us put in an <iframe>?
   This can't be answered in the browser: a site that refuses framing still
   fires the iframe's `load` event and reports no error, so a blocked frame is
   indistinguishable from a working one on the client. The answer only exists
   in the response headers, so we read them here.

   Cached per-origin — policy is a property of the site, not the page, and it
   changes about never. Two layers:
     L1  module memory, free but per-instance and lost on every cold start
     L2  the `origin_framing` table, shared by every instance and every user
   L2 is what keeps cards from sitting on their screenshots: after the first
   person ever bookmarks a site, everyone else gets the verdict instantly. */

type Reason = "ok" | "x-frame-options" | "frame-ancestors" | "unreachable";
type Verdict = { value: boolean; reason: Reason };

// A real refusal is durable; an unreachable host is usually a blip, so it gets
// retried far sooner rather than pinning a good site to its screenshot for days.
const TTL_SETTLED_MS = 30 * 24 * 60 * 60 * 1000;
const TTL_UNREACHABLE_MS = 60 * 60 * 1000;

const memory = new Map<string, { verdict: Verdict; at: number }>();

function ttlFor(reason: Reason) {
  return reason === "unreachable" ? TTL_UNREACHABLE_MS : TTL_SETTLED_MS;
}

function fresh(reason: Reason, at: number) {
  return Date.now() - at < ttlFor(reason);
}

function readHeaders(headers: Headers): Verdict {
  const xfo = headers.get("x-frame-options")?.toLowerCase() ?? "";
  if (xfo.includes("deny") || xfo.includes("sameorigin")) {
    return { value: false, reason: "x-frame-options" };
  }

  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";
  const directive = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("frame-ancestors"));
  if (!directive) return { value: true, reason: "ok" };

  // Anything other than a wildcard is, from our origin, a refusal.
  const sources = directive.replace("frame-ancestors", "").trim();
  const permissive = sources === "*" || sources.startsWith("* ");
  return permissive
    ? { value: true, reason: "ok" }
    : { value: false, reason: "frame-ancestors" };
}

async function probe(origin: string): Promise<Verdict> {
  try {
    const res = await fetch(origin, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        /* Deliberately a real browser UA. We are predicting what the visitor's
           Chrome will be served, and sites that 403 unknown agents answered
           with headers that had nothing to do with their framing policy — which
           put empty frames on cards for sites that do in fact refuse framing. */
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const verdict = readHeaders(res.headers);
    // Don't hold the body open — we only ever wanted the headers.
    await res.body?.cancel();
    return verdict;
  } catch {
    // Unreachable, slow, or TLS-broken: treat as not embeddable so the card
    // shows its screenshot rather than an empty frame. Retried within the hour.
    return { value: false, reason: "unreachable" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { urls } = await request.json();
    if (!Array.isArray(urls)) {
      return NextResponse.json({ error: "urls is required" }, { status: 400 });
    }

    // Collapse to distinct origins — a grid usually holds several pages from
    // the same site, and the policy is identical across them.
    //
    // Every URL goes through the same SSRF guard the scan and metadata routes
    // use: this endpoint makes server-side requests to caller-supplied URLs,
    // so without it an authenticated user could probe internal services and
    // read the answer off the returned boolean.
    const origins = new Map<string, string>();
    await Promise.all(
      urls.slice(0, 100).map(async (raw: unknown) => {
        if (typeof raw !== "string") return;
        try {
          const u = await assertPublicHttpUrl(raw);
          origins.set(raw, u.origin);
        } catch {
          /* unparseable, non-http, or private — leave it out entirely */
        }
      })
    );

    const distinct = [...new Set(origins.values())];
    const known = new Map<string, Verdict>();

    // L1
    const unknown = distinct.filter((o) => {
      const hit = memory.get(o);
      if (hit && fresh(hit.verdict.reason, hit.at)) {
        known.set(o, hit.verdict);
        return false;
      }
      return true;
    });

    // L2 — one round trip for everything memory didn't have.
    const admin = createAdminClient();
    let toProbe = unknown;
    if (unknown.length) {
      const { data: rows } = await admin
        .from("origin_framing")
        .select("origin, embeddable, reason, checked_at")
        .in("origin", unknown);

      for (const row of rows ?? []) {
        const reason = row.reason as Reason;
        const at = new Date(row.checked_at).getTime();
        if (!fresh(reason, at)) continue;
        const verdict = { value: row.embeddable, reason };
        known.set(row.origin, verdict);
        memory.set(row.origin, { verdict, at });
      }
      toProbe = unknown.filter((o) => !known.has(o));
    }

    if (toProbe.length) {
      const probed = await Promise.all(toProbe.map((o) => probe(o)));
      const at = Date.now();
      toProbe.forEach((o, i) => {
        known.set(o, probed[i]);
        memory.set(o, { verdict: probed[i], at });
      });

      // Write back for every other instance and user. Best-effort: a failed
      // upsert costs a re-probe later, nothing more.
      const { error } = await admin.from("origin_framing").upsert(
        toProbe.map((o, i) => ({
          origin: o,
          embeddable: probed[i].value,
          reason: probed[i].reason,
          checked_at: new Date(at).toISOString(),
        })),
        { onConflict: "origin" }
      );
      if (error) console.error("origin_framing upsert failed:", error.message);
    }

    const out: Record<string, boolean> = {};
    for (const [url, origin] of origins) {
      out[url] = known.get(origin)?.value ?? false;
    }

    return NextResponse.json(out);
  } catch (error) {
    console.error("Error checking embeddability:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
