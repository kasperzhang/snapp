import puppeteer, { Browser, Page } from "puppeteer-core";
import puppeteerFull from "puppeteer";
import chromium from "@sparticuz/chromium-min";
import Color from "color";
import namer from "color-namer";
// `import type` matters beyond style here: these are all interfaces, so they
// vanish at runtime. A value import leaves Node looking for exports that the
// compiled module never had, which breaks scripts/scan-preview.mjs.
import type {
  ExtractedFont,
  ExtractedColor,
  ScanResult,
  StyleTokens,
} from "@/types";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

// How many viewport-height bands of a page get sent to the model. Three covers
// hero + the first content sections, where a site's component vocabulary
// (cards, inputs, buttons) actually lives. Each band is ~1,365 image tokens, so
// this is also the per-scan cost ceiling.
const MAX_SCREENSHOT_SECTIONS = 3;

// Production Chromium binary for @sparticuz/chromium-min. Defaults to the
// OFFICIAL Sparticuz release matching the installed `@sparticuz/chromium-min`
// major (v143) — NOT a random third-party repo — to avoid supply-chain risk and
// version mismatch. Override with CHROMIUM_EXECUTABLE_PATH (e.g. a self-hosted
// copy) if you prefer to serve the pack yourself. Keep this URL's version in
// sync with the package version in package.json.
const CHROMIUM_EXECUTABLE_PATH =
  process.env.CHROMIUM_EXECUTABLE_PATH ||
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

// CSS generic font keywords to SKIP (these are not actual font names)
const CSS_GENERIC_KEYWORDS = [
  "system-ui", "-apple-system", "BlinkMacSystemFont",
  "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded",
  "sans-serif", "serif", "monospace", "cursive", "fantasy",
  "emoji", "math", "fangsong", "inherit", "initial", "unset", "revert"
];

// Known system fonts (actual font names, not CSS keywords)
const SYSTEM_FONTS = [
  // Windows
  "Segoe UI", "Segoe UI Variable", "Tahoma", "Verdana", "Trebuchet MS",
  "Lucida Grande", "Lucida Sans Unicode", "Palatino Linotype", "Book Antiqua",
  // macOS/iOS
  "SF Pro", "SF Pro Display", "SF Pro Text", "SF Mono", "New York",
  "Helvetica Neue", "Helvetica", "Apple Color Emoji",
  // Common system fonts
  "Arial", "Arial Black", "Times New Roman", "Times", "Georgia",
  "Courier New", "Courier", "Comic Sans MS", "Impact",
  // Linux
  "Ubuntu", "Cantarell", "Noto Sans", "Liberation Sans", "DejaVu Sans",
  // Android
  "Roboto", "Droid Sans"
];

// Known monospace fonts
const MONOSPACE_FONTS = [
  "JetBrains Mono", "Fira Code", "Source Code Pro", "Monaco", "Menlo",
  "Consolas", "Liberation Mono", "Courier New", "Courier", "SF Mono",
  "IBM Plex Mono", "Inconsolata", "Hack", "Ubuntu Mono", "Roboto Mono",
  "Anonymous Pro", "Cascadia Code", "Cascadia Mono"
];


async function getBrowser(): Promise<Browser> {
  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    // For local development, use puppeteer's bundled Chromium
    return puppeteerFull.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    }) as Promise<Browser>;
  }

  // For Vercel/production - use sparticuz/chromium-min
  const executablePath = await chromium.executablePath(CHROMIUM_EXECUTABLE_PATH);

  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    executablePath,
    headless: true,
    // Default is 180s — the same order as the whole function budget, so a CDP
    // call that never answers takes the platform down with it instead of
    // surfacing as an error we can handle.
    protocolTimeout: 30_000,
  });
}

interface FontUsageData {
  family: string;
  weight: string;
  fontSize: number;
  element: string;
  isHeading: boolean;
  isCode: boolean;
  textLength: number;
}

/* One colour's measured usage. Roles are assigned afterwards from these
   numbers, not claimed at collection time — see extractColorsFromPage. */
interface ColorInfo {
  color: string;
  /** Elements painting this as their background. */
  bg: number;
  /** Total px² those backgrounds cover — a page background dwarfs a swatch. */
  bgArea: number;
  /** Elements that render text in this colour, text-bearing ones only. */
  text: number;
  /** Elements with a real (non-zero-width) border in this colour. */
  border: number;
  /** Declared as a :root custom property, so it's part of the design system
      even if it barely renders. */
  isVar: boolean;
}

interface GoogleFontInfo {
  family: string;
  weights: string[];
}

