"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BookmarkWithRelations, CreateBookmarkInput, URLMetadata } from "@/types";
import { BOOKMARKS_PAGE_SIZE, pageCount } from "@/lib/pagination";

interface UseBookmarksOptions {
  search?: string;
  tagIds?: string[];
  untagged?: boolean;
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The list always starts at page 1 and grows by scrolling, so this is simply
  // how much of it is currently on screen. Filters reset it.
  const [pagesLoaded, setPagesLoaded] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // Guards against the observer firing twice before state settles, which would
  // append the same page.
  const loadingMoreRef = useRef(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.tagIds?.length) params.set("tags", options.tagIds.join(","));
      if (options.untagged) params.set("untagged", "1");

      const response = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }

      const data = await response.json();
      setBookmarks(data.items ?? []);
      setTotal(data.total ?? 0);
      setLibraryTotal(data.libraryTotal ?? data.total ?? 0);
      setPagesLoaded(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookmarks");
    } finally {
      setLoading(false);
    }
  }, [options.search, options.tagIds, options.untagged]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const lastPage = pageCount(total, BOOKMARKS_PAGE_SIZE);
  const hasMore = pagesLoaded < lastPage;

  /**
   * Pull the next page in and append it, for scrolling past the end of the
   * grid. Distinct from the main fetch, which replaces when the filters change.
   */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = pagesLoaded + 1;
      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.tagIds?.length) params.set("tags", options.tagIds.join(","));
      if (options.untagged) params.set("untagged", "1");
      params.set("page", String(next));

      const response = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch bookmarks");
      const data = await response.json();

      // De-duplicate on id: a bookmark added or deleted since the first page
      // was fetched shifts every later row, which would otherwise show the
      // same card twice.
      setBookmarks((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...(data.items ?? []).filter((b: BookmarkWithRelations) => !seen.has(b.id))];
      });
      setTotal(data.total ?? 0);
      setPagesLoaded((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookmarks");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [
    loading,
    hasMore,
    pagesLoaded,
    options.search,
    options.tagIds,
    options.untagged,
  ]);

  const fetchMetadata = async (url: string): Promise<URLMetadata> => {
    const response = await fetch("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }

    return response.json();
  };

  const createBookmark = async (input: CreateBookmarkInput) => {
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to create bookmark");
    }

    const newBookmark = await response.json();
    setBookmarks((prev) => [newBookmark, ...prev]);
    setTotal((n) => n + 1);
    setLibraryTotal((n) => n + 1);
    return newBookmark;
  };

  const updateBookmark = async (
    id: string,
    updates: { title?: string; description?: string; tag_ids?: string[] }
  ) => {
    const response = await fetch("/api/bookmarks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      throw new Error("Failed to update bookmark");
    }

    const updatedBookmark = await response.json();
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? updatedBookmark : b))
    );
    return updatedBookmark;
  };

  const deleteBookmark = async (id: string) => {
    const response = await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete bookmark");
    }

    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setTotal((n) => Math.max(0, n - 1));
    setLibraryTotal((n) => Math.max(0, n - 1));
  };

  return {
    bookmarks,
    total,
    libraryTotal,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    refresh: fetchBookmarks,
    fetchMetadata,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  };
}
