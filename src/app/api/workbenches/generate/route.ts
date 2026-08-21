import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
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
import {
  debugGenerationError,
  describeGenerationError,
  logGenerationError,
} from "@/lib/ai/errors";
import { resolveModel } from "@/lib/ai/models";
import { LEAD, sourceText, type ItemForPrompt } from "@/lib/ai/prompts/mix";

const anthropic = new Anthropic();

export const maxDuration = 300; // Vercel function timeout (vision + long output)

/* NDJSON frames — one JSON object per line, streamed to the client while the
   guide is written. "d" is a text delta, "done" carries the saved workbench
   row, "err" reports a failure that happened after headers were already sent. */
type GuideFrame =
  | { t: "d"; v: string }
  | { t: "done"; workbench: unknown }
  /* `guide` rides along when the model finished and only the save failed —
     the text exists, it cost a credit, and dropping it on the floor while
     telling someone to "try again" spends a second one for nothing. */
  | { t: "err"; message: string; guide?: string; debug?: string };


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

    // `checkUsageLimit` already resolved the plan, so routing is free here.
    const model = resolveModel("mix", limit.plan);

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

    // From here on the response is a stream, so failures can no longer be an
    // HTTP status — they ride in-band as an "err" frame. Every check that can
    // reject the request (auth, limits, plan cap) already ran above.
    const encoder = new TextEncoder();
    // Swallow enqueue failures: if the panel was closed mid-generation the
    // controller is dead, but we still want the guide finished, metered and
    // saved so it's waiting when the designer comes back.
    const send = (
      controller: ReadableStreamDefaultController,
      frame: GuideFrame
    ) => {
      try {
        controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
      } catch {
        /* client gone — keep generating */
      }
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 12000, matching the single-site route. Sonnet's natural length for
          // that template measured 7,700-8,900, so an 8000 cap truncated about
          // half of them; a combined guide synthesises up to 8 sources and has
          // no reason to be shorter. Streaming keeps bytes flowing, so the 300s
          // Vercel timeout is not the binding constraint here.
          const message = anthropic.messages.stream({
            model: model.id,
            max_tokens: 12000,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content }],
          });

          let designGuide = "";
          for await (const event of message) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              designGuide += event.delta.text;
              send(controller, { t: "d", v: event.delta.text });
            }
          }

          // Usage is only final once the stream ends.
          const final = await message.finalMessage();
          await recordUsage(supabase, {
            userId: user.id,
            kind: "guide",
            tokensIn: totalInputTokens(final.usage),
            tokensOut: final.usage?.output_tokens ?? 0,
            costCents: estimateCostCents(model.id, final.usage),
            metadata: { workbench_id, sources: sources.length },
          });

          /* Saving is its own failure, and a different one: the guide has
             already been written and paid for. Reporting it as "couldn't write
             the guide" sent people back to spend another credit reproducing
             something that already existed. */
          const { data: updated, error: updateError } = await supabase
            .from("workbenches")
            .update({ design_guide: designGuide, guide_status: "completed" })
            .eq("id", workbench_id)
            .select()
            .single();

          if (updateError) {
            logGenerationError("mix:save", updateError);
            send(controller, {
              t: "err",
              message:
                "Your guide was written, but saving it failed. It's here — copy it now, because a retry costs another credit.",
              guide: designGuide,
              debug: debugGenerationError(updateError),
            });
            return;
          }

          send(controller, { t: "done", workbench: updated });
        } catch (err) {
          logGenerationError("mix:model", err);
          await supabase
            .from("workbenches")
            .update({ guide_status: "error" })
            .eq("id", workbench_id);
          // close(), not error() — an errored stream reaches the client as an
          // opaque network failure with no message to show. The frame carries
          // the reason: "try again" and "re-scan that source" are different
          // instructions, and only the server knows which one applies.
          send(controller, {
            t: "err",
            message: describeGenerationError(err),
            debug: debugGenerationError(err),
          });
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed by a disconnect */
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    logGenerationError("mix:setup", error);
    return NextResponse.json(
      {
        error: describeGenerationError(
          error,
          "Couldn't start the guide. Try again."
        ),
      },
      { status: 500 }
    );
  }
}