async function extractFontsFromPage(page: Page): Promise<ExtractedFont[]> {
  // Step 1: Extract Google Fonts from link tags (both v1 and v2 API formats)
  const googleFonts = await page.evaluate(() => {
    const fonts: GoogleFontInfo[] = [];

    // Check link tags
    const links = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]');
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";

      // Google Fonts API v2: family=Font+Name:wght@400;500;700
      const v2Matches = href.matchAll(/family=([^:&]+)(?::wght@([^&]+))?/g);
      for (const match of v2Matches) {
        const family = decodeURIComponent(match[1].replace(/\+/g, " "));
        const weights = match[2] ? match[2].split(";") : ["400"];
        fonts.push({ family, weights });
      }

      // Google Fonts API v1: family=Font+Name:400,500,700
      if (href.includes("family=") && !href.includes(":wght@")) {
        const v1Match = href.match(/family=([^&]+)/);
        if (v1Match) {
          const parts = v1Match[1].split("|");
          parts.forEach((part) => {
            const [name, weightsStr] = part.split(":");
            const family = decodeURIComponent(name.replace(/\+/g, " "));
            const weights = weightsStr ? weightsStr.split(",") : ["400"];
            // Filter out italic indicators
            const cleanWeights = weights.map(w => w.replace(/i$/, "")).filter(w => /^\d+$/.test(w));
            fonts.push({ family, weights: cleanWeights.length ? cleanWeights : ["400"] });
          });
        }
      }
    });

    // Check @import rules in stylesheets
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => {
          if (rule instanceof CSSImportRule && rule.href?.includes("fonts.googleapis.com")) {
            const match = rule.href.match(/family=([^:&]+)(?::wght@([^&]+))?/);
            if (match) {
              const family = decodeURIComponent(match[1].replace(/\+/g, " "));
              const weights = match[2] ? match[2].split(";") : ["400"];
              fonts.push({ family, weights });
            }
          }
        });
      } catch {
        // CORS restriction
      }
    });

    return fonts;
  });

  // Step 2: Extract @font-face declarations
  const fontFaceDeclarations = await page.evaluate(() => {
    const declarations: { family: string; weight: string; src: string }[] = [];

    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => {
          if (rule instanceof CSSFontFaceRule) {
            const family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
            const weight = rule.style.getPropertyValue("font-weight") || "400";
            const src = rule.style.getPropertyValue("src") || "";
            if (family) {
              declarations.push({ family, weight, src });
            }
          }
        });
      } catch {
        // CORS restriction
      }
    });

    return declarations;
  });

  // Step 3: Analyze actual font usage on the page
  const fontUsageData = await page.evaluate((cssGenericKeywords: string[]) => {
    const usageData: FontUsageData[] = [];
    const processedElements = new Set<Element>();

    // Helper to check if font is a CSS generic keyword
    const isGenericKeyword = (font: string) => {
      return cssGenericKeywords.some(kw => kw.toLowerCase() === font.toLowerCase());
    };

    // Helper to extract actual font from font-family stack
    const extractRealFont = (fontFamily: string): string | null => {
      const fonts = fontFamily.split(",").map(f => f.trim().replace(/['"]/g, ""));
      for (const font of fonts) {
        if (!isGenericKeyword(font) && font !== "inherit" && font !== "initial") {
          return font;
        }
      }
      return null;
    };

    // Process important text elements
    const textSelectors = [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "span", "a", "li", "td", "th", "label",
      "button", "input", "textarea",
      "code", "pre", "kbd", "samp",
      "blockquote", "figcaption", "cite",
      "[class*='title']", "[class*='heading']", "[class*='text']",
      "[class*='body']", "[class*='content']", "[class*='paragraph']"
    ];

    textSelectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          if (processedElements.has(el)) return;

          // Only process elements with actual text content
          const text = el.textContent?.trim() || "";
          if (text.length < 2) return;

          processedElements.add(el);

          const computedStyle = window.getComputedStyle(el);
          const fontFamily = computedStyle.fontFamily;
          const realFont = extractRealFont(fontFamily);

          if (!realFont) return;

          const weight = computedStyle.fontWeight;
          const fontSize = parseFloat(computedStyle.fontSize);
          const tagName = el.tagName.toLowerCase();
          const isHeading = /^h[1-6]$/.test(tagName) || fontSize >= 24;
          const isCode = ["code", "pre", "kbd", "samp"].includes(tagName) ||
                        fontFamily.toLowerCase().includes("mono") ||
                        computedStyle.fontFamily.toLowerCase().includes("code");

          usageData.push({
            family: realFont,
            weight,
            fontSize,
            element: tagName,
            isHeading,
            isCode,
            textLength: text.length,
          });
        });
      } catch {
        // Invalid selector
      }
    });

    return usageData;
  }, CSS_GENERIC_KEYWORDS);

  // Step 4: Aggregate and analyze font data
  const fontMap = new Map<string, {
    weights: Set<string>;
    usageScore: { heading: number; body: number; code: number };
    isGoogle: boolean;
    isFontFace: boolean;
    totalTextLength: number;
  }>();

  // Build Google Fonts lookup
  const googleFontNames = new Set(googleFonts.map(gf => gf.family.toLowerCase()));
  const googleFontWeights = new Map<string, Set<string>>();
  googleFonts.forEach(gf => {
    const key = gf.family.toLowerCase();
    if (!googleFontWeights.has(key)) {
      googleFontWeights.set(key, new Set());
    }
    gf.weights.forEach(w => googleFontWeights.get(key)?.add(w));
  });

  // Build font-face lookup
  const fontFaceNames = new Set(fontFaceDeclarations.map(ff => ff.family.toLowerCase()));
  const fontFaceWeights = new Map<string, Set<string>>();
  fontFaceDeclarations.forEach(ff => {
    const key = ff.family.toLowerCase();
    if (!fontFaceWeights.has(key)) {
      fontFaceWeights.set(key, new Set());
    }
    fontFaceWeights.get(key)?.add(ff.weight);
  });

  // Process usage data
  fontUsageData.forEach((usage) => {
    const familyLower = usage.family.toLowerCase();
    const existing = fontMap.get(familyLower) || {
      weights: new Set<string>(),
      usageScore: { heading: 0, body: 0, code: 0 },
      isGoogle: googleFontNames.has(familyLower),
      isFontFace: fontFaceNames.has(familyLower),
      totalTextLength: 0,
    };

    existing.weights.add(usage.weight);
    existing.totalTextLength += usage.textLength;

    // Score usage based on context
    if (usage.isCode) {
      existing.usageScore.code += usage.textLength;
    } else if (usage.isHeading) {
      existing.usageScore.heading += usage.textLength;
    } else {
      existing.usageScore.body += usage.textLength;
    }

    fontMap.set(familyLower, existing);
  });

  // Add Google Font weights that might not be detected in usage
  googleFonts.forEach(gf => {
    const key = gf.family.toLowerCase();
    const existing = fontMap.get(key);
    if (existing) {
      gf.weights.forEach(w => existing.weights.add(w));
    }
  });

  // Step 5: Build final result
  const result: ExtractedFont[] = [];

  fontMap.forEach((data, familyLower) => {
    // Find the proper-cased family name
    let properFamily = familyLower;

    // Check Google Fonts for proper casing
    const googleMatch = googleFonts.find(gf => gf.family.toLowerCase() === familyLower);
    if (googleMatch) {
      properFamily = googleMatch.family;
    }

    // Check font-face for proper casing
    const fontFaceMatch = fontFaceDeclarations.find(ff => ff.family.toLowerCase() === familyLower);
    if (fontFaceMatch) {
      properFamily = fontFaceMatch.family;
    }

    // Capitalize first letter of each word as fallback
    if (properFamily === familyLower) {
      properFamily = familyLower.split(" ").map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ");
    }

    // Determine source
    let source: "google" | "system" | "custom" = "custom";
    if (data.isGoogle) {
      source = "google";
    } else if (SYSTEM_FONTS.some(sf => sf.toLowerCase() === familyLower)) {
      source = "system";
    } else if (data.isFontFace) {
      source = "custom";
    }

    // Determine primary usage
    const { heading, body, code } = data.usageScore;
    let usage: "heading" | "body" | "code" | "other" = "other";

    // Check if it's a monospace font
    if (MONOSPACE_FONTS.some(mf => mf.toLowerCase() === familyLower) || code > 0) {
      usage = "code";
    } else if (heading > body && heading > 0) {
      usage = "heading";
    } else if (body > 0) {
      usage = "body";
    }

    // Sort and normalize weights
    const weights = Array.from(data.weights)
      .map(w => {
        // Normalize weight values
        const num = parseInt(w);
        if (!isNaN(num)) return String(num);
        // Convert named weights
        const namedWeights: Record<string, string> = {
          "normal": "400", "regular": "400", "bold": "700",
          "light": "300", "medium": "500", "semibold": "600", "extrabold": "800"
        };
        return namedWeights[w.toLowerCase()] || "400";
      })
      .filter((w, i, arr) => arr.indexOf(w) === i) // dedupe
      .sort((a, b) => parseInt(a) - parseInt(b));

    result.push({
      family: properFamily,
      weights: weights.length > 0 ? weights : ["400"],
      source,
      usage,
    });
  });

  // Sort by importance: heading > body > code > other, then by text length
  return result
    .sort((a, b) => {
      const order = { heading: 0, body: 1, code: 2, other: 3 };
      const orderDiff = order[a.usage] - order[b.usage];
      if (orderDiff !== 0) return orderDiff;

      // Secondary sort by whether it's a Google/custom font (more interesting)
      if (a.source !== b.source) {
        const sourceOrder = { google: 0, custom: 1, system: 2 };
        return sourceOrder[a.source] - sourceOrder[b.source];
      }

      return 0;
    })
    .slice(0, 10);
}

