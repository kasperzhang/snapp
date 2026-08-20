"use client";

import { useState } from "react";
import { MIDNIGHT_LEDGER } from "./midnight-ledger";

/* The guide behind the panel, on the clipboard. The whole claim of this
   section is "paste this and your agent stops guessing" — so the visitor
   should be able to actually do that, here, before signing up for anything. */
export function CopyGuideButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MIDNIGHT_LEDGER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* clipboard blocked — the button simply doesn't confirm */
    }
  };

  return (
    <button type="button" onClick={copy} className="ba-copy" aria-live="polite">
      {copied ? "✓ Copied — paste it into your agent" : "Copy this guide"}
    </button>
  );
}
