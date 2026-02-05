"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
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

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
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

          {/* Title and Clickable URL */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--foreground)] truncate">
              {bookmark.title}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {bookmark.domain}
            </a>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-[var(--border)] transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