/**
 * Reads border-radius, box-shadow and the spacing rhythm off the live DOM.
 *
 * These three are demanded by the guide template but were never scraped, so the
 * model guessed them from one above-the-fold screenshot. One DOM pass covers all
 * three; elements are classified by tag/role so the guide can say "cards use
 * 16px" rather than quoting a single global number.
 */
async function extractStyleTokensFromPage(page: Page): Promise<StyleTokens> {
  return page.evaluate(() => {
    type Bucket = Map<string, { count: number; context: string }>;
    const radii: Bucket = new Map();
    const shadows: Bucket = new Map();
    const spacing = new Map<string, { count: number; property: string }>();
    // key: "duration easing|property" so one row reads "150ms ease-out on
    // background-color" rather than collapsing every property into one number.
    const transitions = new Map<
      string,
      { count: number; value: string; property: string; context: string }
    >();

    /* What kind of thing is this, for "8px on inputs, 16px on cards"?
       Class names alone answered "other" for nearly everything: hashed and
       utility class names carry no such words, so a whole site's radii came
       back unlabelled and the guide had to guess which value belonged to what.
       Structure is the fallback — an element painting its own background,
       distinct from the page's, is a surface, and its size says which kind. */
    const pageBg = window.getComputedStyle(document.body).backgroundColor;

    const classify = (
      el: Element,
      style: CSSStyleDeclaration,
      rect: DOMRect
    ): string => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute("class") || "").toLowerCase();
      if (tag === "button" || el.getAttribute("role") === "button" || /\bbtn\b|button/.test(cls))
        return "button";
      if (tag === "input" || tag === "textarea" || tag === "select") return "input";
      if (tag === "img" || tag === "picture" || tag === "video" || tag === "svg") return "image";
      if (/card|tile|panel|item/.test(cls)) return "card";

      const bg = style.backgroundColor;
      const isSurface =
        bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== pageBg;
      if (isSurface) {
        // Small and wide-ish reads as a control; large reads as a panel.
        if (rect.height <= 64 && rect.width <= 380) return "button";
        if (rect.width >= 140 && rect.height >= 80) return "card";
      }
      if (tag === "a" && isSurface) return "button";
      return "other";
    };

    // Only elements that actually render — a hidden element's styles say nothing
    // about the design, and they badly skew the frequency counts.
    const visible = Array.from(document.querySelectorAll("*")).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      const s = window.getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
    });

    const bump = (m: Bucket, key: string, context: string) => {
      const cur = m.get(key);
      if (cur) {
        cur.count += 1;
        if (cur.context === "other" && context !== "other") cur.context = context;
      } else m.set(key, { count: 1, context });
    };

    for (const el of visible) {
      const s = window.getComputedStyle(el);
      const kind = classify(el, s, el.getBoundingClientRect());

      // Radius. Rounded corners often differ per corner; take the top-left as
      // representative but skip elements whose corners disagree wildly.
      const tl = s.borderTopLeftRadius;
      if (tl && tl !== "0px" && !tl.includes("%")) {
        const px = parseFloat(tl);
        // A pill is any radius at least half the box's shorter side.
        const r = el.getBoundingClientRect();
        const isPill = px >= Math.min(r.width, r.height) / 2 - 1;
        bump(radii, isPill ? "9999px" : `${Math.round(px)}px`, kind);
      }
      // 0px is deliberately NOT counted. It's the CSS default, so every icon,
      // svg and wrapper div votes for it — on a real site that buries the
      // handful of genuine radius decisions under hundreds of non-decisions,
      // and tells the model the design is square-cornered when it isn't.
      // An empty radii list already means "nothing is rounded".

      /* Transitions are the only part of motion a static page will admit to:
         the duration and curve are sitting in the computed style whether or
         not anything is moving right now. Zero-duration entries are the CSS
         default on every element, so counting those would bury the handful of
         real decisions exactly as 0px radii used to. */
      /* Splitting on every comma tears `cubic-bezier(0.16, 1, 0.3, 1)` into
         four fragments and pairs them with the wrong properties, so the depth
         counter keeps parenthesised easings intact. */
      const splitTop = (v: string) => {
        const out: string[] = [];
        let depth = 0;
        let cur = "";
        for (const ch of v) {
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          if (ch === "," && depth === 0) {
            out.push(cur.trim());
            cur = "";
          } else cur += ch;
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
      };
      const dur = splitTop(s.transitionDuration);
      const ease = splitTop(s.transitionTimingFunction);
      const props = splitTop(s.transitionProperty);
      dur.forEach((d, i) => {
        const ms = d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000;
        /* Under one frame is not a decision anyone made: it's either the
           reduced-motion reset (0.01ms) or a rounding artefact, and neither is
           motion a person would notice. */
        if (!ms || ms < 16) return;
        const prop = props[i] ?? props[0] ?? "all";
        if (prop === "none") return;
        const value = `${Math.round(ms)}ms ${ease[i] ?? ease[0] ?? "ease"}`;
        const key = `${value}|${prop}`;
        const cur = transitions.get(key);
        if (cur) {
          cur.count += 1;
          if (cur.context === "other" && kind !== "other") cur.context = kind;
        } else {
          transitions.set(key, { count: 1, value, property: prop, context: kind });
        }
      });

      const sh = s.boxShadow;
      if (sh && sh !== "none") {
        bump(shadows, sh, kind === "input" || kind === "image" ? "other" : kind);
      }

      // Spacing rhythm: the vertical gaps that actually set the page's rhythm.
      for (const [prop, raw] of [
        ["padding", s.paddingTop],
        ["margin", s.marginBottom],
        ["gap", s.rowGap],
      ] as const) {
        const px = parseFloat(raw);
        if (!Number.isFinite(px) || px <= 0 || px > 400) continue;
        const key = `${Math.round(px)}px`;
        const cur = spacing.get(`${prop}:${key}`);
        if (cur) cur.count += 1;
        else spacing.set(`${prop}:${key}`, { count: 1, property: prop });
      }
    }

    const topRadii = [...radii.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([value, d]) => ({
        value,
        px: value === "9999px" ? 9999 : parseFloat(value),
        frequency: d.count,
        context: d.context,
      }));

    const topShadows = [...shadows.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([value, d]) => ({ value, frequency: d.count, context: d.context }));

    const topSpacing = [...spacing.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([k, d]) => {
        const value = k.split(":")[1];
        return { value, px: parseFloat(value), frequency: d.count, property: d.property };
      });

    /* Running animations, read straight off the Web Animations API — this
       covers CSS animations, CSS transitions and anything Framer or GSAP is
       driving. An infinite iteration count is a marquee or a spinner, which is
       a different design decision from a one-shot reveal, so it's kept. */
    const anims = new Map<string, number>(
      Object.entries(
        (window as unknown as { __snappMotion?: Record<string, number> })
          .__snappMotion ?? {}
      )
    );
    for (const a of document.getAnimations()) {
      try {
        const t = a.effect?.getTiming?.();
        if (!t) continue;
        const ms = typeof t.duration === "number" ? Math.round(t.duration) : 0;
        if (!ms) continue;
        const loop = t.iterations === Infinity;
        const label = `${ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`} ${
          t.easing ?? "linear"
        }${loop ? ", looping" : ""}`;
        anims.set(label, (anims.get(label) ?? 0) + 1);
      } catch {
        /* an animation that refuses to describe itself */
      }
    }

    const rootScroll = window.getComputedStyle(document.documentElement).scrollBehavior;
    const bodyScroll = window.getComputedStyle(document.body).scrollBehavior;

    const topTransitions = [...transitions.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => ({
        value: t.value,
        property: t.property,
        frequency: t.count,
        context: t.context,
      }));

    const topAnimations = [...anims.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, frequency]) => ({ value, frequency }));

    return {
      radii: topRadii,
      shadows: topShadows,
      spacing: topSpacing,
      motion: {
        transitions: topTransitions,
        animations: topAnimations,
        smoothScroll: rootScroll === "smooth" || bodyScroll === "smooth",
      },
    };
  }) as Promise<StyleTokens>;
}

/* What a colour is FOR, decided by how the page uses it.
 *
 * This used to label every :root custom property "accent" and let that label
 * win unconditionally over anything measured — so on a site that declares
 * `--bg: #FAF9F5`, the page background was reported as an accent, while the
 * actual terracotta accent (rare, so it lost the top-5 cut) came through as
 * "other". A guide built on that mislabels roles no matter how carefully the
 * prompt asks: it was told the background was an accent.
 *
 * Now nothing claims a role at collection time. Elements report how they use a
 * colour — as a background (weighted by the area it covers), as text, as a real
 * border — and roles are assigned from those counts afterwards. */
async function extractColorsFromPage(page: Page): Promise<ExtractedColor[]> {
  const colorData = await page.evaluate(() => {
    const usage = new Map<string, ColorInfo>();
    const touch = (color: string): ColorInfo => {
      let u = usage.get(color);
      if (!u) {
        u = { color, bg: 0, bgArea: 0, text: 0, border: 0, isVar: false };
        usage.set(color, u);
      }
      return u;
    };

    const visible = Array.from(document.querySelectorAll("*")).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      const s = window.getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
    });

    for (const el of visible) {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();

      const bg = s.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const u = touch(bg);
        u.bg += 1;
        u.bgArea += Math.max(0, r.width) * Math.max(0, r.height);
      }

      /* Only elements that actually render text. Every wrapper div inherits a
         colour it never paints, and counting those made the body colour look
         thousands of times more common than it is while burying real ones. */
      const hasText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 0
      );
      if (hasText && s.color) touch(s.color).text += 1;

      /* Likewise borderColor is defined even at zero width, and it defaults to
         the text colour — so reading it unconditionally gave every element on
         the page a phantom vote for a border it doesn't have. */
      const bw =
        parseFloat(s.borderTopWidth) +
        parseFloat(s.borderRightWidth) +
        parseFloat(s.borderBottomWidth) +
        parseFloat(s.borderLeftWidth);
      if (bw > 0 && s.borderTopColor && s.borderTopColor !== "rgba(0, 0, 0, 0)") {
        touch(s.borderTopColor).border += 1;
      }
    }

    // Design-system colours, kept as candidates even when they barely render.
    const rootStyles = getComputedStyle(document.documentElement);
    const cssVars = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).flatMap((rule) => {
          if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
            const props: string[] = [];
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith("--")) props.push(prop);
            }
            return props;
          }
          return [];
        });
      } catch {
        return [];
      }
    });
    cssVars.forEach((varName) => {
      const value = rootStyles.getPropertyValue(varName).trim();
      if (value && (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl"))) {
        touch(value).isVar = true;
      }
    });

    return Array.from(usage.values());
  });

  // ── parse, merge by hex ───────────────────────────────────────────────────
  interface Measured extends Omit<ColorInfo, "color"> {
    hex: string;
    rgb: { r: number; g: number; b: number };
    saturation: number;
    lightness: number;
  }
  const byHex = new Map<string, Measured>();

  for (const u of colorData) {
    try {
      const parsed = Color(u.color);
      if (parsed.alpha() < 0.5) continue; // near-transparent says nothing
      const hex = parsed.hex().toUpperCase();
      const rgb = parsed.rgb().object();
      const hsl = parsed.hsl().object();
      const cur = byHex.get(hex);
      if (cur) {
        cur.bg += u.bg;
        cur.bgArea += u.bgArea;
        cur.text += u.text;
        cur.border += u.border;
        cur.isVar = cur.isVar || u.isVar;
      } else {
        byHex.set(hex, {
          hex,
          rgb: {
            r: Math.round(rgb.r),
            g: Math.round(rgb.g),
            b: Math.round(rgb.b),
          },
          saturation: hsl.s / 100,
          lightness: hsl.l / 100,
          bg: u.bg,
          bgArea: u.bgArea,
          text: u.text,
          border: u.border,
          isVar: u.isVar,
        });
      }
    } catch {
      /* unparseable colour value */
    }
  }

  const all = Array.from(byHex.values());
  const weight = (c: Measured) => c.bg + c.text + c.border;
  const max = (pick: (c: Measured) => number) =>
    Math.max(1, ...all.map(pick));
  const maxArea = max((c) => c.bgArea);
  /* Backgrounds are painted by a handful of elements covering most of the
     screen, while text is painted by hundreds covering very little — so
     comparing raw element counts hands every argument to text, and the page's
     own paper colour comes back labelled as type. Area is converted into the
     same currency: the colour covering the most ground gets as many votes as
     the busiest text colour has elements. */
  const maxCount = max((c) => Math.max(c.text, c.border));

  /* Each colour is judged on its own usage, not ranked against the others for
     a fixed number of slots. Plenty of colours are honestly two things — an ink
     that also backs an inverted section, a paper that also sets type on one —
     and a global top-N with exclusivity gave the whole page to whichever role
     happened to be assigned first: text-first left the site with no background
     at all, background-first left it with no ink. Comparing a colour's own
     shares picks the role it mostly plays and lets every role be filled. */
  /* A colour can honestly be two things — an ink that also backs an inverted
     section, a paper that also sets type on one — and every single-label
     scheme tried here lost the half that mattered: label the ink "background"
     and the guide thinks the body text is the muted grey; label it "text" and
     the site appears to have no dark section. So each colour reports every
     role it materially plays, and the same hex may appear twice under
     different roles. That is what the page actually does. */
  const roles = (c: Measured): ExtractedColor["context"][] => {
    const out: ExtractedColor["context"][] = [];
    const floor = Math.max(2, maxCount * 0.04);
    const bgVotes = (c.bgArea / maxArea) * maxCount;

    /* 0.4, not 0.25: warm neutrals are less unsaturated than they look. The
       beige card surface on a paper-coloured site measures ~0.29 and came
       through as an accent, which is the exact confusion this function exists
       to prevent. The terracotta it should have found sits at ~0.63. */
    if (
      c.saturation >= 0.4 &&
      c.lightness > 0.12 &&
      c.lightness < 0.92 &&
      c.bgArea < maxArea * 0.25
    ) {
      out.push("accent");
    }
    if (bgVotes >= floor) out.push("background");
    if (c.text >= floor) out.push("text");
    if (c.border >= floor) out.push("border");
    return out.length ? out : ["other"];
  };

  const LIMITS: Record<string, number> = {
    background: 4,
    text: 4,
    accent: 3,
    border: 3,
    other: 5,
  };
  const kept: ExtractedColor[] = [];
  const counts: Record<string, number> = {};
  const rank = (c: Measured, role: string) =>
    role === "background" ? c.bgArea : weight(c);

  const entries = all
    .flatMap((c) => roles(c).map((role) => ({ c, role })))
    // Strongest example of each role first, so the caps keep the best ones —
    // and backgrounds rank by the ground they cover, not by how many elements
    // painted them, or one full-page body loses to a dozen small panels.
    .sort((a, b) => rank(b.c, b.role) - rank(a.c, a.role));

  for (const { c, role } of entries) {
    const n = counts[role] ?? 0;
    if (n >= (LIMITS[role] ?? 4)) continue;
    counts[role] = n + 1;
    kept.push({
      hex: c.hex,
      rgb: c.rgb,
      frequency: weight(c),
      context: role as ExtractedColor["context"],
    });
  }

  const ROLE_ORDER: ExtractedColor["context"][] = [
    "background",
    "text",
    "accent",
    "border",
    "other",
  ];
  return kept
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.context) - ROLE_ORDER.indexOf(b.context) ||
        b.frequency - a.frequency
    )
    .slice(0, 20);
}

