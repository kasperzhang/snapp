import { NextRequest, NextResponse } from "next/server";
import { scrapeMetadata } from "@/lib/metadata/scraper";
import { createClient } from "@/lib/supabase/server";
import { assertPublicHttpUrl, SsrfError } from "@/lib/security/ssrf";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!rateLimit(`metadata:${user.id}`, 30, 60_000).success) {
      return NextResponse.json(
        { error: "Too many requests, slow down a moment." },
        { status: 429 }
      );
    }

    // Validate URL + SSRF guard (blocks private/loopback/metadata hosts).
    try {
      await assertPublicHttpUrl(url);
    } catch (e) {
      if (e instanceof SsrfError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const metadata = await scrapeMetadata(url);
    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
