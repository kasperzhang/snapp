import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  DESIGN_ASPECTS,
  DesignAspect,
  ExtractedColor,
  ExtractedFont,
  WorkbenchItemSelection,
} from "@/types";
import { MAX_GUIDE_SOURCES } from "@/lib/billing/plans";
import {
  checkUsageLimit,
  recordUsage,
  estimateCostCents,
  totalInputTokens,
} from "@/lib/billing/limits";
import { rateLimit } from "@/lib/ratelimit";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-5";

export const maxDuration = 300; // Vercel function timeout (vision + long output)

const ASPECT_LABEL: Record<DesignAspect, string> = Object.fromEntries(
  DESIGN_ASPECTS.map((a) => [a.id, a.label])
) as Record<DesignAspect, string>;

const LEAD = `<role>
You are a world-class product designer and front-end engineer. You specialize in
distilling the visual language of real websites into precise, buildable design guides.
</role>

<task>
The designer below has hand-picked several reference websites and, for each, marked which
design aspects they want to borrow (with optional specific fonts/colors and a note). A
screenshot of each site is attached so you can read its actual layout, background, spacing,
motion cues, imagery and overall feel — not just the extracted tokens. Synthesize ONE
cohesive, original design guide that combines the requested aspects from each source plus
the designer's own additions. Attribute decisions to their source ("headings follow Site A;
the accent + gradient background come from Site B"). Resolve conflicts with taste and state
why. The result should read as a single coherent design system, not a list of quotes.
</task>

<output-format>
Produce Markdown with these sections:

# Combined Design Guide: {a short evocative name you coin}

## Design Philosophy
2-4 sentences on the unified direction and how the borrowed pieces cohere.

## Typography
Font families (with fallbacks), scale, weights, and usage. Note the source.

## Color & Background
Palette with hex values, roles (bg/surface/text/accent/border), and the background
treatment (solid, gradient, texture). Note the source.

## Layout & Spacing
Grid, container widths, spacing scale, and structural patterns. Note the source.

## Components
Buttons, cards, inputs, nav — shapes, radii, borders, shadows, states.

## Motion & Effects
Animations, transitions, hover/scroll behaviors, and their feel. Note the source.

## Imagery & Iconography
Image treatment, illustration style, icon style.

## Your Additions
How the designer's own notes were incorporated.

## Implementation Notes
A short Tailwind/CSS starting point (design tokens as CSS variables + a couple of key
component snippets).

## Quick Reference
A compact bullet cheat-sheet of the core decisions.

## Paste-Ready Agent Prompt
A single fenced \`\`\`text code block (roughly 150-250 words) the designer can paste
verbatim into an AI coding agent (Claude Code, Cursor, v0) to build in this style.
Write it as direct commands: name the fonts with fallbacks, list the core hex
tokens and their roles, state the radius/shadow/spacing rules and the motion feel,
and repeat the three most load-bearing decisions from above. It must be
self-contained — usable without the rest of this document.
</output-format>

<instructions>
- Be specific and buildable: real hex values, real pixel/rem numbers, real font names.
- Only borrow the aspects the designer marked for each source; ignore the rest of that site.
- When a font/color is explicitly picked, use it; otherwise infer sensible values from the
  screenshot and extracted tokens.
- Keep it a single, opinionated, cohesive system.
- Output ONLY the Markdown document: begin directly with the "# Combined Design Guide:" heading and end after the last section. No preamble, no closing remarks, no questions.
</instructions>`;

interface ItemForPrompt {
  index: number;
  title: string;
  url: string;
  selection: WorkbenchItemSelection;
  fonts: ExtractedFont[];
  colors: ExtractedColor[];
  screenshotUrl: string;
}

