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
  StyleTokens,
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
Palette with hex values, and for EACH one a role (bg / surface / text / accent /
border) plus, where the evidence supports it, where it must NOT be used. Measuring
that a colour exists does not tell you what it is for: a colour that appears only
in imagery is not a link colour, and an accent used sparsely is not a CTA colour.
Say so explicitly — "decorative only, never on an interactive control" is a more
useful line than another hex. Use the measured ink exactly; if the darkest measured
text is #141413, the text colour is #141413 and not #000000. Then the background
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

## What This Design Is NOT
Up to five lines, each naming a default this design rejects AND the thing it does
instead: "Not X — Y instead." Every line must be derivable from the decisions above;
this section resolves what they leave open, it never introduces anything new. Prefer
constraints that contradict what a coding agent reaches for unprompted — decorative
gradients, glassmorphism, an all-purpose rounded corner, a default blue button, emoji
as icons — and constraints the measurements prove, e.g. no shadows were detected.
Skip any line that could appear in any other design guide; "not a generic template"
says nothing.

Close the section with "**Non-negotiable:**" and the three decisions above that must
survive any adaptation — the ones where trading them away would make the result stop
being this design. State each as a rule, not a preference.

## Design Tokens
The decisions above as machine-usable values: design tokens as CSS variables, plus a
couple of key component snippets (Tailwind or plain CSS). This is a translation of
what is already stated, never a place for new decisions.
</output-format>

<instructions>
- Be specific and buildable: real hex values, real pixel/rem numbers, real font names.
- Be GROUNDED. Document only what you can see in the screenshots or what appears in
  the measured values above. Measured radii, shadows and spacing are FACTS: use them
  exactly, never round them to a tidier number, and never call a design
  sharp-cornered when a radius is listed. If a source has no component of some kind,
  omit that decision rather than inventing one — an omitted line is correct, an
  invented one is a defect.
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
  /** Radii, shadows and spacing read off the live DOM. Null for sources
      scanned before the scanner measured them. */
  styleTokens: StyleTokens | null;
  screenshotUrl: string;
  /** Every captured band, hero first. The route decides how many to send. */
  screenshotUrls: string[];
}

export function sourceText(item: ItemForPrompt): string {
  const sel = item.selection || { aspects: [], fonts: [], colors: [], comment: "" };
  const aspects = (sel.aspects || [])
    .map((a) => ASPECT_LABEL[a] ?? a)
    .join(", ");

  const lines: string[] = [];
  lines.push(`## Source ${item.index}: ${item.title} (${item.url})`);
  lines.push(`Borrow from this site: ${aspects || "(overall feel)"}`);

  /* Everything measured off this site, always — the tags decide what to
     BORROW, never what the model is allowed to KNOW. Sending only the picked
     values meant an untagged source arrived with no palette and no type at
     all, and the guide invented both: real runs produced Tailwind's default
     gray for a site that has its own five-step neutral ramp. */
  if (item.fonts.length) {
    lines.push(
      `Fonts measured on this site: ${item.fonts
        .map(
          (f) =>
            `${f.family} (weights: ${f.weights.join(", ")}, ${f.usage})${
              sel.fonts?.includes(f.family) ? " ← designer picked this" : ""
            }`
        )
        .join("; ")}`
    );
  }

  if (item.colors.length) {
    lines.push(
      `Colors measured on this site: ${item.colors
        .slice(0, 16)
        .map(
          (c) =>
            `${c.hex} (${c.context})${
              sel.colors?.includes(c.hex) ? " ← designer picked this" : ""
            }`
        )
        .join(", ")}`
    );
  }

  // Read off the live DOM, so they outrank anything inferred from a picture.
  const t = item.styleTokens;
  if (t?.radii?.length) {
    lines.push(
      `Measured radii (facts, not estimates): ${t.radii
        .map((r) => `${r.value} on ${r.context}`)
        .join(", ")}`
    );
  }
  if (t?.shadows?.length) {
    lines.push(
      `Measured shadows (copy verbatim, never invent): ${t.shadows
        .map((sh) => `${sh.value} on ${sh.context}`)
        .join(" | ")}`
    );
  } else if (t) {
    lines.push("Measured shadows: none — this site uses no shadows at all.");
  }
  if (t?.spacing?.length) {
    lines.push(
      `Measured spacing: ${t.spacing
        .map((sp) => `${sp.value} ${sp.property}`)
        .join(", ")}`
    );
  }

  if (sel.comment?.trim()) {
    lines.push(`Designer note: ${sel.comment.trim()}`);
  }

  lines.push("Screenshots of this site follow.");
  return lines.join("\n");
}
