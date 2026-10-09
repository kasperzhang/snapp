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
 * Whether `url` points at one of this user's own files in the screenshots
 * bucket. Guide routes hand screenshot URLs to the model to fetch, and the
 * screenshot columns are writable by the row's owner straight through the anon
 * key — so a URL is only trusted if it sits where a scan would have put it.
 * `new URL` resolves `..` and `%2e%2e` segments before the prefix is compared.
 */
export function isOwnScreenshotUrl(url: unknown, userId: string): url is string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (typeof url !== "string" || !base) return false;
  try {
    const prefix = new URL(
      `${base.replace(/\/+$/, "")}/storage/v1/object/public/${SCREENSHOT_BUCKET}/${userId}/`
    ).href;
    return new URL(url).href.startsWith(prefix);
  } catch {
    return false;
  }
}

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
