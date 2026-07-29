/* A workbench is flipped to `generating` before the model call and only
   written again when the call finishes. If the function never gets to that
   second write — a deploy mid-request, a crash, the 300s ceiling — the row
   keeps saying `generating` forever, and every entry point in the UI is gated
   on `!generating`: the panel's regenerate button, the /mix/[id] button, and
   the auto-generate effect. The mix becomes permanently un-generatable.

   The route caps generation at maxDuration = 300s, so nothing legitimate can
   still be running past that. Anything older is dead by definition, and is
   reported as `error` so the UI offers a retry. */

const MAX_RUN_MS = 300_000; // matches `export const maxDuration` on the route
const GRACE_MS = 60_000; // clock skew + the writes either side of the call

export const STALE_GENERATING_MS = MAX_RUN_MS + GRACE_MS;

export function isStaleGenerating(row: {
  guide_status?: string | null;
  updated_at?: string | null;
}): boolean {
  if (row.guide_status !== "generating" || !row.updated_at) return false;
  const started = Date.parse(row.updated_at);
  if (Number.isNaN(started)) return false;
  return Date.now() - started > STALE_GENERATING_MS;
}

/**
 * Report an abandoned run as `error` rather than an eternal `generating`.
 * Applied on read, so a row stranded by an earlier crash recovers without
 * needing a migration or a sweeper job.
 */
export function withResolvedGuideStatus<
  T extends { guide_status?: string | null; updated_at?: string | null }
>(row: T): T {
  return isStaleGenerating(row) ? { ...row, guide_status: "error" } : row;
}
