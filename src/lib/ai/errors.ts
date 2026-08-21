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
  name?: string;
  /** Postgres/PostgREST errors carry these instead of an HTTP status. */
  code?: string;
  details?: string;
  hint?: string;
  error?: { type?: string; message?: string };
}

const GENERIC = "Couldn't write the guide. Try again.";

export function describeGenerationError(
  err: unknown,
  /* Distinct per call site: a failure before the model is even reached reads
     differently from one after it started writing, and telling them apart in
     a screenshot is the difference between one guess and none. */
  fallback: string = GENERIC
): string {
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

  /* An exhausted account answers 400 with "credit balance is too low" — an
     invalid_request_error, not an auth or quota code — so it landed in the
     generic bucket and read as a transient glitch. It is neither transient nor
     the user's to fix, and every retry burns their credit against a call that
     cannot succeed. */
  if (detail.includes("credit balance") || detail.includes("insufficient"))
    return "Generation is unavailable right now — our AI account needs topping up. Nothing was charged to you.";

  // Ours to fix, not theirs — say so rather than inviting a pointless retry.
  if (status === 401 || status === 403)
    return "The AI service rejected our credentials. This one's on us — we've been notified.";

  if (status === 408 || type === "timeout_error" || detail.includes("timed out"))
    return "The guide took too long to write. Try again, or drop a source.";

  /* A database failure has no HTTP status, so it used to fall through to the
     generic line — which reads as "the model failed" and sends people back to
     spend another credit on something that may already exist. */
  if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code))
    return "The guide couldn't be saved. Try again in a moment.";

  return fallback;
}

/* A single-line description of what actually failed, for the browser console.
   Never rendered — the UI keeps its sentence — but the person debugging is
   usually looking at the console anyway, and three round trips of "it says the
   generic message again" is worse than showing the status and message that
   produced it. Contains nothing secret: these are API and database errors, not
   credentials. */
export function debugGenerationError(err: unknown): string {
  const e = (err ?? {}) as ApiErrorish;
  const bits = [
    e.status !== undefined ? `status=${e.status}` : "",
    e.code ? `code=${e.code}` : "",
    e.error?.type ? `type=${e.error.type}` : "",
    e.name && e.name !== "Error" ? `name=${e.name}` : "",
    `msg=${(e.error?.message ?? e.message ?? String(err)).slice(0, 300)}`,
  ].filter(Boolean);
  return bits.join(" ");
}

/** One structured line per failure, so the log says which case it was. */
export function logGenerationError(scope: string, err: unknown): void {
  const e = (err ?? {}) as ApiErrorish;
  console.error(`[${scope}] generation failed`, {
    status: e.status,
    // Postgres errors report here instead; without them an unrecognised
    // failure is invisible and every retry is a guess.
    code: e.code,
    name: e.name,
    type: e.error?.type,
    message: e.error?.message ?? e.message,
    details: e.details,
    hint: e.hint,
  });
}
