"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TagChip } from "@/components/ui/TagChip";
import { Tag, URLMetadata } from "@/types";

interface AddBookmarkDialogProps {
  tags: Tag[];
  onSubmit: (data: {
    url: string;
    title: string;
    description?: string;
    favicon_url?: string;
    og_image_url?: string;
    domain?: string;
    tag_ids: string[];
  }) => Promise<void>;
  onCreateTag: (name: string) => Promise<Tag>;
  fetchMetadata: (url: string) => Promise<URLMetadata>;
  trigger?: React.ReactNode;
}

export function AddBookmarkDialog({
  tags,
  onSubmit,
  onCreateTag,
  fetchMetadata,
  trigger,
}: AddBookmarkDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<URLMetadata | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setUrl("");
      setTitle("");
      setDescription("");
      setMetadata(null);
      setSelectedTags([]);
      setNewTagName("");
      setError(null);
    }
  }, [open]);

  const handleUrlBlur = async () => {
    if (!url) return;

    try {
      // Validate URL
      const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      const normalizedUrl = parsedUrl.href;
      setUrl(normalizedUrl);

      setFetchingMetadata(true);
      setError(null);
      const data = await fetchMetadata(normalizedUrl);
      setMetadata(data);
      setTitle(data.title);
      setDescription(data.description || "");
    } catch (err) {
      console.error("Error fetching metadata:", err);
      setError("Could not fetch page info. You can still add the bookmark manually.");
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !title) return;

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        url,
        title,
        description: description || undefined,
        favicon_url: metadata?.favicon_url || undefined,
        og_image_url: metadata?.og_image_url || undefined,
        domain: metadata?.domain || undefined,
        tag_ids: selectedTags,
      });

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bookmark");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Bookmark
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bookmark</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* URL Input */}
          <div className="relative">
            <Input
              label="URL"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              disabled={loading}
            />
            {fetchingMetadata && (
              <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-[var(--text-secondary)]" />
            )}
          </div>

          {/* Title Input */}
          <Input
            label="Title"
            placeholder="Page title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading || fetchingMetadata}
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
              disabled={loading || fetchingMetadata}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
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
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Preview */}
          {metadata?.og_image_url && (
            <div className="rounded-lg overflow-hidden border border-[var(--border)]">
              <img
                src={metadata.og_image_url}
                alt="Preview"
                className="w-full h-32 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!url || !title || loading || fetchingMetadata}
              loading={loading}
            >
              Add Bookmark
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
