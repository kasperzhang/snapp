/* A real guide, mixed from two bookmarked sites — the one the "with your
   guide" panel in the before/after section is built from. It ships as text
   rather than a picture so a visitor can copy it, paste it into their own
   agent, and watch the same thing happen. That is the product demo.

   Deliberately free of the source sites' names: this is handed to strangers to
   use on their own work, and a spec that keeps pointing at someone else's
   brand reads as instructions to copy that brand. Every value the sources
   produced is still here — only the attributions are gone. */

export const MIDNIGHT_LEDGER = `# Combined Design Guide: Midnight Ledger

## Design Philosophy
Midnight Ledger pairs a confident, near-black command-center canvas with oversized, geometric editorial type. The result is a dark, focused SaaS interface that feels serious and secure (financial-grade) but never sterile — big grotesk headlines punch through a deep charcoal ground, while lime-green accents and soft glowing surfaces guide the eye to the one thing that matters: the call to action. Dark backdrop + huge type + a single loud accent color is the throughline that unifies every screen.

## Typography
- **Headings:** A tall, geometric grotesk — use **"Neue Montreal"** or **"General Sans"** as primary, falling back to **"Archivo", "Inter", sans-serif**. Set extremely large (64–96px / 4–6rem on desktop, 40–48px mobile), tight tracking (-0.02em), weight 500–600 (medium/semibold, not black) so it stays elegant rather than shouty. Restrained weight at large sizes is the whole trick; a heavier cut at this scale reads as a template.
- **Body/UI text:** **"Inter", "Suisse Int'l", system-ui, sans-serif** at 16–18px, weight 400, line-height 1.6, color muted gray for calm readability against the dark background.
- **Scale:**
  - H1: 4–6rem / 500 weight / -0.02em tracking
  - H2: 2.5–3rem / 500 weight
  - H3: 1.5–1.75rem / 600 weight
  - Body: 1rem–1.125rem / 400 weight
  - Small/labels: 0.875rem / 500 weight, uppercase tracking 0.05em for eyebrow tags
- **Usage note:** Headlines can break across lines with inline glyphs/icons (small arrow, diamond or sparkle marks set between words) — in Midnight Ledger these read as AI/status marks punctuating the hero copy.

## Color & Background
A near-black, high-contrast dark theme:
- **Background:** \`#0A0A0A\` (primary canvas, almost pure black with a whisper of warmth)
- **Surface/Card:** \`#161616\` – \`#1C1C1C\` (elevated panels, input fields, pill-shaped suggestion chips)
- **Border:** \`#2A2A2A\` subtle hairlines; \`#3A3A3A\` on hover/focus
- **Text primary:** \`#F5F5F0\` (soft off-white, not pure white — a warm paper-white for headlines)
- **Text secondary/muted:** \`#9A9A9A\`
- **Accent (primary CTA):** \`#D4F547\` electric lime-yellow — used sparingly for the single most important action (Get Access buttons, focus rings, active states) and nowhere else
- **Accent-adjacent:** icons/sparkles in \`#C9C9C9\` on dark chips, occasionally tinted lime on hover
- **Background treatment:** solid near-black base with soft radial glow/vignette behind the hero (a faint darker-to-black gradient, \`#111111 → #000000\`), and translucent floating "chip" elements with low-opacity white borders that fade at the viewport edge.

## Layout & Spacing
- **Container:** max-width 1200–1280px, centered, generous 24–32px side gutters on mobile, 64–80px on desktop.
- **Grid:** 12-column desktop grid; hero content is single-column, centered, with a vertically stacked headline → subhead → input/CTA row → floating chip cloud beneath.
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px — generous vertical rhythm between sections (96–128px section padding) to let the oversized type breathe.
- **Structural pattern:** Fixed top nav (logo left, links center/right-of-center, ghost "Sign in" + solid lime "Get access" button pair on far right) sitting on the same dark background as the hero — no visual seam between nav and hero.
- Suggestion/example chips arranged in an overflowing, slightly-rotated horizontal scroll row beneath the fold, fading at container edges — a distinctive layout signature to reuse for feature highlights, testimonials, or example prompts.

## Components
- **Buttons:**
  - Primary: solid lime \`#D4F547\` fill, black text, fully rounded (border-radius 9999px / pill), medium padding (12px 24px), no shadow — flat and confident.
  - Secondary/ghost: transparent fill, 1px \`#3A3A3A\` border, off-white text, rounded-pill, hover fills to \`#1C1C1C\`.
  - Dark solid button (for secondary contexts on light sections, if any): black fill, white text, pill shape.
- **Inputs:** Dark surface \`#161616\`, 1px \`#2A2A2A\` border, rounded-full or rounded-xl (12–16px), lime border-glow on focus, inline icon (mail, search) in muted gray at left.
- **Cards/Chips:** Rounded-full or rounded-2xl pill containers, \`#161616\` background at ~70% opacity, subtle 1px white/10% border, small sparkle icon + text, slight scale/opacity fade at row edges to suggest infinite scroll.
- **Nav:** Transparent/dark, logo + wordmark left, dropdown menu items with chevrons, right-aligned button pair (outlined "Sign in", solid lime "Get access"). Sticky on scroll with slight background blur.
- **Radii:** Pills (9999px) for buttons/chips/inputs; 16–24px rounded corners for larger cards/panels.
- **Shadows:** Minimal — rely on borders and subtle glow instead of drop shadows, keeping the dark UI flat and modern. A soft lime glow (\`box-shadow: 0 0 24px rgba(212,245,71,0.25)\`) is reserved for primary CTA hover only.

## Motion & Effects
- Hero headline uses a subtle typewriter/cursor-blink cue — apply this to rotating value props in the H1.
- Suggestion chips auto-scroll horizontally at a slow, continuous marquee speed, pausing on hover.
- Buttons: 150ms ease-out transitions on background-color, border-color, and transform (translateY(-1px) on hover for lift).
- Focus states: lime ring (2px, \`#D4F547\` at 60% opacity) on inputs and interactive elements for accessibility and brand consistency.
- Section reveals: fade + slide-up (16px) on scroll, staggered by 60–80ms per element — restrained, not bouncy, matching the serious fintech tone.

## Imagery & Iconography
- No photography in the hero — rely entirely on typography, color, and UI chips to create visual interest.
- Iconography: simple, single-weight line icons (mail envelope, sparkle/AI stars, chevrons, arrows) in muted gray or lime, 20–24px, stroke-width ~1.5px.
- Inline glyphs (diamond, arrow, sparkle) can punctuate headlines as decorative elements between words, rendered in lime or off-white to fit the dark theme.
- Any product screenshots or diagrams should live on dark \`#161616\` cards with soft internal glow, never full-bleed light panels, to preserve the cohesive dark mood.

## Your Additions
The direction here — a fintech/legal-grade trust palette carrying bold editorial typography — is realized by keeping the dark canvas, the single lime accent, the floating chip rows and the centered hero as the structural and chromatic backbone, while type-scale discipline (huge but medium-weight, never heavy) lifts the headline system beyond a typical SaaS template. No conflicting instructions were given for components or motion, so those were designed from scratch in a manner consistent with the same minimalism and confidence.
`;
