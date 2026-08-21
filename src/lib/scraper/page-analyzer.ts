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

interface ColorInfo {
  color: string;
  context: string;
  count: number;
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

    const classify = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute("class") || "").toLowerCase();
      if (tag === "button" || el.getAttribute("role") === "button" || /\bbtn\b|button/.test(cls))
        return "button";
      if (tag === "input" || tag === "textarea" || tag === "select") return "input";
      if (tag === "img" || tag === "picture" || tag === "video" || tag === "svg") return "image";
      if (/card|tile|panel|item/.test(cls)) return "card";
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
      const kind = classify(el);

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

    return { radii: topRadii, shadows: topShadows, spacing: topSpacing };
  }) as Promise<StyleTokens>;
}

async function extractColorsFromPage(page: Page): Promise<ExtractedColor[]> {
  const colorData = await page.evaluate(() => {
    const colors: ColorInfo[] = [];
    const elements = document.querySelectorAll("*");

    elements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el);

      // Extract background colors
      const bgColor = computedStyle.backgroundColor;
      if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
        colors.push({ color: bgColor, context: "background", count: 1 });
      }

      // Extract text colors
      const textColor = computedStyle.color;
      if (textColor) {
        colors.push({ color: textColor, context: "text", count: 1 });
      }

      // Extract border colors
      const borderColor = computedStyle.borderColor;
      if (borderColor && borderColor !== "rgba(0, 0, 0, 0)") {
        colors.push({ color: borderColor, context: "border", count: 1 });
      }
    });

    // Check for CSS custom properties (CSS variables)
    const rootStyles = getComputedStyle(document.documentElement);
    const cssVars = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).flatMap((rule) => {
          if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
            const props: string[] = [];
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith("--")) {
                props.push(prop);
              }
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
        colors.push({ color: value, context: "accent", count: 1 });
      }
    });

    return colors;
  });

  // Parse and aggregate colors
  const colorMap = new Map<string, { rgb: { r: number; g: number; b: number }; count: number; context: string }>();

  colorData.forEach(({ color, context, count }) => {
    try {
      const parsed = Color(color);
      const hex = parsed.hex().toUpperCase();
      const rgb = parsed.rgb().object();

      const existing = colorMap.get(hex);
      if (existing) {
        existing.count += count;
        // Prefer more specific contexts
        if (context === "accent" || (context === "background" && existing.context !== "accent")) {
          existing.context = context;
        }
      } else {
        colorMap.set(hex, {
          rgb: { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) },
          count,
          context,
        });
      }
    } catch {
      // Invalid color format
    }
  });

  // Convert to array and sort by frequency
  const result: ExtractedColor[] = [];
  colorMap.forEach((data, hex) => {
    result.push({
      hex,
      rgb: data.rgb,
      frequency: data.count,
      context: data.context as ExtractedColor["context"],
    });
  });

  // Sort and organize colors
  // Keep black and white but mark them appropriately
  const sortedColors = result.sort((a, b) => b.frequency - a.frequency);

  // Separate into categories for better organization
  const categorized: ExtractedColor[] = [];
  const seen = new Set<string>();

  // Add most frequent colors by context
  const contexts = ["background", "text", "accent", "border"];
  contexts.forEach(ctx => {
    sortedColors
      .filter(c => c.context === ctx && !seen.has(c.hex))
      .slice(0, 5)
      .forEach(c => {
        seen.add(c.hex);
        categorized.push(c);
      });
  });

  // Add any remaining important colors
  sortedColors
    .filter(c => !seen.has(c.hex))
    .slice(0, 10)
    .forEach(c => {
      seen.add(c.hex);
      categorized.push({ ...c, context: "other" });
    });

  return categorized.slice(0, 20);
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
async function finishAnimations(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
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
    });
  } catch {
    /* page navigated or closed mid-call — the capture will still work */
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
  let browser: Browser | null = null;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();

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
      timeout: Math.max(8_000, Math.min(25_000, left() - 20_000)),
    });

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
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
    } catch {
      /* older engines without the Font Loading API */
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
      const shot = await page.screenshot({
        type: "webp",
        quality: 80,
        fullPage: false,
      });
      sections.push(Buffer.from(shot));
    }

    // Style extraction runs after the scroll-through so lazy content is present.
    await page.evaluate(() => window.scrollTo(0, 0));
    const [fonts, colors, styleTokens] = await Promise.all([
      extractFontsFromPage(page),
      extractColorsFromPage(page),
      extractStyleTokensFromPage(page),
    ]);

    return {
      // The hero doubles as the bookmark card's preview image.
      screenshot: sections[0] ?? null,
      sections,
      fonts,
      colors,
      styleTokens,
    };
  } finally {
    if (browser) {
      await browser.close();
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
