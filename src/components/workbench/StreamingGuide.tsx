"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { GUIDE_SECTIONS } from "@/lib/guide-sections";
import { cn } from "@/lib/utils/cn";

/* The guide arriving live. Progress is read back out of the text itself —
   each "## " heading the model writes is one section done — so a change to the
   prompt's section list degrades to a still-truthful label instead of a wrong
   one. */
export function StreamingGuide({ text }: { text: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = GUIDE_SECTIONS.length;

  const headings = text.match(/^##\s+(.+)$/gm) ?? [];
  const done = Math.min(headings.length, total);
  const label =
    headings.length > 0
      ? headings[headings.length - 1].replace(/^##\s+/, "").trim()
      : text.match(/^#\s+(.+)$/m)?.[1].trim() || "Getting started";

  // Follow the text down, but don't yank someone who scrolled back to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      el.scrollTop = el.scrollHeight;
    }
  }, [text]);

  return (
    <>
      <div className="border-b border-[var(--border)] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">
            Writing your guide…
          </p>
        </div>
        <p className="mt-1 truncate pl-6 text-xs text-[var(--text-secondary)]">
          {label}
        </p>
        <div className="mt-2 flex items-center gap-2 pl-6">
          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i < done ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                )}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {done} of {total}
          </span>
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[var(--foreground)]">
          {text}
          <span className="stream-caret" />
        </pre>
      </div>
    </>
  );
}
