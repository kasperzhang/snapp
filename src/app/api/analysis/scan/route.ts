import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzePage, generateDesignTokens } from "@/lib/scraper/page-analyzer";

export const maxDuration = 60; // Vercel function timeout

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

    // Update status to scanning
    await supabase
      .from("site_analyses")
      .update({ analysis_status: "scanning" })
      .eq("id", analysis_id);

    try {
      // Perform the page analysis
      const scanResult = await analyzePage(url);

      // Upload screenshot to Supabase Storage
      let screenshotUrl: string | null = null;
      if (scanResult.screenshot) {
        const fileName = `${user.id}/${analysis_id}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(fileName, scanResult.screenshot, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("screenshots")
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Generate design tokens
      const designTokens = generateDesignTokens(scanResult.fonts, scanResult.colors);

      // Update analysis with results
      const { data: updatedAnalysis, error: updateError } = await supabase
        .from("site_analyses")
        .update({
          screenshot_url: screenshotUrl,
          fonts: scanResult.fonts,
          colors: scanResult.colors,
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
