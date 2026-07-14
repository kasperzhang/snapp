"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ExternalLink, Check } from "lucide-react";
import { BookmarkWithRelations } from "@/types";
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
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onAnalyze,
  selectable = false,
  selected = false,
  onToggleSelect,
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
                Visit Site
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
        </div>
      )}
    </Card>
  );
}
