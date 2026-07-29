"use client";

import { useState, useCallback, useEffect } from "react";
import { BookmarkWithRelations, CreateBookmarkInput, URLMetadata } from "@/types";

interface UseBookmarksOptions {
  search?: string;
  tagIds?: string[];
  page?: number;
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.tagIds?.length) params.set("tags", options.tagIds.join(","));
      if (options.page && options.page > 1) params.set("page", String(options.page));

      const response = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }

      const data = await response.json();
      setBookmarks(data.items ?? []);
      setTotal(data.total ?? 0);
      setLibraryTotal(data.libraryTotal ?? data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookmarks");
    } finally {
      setLoading(false);
    }
  }, [options.search, options.tagIds, options.page]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

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
    error,
    refresh: fetchBookmarks,
    fetchMetadata,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  };
}
