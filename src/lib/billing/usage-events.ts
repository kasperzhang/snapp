// Lets metered actions tell the UI that a counter moved.
//
// The sidebar and settings both read /api/billing/usage once on mount. Nothing
// re-read it afterwards, so generating a guide left the counter showing the old
// number until you navigated somewhere that remounted the component — the meter
// looked broken at exactly the moment it matters most, when you're close to a
// limit.
//
// A window event rather than a store or context: there is no shared parent
// between the sidebar and the panels that generate, and the payload is nothing
// more than "go re-read the endpoint".

const EVENT = "snapp:usage-changed";

/** Call after any action that consumes a guide credit or a scan. */
export function notifyUsageChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe; returns an unsubscribe function for useEffect cleanup. */
export function onUsageChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
