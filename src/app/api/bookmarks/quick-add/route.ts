import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeMetadata } from "@/lib/metadata/scraper";
import { assertPublicHttpUrl, SsrfError } from "@/lib/security/ssrf";
import { rateLimit } from "@/lib/ratelimit";

/* One-shot save from the browser extension.

   `POST /api/bookmarks` exists already, but it expects the caller to have
   fetched the favicon, og:image and domain first — that's the add dialog's job,
   and the extension has no dialog. This route does the whole thing from a URL
   and a tab title: scrape, de-duplicate, insert.

   Authenticated by the same session cookie as everything else. Chrome attaches
   it because the extension holds host permissions for this origin, which makes
   its requests same-site. Deliberately NO CORS headers: the extension doesn't
   need them, and adding them would open this endpoint to ordinary websites,
   where SameSite=Lax is the only thing standing between a cross-site POST and
   a bookmark inserted into someone's library without their knowing. */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // The extension reads this specific status and falls back to opening the
      // add dialog in a tab, which can walk the user through logging in.
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, title } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!rateLimit(`quick-add:${user.id}`, 30, 60_000).success) {
      return NextResponse.json(
        { error: "Too many requests, slow down a moment." },
        { status: 429 }
      );
    }

    let parsed;
    try {
      parsed = await assertPublicHttpUrl(url);
    } catch (e) {
      if (e instanceof SsrfError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const normalizedUrl = parsed.href;
    const domain = parsed.hostname.replace(/^www\./, "");

    /* Already saved? Say so rather than growing a second copy. Matched on the
       normalized URL, so http/https and a trailing slash don't sneak past. */
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id, url, title, domain")
      .eq("user_id", user.id)
      .eq("url", normalizedUrl)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: "duplicate", bookmark: existing });
    }

    // Best-effort: a site that blocks scrapers still gets saved, just with the
    // tab's own title and nothing else.
    let metadata = null;
    try {
      metadata = await scrapeMetadata(normalizedUrl);
    } catch (e) {
      console.error("quick-add: metadata scrape failed:", e);
    }

    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        url: normalizedUrl,
        // The tab title is what the user was actually looking at, so it wins
        // over the scraped one.
        title: title || metadata?.title || domain,
        description: metadata?.description ?? null,
        favicon_url: metadata?.favicon_url ?? null,
        og_image_url: metadata?.og_image_url ?? null,
        domain: metadata?.domain || domain,
      })
      .select("id, url, title, domain")
      .single();

    if (error) {
      console.error("quick-add: insert failed:", error);
      return NextResponse.json(
        { error: "Failed to save bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "created", bookmark }, { status: 201 });
  } catch (error) {
    console.error("Error in quick-add:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
