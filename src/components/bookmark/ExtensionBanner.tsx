"use client";

import { useState } from "react";
import { Sparkles, X, RefreshCw } from "lucide-react";
import { useExtensionPrompt } from "@/hooks";
import { cn } from "@/lib/utils/cn";

interface ExtensionBannerProps {
  /* Only shown once something is actually worse without the extension — i.e.
     the library contains a bookmark whose site refused to be framed. Someone
     whose bookmarks all embed fine is losing nothing, and telling them
     otherwise would be a lie dressed as a feature. */
  degradedCount: number;
}

export function ExtensionBanner({ degradedCount }: ExtensionBannerProps) {
  const { shouldPrompt, storeUrl, dismiss } = useExtensionPrompt();
  /* Installing happens in another tab, and the extension's content script only
     runs on a fresh page load — so this tab cannot notice. Without this step
     the banner keeps nagging someone who has already done what it asked. */
  const [awaitingReload, setAwaitingReload] = useState(false);

  if (!shouldPrompt || degradedCount === 0) return null;

  return (
    <div
      className={cn(
        "mb-5 flex items-center gap-3 rounded-xl border border-[var(--border)]",
        "bg-[var(--brand-tint)]/60 px-4 py-2.5"
      )}
    >
      <Sparkles className="h-4 w-4 flex-none text-[var(--accent)]" />

      {awaitingReload ? (
        <>
          <p className="flex-1 text-[13px] text-[var(--foreground)]">
            Added it? Refresh to turn on live previews.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex flex-none items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </>
      ) : (
        <>
          <p className="flex-1 text-[13px] leading-snug text-[var(--foreground)]">
            {degradedCount === 1
              ? "One of your bookmarks shows a screenshot because that site blocks live previews."
              : `${degradedCount} of your bookmarks show screenshots because those sites block live previews.`}{" "}
            <span className="text-[var(--text-secondary)]">
              The Snapp extension makes them live — and saves any page in one
              click.
            </span>
          </p>
          <a
            href={storeUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAwaitingReload(true)}
            className="inline-flex flex-none items-center rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Add to Chrome
          </a>
        </>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-none rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--border)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
