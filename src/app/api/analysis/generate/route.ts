import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { ExtractedFont, ExtractedColor, StyleTokens } from "@/types";
import {
  checkUsageLimit,
  recordUsage,
  estimateCostCents,
  totalInputTokens,
} from "@/lib/billing/limits";
import { rateLimit } from "@/lib/ratelimit";
import { resolveModel } from "@/lib/ai/models";
import { STATIC_PROMPT, buildContext } from "@/lib/ai/prompts/guide";

const anthropic = new Anthropic();

// Vercel function timeout. Generating the full design guide is a large,
// non-streamed completion (~60-80s). 300 is the Vercel Pro ceiling; Hobby
// clamps to 60s, so on Hobby this route needs streaming or a shorter prompt.
export const maxDuration = 300;


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
    const { analysis_id } = body;

    if (!analysis_id) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    // Fetch analysis with bookmark info
    const { data: analysis, error: analysisError } = await supabase
      .from("site_analyses")
      .select(`
        *,
        bookmark:bookmarks(url)
      `)
      .eq("id", analysis_id)
      .single();

    if (analysisError || !analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (!analysis.fonts || !analysis.colors) {
      return NextResponse.json(
        { error: "Analysis must be completed before generating design guide" },
        { status: 400 }
      );
    }

    // Rate limit: guard against runaway generate loops.
    if (!rateLimit(`analysis:${user.id}`, 10, 60_000).success) {
      return NextResponse.json(
        { error: "Too many generations, please wait a moment." },
        { status: 429 }
      );
    }

    // Monthly plan cap.
    const limit = await checkUsageLimit(supabase, user.id, "guide");
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `You've reached your monthly design-guide limit (${limit.used}/${limit.limit}). Upgrade to keep going.`,
          code: "limit_reached",
        },
        { status: 402 }
      );
    }

    const url = (analysis.bookmark as { url: string })?.url || "the website";

    // Static instructions first with the cache breakpoint (a byte-identical
    // prefix is what makes the prompt cache hit), then per-site context, then
    // the screenshot so the model reads the actual design, not just tokens.
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text: STATIC_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: buildContext(
          analysis.fonts as ExtractedFont[],
          analysis.colors as ExtractedColor[],
          url,
          analysis.style_tokens as StyleTokens | null
        ),
      },
    ];

    // Send every captured band, labelled by position. Analyses scanned before
    // sectioning fall back to the single hero shot.
    const bands: string[] =
      (analysis.screenshot_urls as string[] | null)?.length
        ? (analysis.screenshot_urls as string[])
        : analysis.screenshot_url
          ? [analysis.screenshot_url]
          : [];

    bands.forEach((bandUrl, i) => {
      content.push({
        type: "text",
        text:
          bands.length === 1
            ? "Screenshot of the website (top of the page only):"
            : i === 0
              ? `Screenshot ${i + 1} of ${bands.length} — top of the page:`
              : `Screenshot ${i + 1} of ${bands.length} — continuing down the page:`,
      });
      content.push({ type: "image", source: { type: "url", url: bandUrl } });
    });

    // `checkUsageLimit` already resolved the plan, so routing is free here.
    const model = resolveModel("guide", limit.plan);

    // 12000, not 8000. Sonnet's natural length for this template is 7,700-8,500
    // tokens, so an 8000 cap truncated roughly half of all guides — measured
    // across 6 real sites — usually severing the Paste-Ready Agent Prompt at the
    // very end, which is the most useful part. At ~85s per 8,000 tokens, 12000
    // lands near 120s, comfortably inside the 300s ceiling.
    const message = await anthropic.messages.create({
      model: model.id,
      max_tokens: 12000,
      thinking: { type: "disabled" }, // keep latency low (Sonnet 5 runs adaptive thinking by default)
      messages: [{ role: "user", content }],
    });

    // Extract text from response
    const designPrompt = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    // Meter the successful generation with real token counts + est. cost.
    await recordUsage(supabase, {
      userId: user.id,
      kind: "guide",
      tokensIn: totalInputTokens(message.usage),
      tokensOut: message.usage?.output_tokens ?? 0,
      costCents: estimateCostCents(model.id, message.usage),
      metadata: { analysis_id },
    });

    // Update analysis with generated prompt
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("site_analyses")
      .update({
        design_prompt: designPrompt,
      })
      .eq("id", analysis_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating analysis:", updateError);
      return NextResponse.json(
        { error: "Failed to save design guide" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAnalysis);
  } catch (error) {
    console.error("Error generating design prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate design guide" },
      { status: 500 }
    );
  }
}
