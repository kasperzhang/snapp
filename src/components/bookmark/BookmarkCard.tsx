"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Check, Link2, Plus, Sparkles } from "lucide-react";
import { BookmarkWithRelations, DESIGN_ASPECTS, DesignAspect } from "@/types";
import { Card } from "@/components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useExtensionPrompt } from "@/hooks";
import { cn } from "@/lib/utils/cn";

interface BookmarkCardProps {
  bookmark: BookmarkWithRelations;
  /** Does this site permit being framed? Undefined until the check returns —
      the card shows its screenshot until then, so a site that refuses framing
      never flashes an empty frame. */
  embeddable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAnalyze?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // Compose mode: aspects tagged to borrow from this site, shown as chips
  // pinned to the selected card, plus an optional free-text note.
  aspects?: DesignAspect[];
  onToggleAspect?: (aspect: DesignAspect) => void;
  comment?: string;
  onCommentChange?: (comment: string) => void;
}

const ASPECT_META = Object.fromEntries(
  DESIGN_ASPECTS.map((a) => [a.id, a])
) as Record<DesignAspect, (typeof DESIGN_ASPECTS)[number]>;

export function BookmarkCard({
  bookmark,
  embeddable,
  onEdit,
  onDelete,
  onAnalyze,
  selectable = false,
  selected = false,
  onToggleSelect,
  aspects = [],
  onToggleAspect,
  comment = "",
  onCommentChange,
}: BookmarkCardProps) {
  // Preview falls back down a chain: scan screenshot → the site's own
  // og:image → a wordmark. `shotIndex` is how far down we've been forced.
  const [shotIndex, setShotIndex] = useState(0);
  // Which compose popover is open: the aspect checklist or the note editor.
  const [openPanel, setOpenPanel] = useState<"borrow" | "note" | null>(null);
  const borrowRef = useRef<HTMLDivElement>(null);

  /* A live frame is a whole page load. The grid scrolls forever, so only mount
     one once the card is near the viewport — and keep it mounted after that,
     since tearing frames down on scroll-back would reload the site every time.
     `loading="lazy"` alone isn't enough: support for it on iframes is uneven,
     and it can't express "close to the viewport" the way rootMargin can. */
  const previewRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  // Whether we can offer the extension as the fix for a screenshot-only card.
  const { canInstall, storeUrl } = useExtensionPrompt();

  // No observer (server render, ancient browser): don't gate at all.
  const canObserve =
    typeof IntersectionObserver !== "undefined" && typeof window !== "undefined";

  useEffect(() => {
    const el = previewRef.current;
    if (!el || nearViewport || !canObserve) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearViewport, canObserve]);

  // Dismiss the open popover on outside click / Escape.
  useEffect(() => {
    if (!openPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!borrowRef.current?.contains(e.target as Node)) setOpenPanel(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPanel(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPanel]);

  /* Best available preview. The scan screenshot is the real page; og:image is
     whatever the site shows when its link is shared — usually a logo or
     banner, so it's second choice. Neither is guaranteed to exist. */
  const previewSrc =
    [bookmark.screenshot_url, bookmark.og_image_url].filter(Boolean)[
      shotIndex
    ] ?? null;

  return (
    <Card
      hoverable
      className={cn(
        "bookmark-card group flex flex-col relative transition-transform duration-200 hover:-translate-y-0.5",
        // Compose mode lets chips/check overhang the edges; otherwise the
        // card clips its children to the rounded corners as before.
        selectable ? "overflow-visible" : "overflow-hidden",
        selectable && "cursor-pointer",
        selected && "-translate-y-0.5"
      )}
    >
      {/* Preview Area. The screenshot is the base layer and the live frame is
          painted over it once it has loaded — so a framed site never shows an
          empty box while it boots, and a site that refuses framing simply keeps
          the picture it already had. */}
      <div
        ref={previewRef}
        className="relative aspect-[16/10] bg-[var(--border)] overflow-hidden rounded-t-[var(--radius-card)]"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={bookmark.title}
            className="w-full h-full object-cover object-top"
            loading="lazy"
            // A dead image URL drops us to the next source rather than
            // leaving a broken-image box.
            onError={() => setShotIndex((i) => i + 1)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-[family-name:var(--font-display)] font-bold text-3xl tracking-tight text-[var(--text-secondary)] truncate max-w-full px-4">
              {bookmark.domain.split(".")[0]}
            </span>
          </div>
        )}

        {/* This card is a screenshot because the site refused to be framed,
            and the extension would fix it. Shown on hover only, and never in
            compose mode where the selection overlay owns every click. The
            badge explains the picture the user is already looking at, so it
            survives dismissing the banner — it isn't a prompt, it's a label. */}
        {embeddable === false && canInstall && !selectable && (
          <a
            href={storeUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="This site blocks live previews. The Snapp extension turns them on."
            className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--background)]/90 px-2 py-1 text-[10.5px] font-medium text-[var(--text-secondary)] opacity-0 shadow-sm backdrop-blur-sm transition-all hover:text-[var(--accent)] group-hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Sparkles className="h-2.5 w-2.5" />
            Make it live
          </a>
        )}

        {embeddable && (nearViewport || !canObserve) && (
          <iframe
            src={bookmark.url}
            title={bookmark.title}
            className={cn(
              "bookmark-iframe absolute left-0 top-0",
              !frameLoaded && "opacity-0"
            )}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            onLoad={() => setFrameLoaded(true)}
          />
        )}
      </div>

      {/* Content - Clickable to open analysis */}
      <button
        onClick={onAnalyze}
        className="p-4 flex flex-col gap-2 text-left w-full cursor-pointer rounded-b-[var(--radius-card)] hover:bg-[var(--border-light)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset"
      >
        <div className="flex items-center gap-3">
          {/* Favicon tile */}
          <div className="w-[26px] h-[26px] rounded-[7px] bg-[var(--border-light)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold text-[var(--foreground)] flex-shrink-0 overflow-hidden">
            {bookmark.favicon_url ? (
              <img
                src={bookmark.favicon_url}
                alt=""
                className="w-4 h-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              bookmark.domain.charAt(0).toUpperCase()
            )}
          </div>

          {/* Title and Domain */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[13.5px] font-medium text-[var(--foreground)] truncate">
              {bookmark.title}
            </h3>
            <span className="text-xs text-[var(--text-muted)] truncate block mt-0.5">
              {bookmark.domain}
            </span>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                  }
                }}
                className="p-1 rounded hover:bg-[var(--border)] transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(bookmark.url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit site
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(bookmark.url);
                }}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </button>

      {/* Selection overlay (workbench compose mode) */}
      {selectable && (
        <div
          role="checkbox"
          aria-checked={selected}
          tabIndex={0}
          onClick={onToggleSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleSelect?.();
            }
          }}
          className="absolute inset-0 z-10 rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
        >
          {/* Crisp accent outline hugging the card when selected */}
          <span
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[var(--radius-card)] border-2 transition-colors duration-150",
              selected ? "border-[var(--accent)]" : "border-transparent"
            )}
          />
          {/* Subtle tint so the whole tile reads as chosen */}
          {selected && (
            <span className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] bg-[var(--accent)]/[0.04]" />
          )}
          {/* Corner check badge — overlaps the top-left corner like the
              landing mockup; faint hint on hover before selection */}
          <span
            className={cn(
              "absolute -top-2 -left-2 z-20 flex items-center justify-center rounded-full w-6 h-6 transition-all duration-150",
              selected
                ? "bg-[var(--accent)] text-white ring-2 ring-[var(--background)] shadow-md scale-100 opacity-100"
                : "bg-white/90 backdrop-blur-sm border border-[var(--border)] text-[var(--text-muted)] scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
            )}
          >
            {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </span>

          {/* Borrow chips — pinned overlapping the card's top edge, mockup
              style. Click a chip to remove it; the trailing pill (or the ✎
              note pill) opens the aspect + note menu. */}
          {selected && onToggleAspect && (
            <div
              ref={borrowRef}
              className="absolute -top-[13px] left-7 right-2 z-20 flex flex-wrap justify-end gap-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {aspects.map((a) => (
                <button
                  key={a}
                  onClick={() => onToggleAspect(a)}
                  title="Stop borrowing this"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-[11px] font-medium text-[var(--background)] shadow-md transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  <i
                    className="h-1.5 w-1.5 rounded-full not-italic"
                    style={{
                      background:
                        ASPECT_META[a].hue === "#221C15"
                          ? "#FBFAF7"
                          : ASPECT_META[a].hue,
                    }}
                  />
                  {ASPECT_META[a].label}
                </button>
              ))}
              <button
                onClick={() =>
                  setOpenPanel((v) => (v === "borrow" ? null : "borrow"))
                }
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Plus className="w-3 h-3" />
                Borrow
              </button>
              {onCommentChange && (
                <button
                  onClick={() =>
                    setOpenPanel((v) => (v === "note" ? null : "note"))
                  }
                  title={comment.trim() || undefined}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    comment.trim()
                      ? "border border-[var(--brand)] bg-[var(--brand-tint)] text-[var(--accent)]"
                      : "border border-[var(--border)] bg-white/90 text-[var(--foreground)] hover:border-[var(--accent)]"
                  )}
                >
                  {comment.trim() ? (
                    "✎ Note"
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Note
                    </>
                  )}
                </button>
              )}

              {/* Hand-rolled popovers (not Radix menus: menus dismiss on any
                  non-item interaction, which kills form fields). */}
              {openPanel === "borrow" && (
                <div className="pop-in absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                  <div className="max-h-56 overflow-y-auto p-1.5">
                    {DESIGN_ASPECTS.map((a) => {
                      const on = aspects.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => onToggleAspect(a.id)}
                          className={cn(
                            "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--border-light)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                            on
                              ? "font-medium text-[var(--foreground)]"
                              : "text-[var(--text-secondary)]"
                          )}
                        >
                          <span
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                              on
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-[var(--border)]"
                            )}
                          >
                            {on && (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            )}
                          </span>
                          <i
                            className="mr-1.5 h-1.5 w-1.5 rounded-full not-italic"
                            style={{ background: a.hue }}
                          />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end border-t border-[var(--border)] px-2.5 py-1.5">
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="rounded-full px-3 py-1 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--brand-tint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {openPanel === "note" && onCommentChange && (
                <div className="pop-in absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                  <div className="px-2.5 pb-1 pt-2">
                    <p className="mb-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                      Note for this site
                    </p>
                    <textarea
                      autoFocus
                      value={comment}
                      onChange={(e) => onCommentChange(e.target.value)}
                      placeholder="e.g. love the slow fade-in on scroll"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div className="flex justify-end border-t border-[var(--border)] px-2.5 py-1.5">
                    <button
                      onClick={() => setOpenPanel(null)}
                      className="rounded-full px-3 py-1 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--brand-tint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
