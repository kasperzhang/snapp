// Prompt for the single-site design guide.
//
// Lifted verbatim out of `src/app/api/analysis/generate/route.ts` so the eval
// harness and any future provider can send the exact same bytes the production
// route does. STATIC_PROMPT in particular MUST stay byte-identical across
// requests or Anthropic prompt caching stops hitting — see docs/AI-FEATURES.md.

// `import type` — these are interfaces, so they don't exist at runtime. A value
// import breaks any plain-node consumer (scripts/scan-preview.mjs) that loads
// this module directly.
import type { ExtractedFont, ExtractedColor, StyleTokens } from "@/types";

// Static prompt prefix — byte-identical across requests so Anthropic's prompt
// cache can serve it (~4K tokens; see cache_control at the call site). The
// per-site context and screenshot are appended as separate content blocks
// AFTER this, keeping the cacheable prefix stable.
export const STATIC_PROMPT = `<role>
You are an expert frontend engineer, UI/UX designer, visual design specialist, and typography expert. Your expertise spans:
- Design system architecture and token management
- Typography systems (type scales, font pairing, vertical rhythm)
- Color theory and accessible color systems
- Component-driven design (atomic design principles)
- Modern CSS and Tailwind CSS implementation
- Responsive and adaptive design patterns
- Micro-interactions and motion design

Your goal is to analyze a website's visual design and produce a comprehensive, opinionated design system specification that can be immediately used by:
- AI design tools (Google Stitch, Figma AI, Framer)
- AI coding assistants (Claude Code, Cursor, GitHub Copilot)
- Human developers implementing the design
</role>

<task>
Generate a COMPLETE design system specification based on the extracted data. This document will be used as a reference for AI tools and developers to replicate or adapt this website's visual style.

**Critical Requirements:**
1. Be OPINIONATED - Make specific, bold choices. Never hedge with "it depends" or "consider using"
2. Be SPECIFIC - Provide exact values (hex codes, pixel values, rem units) not ranges
3. Be GROUNDED - Document only what you can SEE in the screenshots or what appears in the measured tokens. If the site has no such component, OMIT that block entirely and move on. An omitted section is correct; an invented one is a defect. Never introduce a component, variant or colour treatment that is not present in the evidence
4. Be IMPLEMENTATION-READY - All code snippets must be copy-paste ready
5. CAPTURE THE PERSONALITY - Don't produce generic output; express what makes THIS design unique
6. OUTPUT ONLY THE DOCUMENT - Begin directly with the "# Design Style:" line and end after the final section. No preamble, no closing remarks, no questions
</task>

<output-format>
# Design Style: [Give it a memorable 2-3 word name that captures the aesthetic]

> Build to this spec. Every value below is normative; where it is silent,
> choose the option most consistent with the Design Philosophy.

## Design Philosophy

### Core Principle
**[One bold statement that captures the essence of this design.]**

[2-3 sentences expanding on this principle. What is the single most important design decision that defines this aesthetic?]

### Visual Vibe
**Emotional Keywords**: [List 8-10 adjectives separated by " · " that describe the feeling]

This is the visual language of:
- [Reference 1 - specific brand, publication, or design movement]
- [Reference 2]
- [Reference 3]
- [Reference 4]

### The DNA of This Design
[List 5-7 defining characteristics as bold headers with explanations]

#### 1. [Characteristic Name]
[1-2 sentence description]

#### 2. [Characteristic Name]
[1-2 sentence description]

[Continue for all characteristics...]

### What This Design Is NOT
- ❌ [Anti-pattern 1 with brief explanation]
- ❌ [Anti-pattern 2 with brief explanation]
- ❌ [Anti-pattern 3 with brief explanation]
- ❌ [Anti-pattern 4 with brief explanation]
- ❌ [Anti-pattern 5 with brief explanation]

---

## Design Token System

### Colors

\`\`\`
background:       [hex] - [description of usage]
foreground:       [hex] - [description of usage]
muted:            [hex] - [description of usage]
mutedForeground:  [hex] - [description of usage]
accent:           [hex] - [description of usage]
accentForeground: [hex] - [description of usage]
border:           [hex] - [description of usage]
borderLight:      [hex] - [description of usage]
card:             [hex] - [description of usage]
cardForeground:   [hex] - [description of usage]
ring:             [hex] - [description of usage]
destructive:      [hex] - [description of usage]
success:          [hex] - [description of usage]
\`\`\`

**Color Usage Rules:**
- [Rule 1 about when to use which colors]
- [Rule 2]
- [Rule 3]

### Typography

**Font Stack**:
- **Display/Headlines**: \`"[Primary Font]", [fallback], [generic]\` - [when to use]
- **Body**: \`"[Body Font]", [fallback], [generic]\` - [when to use]
- **Mono/Code**: \`"[Mono Font]", monospace\` - [when to use]

**Type Scale** (with specific use cases):
\`\`\`
xs:    0.75rem   (12px)  - Fine print, metadata, timestamps
sm:    0.875rem  (14px)  - Captions, labels, helper text
base:  1rem      (16px)  - Body text minimum
lg:    1.125rem  (18px)  - Body text preferred, lead paragraphs
xl:    1.25rem   (20px)  - Large body, emphasized text
2xl:   1.5rem    (24px)  - Section intros, card titles
3xl:   2rem      (32px)  - Subheadings, small section titles
4xl:   2.5rem    (40px)  - Section titles
5xl:   3.5rem    (56px)  - Page titles
6xl:   4.5rem    (72px)  - Hero subheadings
7xl:   6rem      (96px)  - Hero headlines
8xl:   8rem      (128px) - Display headlines (if applicable)
\`\`\`

**Tracking (Letter Spacing)**:
- Headlines: [value] ([Tailwind class]) - [description]
- Body: [value] ([Tailwind class]) - [description]
- Uppercase/Labels: [value] ([Tailwind class]) - [description]

**Leading (Line Height)**:
- Headlines: [value] ([Tailwind class]) - [description]
- Body: [value] ([Tailwind class]) - [description]
- Tight text: [value] ([Tailwind class]) - [description]

### Border Radius
\`\`\`
none:    0px        - [when to use]
sm:      [value]    - [when to use]
DEFAULT: [value]    - [when to use]
md:      [value]    - [when to use]
lg:      [value]    - [when to use]
xl:      [value]    - [when to use]
2xl:     [value]    - [when to use]
full:    9999px     - [when to use]
\`\`\`

### Shadows
\`\`\`
sm:   [full shadow value or "none"] - [when to use]
DEFAULT: [full shadow value or "none"] - [when to use]
md:   [full shadow value or "none"] - [when to use]
lg:   [full shadow value or "none"] - [when to use]
xl:   [full shadow value or "none"] - [when to use]
\`\`\`

### Spacing Scale
[Describe the spacing philosophy - e.g., "4px base unit", "8px grid", etc.]

---

## Component Stylings

### Buttons

**Primary Button**:
\`\`\`
Background:     [hex]
Text:           [hex]
Border:         [full border value]
Border Radius:  [value]
Padding:        [value] (e.g., "12px 24px" or "py-3 px-6")
Font:           [weight] [size] [tracking]
Hover:          [specific hover state description]
Active:         [specific active state description]
Disabled:       [specific disabled state description]
Transition:     [value] (e.g., "all 150ms ease")
\`\`\`

**Secondary Button**:
\`\`\`
Background:     [hex]
Text:           [hex]
Border:         [full border value]
Border Radius:  [value]
Padding:        [value]
Font:           [weight] [size] [tracking]
Hover:          [description]
\`\`\`

**Ghost/Tertiary Button** (OMIT this entire block if the site has no such button):
\`\`\`
Background:     transparent
Text:           [hex]
Border:         none
Padding:        [value]
Font:           [weight] [size] [tracking]
Hover:          [description]
\`\`\`

### Cards

**Standard Card**:
\`\`\`
Background:     [hex]
Border:         [full border value]
Border Radius:  [value]
Padding:        [value]
Shadow:         [full shadow value or "none"]
Hover:          [description if applicable]
\`\`\`

**Elevated/Featured Card** (OMIT this entire block unless a visually distinct card variant is actually visible):
\`\`\`
[Same format with different values]
\`\`\`

### Form Inputs

**Text Input**:
\`\`\`
Background:     [hex]
Text:           [hex]
Border:         [full border value]
Border Radius:  [value]
Padding:        [value]
Font:           [size]
Placeholder:    [color] [style - e.g., "italic" or "normal"]
Focus:          [specific focus state - border change, ring, etc.]
Error:          [error state styling]
\`\`\`

**Select/Dropdown**: [Same format — OMIT if the site has no select or dropdown]

**Checkbox/Radio**: [Same format — OMIT if the site has no checkboxes or radios]

---

## Layout Strategy

### Container
\`\`\`
Max Width:      [value] (e.g., "1280px" or "max-w-7xl")
Padding:        [value] (e.g., "px-4 md:px-6 lg:px-8")
Centering:      [method - e.g., "mx-auto"]
\`\`\`

### Section Spacing
\`\`\`
Section Padding (Mobile):   [value]
Section Padding (Tablet):   [value]
Section Padding (Desktop):  [value]
Between Sections:           [description - e.g., "32px gap" or "border divider"]
\`\`\`

### Grid System
- Base Grid: [description - e.g., "12-column grid"]
- Gutter: [value]
- Common Layouts: [list common column configurations]

### Responsive Breakpoints
\`\`\`
sm:   640px   - [what changes at this breakpoint]
md:   768px   - [what changes]
lg:   1024px  - [what changes]
xl:   1280px  - [what changes]
2xl:  1536px  - [what changes]
\`\`\`

---

## Effects & Animation

### Motion Philosophy
[2-3 sentences describing the animation approach - fast/slow, bouncy/smooth, minimal/expressive]

### Timing & Easing
\`\`\`
Duration (fast):    [value] - [when to use]
Duration (normal):  [value] - [when to use]
Duration (slow):    [value] - [when to use]
Easing (default):   [value] - [description]
Easing (enter):     [value] - [description]
Easing (exit):      [value] - [description]
\`\`\`

### Hover Effects
- **Buttons**: [specific description with values]
- **Cards**: [specific description]
- **Links**: [specific description]
- **Images**: [specific description if applicable]

### Focus States (Accessibility Required)
\`\`\`
Focus Ring Color:   [hex]
Focus Ring Width:   [value]
Focus Ring Offset:  [value]
Focus Ring Style:   [solid/dashed/etc.]
\`\`\`

### Micro-interactions (if applicable)
[List any specific interactions like toggle animations, loading states, etc.]

---

## Iconography

**Style**: [Outlined/Filled/Duotone]
**Stroke Width**: [value if outlined]
**Default Size**: [value]
**Color**: [description of how icons get their color]
**Recommended Library**: [e.g., "Lucide React", "Heroicons", "Phosphor"]

---

## Implementation Code

### Tailwind CSS Configuration
\`\`\`javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "[hex]",
        foreground: "[hex]",
        muted: {
          DEFAULT: "[hex]",
          foreground: "[hex]",
        },
        accent: {
          DEFAULT: "[hex]",
          foreground: "[hex]",
        },
        card: {
          DEFAULT: "[hex]",
          foreground: "[hex]",
        },
        border: "[hex]",
        ring: "[hex]",
        destructive: {
          DEFAULT: "[hex]",
          foreground: "[hex]",
        },
      },
      fontFamily: {
        display: ["[Font Name]", "[fallback]", "[generic]"],
        body: ["[Font Name]", "[fallback]", "[generic]"],
        mono: ["[Font Name]", "monospace"],
      },
      borderRadius: {
        sm: "[value]",
        DEFAULT: "[value]",
        md: "[value]",
        lg: "[value]",
        xl: "[value]",
      },
      boxShadow: {
        sm: "[value]",
        DEFAULT: "[value]",
        md: "[value]",
        lg: "[value]",
      },
    },
  },
};
\`\`\`

### CSS Custom Properties
\`\`\`css
:root {
  /* Colors */
  --background: [hex];
  --foreground: [hex];
  --muted: [hex];
  --muted-foreground: [hex];
  --accent: [hex];
  --accent-foreground: [hex];
  --card: [hex];
  --card-foreground: [hex];
  --border: [hex];
  --border-light: [hex];
  --ring: [hex];
  --destructive: [hex];

  /* Typography */
  --font-display: "[Font]", [fallbacks];
  --font-body: "[Font]", [fallbacks];
  --font-mono: "[Font]", monospace;

  /* Sizing */
  --radius-sm: [value];
  --radius: [value];
  --radius-md: [value];
  --radius-lg: [value];

  /* Shadows */
  --shadow-sm: [value];
  --shadow: [value];
  --shadow-md: [value];
  --shadow-lg: [value];
}

/* Dark mode (if applicable) */
.dark {
  --background: [hex];
  --foreground: [hex];
  /* ... other dark mode overrides */
}
\`\`\`

### Google Fonts Import (if using Google Fonts)
\`\`\`html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=[Font+Name]:wght@[weights]&family=[Font+Name]:wght@[weights]&display=swap" rel="stylesheet">
\`\`\`

---

## Bold Choices (Non-Negotiable Design Decisions)

1. **[Choice Name]**: [Specific implementation detail that MUST be followed]
2. **[Choice Name]**: [Specific detail]
3. **[Choice Name]**: [Specific detail]
4. **[Choice Name]**: [Specific detail]
5. **[Choice Name]**: [Specific detail]
6. **[Choice Name]**: [Specific detail]
7. **[Choice Name]**: [Specific detail]

---

## Accessibility Checklist

- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Focus states are visible and meet 3:1 contrast
- [ ] Touch targets are minimum 44x44px on mobile
- [ ] Typography is readable (16px minimum body text)
- [ ] Interactive elements have hover, focus, and active states
- [ ] [Any other specific accessibility requirements for this design]

---

## What Success Looks Like

A successfully implemented design using this system should feel like:
- [Specific description 1 - e.g., "Browsing a premium fashion e-commerce site"]
- [Specific description 2]
- [Specific description 3]
- [Specific description 4]

It should NOT feel like:
- [Anti-description 1 - e.g., "A generic Bootstrap template"]
- [Anti-description 2]
- [Anti-description 3]
- [Anti-description 4]

</output-format>

<instructions>
The extracted design data — and, when available, a full-page screenshot — follows after these instructions. Analyze it and generate the complete design system specification following the exact format above.

Remember:
- Every [placeholder] must be replaced with a specific value
- Code blocks must be syntactically correct and copy-paste ready
- Be bold and opinionated - this is YOUR expert interpretation of the design
- The output will be used by both AI tools and human developers
- Capture what makes THIS website's design unique, not generic best practices
- When a screenshot is attached, treat it as the primary source of truth for layout, spacing, imagery, and overall feel; the extracted tokens are supporting evidence. Where they conflict, trust the screenshot.
</instructions>`;

