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
  screenshot: Buffer | null;
  fonts: ExtractedFont[];
  colors: ExtractedColor[];
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
