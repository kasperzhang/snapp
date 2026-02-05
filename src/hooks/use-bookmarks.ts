"use client";

import { useState, useCallback, useEffect } from "react";
import { BookmarkWithRelations, CreateBookmarkInput, URLMetadata } from "@/types";

interface UseBookmarksOptions {
  search?: string;
  tagIds?: string[];
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  const [bookmarks, setBookmarks] = useState<BookmarkWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.search) params.set("search", options.search);
      if (options.tagIds?.length) params.set("tags", options.tagIds.join(","));

      const response = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }

      const data = await response.json();
      setBookmarks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookmarks");
    } finally {
      setLoading(false);
    }
  }, [options.search, options.tagIds]);

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
  };

  return {
    bookmarks,
    loading,
    error,
    refresh: fetchBookmarks,
    fetchMetadata,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  };
}
