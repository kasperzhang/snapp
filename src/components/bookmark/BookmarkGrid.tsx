"use client";

import { BookmarkWithRelations, DesignAspect } from "@/types";
import { BookmarkCard } from "./BookmarkCard";
import { ExtensionBanner } from "./ExtensionBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Bookmark } from "lucide-react";
import { useEmbeddable, useSnappExtension } from "@/hooks";

interface BookmarkGridProps {
  bookmarks: BookmarkWithRelations[];
  loading?: boolean;
  onEdit?: (bookmark: BookmarkWithRelations) => void;
  onDelete?: (bookmarkId: string) => void;
  onAnalyze?: (bookmark: BookmarkWithRelations) => void;
  emptyMessage?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
  /** How many placeholder cards to draw on a cold load. */
  skeletonCount?: number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (bookmarkId: string) => void;
  aspectsById?: Record<string, DesignAspect[]>;
  onToggleAspect?: (bookmarkId: string, aspect: DesignAspect) => void;
  commentsById?: Record<string, string>;
  onCommentChange?: (bookmarkId: string, comment: string) => void;
}

function BookmarkSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BookmarkGrid({
  bookmarks,
  loading,
  onEdit,
  onDelete,
  onAnalyze,
  emptyMessage = "No bookmarks yet",
  emptyHint,
  emptyAction,
  skeletonCount = 6,
  selectable = false,
  selectedIds,
  onToggleSelect,
  aspectsById,
  onToggleAspect,
  commentsById,
  onCommentChange,
}: BookmarkGridProps) {
  /* Which of these sites permit framing. Answered asynchronously; until it
     arrives every card shows its screenshot.

     With the extension installed the question is moot — it strips the headers
     that refuse framing, so everything is embeddable and we don't spend a
     round trip finding out. */
  const hasExtension = useSnappExtension();
  const embeddable = useEmbeddable(
    hasExtension ? [] : bookmarks.map((b) => b.url)
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <BookmarkSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      // flex-1 centers this vertically when the parent is a flex column
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-tint)]">
          <Bookmark className="h-6 w-6 text-[var(--brand)]" />
        </div>
        <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
          {emptyMessage}
        </p>
        {emptyHint && (
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
            {emptyHint}
          </p>
        )}
        {emptyAction && <div className="mt-6">{emptyAction}</div>}
      </div>
    );
  }

  /* How many cards are worse off for the extension being missing. Only sites
     that actively refused framing count — `undefined` means the check hasn't
     answered yet, and counting those would make the banner appear and then
     disagree with itself a second later. */
  const degradedCount = hasExtension
    ? 0
    : bookmarks.filter((b) => embeddable[b.url] === false).length;

  return (
    <div>
      {/* Not while composing a mix — that's a focused task and the library
          shouldn't interrupt it. */}
      {!selectable && <ExtensionBanner degradedCount={degradedCount} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          embeddable={hasExtension || embeddable[bookmark.url]}
          onEdit={() => onEdit?.(bookmark)}
          onDelete={() => onDelete?.(bookmark.id)}
          onAnalyze={() => onAnalyze?.(bookmark)}
          selectable={selectable}
          selected={selectedIds?.has(bookmark.id)}
          onToggleSelect={() => onToggleSelect?.(bookmark.id)}
          aspects={aspectsById?.[bookmark.id]}
          onToggleAspect={
            onToggleAspect
              ? (aspect) => onToggleAspect(bookmark.id, aspect)
              : undefined
          }
          comment={commentsById?.[bookmark.id]}
          onCommentChange={
            onCommentChange
              ? (comment) => onCommentChange(bookmark.id, comment)
              : undefined
          }
        />
      ))}
      </div>
    </div>
  );
}
