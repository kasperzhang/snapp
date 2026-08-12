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
fs.mkdirSync(`${OUT}/variants`, { recursive: true });

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
/* Tagline candidates, rendered small-tile-size so they can be compared as
   pictures rather than as sentences. The chosen one gets promoted into the
   real tiles below. All four are the landing page's own voice — the store
   forbids superlative claims ("best", "#1") in promo art anyway. */
const CANDIDATES = {
  a: { lines: ["Keep the sites you wish", "you'd made."], size: 21 },
  b: { lines: ["For designers, and the people", "building with AI."], size: 19 },
  c: { lines: ["Your agent writes the code.", "You bring the taste."], size: 19, em: "taste." },
  d: { lines: ["Make it look like that."], size: 24, em: "that." },
};

/* Text is laid out by hand here, so the only guard against a line running off
   the canvas is arithmetic: Avenir Next averages a hair over half its point
   size per character in mixed case, and the tile has 344px between the margins.
   Overflowing silently is the failure mode — b did exactly that on the first
   pass — so it's checked rather than eyeballed. */
const SAFE_WIDTH = 344;
function fits(line, size) {
  return line.length * size * 0.53 <= SAFE_WIDTH;
}

for (const [key, { lines, size, em }] of Object.entries(CANDIDATES)) {
  for (const line of lines) {
    if (!fits(line, size)) {
      throw new Error(
        `variant ${key}: "${line}" is too wide at ${size}px — shorten it or drop a point size`
      );
    }
  }

  const rows = lines
    .map((line, i) => {
      const html = em
        ? line.replace(
            em,
            `<tspan font-style="italic" fill="${BRAND}">${em}</tspan>`
          )
        : line;
      return `<text x="48" y="${210 + i * (size + 8)}" font-family="${DISPLAY}" font-size="${size}" font-weight="500" fill="${TINT}" opacity="0.74">${html}</text>`;
    })
    .join("");

  await render(
    `variants/tagline-${key}`,
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
       <g transform="translate(48,46) scale(1.8)">${mark(CREAM, BRAND)}</g>
       <text x="48" y="176" font-family="${DISPLAY}" font-size="40" font-weight="600" fill="${CREAM}">snapp</text>
       ${rows}
     </svg>`
  );
}

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
     <g transform="translate(48,46) scale(1.8)">${mark(CREAM, BRAND)}</g>
     <text x="48" y="176" font-family="${DISPLAY}" font-size="40" font-weight="600" fill="${CREAM}">snapp</text>
     <text x="48" y="210" font-family="${DISPLAY}" font-size="19" font-weight="500" fill="${TINT}" opacity="0.74">Your agent writes the code.</text>
     <text x="48" y="237" font-family="${DISPLAY}" font-size="19" font-weight="500" fill="${TINT}" opacity="0.74">You bring the <tspan font-style="italic" fill="${BRAND}">taste.</tspan></text>
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
     <g transform="translate(122,232) scale(3.4)">${mark(CREAM, BRAND)}</g>
     <text x="340" y="262" font-family="${DISPLAY}" font-size="76" font-weight="600" fill="${CREAM}">Your agent writes the code.</text>
     <text x="340" y="348" font-family="${DISPLAY}" font-size="76" font-weight="600" fill="${CREAM}">You bring the <tspan font-style="italic" fill="${BRAND}">taste.</tspan></text>
     <text x="344" y="410" font-family="${DISPLAY}" font-size="27" font-weight="500" fill="${TINT}" opacity="0.62">snapp — the bookmark app for designers and the people building with AI</text>
   </svg>`
);

console.log(`\nwritten to ${OUT}/`);
