import puppeteer, { Browser, Page } from "puppeteer-core";
import puppeteerFull from "puppeteer";
import chromium from "@sparticuz/chromium-min";
import Color from "color";
import namer from "color-namer";
import { ExtractedFont, ExtractedColor, ScanResult } from "@/types";

const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH ||
  "https://github.com/niceprogrammer2022/niceprogrammer-chromium-113/releases/download/v0.0.1/chromium-v113.0.0-pack.tar";

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
    defaultViewport: { width: 1280, height: 800 },
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

export async function analyzePage(url: string): Promise<ScanResult> {
  let browser: Browser | null = null;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to URL - use domcontentloaded for faster loading, then wait for network
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Try to wait for network idle, but don't fail if it times out
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch {
      // Network didn't fully settle, continue anyway
    }

    // Wait a bit for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    // Extract fonts and colors
    const [fonts, colors] = await Promise.all([
      extractFontsFromPage(page),
      extractColorsFromPage(page),
    ]);

    return {
      screenshot: Buffer.from(screenshot),
      fonts,
      colors,
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
