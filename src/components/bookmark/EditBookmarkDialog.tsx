"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TagChip } from "@/components/ui/TagChip";
import { BookmarkWithRelations, Tag } from "@/types";

interface EditBookmarkDialogProps {
  bookmark: BookmarkWithRelations | null;
  tags: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    tag_ids: string[];
  }) => Promise<void>;
  onCreateTag: (name: string) => Promise<Tag>;
}

export function EditBookmarkDialog({
  bookmark,
  tags,
  open,
  onOpenChange,
  onSubmit,
  onCreateTag,
}: EditBookmarkDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when bookmark changes
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setDescription(bookmark.description || "");
      setSelectedTags(bookmark.tags?.map((t) => t.id) || []);
      setNewTagName("");
      setError(null);
    }
  }, [bookmark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        title,
        description: description || undefined,
        tag_ids: selectedTags,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bookmark");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const tag = await onCreateTag(newTagName.trim());
      setSelectedTags((prev) => [...prev, tag.id]);
      setNewTagName("");
    } catch (err) {
      console.error("Error creating tag:", err);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (!bookmark) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* URL (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              URL
            </label>
            <div className="h-10 px-3 flex items-center rounded-[var(--radius-button)] bg-[var(--border)] text-[var(--text-secondary)] text-sm truncate">
              {bookmark.url}
            </div>
          </div>

          {/* Title Input */}
          <Input
            label="Title"
            placeholder="Page title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />

          {/* Description Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Description (optional)
            </label>
            <textarea
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-button)] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  selected={selectedTags.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                  size="sm"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="New tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title || loading} loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
