"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  // Tags typed here that the server hasn't confirmed yet, tracked by name.
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when bookmark changes
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setDescription(bookmark.description || "");
      setSelectedTags(bookmark.tags?.map((t) => t.id) || []);
      setNewTagName("");
      // Otherwise a name still in flight from the last bookmark would attach
      // itself to this one the moment it lands.
      setPendingNames([]);
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
    const name = newTagName.trim();
    if (!name) return;
    // Clear first: waiting on the network to empty the field blocks typing the
    // next tag for as long as the round trip takes.
    setNewTagName("");

    /* Typing a tag you already have shouldn't cost a request at all. The list
       is right here — reuse it and select it. */
    const known = tags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (known) {
      setSelectedTags((prev) =>
        prev.includes(known.id) ? prev : [...prev, known.id]
      );
      return;
    }

    /* Held by name, not id: the optimistic tag carries a temporary id that the
       server replaces, and selecting the temporary one would leave the
       selection pointing at a row that never existed. */
    setPendingNames((prev) => [...prev, name]);
    try {
      await onCreateTag(name);
    } catch (err) {
      console.error("Error creating tag:", err);
      setPendingNames((prev) => prev.filter((n) => n !== name));
    }
  };

  /* Whenever the real tag arrives, adopt it and stop tracking the name. */
  useEffect(() => {
    if (!pendingNames.length) return;
    const landed = tags.filter(
      (t) =>
        !t.id.startsWith("temp-") &&
        pendingNames.some((n) => n.toLowerCase() === t.name.toLowerCase())
    );
    if (!landed.length) return;
    setSelectedTags((prev) => [
      ...prev,
      ...landed.map((t) => t.id).filter((id) => !prev.includes(id)),
    ]);
    setPendingNames((prev) =>
      prev.filter(
        (n) => !landed.some((t) => t.name.toLowerCase() === n.toLowerCase())
      )
    );
  }, [tags, pendingNames]);

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
          <DialogTitle>Edit bookmark</DialogTitle>
          <DialogDescription>
            Update the details and tags for this saved site.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-5">
          {/* URL (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--foreground)]">
              URL
            </label>
            <div className="h-10 pl-2.5 pr-3 flex items-center gap-2.5 rounded-[10px] bg-[var(--sidebar)] border border-[var(--border)] text-[var(--text-secondary)] text-sm">
              {bookmark.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bookmark.favicon_url}
                  alt=""
                  className="w-4 h-4 rounded shrink-0"
                />
              ) : (
                <Globe className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
              )}
              <span className="truncate">{bookmark.url}</span>
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
            <label className="text-[13px] font-medium text-[var(--foreground)]">
              Description{" "}
              <span className="text-[var(--text-muted)] font-normal">
                (optional)
              </span>
            </label>
            <textarea
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[13px] font-medium text-[var(--foreground)]">
              Tags
            </label>
            {/* Chips and the field share one row, so adding a tag reads as
                continuing the list rather than operating a separate control. */}
            <div className="flex flex-wrap items-center gap-2.5">
              {tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  selected={
                    selectedTags.includes(tag.id) ||
                    pendingNames.some(
                      (n) => n.toLowerCase() === tag.name.toLowerCase()
                    )
                  }
                  onClick={() => toggleTag(tag.id)}
                  size="xs"
                />
              ))}
              <input
                placeholder="Add a tag…"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  // Comma too: nobody who types tags for a living expects it
                  // to end up inside the tag.
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                onBlur={(e) => {
                  /* Except when leaving for Cancel — creating a tag on the way
                     out of a dialog someone is abandoning is a side effect
                     they didn't ask for. */
                  const to = e.relatedTarget as HTMLElement | null;
                  if (to?.dataset?.noTagCommit === undefined) handleCreateTag();
                }}
                size={Math.max(newTagName.length + 1, 8)}
                className="h-7 min-w-[5.5rem] rounded-full border border-dashed border-[var(--border)] bg-transparent px-2.5 text-[12px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-colors focus:border-solid focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-light)] -mx-6 px-6 mt-1">
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                data-no-tag-commit
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title || loading}
                loading={loading}
              >
                Save changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
