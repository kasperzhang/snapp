// Prompt for the combined (Mix) design guide.
//
// Lifted verbatim out of `src/app/api/workbenches/generate/route.ts` so the
// eval harness and any future provider send the exact same bytes as production.
// See docs/AI-FEATURES.md for why the interleaving and precedence rules matter.

import {
  DESIGN_ASPECTS,
  DesignAspect,
  ExtractedColor,
  ExtractedFont,
  WorkbenchItemSelection,
} from "@/types";

const ASPECT_LABEL: Record<DesignAspect, string> = Object.fromEntries(
  DESIGN_ASPECTS.map((a) => [a.id, a.label])
) as Record<DesignAspect, string>;

export const LEAD = `<role>
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

> Build to this spec. Every value below is normative; where it is silent,
> choose the option most consistent with the Design Philosophy.

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

## Design Tokens
The decisions above as machine-usable values: design tokens as CSS variables, plus a
couple of key component snippets (Tailwind or plain CSS). This is a translation of
what is already stated, never a place for new decisions.
</output-format>

<instructions>
- Be specific and buildable: real hex values, real pixel/rem numbers, real font names.
- Only borrow the aspects the designer marked for each source; ignore the rest of that site.
- When a font/color is explicitly picked, use it; otherwise infer sensible values from the
  screenshot and extracted tokens.
- Keep it a single, opinionated, cohesive system.
- Output ONLY the Markdown document: begin directly with the "# Combined Design Guide:" heading and end after the last section. No preamble, no closing remarks, no questions.
</instructions>`;

export interface ItemForPrompt {
  index: number;
  title: string;
  url: string;
  selection: WorkbenchItemSelection;
  fonts: ExtractedFont[];
  colors: ExtractedColor[];
  screenshotUrl: string;
}

export function sourceText(item: ItemForPrompt): string {
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
