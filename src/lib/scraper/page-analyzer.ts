import puppeteer, { Browser, Page } from "puppeteer-core";
import puppeteerFull from "puppeteer";
import chromium from "@sparticuz/chromium-min";
import Color from "color";
import namer from "color-namer";
import { ExtractedFont, ExtractedColor, ScanResult } from "@/types";

const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH ||
  "https://github.com/niceprogrammer2022/niceprogrammer-chromium-113/releases/download/v0.0.1/chromium-v113.0.0-pack.tar";

// System fonts to detect
const SYSTEM_FONTS = [
  "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI",
  "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Liberation Sans",
  "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
  "Noto Color Emoji", "serif", "monospace", "cursive", "fantasy",
  "Georgia", "Times New Roman", "Times", "Courier New", "Courier",
  "Verdana", "Tahoma", "Trebuchet MS", "Impact", "Comic Sans MS"
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

interface FontInfo {
  family: string;
  weight: string;
  element: string;
}

interface ColorInfo {
  color: string;
  context: string;
  count: number;
}

async function extractFontsFromPage(page: Page): Promise<ExtractedFont[]> {
  const fontData = await page.evaluate(() => {
    const fonts: FontInfo[] = [];
    const elements = document.querySelectorAll("*");

    elements.forEach((el) => {
      const computedStyle = window.getComputedStyle(el);
      const fontFamily = computedStyle.fontFamily;
      const fontWeight = computedStyle.fontWeight;
      const tagName = el.tagName.toLowerCase();

      if (fontFamily) {
        // Extract primary font family
        const primaryFont = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
        fonts.push({
          family: primaryFont,
          weight: fontWeight,
          element: tagName,
        });
      }
    });

    // Check for @font-face rules
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const rules = styleSheets[i].cssRules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule instanceof CSSFontFaceRule) {
              const family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "");
              const weight = rule.style.getPropertyValue("font-weight") || "400";
              fonts.push({ family, weight, element: "@font-face" });
            }
          }
        }
      } catch {
        // CORS restrictions on external stylesheets
      }
    }

    return fonts;
  });

  // Check for Google Fonts links
  const googleFontsUsed = await page.evaluate(() => {
    const links = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    const families: string[] = [];
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href) {
        const match = href.match(/family=([^&]+)/);
        if (match) {
          families.push(...match[1].split("|").map((f) => f.split(":")[0].replace(/\+/g, " ")));
        }
      }
    });
    return families;
  });

  // Aggregate and deduplicate fonts
  const fontMap = new Map<string, { weights: Set<string>; usage: string; isGoogle: boolean }>();

  fontData.forEach(({ family, weight, element }) => {
    const existing = fontMap.get(family) || {
      weights: new Set<string>(),
      usage: "other",
      isGoogle: googleFontsUsed.includes(family),
    };
    existing.weights.add(weight);

    // Determine usage based on element
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(element)) {
      existing.usage = "heading";
    } else if (["p", "span", "div", "li", "a"].includes(element) && existing.usage !== "heading") {
      existing.usage = "body";
    } else if (["code", "pre", "kbd"].includes(element)) {
      existing.usage = "code";
    }

    fontMap.set(family, existing);
  });

  const result: ExtractedFont[] = [];
  fontMap.forEach((data, family) => {
    // Determine font source
    let source: "google" | "system" | "custom" = "custom";
    if (data.isGoogle || googleFontsUsed.includes(family)) {
      source = "google";
    } else if (SYSTEM_FONTS.some((sf) => sf.toLowerCase() === family.toLowerCase())) {
      source = "system";
    }

    result.push({
      family,
      weights: Array.from(data.weights).sort(),
      source,
      usage: data.usage as ExtractedFont["usage"],
    });
  });

  // Sort by usage importance
  return result
    .filter((f) => f.family && f.family !== "inherit")
    .sort((a, b) => {
      const order = { heading: 0, body: 1, code: 2, other: 3 };
      return order[a.usage] - order[b.usage];
    })
    .slice(0, 10); // Limit to top 10 fonts
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

  // Sort by frequency and limit
  return result
    .filter((c) => {
      // Filter out pure white/black/transparent
      const { r, g, b } = c.rgb;
      return !(
        (r === 255 && g === 255 && b === 255) ||
        (r === 0 && g === 0 && b === 0) ||
        (r === 0 && g === 0 && b === 0 && c.hex === "#000000")
      );
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20); // Limit to top 20 colors
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

    // Navigate to URL with timeout
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
