"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
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
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onAnalyze,
}: BookmarkCardProps) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <Card hoverable className="bookmark-card group overflow-hidden flex flex-col">
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
            <span className="text-4xl font-bold text-[var(--text-secondary)]">
              {bookmark.domain.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content - Clickable to open analysis */}
      <button
        onClick={onAnalyze}
        className="p-4 flex flex-col gap-2 text-left w-full cursor-pointer hover:bg-[var(--border-light)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset"
      >
        <div className="flex items-start gap-3">
          {/* Favicon */}
          {bookmark.favicon_url && (
            <img
              src={bookmark.favicon_url}
              alt=""
              className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}

          {/* Title and Domain */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--foreground)] truncate">
              {bookmark.title}
            </h3>
            <span className="text-sm text-[var(--text-secondary)] truncate block">
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
    </Card>
  );
}
