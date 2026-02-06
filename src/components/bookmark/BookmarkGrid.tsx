"use client";

import { BookmarkWithRelations } from "@/types";
import { BookmarkCard } from "./BookmarkCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Bookmark } from "lucide-react";

interface BookmarkGridProps {
  bookmarks: BookmarkWithRelations[];
  loading?: boolean;
  onEdit?: (bookmark: BookmarkWithRelations) => void;
  onDelete?: (bookmarkId: string) => void;
  onAnalyze?: (bookmark: BookmarkWithRelations) => void;
  emptyMessage?: string;
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
}: BookmarkGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <BookmarkSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Bookmark className="w-8 h-8 text-[var(--text-secondary)] mb-4" />
        <p className="text-[var(--text-secondary)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onEdit={() => onEdit?.(bookmark)}
          onDelete={() => onDelete?.(bookmark.id)}
          onAnalyze={() => onAnalyze?.(bookmark)}
        />
      ))}
    </div>
  );
}
