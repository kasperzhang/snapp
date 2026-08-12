"use client";

import { useSyncExternalStore } from "react";

/* Is the Snapp Live Previews extension installed?

   It announces itself by setting `window.__snappExtension` to its version at
   document_start (see extension/announce.js). When it's there, every site can
   be framed — the extension strips the headers that would otherwise refuse —
   so the grid can skip asking the server about framing altogether.

   Read through useSyncExternalStore because this is external state owned by the
   extension, not by React. That matters for more than tidiness: the server
   renders without the extension and the client renders with it, and
   getServerSnapshot is what lets React hydrate against the server's answer and
   then re-render, instead of reporting a mismatch. */

declare global {
  interface Window {
    __snappExtension?: string;
  }
}

function subscribe(onChange: () => void) {
  document.addEventListener("snapp:extension", onChange);
  return () => document.removeEventListener("snapp:extension", onChange);
}

function getSnapshot(): string | null {
  return window.__snappExtension ?? null;
}

function getServerSnapshot(): string | null {
  return null;
}

/** The extension's version, or null when it isn't installed. */
export function useSnappExtensionVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSnappExtension() {
  return useSnappExtensionVersion() !== null;
}
