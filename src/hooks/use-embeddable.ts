"use client";

import { useEffect, useRef, useState } from "react";

/* Asks the server which of these URLs will render in an <iframe>.
   Undefined for a URL means "not answered yet" — cards should show their
   screenshot until told otherwise, so a blocked site never flashes an empty
   frame on the way to being corrected. */
export function useEmbeddable(urls: string[]) {
  const [map, setMap] = useState<Record<string, boolean>>({});
  // URLs already requested this session — the grid re-renders constantly.
  const asked = useRef<Set<string>>(new Set());

  const pending = urls.filter((u) => u && !asked.current.has(u));
  const key = pending.join("|");

  useEffect(() => {
    if (!pending.length) return;
    pending.forEach((u) => asked.current.add(u));

    let alive = true;
    fetch("/api/embeddable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: pending }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setMap((prev) => ({ ...prev, ...d })))
      .catch(() => {
        /* leave them undefined — cards keep their screenshots */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}