/**
 * Snap every in-flight animation to its finished state.
 *
 * Modern sites reveal content on scroll — text fading in word by word, cards
 * rising into place. Capturing a fixed number of milliseconds after scrolling
 * catches those mid-flight: half the sentence rendered, the rest invisible, and
 * the visible half sitting at a transient grey that then pollutes the extracted
 * palette. Waiting longer only moves the race; it doesn't win it.
 *
 * `document.getAnimations()` covers CSS animations, CSS transitions AND the Web
 * Animations API, which is what Framer, GSAP and friends drive their reveals
 * through — so this catches the ones a CSS-only override would miss.
 */
/* Anything talking to a browser page can hang: a webfont that never resolves,
   a CDP call that never answers, a DOM walk over a page with 40,000 nodes.
   Puppeteer's own timeouts don't cover page.evaluate, so an unbounded await
   here means the platform kills the function and the caller sees a 504 — the
   same failure mode the navigation timeout used to cause, one level down.
   Every step that touches the page goes through this. */
function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      );
    }),
  ]);
}

/** Phase timings, so a slow scan says where it went in the logs. */
function phase(label: string, startedAt: number) {
  console.log(`[scan] ${label}: ${Date.now() - startedAt}ms`);
}

async function finishAnimations(page: Page): Promise<void> {
  try {
    await withTimeout(
      page.evaluate(() => {
        /* Record before freezing. This runs repeatedly through the capture, so
           it is the only place a scroll-triggered reveal is ever observable —
           by extraction time every one of them has been finished and dropped
           from getAnimations(). Framer, GSAP and friends drive their reveals
           through this API, so without this the busiest sites measured as the
           stillest. */
        const seen: Record<string, number> = ((
          window as unknown as { __snappMotion?: Record<string, number> }
        ).__snappMotion ??= {});
        for (const animation of document.getAnimations()) {
          try {
            const t = animation.effect?.getTiming?.();
            const ms =
              t && typeof t.duration === "number" ? Math.round(t.duration) : 0;
            if (ms) {
              const label = `${
                ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
              } ${t?.easing ?? "linear"}${
                t?.iterations === Infinity ? ", looping" : ""
              }`;
              seen[label] = (seen[label] ?? 0) + 1;
            }
          } catch {
            /* an animation that refuses to describe itself */
          }
          try {
            // Looping animations (spinners, marquees) never "finish" — calling
            // finish() on one throws. They look the same at any moment anyway.
            const iterations = animation.effect?.getTiming?.().iterations;
            if (iterations === Infinity) continue;
            animation.finish();
          } catch {
            /* some animations refuse to be finished; leave them */
          }
        }
      }),
      4_000,
      "finishAnimations"
    );
  } catch {
    /* page navigated, closed, or too busy — the capture still works */
  }
}

