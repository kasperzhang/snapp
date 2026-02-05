"use client";

import { useState, useCallback, useEffect } from "react";
import { Tag, CreateTagInput } from "@/types";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/tags");
      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const data = await response.json();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = async (input: CreateTagInput) => {
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create tag");
    }

    const newTag = await response.json();
    setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
    return newTag;
  };

  const updateTag = async (id: string, name: string) => {
    const response = await fetch("/api/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update tag");
    }

    const updatedTag = await response.json();
    setTags((prev) =>
      prev
        .map((t) => (t.id === id ? updatedTag : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return updatedTag;
  };

  const deleteTag = async (id: string) => {
    const response = await fetch("/api/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete tag");
    }

    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    tags,
    loading,
    error,
    refresh: fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
