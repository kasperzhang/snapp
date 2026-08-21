/* What to tell someone when a generation fails.
 *
 * Both guide routes used to answer every failure with "Failed to generate
 * design guide" and put the real cause in console.error, where only a Vercel
 * log tail can see it. That's the same trade the scanner used to make: the
 * server knows exactly what went wrong and the person who pressed the button
 * is told nothing they can act on — retry, re-scan, wait, or upgrade are very
 * different instructions.
 *
 * Anything unrecognised keeps the generic line rather than leaking an internal
 * message into the UI. */

interface ApiErrorish {
  status?: number;
  message?: string;
  error?: { type?: string; message?: string };
}

const GENERIC = "Couldn't write the guide. Try again.";

export function describeGenerationError(err: unknown): string {
  const e = (err ?? {}) as ApiErrorish;
  const status = typeof e.status === "number" ? e.status : undefined;
  const type = e.error?.type ?? "";
  const detail = `${e.error?.message ?? e.message ?? ""}`.toLowerCase();

  // Anthropic is busy or we're going too fast. Both are worth retrying.
  if (status === 529 || type === "overloaded_error")
    return "Claude is busy right now. Give it a moment and try again.";
  if (status === 429 || type === "rate_limit_error")
    return "Too many generations at once. Try again in a minute.";

  // A screenshot the model couldn't fetch or decode — re-scanning fixes it,
  // and nothing else will.
  if (status === 400 && (detail.includes("image") || detail.includes("media")))
    return "One of the screenshots couldn't be read. Re-scan that source and try again.";
  if (status === 400 && detail.includes("too long"))
    return "This mix is too large to send in one go. Remove a source and try again.";

  // Ours to fix, not theirs — say so rather than inviting a pointless retry.
  if (status === 401 || status === 403)
    return "The AI service rejected our credentials. This one's on us — we've been notified.";

  if (status === 408 || type === "timeout_error" || detail.includes("timed out"))
    return "The guide took too long to write. Try again, or drop a source.";

  return GENERIC;
}

/** One structured line per failure, so the log says which case it was. */
export function logGenerationError(scope: string, err: unknown): void {
  const e = (err ?? {}) as ApiErrorish;
  console.error(`[${scope}] generation failed`, {
    status: e.status,
    type: e.error?.type,
    message: e.error?.message ?? e.message,
  });
}