/* A wall-clock deadline for the whole scan, so no single step can spend the
   function's entire budget. Puppeteer's own timeouts used to be the only
   guard, and the navigation one was set to exactly the platform limit — so a
   slow site was killed by Vercel at the same second Puppeteer would have
   thrown, and the caller got a 504 HTML page where it expected JSON instead of
   a real error it could show. Everything below stays strictly inside it. */
export async function analyzePage(
  url: string,
  opts: { deadline?: number } = {}
): Promise<ScanResult> {
  const deadline = opts.deadline ?? Date.now() + 150_000;
  const left = () => deadline - Date.now();
  /* Every bound is also clamped to the time actually remaining, so the sum of
     the individual limits can never exceed the whole. Fixed timeouts alone add
     up to more than the budget on a page that trips all of them at once. */
  const bound = <T,>(work: Promise<T>, ms: number, label: string) =>
    withTimeout(work, Math.max(1_000, Math.min(ms, left() - 3_000)), label);
  let browser: Browser | null = null;

  try {
    const t0 = Date.now();
    // Cold start pulls the Chromium binary over the network; it is not free
    // and it is not bounded by anything else here.
    browser = await bound(getBrowser(), 30_000, "browser launch");
    phase("launch", t0);
    const page = await browser.newPage();
    // Bounds waitForNetworkIdle and friends without repeating a number.
    page.setDefaultTimeout(15_000);

    // Set viewport for consistent screenshots
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Ask the site to skip its entrance choreography. Sites that honour this —
    // Framer and Webflow output do by default — render straight to the final
    // state, which removes the race entirely rather than trying to outwait it.
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);

    // Navigate to URL - use domcontentloaded for faster loading, then wait for
    // network. Capped well under the remaining budget: a site that can't reach
    // domcontentloaded in 25s is not going to produce a usable screenshot, and
    // failing here returns a real error rather than a platform timeout.
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: Math.max(5_000, Math.min(25_000, left() - 30_000)),
    });

    phase("goto", t0);

    // Try to wait for network idle, but don't fail if it times out
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch {
      // Network didn't fully settle, continue anyway
    }

    // Wait a bit for any lazy-loaded content, then let the intro animation
    // (preloader curtain, hero reveal) run out rather than photographing it.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Webfonts render as fallback — or as nothing at all under font-display:
    // block — until they load. Both misreport the typography we're here to read.
    try {
      await bound(
        page.evaluate(() => document.fonts.ready.then(() => undefined)),
        6_000,
        "fonts.ready"
      );
    } catch {
      /* older engines without the Font Loading API — or a font request that
         never settles, which on a font-heavy build means document.fonts.ready
         never resolves and this await would otherwise hang forever */
    }

    await finishAnimations(page);

    // Capture the page as consecutive viewport-height bands rather than one
    // tall image. `fullPage: true` would be downsampled to ~1568px on the long
    // edge by the model APIs, so a 6000px page arrives unreadable; bands stay
    // sharp. WebP q80 keeps each around 120KB (PNG was ~800KB) and both
    // Anthropic and Gemini accept image/webp.
    const sections: Buffer[] = [];
    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    const bands = Math.min(
      MAX_SCREENSHOT_SECTIONS,
      Math.max(1, Math.ceil(pageHeight / VIEWPORT_HEIGHT))
    );

    for (let i = 0; i < bands; i++) {
      // Extraction and upload still have to happen. A partial capture — one
      // band plus real fonts and colors — is worth far more than a timeout.
      if (i > 0 && left() < 25_000) break;
      const y = i * VIEWPORT_HEIGHT;
      await page.evaluate((top) => window.scrollTo(0, top), y);
      // Give IntersectionObserver a beat to fire and lazy images to start...
      await new Promise((resolve) => setTimeout(resolve, 600));
      // ...then jump whatever it started straight to its end state. Without
      // this, a band lands mid-reveal: half a sentence rendered, the rest
      // still transparent.
      await finishAnimations(page);
      // A finished reveal can itself trigger the next one (staggered groups),
      // so settle once more before the shutter.
      await new Promise((resolve) => setTimeout(resolve, 250));
      await finishAnimations(page);
      const shot = await bound(
        page.screenshot({ type: "webp", quality: 80, fullPage: false }),
        12_000,
        `screenshot band ${i}`
      );
      sections.push(Buffer.from(shot));
    }

    phase("bands", t0);

    /* Screenshots want the page still, so the capture above runs under
       prefers-reduced-motion: reduce. Motion has to be measured with it off —
       a site that honours the preference zeroes its own transitions under it,
       and we would faithfully record that the design has no motion. The page
       is already loaded; flipping the media feature just re-evaluates CSS. */
    await page
      .emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "no-preference" },
      ])
      .catch(() => {});

    // Style extraction runs after the scroll-through so lazy content is present.
    // Each walks the whole DOM, which on a very large page is slow enough to
    // matter — and a screenshot with no palette still beats no scan at all, so
    // none of these is allowed to sink the capture.
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    const [fonts, colors, styleTokens] = await Promise.all([
      bound(extractFontsFromPage(page), 12_000, "fonts").catch((e) => {
        console.warn("[scan] font extraction skipped:", e.message);
        return [] as ExtractedFont[];
      }),
      bound(extractColorsFromPage(page), 12_000, "colors").catch((e) => {
        console.warn("[scan] color extraction skipped:", e.message);
        return [] as ExtractedColor[];
      }),
      bound(extractStyleTokensFromPage(page), 12_000, "tokens").catch(
        (e) => {
          console.warn("[scan] token extraction skipped:", e.message);
          return {} as StyleTokens;
        }
      ),
    ]);
    phase("extract", t0);

    return {
      // The hero doubles as the bookmark card's preview image.
      screenshot: sections[0] ?? null,
      sections,
      fonts,
      colors,
      styleTokens,
    };
  } finally {
    // A wedged browser must not hold the function open past its deadline; the
    // sandbox is torn down with the invocation either way.
    if (browser) {
      await withTimeout(browser.close(), 5_000, "browser close").catch(() => {});
    }
  }
}

