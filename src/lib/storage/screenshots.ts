// Screenshot storage paths and cleanup.
//
// Screenshots live in the public `screenshots` bucket at `{userId}/{analysisId}.{ext}`.
// Nothing in Postgres references them — `site_analyses.screenshot_url` holds a
// full public URL — so deleting a row does NOT reclaim the file. Every delete
// path has to call `removeScreenshots` explicitly or the bucket grows forever.
//
// Scans wrote PNG until we switched to WebP; both extensions are cleaned up so
// pre-switch files don't strand.

import type { SupabaseClient } from "@supabase/supabase-js";

export const SCREENSHOT_BUCKET = "screenshots";
export const SCREENSHOT_EXT = "webp";
export const SCREENSHOT_CONTENT_TYPE = "image/webp";

/** Every extension a screenshot may have been stored under, current first. */
const KNOWN_EXTS = [SCREENSHOT_EXT, "png"] as const;

/**
 * Path for one captured band. Section 0 is the hero and keeps the bare
 * `{id}.{ext}` name so every existing screenshot_url still resolves; later
 * bands get a `-1`, `-2` suffix.
 */
export function screenshotPath(
  userId: string,
  analysisId: string,
  ext: string = SCREENSHOT_EXT,
  section = 0
): string {
  const suffix = section === 0 ? "" : `-${section}`;
  return `${userId}/${analysisId}${suffix}.${ext}`;
}

/** Upper bound on bands, so cleanup can enumerate paths without a DB read. */
export const MAX_SECTIONS = 3;

/**
 * Delete the stored screenshots for the given analyses. Best-effort: storage
 * cleanup must never block or fail the database delete the caller is doing, so
 * errors are logged and swallowed. Removing a path that doesn't exist is not an
 * error in Supabase Storage, which is why we can fire at every known extension.
 */
export async function removeScreenshots(
  supabase: SupabaseClient,
  userId: string,
  analysisIds: string[]
): Promise<void> {
  if (analysisIds.length === 0) return;

  const paths = analysisIds.flatMap((id) =>
    KNOWN_EXTS.flatMap((ext) =>
      Array.from({ length: MAX_SECTIONS }, (_, i) =>
        screenshotPath(userId, id, ext, i)
      )
    )
  );

  try {
    const { error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .remove(paths);
    if (error) console.error("removeScreenshots failed:", error);
  } catch (e) {
    console.error("removeScreenshots threw:", e);
  }
}
