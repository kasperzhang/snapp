import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzePage, generateDesignTokens } from "@/lib/scraper/page-analyzer";
import { assertPublicHttpUrl, SsrfError } from "@/lib/security/ssrf";
import { rateLimit } from "@/lib/ratelimit";
import { checkUsageLimit, recordUsage } from "@/lib/billing/limits";
import {
  MAX_SECTIONS,
  SCREENSHOT_BUCKET,
  SCREENSHOT_CONTENT_TYPE,
  screenshotPath,
} from "@/lib/storage/screenshots";

/* 180s, not 60. A heavy Framer or Webflow build routinely needs 40-70s to
   reach domcontentloaded, scroll-capture three bands and settle its
   animations; at 60 the platform killed the function mid-scan and answered
   with its own HTML error page, which the client then tried to parse as JSON.
   The scan hands itself a deadline 20s inside this so it always returns. */
export const maxDuration = 180;
const SCAN_BUDGET_MS = (maxDuration - 20) * 1000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { analysis_id, url } = body;

    if (!analysis_id || !url) {
      return NextResponse.json(
        { error: "Analysis ID and URL are required" },
        { status: 400 }
      );
    }

    // Verify analysis ownership
    const { data: analysis, error: analysisError } = await supabase
      .from("site_analyses")
      .select("id, user_id, bookmark_id")
      .eq("id", analysis_id)
      .single();

    if (analysisError || !analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    // Rate limit: guard against runaway scan loops from one user.
    if (!rateLimit(`scan:${user.id}`, 10, 60_000).success) {
      return NextResponse.json(
        { error: "Too many scans, slow down a moment." },
        { status: 429 }
      );
    }

    // Monthly plan cap.
    const limit = await checkUsageLimit(supabase, user.id, "scan");
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `You've reached your monthly scan limit (${limit.used}/${limit.limit}). Upgrade to keep going.`,
          code: "limit_reached",
        },
        { status: 402 }
      );
    }

    // SSRF guard: only allow scanning public http(s) URLs.
    try {
      await assertPublicHttpUrl(url);
    } catch (e) {
      if (e instanceof SsrfError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Update status to scanning
    await supabase
      .from("site_analyses")
      .update({ analysis_status: "scanning" })
      .eq("id", analysis_id);

    try {
      // Perform the page analysis
      const scanResult = await analyzePage(url, {
        deadline: Date.now() + SCAN_BUDGET_MS,
      });

      // Upload every captured band. Section 0 is the hero and keeps the bare
      // path, so screenshot_url still points at it for card previews and Mix.
      const screenshotUrls: string[] = [];
      for (const [i, band] of scanResult.sections.entries()) {
        const fileName = screenshotPath(user.id, analysis_id, undefined, i);
        const { error: uploadError } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .upload(fileName, band, {
            contentType: SCREENSHOT_CONTENT_TYPE,
            upsert: true,
          });
        if (uploadError) break; // keep whatever uploaded; a partial set still works
        const { data: urlData } = supabase.storage
          .from(SCREENSHOT_BUCKET)
          .getPublicUrl(fileName);
        screenshotUrls.push(urlData.publicUrl);
      }
      const screenshotUrl = screenshotUrls[0] ?? null;

      if (screenshotUrl) {
        // A re-scan that produces fewer bands than last time, or that replaces a
        // pre-WebP .png, would otherwise strand the leftovers — upsert only
        // overwrites the identical path.
        const stale: string[] = [
          screenshotPath(user.id, analysis_id, "png"),
          ...Array.from({ length: MAX_SECTIONS }, (_, i) => i)
            .filter((i) => i >= screenshotUrls.length)
            .flatMap((i) => [
              screenshotPath(user.id, analysis_id, undefined, i),
              screenshotPath(user.id, analysis_id, "png", i),
            ]),
        ];
        await supabase.storage.from(SCREENSHOT_BUCKET).remove(stale);
      }

      // Generate design tokens
      const designTokens = generateDesignTokens(scanResult.fonts, scanResult.colors);

      // Update analysis with results
      const { data: updatedAnalysis, error: updateError } = await supabase
        .from("site_analyses")
        .update({
          screenshot_url: screenshotUrl,
          screenshot_urls: screenshotUrls,
          fonts: scanResult.fonts,
          colors: scanResult.colors,
          style_tokens: scanResult.styleTokens,
          design_tokens: designTokens,
          analysis_status: "completed",
          error_message: null,
        })
        .eq("id", analysis_id)
        .select()
        .single();

      if (updateError) {
        throw new Error("Failed to update analysis results");
      }

      // Meter the successful scan (infra cost, no tokens).
      await recordUsage(supabase, {
        userId: user.id,
        kind: "scan",
        metadata: { url },
      });

      return NextResponse.json(updatedAnalysis);
    } catch (scanError) {
      console.error("Scan error:", scanError);

      // Update with error status
      await supabase
        .from("site_analyses")
        .update({
          analysis_status: "error",
          error_message: scanError instanceof Error ? scanError.message : "Failed to scan page",
        })
        .eq("id", analysis_id);

      return NextResponse.json(
        { error: "Failed to scan page", details: scanError instanceof Error ? scanError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in scan route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
