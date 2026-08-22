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
  /** A page handed over by the extension (/app?add=…). Opens the dialog with
      the URL and title already filled, so the only thing left is tagging. Read
      once, at mount — the page clears the query string straight after. */
  prefill?: { url: string; title?: string } | null;
}

export function AddBookmarkDialog({
  tags,
  onSubmit,
  onCreateTag,
  fetchMetadata,
  trigger,
  prefill,
}: AddBookmarkDialogProps) {
  const [open, setOpen] = useState(!!prefill);
  const [url, setUrl] = useState(prefill?.url ?? "");
  const [title, setTitle] = useState(prefill?.title ?? "");
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

  /* The extension can give us a URL and a tab title, but not the favicon,
     og:image or domain the bookmark row wants — so fetch the same metadata the
     URL field would have fetched on blur. The tab title stays if we already
     have one: it's what the user was actually looking at. */
  useEffect(() => {
    if (!prefill) return;
    let alive = true;

    const hydrate = async () => {
      setFetchingMetadata(true);
      try {
        const data = await fetchMetadata(prefill.url);
        if (!alive) return;
        setMetadata(data);
        setTitle((current) => current || data.title);
        setDescription(data.description || "");
      } catch (err) {
        // Keep whatever the extension handed over — it's enough to save.
        console.error("Error fetching metadata for prefill:", err);
      } finally {
        if (alive) setFetchingMetadata(false);
      }
    };
    hydrate();

    return () => {
      alive = false;
    };
    // Runs once: `prefill` is captured at mount and the page clears it after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            Add bookmark
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add bookmark</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* URL Input — Enter fetches page info instead of submitting */}
          <div className="relative">
            <Input
              label="URL"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={loading}
            />
            {fetchingMetadata && (
              <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-[var(--text-secondary)]" />
            )}
            {!fetchingMetadata && metadata?.domain && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                {metadata.favicon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={metadata.favicon_url}
                    alt=""
                    className="w-3.5 h-3.5 rounded-[4px]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                Found {metadata.domain}
              </p>
            )}
          </div>

          {/* Title Input */}
          <Input
            label="Title"
            placeholder={fetchingMetadata ? "Fetching page info…" : "Page title"}
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
              rows={3}
              className="w-full px-3 py-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">
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
                  selected={selectedTags.includes(tag.id)}
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
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* No og:image preview here. It's the site's share banner, not what
              gets saved, and at 128px tall it pushed the actions below the
              fold to confirm something the "Found aihero.dev" line already
              confirms. The card in the grid shows the real thing. */}

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
              Add bookmark
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
