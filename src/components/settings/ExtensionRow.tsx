"use client";

import { Check, Puzzle } from "lucide-react";
import { useExtensionPrompt } from "@/hooks";

/* Settings' record of the browser extension: the permanent, findable home for
   it, and the only surface that stays useful after someone dismisses the
   banner. Unlike the banner and the card badge it also renders when the
   extension IS installed — "yes, this is on" is the thing people come to
   settings to confirm.

   Still hidden entirely while the store item is unpublished, and on browsers
   that can't run it, because a settings row you can't act on is just a
   complaint. */

export function ExtensionRow() {
  const { installed, version, storeUrl, canInstall } = useExtensionPrompt();

  if (!storeUrl) return null;
  if (!installed && !canInstall) return null;

  return (
    <section className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Browser extension
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-tint)]">
          <Puzzle className="h-4 w-4 text-[var(--accent)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {installed ? "Installed" : "Not installed"}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            {installed
              ? `Version ${version}. Every bookmark renders as the live site, and you can save any page in one click.`
              : "Renders every bookmark as the live site instead of a screenshot, and saves any page in one click."}
          </p>
        </div>

        {installed ? (
          <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-[var(--brand-tint)] px-3 py-1.5 text-[12px] font-medium text-[var(--accent)]">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Active
          </span>
        ) : (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-none items-center rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Add to Chrome
          </a>
        )}
      </div>
    </section>
  );
}
