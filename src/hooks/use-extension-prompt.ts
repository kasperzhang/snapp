"use client";

import { useSyncExternalStore } from "react";
import { useSnappExtensionVersion } from "./use-snapp-extension";

/* Should we be telling this person about the browser extension?

   Three ways a prompt like this becomes obnoxious, and the answer to each:

     nagging people who can't install it  → Chromium only; Safari and Firefox
                                            have no equivalent of the rule the
                                            extension relies on
     nagging people who already have it   → the extension announces itself
     linking at a store page that isn't   → everything is gated on the store URL
     live yet                               being configured

   That last one is why the URL is an env var rather than a constant: this can
   ship while the item is still in review and stay completely invisible until
   NEXT_PUBLIC_CHROME_EXTENSION_URL is set. It's a NEXT_PUBLIC_ var, so setting
   it needs a rebuild, not just an env edit. */

const STORE_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || null;

const DISMISS_KEY = "snapp:extension-prompt-dismissed";

// ── dismissal, as an external store ─────────────────────────────────────────
// localStorage isn't React state, and reading it in an effect would mean the
// banner renders once and then yanks itself away. Subscribing means the server
// can render "dismissed" and the client corrects on hydration instead.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// Treated as dismissed on the server so nothing flashes before hydration.
function getServerDismissed() {
  return true;
}

export function dismissExtensionPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode — it'll reappear next session, which is survivable */
  }
  listeners.forEach((l) => l());
}

// ── browser ─────────────────────────────────────────────────────────────────
declare global {
  interface Navigator {
    // Chromium-only, and not in lib.dom yet — its mere presence is most of the
    // signal we need.
    userAgentData?: { brands?: { brand: string; version: string }[] };
  }
}

function noSubscribe() {
  return () => {};
}

function getChromium() {
  const data = navigator.userAgentData;
  if (data?.brands?.length) {
    return data.brands.some((b) => /Chromium/i.test(b.brand));
  }
  // Pre-userAgentData Chromium, and a conservative fallback: anything that
  // names itself Chrome and isn't Safari's or Firefox's engine.
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Firefox\//.test(ua);
}

function getServerChromium() {
  return false;
}

export function useExtensionPrompt() {
  const version = useSnappExtensionVersion();
  const dismissed = useSyncExternalStore(
    subscribe,
    getDismissed,
    getServerDismissed
  );
  const chromium = useSyncExternalStore(
    noSubscribe,
    getChromium,
    getServerChromium
  );

  const installed = version !== null;

  return {
    /** Installed right now, and which version. */
    installed,
    version,
    /** The store URL, or null while the item isn't published yet. */
    storeUrl: STORE_URL,
    /** Could this person install it if we asked? Gates the passive surfaces. */
    canInstall: Boolean(STORE_URL) && chromium && !installed,
    /** Should we actively prompt? Adds "hasn't already said no". */
    shouldPrompt: Boolean(STORE_URL) && chromium && !installed && !dismissed,
    dismiss: dismissExtensionPrompt,
  };
}
