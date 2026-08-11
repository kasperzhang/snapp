"use client";

import { useEffect, useRef, useState } from "react";

/* Asks the server which of these URLs will render in an <iframe>.
   Undefined for a URL means "not answered yet" — cards should show their
   screenshot until told otherwise, so a blocked site never flashes an empty
   frame on the way to being corrected.

   Answers are also kept in localStorage, because the server round trip is the
   whole reason the grid used to look static: on a cold load every card sat on
   its screenshot until the fetch came back. A returning visitor now has last
   session's verdicts on the first render after mount. */

const STORE_KEY = "snapp:embeddable:v1";
const STORE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Stored = { map: Record<string, boolean>; at: number };

function load(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.map || Date.now() - parsed.at > STORE_TTL_MS) return {};
    return parsed.map;
  } catch {
    return {};
  }
}

function save(map: Record<string, boolean>) {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ map, at: Date.now() } satisfies Stored)
    );
  } catch {
    /* private mode or quota — the server answer still arrives */
  }
}

export function useEmbeddable(urls: string[]) {
  const [map, setMap] = useState<Record<string, boolean>>({});
  // URLs already requested this session — the grid re-renders constantly.
  const asked = useRef<Set<string>>(new Set());
  // Read on mount, not during render: the grid is server-rendered, and reaching
  // for localStorage in the initial state would hydrate mismatched markup.
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const cached = load();
    if (Object.keys(cached).length) setMap((prev) => ({ ...cached, ...prev }));
    setWarm(true);
  }, []);

  const pending = urls.filter((u) => u && !asked.current.has(u));
  const key = pending.join("|");

  useEffect(() => {
    // Wait for the cache read, so a warm URL is never re-asked on every load.
    if (!warm || !pending.length) return;
    const ask = pending.filter((u) => !(u in map));
    pending.forEach((u) => asked.current.add(u));
    if (!ask.length) return;

    let alive = true;
    fetch("/api/embeddable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: ask }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setMap((prev) => {
          const next = { ...prev, ...d };
          save(next);
          return next;
        });
      })
      .catch(() => {
        /* leave them undefined — cards keep their screenshots */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, warm]);

  return map;
}
