// Render the Chrome Web Store graphic assets.
//
//   node scripts/build-store-assets.mjs
//
// Writes extension/store-assets/. Screenshots are not generated here — those
// have to be taken from a real, signed-in library.
//
// The display face in the app is Bricolage Grotesque, which Next fetches at
// build time rather than installing, so it isn't available to the renderer.
// These use Avenir Next as a stand-in: right weight and warmth, wrong
// personality. Treat them as drafts to refine, not finals.

import fs from "node:fs";
import sharp from "sharp";

const OUT = "extension/store-assets";
fs.mkdirSync(OUT, { recursive: true });

// Brand, from src/app/globals.css
const INK = "#221C15";
const BRAND = "#8D6F4C";
const TINT = "#F1EBE0";
const CREAM = "#FBFAF7";

const DISPLAY = "Avenir Next, Helvetica Neue, Helvetica, sans-serif";

// The snapp mark, from public/logo.svg — two offset cards, the second
// overlapping like a stack of saved pages.
const mark = (fill1, fill2) => `
  <path d="M31.6442 3.07696C32.622 3.22502 33.3448 4.06548 33.3448 5.05441L33.3448 18.8127L11.3252 16.6727L11.3252 4.9504e-07L31.6442 3.07696Z" fill="${fill1}"/>
  <path d="M22.0196 16.6727L22.0196 33.347L1.70041 30.2685C0.72269 30.1204 6.90753e-07 29.28 7.33978e-07 28.2911L1.33541e-06 14.532L22.0196 16.6727Z" fill="${fill2}"/>`;

async function render(name, width, height, svg) {
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}.png`);
  const { size } = fs.statSync(`${OUT}/${name}.png`);
  console.log(`${name}.png  ${width}×${height}  ${(size / 1024).toFixed(1)} KB`);
}

/* Store icon — 128×128. The store's own guidance is that the artwork should sit
   in roughly the middle 96×96 with padding around it, because the store frames
   the icon differently from the browser toolbar. The packaged toolbar icon
   fills its canvas, so this is a separate, padded rendering. */
await render(
  "store-icon",
  128,
  128,
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
     <rect width="128" height="128" rx="26" fill="${TINT}"/>
     <g transform="translate(30,30) scale(2.0)">${mark(INK, BRAND)}</g>
   </svg>`
);

/* Small promo tile — 440×280. Shown in store placements and required to be
   considered for featuring. Dark, because these sit on a white store surface
   and everything else there is light. Minimal text: the store prints the name
   and summary next to it anyway, so repeating them wastes the space. */
await render(
  "small-promo-tile",
  440,
  280,
  `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280">
     <defs>
       <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
         <stop offset="0" stop-color="${BRAND}" stop-opacity="0.30"/>
         <stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="440" height="280" fill="${INK}"/>
     <rect x="150" y="-190" width="480" height="480" fill="url(#glow)"/>
     <g transform="translate(48,52) scale(1.9)">${mark(CREAM, BRAND)}</g>
     <text x="48" y="188" font-family="${DISPLAY}" font-size="42" font-weight="600" fill="${CREAM}">Snapp</text>
     <text x="48" y="222" font-family="${DISPLAY}" font-size="18" font-weight="500" fill="${TINT}" opacity="0.70">Bookmarks that stay alive</text>
   </svg>`
);

/* Marquee promo tile — 1400×560. Only used if the store features you, so it's
   optional; supplying it is what makes being featured possible. Same idea,
   composed for the wider crop rather than scaled up from the small one. */
await render(
  "marquee-promo-tile",
  1400,
  560,
  `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560">
     <defs>
       <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
         <stop offset="0" stop-color="${BRAND}" stop-opacity="0.34"/>
         <stop offset="1" stop-color="${BRAND}" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="1400" height="560" fill="${INK}"/>
     <rect x="740" y="-330" width="1220" height="1220" fill="url(#glow)"/>
     <g transform="translate(120,168) scale(3.4)">${mark(CREAM, BRAND)}</g>
     <text x="340" y="272" font-family="${DISPLAY}" font-size="82" font-weight="600" fill="${CREAM}">Snapp</text>
     <text x="344" y="332" font-family="${DISPLAY}" font-size="30" font-weight="500" fill="${TINT}" opacity="0.70">Bookmarks that stay alive — not screenshots of them</text>
   </svg>`
);

console.log(`\nwritten to ${OUT}/`);
