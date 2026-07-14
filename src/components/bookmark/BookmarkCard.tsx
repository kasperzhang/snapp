"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Check, Link2, Plus } from "lucide-react";
import { BookmarkWithRelations, DESIGN_ASPECTS, DesignAspect } from "@/types";
import { Card } from "@/components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils/cn";

interface BookmarkCardProps {
  bookmark: BookmarkWithRelations;
  onEdit?: () => void;
  onDelete?: () => void;
  onAnalyze?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // Compose mode: aspects tagged to borrow from this site, shown as chips
  // pinned to the selected card.
  aspects?: DesignAspect[];
  onToggleAspect?: (aspect: DesignAspect) => void;
}

const ASPECT_LABEL = Object.fromEntries(
  DESIGN_ASPECTS.map((a) => [a.id, a.label])
) as Record<DesignAspect, string>;

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onAnalyze,
  selectable = false,
  selected = false,
  onToggleSelect,
  aspects = [],
  onToggleAspect,
}: BookmarkCardProps) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <Card
      hoverable
      className={cn(
        "bookmark-card group overflow-hidden flex flex-col relative transition-transform duration-200 hover:-translate-y-0.5",
        selectable && "cursor-pointer",
        selected && "-translate-y-0.5"
      )}
    >
      {/* Preview Area */}
      <div className="relative aspect-[16/10] bg-[var(--border)] overflow-hidden">
        {!iframeError ? (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--border)]">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <iframe
              src={bookmark.url}
              title={bookmark.title}
              className={cn(
                "bookmark-iframe",
                iframeLoading && "opacity-0"
              )}
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeError(true);
                setIframeLoading(false);
              }}
            />
          </>
        ) : bookmark.og_image_url ? (
          <img
            src={bookmark.og_image_url}
            alt={bookmark.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-[family-name:var(--font-display)] font-bold text-3xl tracking-tight text-[var(--text-secondary)] truncate max-w-full px-4">
              {bookmark.domain.split(".")[0]}
            </span>
          </div>
        )}
      </div>

      {/* Content - Clickable to open analysis */}
      <button
        onClick={onAnalyze}
        className="p-4 flex flex-col gap-2 text-left w-full cursor-pointer hover:bg-[var(--border-light)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset"
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
          {/* Corner check badge — solid when selected, faint hint on hover */}
          <span
            className={cn(
              "absolute top-2.5 right-2.5 flex items-center justify-center rounded-full w-6 h-6 transition-all duration-150",
              selected
                ? "bg-[var(--accent)] text-white ring-2 ring-white shadow-md scale-100 opacity-100"
                : "bg-white/80 backdrop-blur-sm border border-[var(--border)] text-[var(--text-muted)] scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
            )}
          >
            {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
          </span>

          {/* Borrow chips — what to take from this site. Click a chip to
              remove it; the trailing pill opens the full aspect menu. */}
          {selected && onToggleAspect && (
            <div
              className="absolute top-2.5 left-2.5 right-10 z-20 flex flex-wrap gap-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {aspects.map((a) => (
                <button
                  key={a}
                  onClick={() => onToggleAspect(a)}
                  title="Stop borrowing this"
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-[11px] font-medium text-[var(--background)] shadow-md transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                >
                  {ASPECT_LABEL[a]}
                </button>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                    <Plus className="w-3 h-3" />
                    Borrow
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  {DESIGN_ASPECTS.map((a) => {
                    const on = aspects.includes(a.id);
                    return (
                      <DropdownMenuItem
                        key={a.id}
                        // Keep the menu open so several aspects can be tagged
                        // in one visit.
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => onToggleAspect(a.id)}
                        className={cn(on && "font-medium")}
                      >
                        <span
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                            on
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border)]"
                          )}
                        >
                          {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        {a.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