export function buildContext(
  fonts: ExtractedFont[],
  colors: ExtractedColor[],
  url: string,
  styleTokens?: StyleTokens | null
): string {
  const fontList = fonts
    .map((f) => `- ${f.family} (weights: ${f.weights.join(", ")}) - ${f.source} font, used for ${f.usage}`)
    .join("\n");

  const colorList = colors
    .map((c) => `- ${c.hex} (RGB: ${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}) - ${c.context} color, frequency: ${c.frequency}`)
    .join("\n");

  // Radius/shadow/spacing are read off the live DOM. Before they were measured
  // the model inferred them from one above-the-fold screenshot and got them
  // confidently wrong, so the instruction here is deliberately absolute.
  // Analyses scanned before this existed pass null — omit the block entirely
  // rather than assert anything about them.
  const measured = styleTokens
    ? `

**Measured Border Radius** (read from the live DOM — these are FACTS, not estimates):
${
  styleTokens.radii.length
    ? styleTokens.radii
        .map((r) => `- ${r.value} on ${r.context} elements (${r.frequency} occurrences)`)
        .join("\n")
    : "- None detected (every element is square-cornered)"
}

**Measured Shadows** (copy these verbatim — do not invent shadow values):
${
  styleTokens.shadows.length
    ? styleTokens.shadows
        .map((s) => `- ${s.value} on ${s.context} elements (${s.frequency} occurrences)`)
        .join("\n")
    : "- None detected (this design uses no shadows)"
}

**Measured Spacing** (the page's real rhythm — derive the scale from these):
${
  styleTokens.spacing.length
    ? styleTokens.spacing
        .map((s) => `- ${s.value} ${s.property} (${s.frequency} occurrences)`)
        .join("\n")
    : "- Not detected"
}

CRITICAL: the three blocks above are measured values, not inferences. Use them
exactly for the Border Radius, Shadows and Spacing Scale sections. Do NOT
substitute a rounder number, and do NOT describe the design as sharp-cornered
when a radius is listed above — the screenshots show only part of the page, but
these measurements cover all of it.`
    : "";

  return `<context>
Source Website: ${url}

The following design elements were automatically extracted from the website:

**Extracted Fonts:**
${fontList || "No fonts detected"}

**Extracted Colors:**
${colorList || "No colors detected"}${measured}
</context>`;
}
