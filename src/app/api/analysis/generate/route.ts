import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { ExtractedFont, ExtractedColor } from "@/types";

const anthropic = new Anthropic();

function buildPrompt(fonts: ExtractedFont[], colors: ExtractedColor[], url: string): string {
  const fontList = fonts
    .map((f) => `- ${f.family} (weights: ${f.weights.join(", ")}) - ${f.source} font, used for ${f.usage}`)
    .join("\n");

  const colorList = colors
    .map((c) => `- ${c.hex} (RGB: ${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}) - ${c.context} color, frequency: ${c.frequency}`)
    .join("\n");

  return `<role>
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

<context>
Source Website: ${url}

The following design elements were automatically extracted from the website:

**Extracted Fonts:**
${fontList || "No fonts detected"}

**Extracted Colors:**
${colorList || "No colors detected"}
</context>

<task>
Generate a COMPLETE design system specification based on the extracted data. This document will be used as a reference for AI tools and developers to replicate or adapt this website's visual style.

**Critical Requirements:**
1. Be OPINIONATED - Make specific, bold choices. Never hedge with "it depends" or "consider using"
2. Be SPECIFIC - Provide exact values (hex codes, pixel values, rem units) not ranges
3. Be COMPLETE - Fill every section with actionable specifications
4. Be IMPLEMENTATION-READY - All code snippets must be copy-paste ready
5. CAPTURE THE PERSONALITY - Don't produce generic output; express what makes THIS design unique
</task>

<output-format>
# Design Style: [Give it a memorable 2-3 word name that captures the aesthetic]

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

**Ghost/Tertiary Button**:
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

**Elevated/Featured Card** (if applicable):
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

**Select/Dropdown**: [Same format]

**Checkbox/Radio**: [Same format]

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

---

## Quick Reference Card

| Element | Value |
|---------|-------|
| Primary Font | [value] |
| Body Font | [value] |
| Primary Color | [hex] |
| Accent Color | [hex] |
| Border Radius | [value] |
| Base Spacing | [value] |
| Shadow Style | [description] |
| Animation Speed | [value] |

</output-format>

<instructions>
Now analyze the extracted design data and generate the complete design system specification following the exact format above.

Remember:
- Every [placeholder] must be replaced with a specific value
- Code blocks must be syntactically correct and copy-paste ready
- Be bold and opinionated - this is YOUR expert interpretation of the design
- The output will be used by both AI tools and human developers
- Capture what makes THIS website's design unique, not generic best practices
</instructions>`;
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
        { error: "Analysis must be completed before generating design prompt" },
        { status: 400 }
      );
    }

    const url = (analysis.bookmark as { url: string })?.url || "the website";
    const prompt = buildPrompt(
      analysis.fonts as ExtractedFont[],
      analysis.colors as ExtractedColor[],
      url
    );

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const designPrompt = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

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
        { error: "Failed to save design prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAnalysis);
  } catch (error) {
    console.error("Error generating design prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate design prompt" },
      { status: 500 }
    );
  }
}
