import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertPublicHttpUrl } from "@/lib/security/ssrf";

/* Which sites will a browser actually let us put in an <iframe>?
   This can't be answered in the browser: a site that refuses framing still
   fires the iframe's `load` event and reports no error, so a blocked frame is
   indistinguishable from a working one on the client. The answer only exists
   in the response headers, so we read them here.

   Cached per-origin in module memory — policy is a property of the site, not
   the page, and it changes about never. */

const TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { value: boolean; at: number }>();

function blocksFraming(headers: Headers): boolean {
  const xfo = headers.get("x-frame-options")?.toLowerCase() ?? "";
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return true;

  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";
  const directive = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("frame-ancestors"));
  if (!directive) return false;

  // Anything other than a wildcard is, from our origin, a refusal.
  const sources = directive.replace("frame-ancestors", "").trim();
  return sources !== "*" && !sources.startsWith("* ");
}

async function checkOrigin(origin: string): Promise<boolean> {
  const hit = cache.get(origin);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value = false;
  try {
    const res = await fetch(origin, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; Snapp/1.0; +https://www.usesnapp.app)",
      },
    });
    value = !blocksFraming(res.headers);
    // Don't hold the body open — we only ever wanted the headers.
    await res.body?.cancel();
  } catch {
    // Unreachable, slow, or TLS-broken: treat as not embeddable so the card
    // shows its screenshot rather than an empty frame.
    value = false;
  }

  cache.set(origin, { value, at: Date.now() });
  return value;
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
    const results = await Promise.all(distinct.map((o) => checkOrigin(o)));
    const byOrigin = new Map(distinct.map((o, i) => [o, results[i]]));

    const out: Record<string, boolean> = {};
    for (const [url, origin] of origins) out[url] = byOrigin.get(origin) ?? false;

    return NextResponse.json(out);
  } catch (error) {
    console.error("Error checking embeddability:", error);
    return NextResponse.json({ error: "Failed to check" }, { status: 500 });
  }
}