function sourceText(item: ItemForPrompt): string {
  const sel = item.selection || { aspects: [], fonts: [], colors: [], comment: "" };
  const aspects = (sel.aspects || [])
    .map((a) => ASPECT_LABEL[a] ?? a)
    .join(", ");

  const lines: string[] = [];
  lines.push(`## Source ${item.index}: ${item.title} (${item.url})`);
  lines.push(`Borrow from this site: ${aspects || "(overall feel)"}`);

  if (sel.fonts?.length) {
    const picked = item.fonts.filter((f) => sel.fonts.includes(f.family));
    const detail = picked.length
      ? picked
          .map(
            (f) =>
              `${f.family} (weights: ${f.weights.join(", ")}, ${f.usage})`
          )
          .join("; ")
      : sel.fonts.join("; ");
    lines.push(`Picked fonts: ${detail}`);
  }

  if (sel.colors?.length) {
    const picked = item.colors.filter((c) => sel.colors.includes(c.hex));
    const detail = picked.length
      ? picked.map((c) => `${c.hex} (${c.context})`).join(", ")
      : sel.colors.join(", ");
    lines.push(`Picked colors: ${detail}`);
  }

  if (sel.comment?.trim()) {
    lines.push(`Designer note: ${sel.comment.trim()}`);
  }

  lines.push("Screenshot of this site is attached below.");
  return lines.join("\n");
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

    const { workbench_id } = await request.json();
    if (!workbench_id) {
      return NextResponse.json(
        { error: "workbench_id is required" },
        { status: 400 }
      );
    }

    const { data: workbench, error: wbError } = await supabase
      .from("workbenches")
      .select(
        "*, items:workbench_items(*, bookmark:bookmarks(url,title), analysis:site_analyses(fonts,colors,screenshot_url,analysis_status))"
      )
      .eq("id", workbench_id)
      .eq("user_id", user.id)
      .single();

    if (wbError || !workbench) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    interface RawItem {
      position: number;
      selection: WorkbenchItemSelection;
      bookmark?: { url: string; title: string };
      analysis?: {
        fonts: ExtractedFont[] | null;
        colors: ExtractedColor[] | null;
        screenshot_url: string | null;
        analysis_status: string;
      } | null;
    }

    const rawItems: RawItem[] = Array.isArray(workbench.items)
      ? [...workbench.items].sort((a, b) => a.position - b.position)
      : [];

    // Only sources that have been scanned (need a screenshot for vision)
    const ready: ItemForPrompt[] = rawItems
      .filter((it) => it.analysis?.screenshot_url)
      .map((it, i) => ({
        index: i + 1,
        title: it.bookmark?.title || "Untitled",
        url: it.bookmark?.url || "",
        selection: it.selection,
        fonts: it.analysis?.fonts || [],
        colors: it.analysis?.colors || [],
        screenshotUrl: it.analysis!.screenshot_url!,
      }));

    if (ready.length === 0) {
      return NextResponse.json(
        { error: "Add and scan at least one source before generating" },
        { status: 400 }
      );
    }

    // Rate limit: guard against runaway generate loops.
    if (!rateLimit(`guide:${user.id}`, 5, 60_000).success) {
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

    // Cap the number of screenshots sent to the model to bound per-call cost.
    const sources = ready.slice(0, MAX_GUIDE_SOURCES);

    await supabase
      .from("workbenches")
      .update({ guide_status: "generating" })
      .eq("id", workbench_id);

    // Build an interleaved content array: lead text, then per-source text + screenshot
    const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: LEAD }];
    for (const item of sources) {
      content.push({ type: "text", text: sourceText(item) });
      content.push({
        type: "image",
        source: { type: "url", url: item.screenshotUrl },
      });
    }
    if (workbench.own_additions?.trim()) {
      content.push({
        type: "text",
        text: `## Designer's own additions\n${workbench.own_additions.trim()}`,
      });
    }
    content.push({
      type: "text",
      text: "Now write the combined design guide following the output format exactly.",
    });

    let designGuide = "";
    try {
      // 8000 caps worst-case generation at ~2 min of output — the 300s Vercel
      // timeout becomes unreachable (16000 could brush it and strand the
      // workbench in guide_status "generating").
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content }],
      });
      designGuide = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // Meter the successful generation with real token counts + est. cost.
      await recordUsage(supabase, {
        userId: user.id,
        kind: "guide",
        tokensIn: totalInputTokens(message.usage),
        tokensOut: message.usage?.output_tokens ?? 0,
        costCents: estimateCostCents(MODEL, message.usage),
        metadata: { workbench_id, sources: sources.length },
      });
    } catch (err) {
      console.error("Error generating combined guide:", err);
      await supabase
        .from("workbenches")
        .update({ guide_status: "error" })
        .eq("id", workbench_id);
      return NextResponse.json(
        { error: "Failed to generate design guide" },
        { status: 500 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("workbenches")
      .update({ design_guide: designGuide, guide_status: "completed" })
      .eq("id", workbench_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error saving combined guide:", updateError);
      return NextResponse.json(
        { error: "Failed to save design guide" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error generating combined guide:", error);
    return NextResponse.json(
      { error: "Failed to generate design guide" },
      { status: 500 }
    );
  }
}
