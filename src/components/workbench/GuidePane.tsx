"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { renderMarkdown, splitGuide } from "@/lib/markdown";
import { cn } from "@/lib/utils/cn";
import { StreamingGuide } from "./StreamingGuide";

interface GuidePaneProps {
  /** The saved guide, if one has ever been generated. */
  guide: string | null;
  /** The guide as it streams in, before it's saved. */
  partial: string;
  generating: boolean;
  name: string;
  /** Shown in the empty state — normally the Generate button. */
  action?: React.ReactNode;
  emptyHint?: string;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  };
  return { copied, copy };
}

export function GuidePane({
  guide,
  partial,
  generating,
  name,
  action,
  emptyHint,
}: GuidePaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopy();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { preamble, sections } = useMemo(
    () => splitGuide(guide ?? ""),
    [guide]
  );
  const ids = sections.map((s) => s.id).join("|");

  /* Which section you're reading.

     Not an IntersectionObserver: "sections currently on screen" is a set that
     gains and loses members at different edges as you scroll, so picking from
     it made the highlight jump backwards mid-scroll. This asks a monotonic
     question instead — which heading was the last one to cross the top of the
     pane — so scrolling down only ever advances it and scrolling back up
     reverses at exactly the same line. */
  const lockedRef = useRef(false);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !sections.length) return;

    const LINE = 28; // px below the top of the pane

    const read = () => {
      // A jump is in flight — the smooth scroll passes over every section on
      // the way, and letting those count would strobe the rail.
      if (lockedRef.current) {
        if (settleRef.current) clearTimeout(settleRef.current);
        settleRef.current = setTimeout(() => {
          lockedRef.current = false;
        }, 140);
        return;
      }
      const top = root.getBoundingClientRect().top + LINE;
      let current = sections[0].id;
      for (const s of sections) {
        const el = root.querySelector(`#${CSS.escape(s.id)}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= top) current = s.id;
        else break;
      }
      // The last section is often short enough that its heading never reaches
      // the line; at the bottom of the guide it's what you're reading anyway.
      if (root.scrollHeight - root.scrollTop - root.clientHeight < 8) {
        current = sections[sections.length - 1].id;
      }
      setActiveId(current);
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };

    read();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  /* Keep the current chip in view — by scrolling the rail itself, never
     scrollIntoView, which walks up and scrolls every scrollable ancestor with
     it. Skipped when you got here by clicking a chip: that chip is already
     under your cursor, and sliding it out from under you is the jumping. */
  const centerChip = (id: string) => {
    const rail = chipsRef.current;
    const chip = rail?.querySelector<HTMLElement>(
      `[data-chip="${CSS.escape(id)}"]`
    );
    if (!rail || !chip) return;
    /* Measured off bounding rects, not offsetLeft: the rail is statically
       positioned, so offsetLeft reports a coordinate from whatever ancestor
       happens to be positioned — hundreds of pixels away — and every target
       overshot and clamped to the far right. */
    const railBox = rail.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const delta =
      chipBox.left - railBox.left - (rail.clientWidth - chipBox.width) / 2;
    const max = rail.scrollWidth - rail.clientWidth;
    rail.scrollTo({
      left: Math.max(0, Math.min(rail.scrollLeft + delta, max)),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (activeId && !lockedRef.current) centerChip(activeId);
  }, [activeId]);

  const jumpTo = (id: string) => {
    const root = scrollRef.current;
    const el = root?.querySelector(`#${CSS.escape(id)}`);
    if (!root || !el) return;
    lockedRef.current = true;
    setActiveId(id);
    const offset =
      el.getBoundingClientRect().top - root.getBoundingClientRect().top;
    root.scrollTo({ top: root.scrollTop + offset - 8, behavior: "smooth" });
    // If the pane was already there, no scroll event arrives to release it.
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      lockedRef.current = false;
    }, 900);
  };

  const download = () => {
    const blob = new Blob([guide ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design-guide"
    }.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const streaming = generating && partial;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      {streaming ? (
        <StreamingGuide text={partial} />
      ) : !guide ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-tint)]">
            <Sparkles className="h-5 w-5 text-[var(--brand)]" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[var(--foreground)]">
            {generating ? "Writing your guide…" : "No guide yet"}
          </p>
          <p className="max-w-[280px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {generating
              ? "Fusing what you tagged from each source. This can take a minute."
              : emptyHint ??
                "Mark what to borrow from each source, then generate one guide for your agent."}
          </p>
          {!generating && action && <div className="mt-1">{action}</div>}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              Design guide
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copy("all", guide)}
              >
                {copied === "all" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied === "all" ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="secondary" onClick={download}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>

          {/* Contents. A guide is eleven sections and several screens long —
              this is how you get back to Typography without scrolling for it. */}
          {sections.length > 1 && (
            <div
              ref={chipsRef}
              className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {sections.map((s) => (
                <button
                  key={s.id}
                  data-chip={s.id}
                  onClick={() => jumpTo(s.id)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[12px] transition-colors",
                    s.id === activeId
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {preamble && (
              <div
                className="guide-prose"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(preamble) }}
              />
            )}
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="group/sec scroll-mt-4">
                <div className="mt-8 flex items-center gap-2 border-t border-[var(--border)] pt-5">
                  <h3 className="flex-1 font-[family-name:var(--font-display)] text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                    {s.title}
                  </h3>
                  <button
                    onClick={() => copy(s.id, `## ${s.title}\n\n${s.body}`)}
                    title={`Copy ${s.title}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--border)] hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover/sec:opacity-100"
                  >
                    {copied === s.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div
                  className="guide-prose"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