export function generateColorName(hex: string): string {
  try {
    const names = namer(hex);
    return names.ntc[0]?.name || names.basic[0]?.name || "Unknown";
  } catch {
    return "Unknown";
  }
}

export function generateDesignTokens(
  fonts: ExtractedFont[],
  colors: ExtractedColor[]
): {
  tailwind: { colors: Record<string, string>; fontFamily: Record<string, string[]> };
  cssVariables: Record<string, string>;
  styleDict: Record<string, { value: string; type: string }>;
} {
  // Generate Tailwind config
  const tailwindColors: Record<string, string> = {};
  const tailwindFontFamily: Record<string, string[]> = {};

  colors.forEach((color, index) => {
    const name = generateColorName(color.hex).toLowerCase().replace(/\s+/g, "-");
    const key = `${color.context}-${name}-${index}`;
    tailwindColors[key] = color.hex;
  });

  fonts.forEach((font) => {
    const key = font.usage === "heading" ? "heading" : font.usage === "code" ? "mono" : "sans";
    if (!tailwindFontFamily[key]) {
      tailwindFontFamily[key] = [font.family];
    }
  });

  // Generate CSS variables
  const cssVariables: Record<string, string> = {};
  colors.forEach((color, index) => {
    const name = generateColorName(color.hex).toLowerCase().replace(/\s+/g, "-");
    cssVariables[`--color-${color.context}-${name}-${index}`] = color.hex;
  });

  fonts.forEach((font, index) => {
    cssVariables[`--font-${font.usage}-${index}`] = font.family;
  });

  // Generate Style Dictionary format
  const styleDict: Record<string, { value: string; type: string }> = {};
  colors.forEach((color, index) => {
    const name = generateColorName(color.hex).toLowerCase().replace(/\s+/g, "-");
    styleDict[`color.${color.context}.${name}.${index}`] = {
      value: color.hex,
      type: "color",
    };
  });

  fonts.forEach((font, index) => {
    styleDict[`font.${font.usage}.${index}`] = {
      value: font.family,
      type: "fontFamily",
    };
  });

  return { tailwind: { colors: tailwindColors, fontFamily: tailwindFontFamily }, cssVariables, styleDict };
}
