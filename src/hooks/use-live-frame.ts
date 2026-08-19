"use client";

import { useEffect, useRef, useState } from "react";
import {
  claimFrameSlot,
  releaseFrameSlot,
  KEEP_MARGIN_PX,
  MOUNT_MARGIN_PX,
} from "@/lib/preview/live-frames";

/* Should this card be running the real site right now?

   Answers with two observers rather than one. The near observer decides when a
   frame is worth starting; the keep observer decides when it is far enough to
   be worth throwing away. The gap between them is hysteresis — a card sitting
   on a single boundary would otherwise mount and unmount on every scroll
   twitch, and every remount is a real page load hitting somebody else's
   server.

   Returns false until the card is near AND a slot is available, and returns to
   false when it drifts away or the slot is taken by a nearer card. Callers
   keep the screenshot underneath, so losing a frame degrades to the picture
   rather than to a hole. */
export function useLiveFrame(
  ref: React.RefObject<HTMLElement | null>,
  wants: boolean
): boolean {
  const [live, setLive] = useState(false);
  // Identity for this card's claim on the shared ceiling.
  const token = useRef({});

  useEffect(() => {
    const el = ref.current;
    if (!el || !wants || typeof IntersectionObserver === "undefined") {
      return;
    }

    const self = token.current;
    let held = false;

    const take = () => {
      if (held) return;
      held = true;
      // The manager calls this back if a nearer card needs the slot.
      claimFrameSlot(self, () => {
        held = false;
        setLive(false);
      });
      setLive(true);
    };

    const drop = () => {
      if (!held) return;
      held = false;
      releaseFrameSlot(self);
      setLive(false);
    };

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) take();
      },
      { rootMargin: `${MOUNT_MARGIN_PX}px` }
    );

    const keep = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) drop();
      },
      { rootMargin: `${KEEP_MARGIN_PX}px` }
    );

    near.observe(el);
    keep.observe(el);

    return () => {
      near.disconnect();
      keep.disconnect();
      // Give the slot back on unmount — scroll-to-load discards cards, and a
      // leaked claim would permanently shrink the ceiling.
      releaseFrameSlot(self);
    };
  }, [ref, wants]);

  // No observer support at all: don't gate, just render.
  if (typeof IntersectionObserver === "undefined" && wants) return true;

  return live;
}
