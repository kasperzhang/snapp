export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  /** Bookmarks carrying this tag across the whole library — not the page. */
  bookmark_count?: number;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_id: string;
}

export interface BookmarkWithRelations extends Bookmark {
  tags: Tag[];
  /** Newest scan screenshot, if this bookmark has ever been scanned. The
      grid prefers it over the site's own og:image. */
  screenshot_url?: string | null;
}

export interface URLMetadata {
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string;
}

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  description?: string;
  favicon_url?: string;
  og_image_url?: string;
  tag_ids?: string[];
}

export interface UpdateBookmarkInput {
  title?: string;
  description?: string;
  tag_ids?: string[];
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

// Site Analysis Types
export interface ExtractedFont {
  family: string;
  weights: string[];
  source: "google" | "system" | "custom";
  usage: "heading" | "body" | "code" | "other";
}

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  frequency: number;
  context: "background" | "text" | "accent" | "border" | "other";
}

/* Measured style tokens. The guide template demands Border Radius, Shadows and
   a Spacing Scale; before these existed the model invented all three from a
   single above-the-fold screenshot, which is how a site full of rounded cards
   got documented as "border-radius: 0px". Scraped values are ground truth. */

export interface ExtractedRadius {
  /** As authored, e.g. "12px" or "9999px". */
  value: string;
  /** Numeric px for sorting/rounding; 9999 for fully-round pills. */
  px: number;
  frequency: number;
  context: "button" | "card" | "input" | "image" | "other";
}

export interface ExtractedShadow {
  /** Full computed box-shadow string, usable verbatim in CSS. */
  value: string;
  frequency: number;
  context: "card" | "button" | "overlay" | "other";
}

export interface ExtractedSpacing {
  value: string;
  px: number;
  frequency: number;
  property: "padding" | "margin" | "gap";
}

/* Motion, measured rather than imagined.
   A screenshot is one moment, so nothing about timing is visible in it — which
   is why the Motion & Effects section used to be the most confidently invented
   part of every guide, handing over easing curves and millisecond values with
   nothing behind them. These come off the live page. */
export interface ExtractedTransition {
  /** As authored, e.g. "150ms ease-out". */
  value: string;
  /** What it animates: "background-color", "transform", "opacity"… */
  property: string;
  frequency: number;
  /** button / input / card / image / other */
  context: string;
}

export interface ExtractedAnimation {
  /** e.g. "600ms ease-out" or "34s linear, looping". */
  value: string;
  frequency: number;
}

/* The type scale, measured. Font families were the only typography evidence a
   guide ever had — no sizes, no line heights, no tracking — so every "display
   56px/1.05, body 16px/1.6, -0.02em" in an output was read off a picture. */
export interface ExtractedTypeStep {
  /** h1 / h2 / h3 / body / small / button / label / code */
  role: string;
  family: string;
  /** Rounded px, e.g. "56px". */
  size: string;
  /** A ratio where one can be computed ("1.05"), else "normal". */
  lineHeight: string;
  weight: string;
  /** Relative to the font size ("-0.02em"), or "normal". */
  letterSpacing: string;
  frequency: number;
}

export interface MotionTokens {
  transitions: ExtractedTransition[];
  animations: ExtractedAnimation[];
  /** `scroll-behavior: smooth` on the root or body. */
  smoothScroll: boolean;
}

export interface StyleTokens {
  radii: ExtractedRadius[];
  shadows: ExtractedShadow[];
  spacing: ExtractedSpacing[];
  /** Absent on analyses scanned before motion was measured. */
  motion?: MotionTokens;
  /** Absent on analyses scanned before typography was measured. */
  type?: ExtractedTypeStep[];
}

export interface DesignTokens {
  tailwind: {
    colors: Record<string, string>;
    fontFamily: Record<string, string[]>;
  };
  cssVariables: Record<string, string>;
  styleDict: Record<string, { value: string; type: string }>;
}

export interface SiteAnalysis {
  id: string;
  bookmark_id: string;
  user_id: string;
  screenshot_url: string | null;
  fonts: ExtractedFont[] | null;
  colors: ExtractedColor[] | null;
  design_prompt: string | null;
  design_tokens: DesignTokens | null;
  analysis_status: "pending" | "scanning" | "completed" | "error";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  /** Hero section — kept separate for the card preview and for Mix. */
  screenshot: Buffer | null;
  /**
   * The page captured as consecutive viewport-height sections, hero first.
   * A single full-page image gets downsampled to ~1568px on the long edge by
   * the model APIs, which turns a 6000px page into unreadable mush; separate
   * sections keep every band at full resolution.
   */
  sections: Buffer[];
  fonts: ExtractedFont[];
  colors: ExtractedColor[];
  styleTokens: StyleTokens;
}

// Workbench Types
export type DesignAspect =
  | "typography"
  | "colors"
  | "background"
  | "layout"
  | "spacing"
  | "components"
  | "depth"
  | "animation"
  | "motion"
  | "imagery"
  | "iconography"
  | "vibe";

// Each aspect carries a hue so chips/dots read consistently everywhere
// (compose chips, borrow menu, marketing).
export const DESIGN_ASPECTS: { id: DesignAspect; label: string; hue: string }[] = [
  { id: "typography", label: "Typography", hue: "#221C15" },
  { id: "colors", label: "Colors", hue: "#C25E6A" },
  { id: "background", label: "Background", hue: "#D9962F" },
  { id: "layout", label: "Layout", hue: "#4C6B9A" },
  { id: "spacing", label: "Spacing", hue: "#8A8578" },
  { id: "components", label: "Components", hue: "#77609C" },
  { id: "depth", label: "Depth & Shape", hue: "#48887B" },
  { id: "animation", label: "Animation", hue: "#D9962F" },
  { id: "motion", label: "Motion & Scroll", hue: "#4C6B9A" },
  { id: "imagery", label: "Imagery", hue: "#C25E6A" },
  { id: "iconography", label: "Iconography", hue: "#77609C" },
  { id: "vibe", label: "Vibe", hue: "#48887B" },
];

export interface WorkbenchItemSelection {
  aspects: DesignAspect[];
  fonts: string[]; // picked font families
  colors: string[]; // picked hex values
  comment: string;
}

export interface Workbench {
  id: string;
  user_id: string;
  name: string;
  own_additions: string | null;
  design_guide: string | null;
  guide_status: "idle" | "generating" | "completed" | "error";
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface WorkbenchItem {
  id: string;
  workbench_id: string;
  bookmark_id: string;
  analysis_id: string | null;
  selection: WorkbenchItemSelection;
  position: number;
  created_at: string;
  bookmark?: Bookmark;
  analysis?: SiteAnalysis | null;
}

export interface WorkbenchWithItems extends Workbench {
  items: WorkbenchItem[];
}

export interface CreateWorkbenchInput {
  name: string;
  bookmark_ids?: string[];
  // Richer alternative to bookmark_ids: sources with the aspects to borrow
  // and an optional free-text note, tagged during compose on the grid.
  items?: { bookmark_id: string; aspects?: DesignAspect[]; comment?: string }[];
  // The designer's own prompt, captured at compose time.
  own_additions?: string;
}
