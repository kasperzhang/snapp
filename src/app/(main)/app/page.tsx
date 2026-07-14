"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { useBookmarks, useTags, announceMixesChanged } from "@/hooks";
import { BookmarkGrid, AddBookmarkDialog, EditBookmarkDialog } from "@/components/bookmark";
import { SiteAnalysisDialog } from "@/components/analysis";
import { MixPanel } from "@/components/workbench";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BookmarkWithRelations, DesignAspect } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>();
  const [editingBookmark, setEditingBookmark] = useState<BookmarkWithRelations | null>(null);
  const [analyzingBookmark, setAnalyzingBookmark] = useState<BookmarkWithRelations | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkWithRelations | null>(null);
  const addDialogTriggerRef = useRef<HTMLButtonElement>(null);

  // Mix compose (select + tag) mode
  const [composeActive, setComposeActive] = useState(
    searchParams.get("compose") === "1"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [aspectsById, setAspectsById] = useState<
    Record<string, DesignAspect[]>
  >({});
  const [creatingMix, setCreatingMix] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  // The generate-in-place rail — set right after a mix is created.
  const [panelMixId, setPanelMixId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("compose")) router.replace("/app");
  }, [searchParams, router]);

  const {
    bookmarks,
    loading: bookmarksLoading,
    fetchMetadata,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  } = useBookmarks({
    search: debouncedSearch,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
  });

  const { tags, createTag } = useTags();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email));
  }, []);

  const handleAddBookmark = async (data: {
    url: string;
    title: string;
    description?: string;
    favicon_url?: string;
    og_image_url?: string;
    domain?: string;
    tag_ids: string[];
  }) => {
    await createBookmark(data);
  };

  const handleUpdateBookmark = async (data: {
    title: string;
    description?: string;
    tag_ids: string[];
  }) => {
    if (editingBookmark) await updateBookmark(editingBookmark.id, data);
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    setDeletingBookmark(bookmarks.find((b) => b.id === bookmarkId) ?? null);
  };

  const handleAddClick = () => addDialogTriggerRef.current?.click();

  // ── Tag filter ──
  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const clearTags = () => setSelectedTagIds([]);

  // ── Compose ──
  const startCompose = () => {
    setSelectedIds(new Set());
    setAspectsById({});
    setComposeError(null);
    setComposeActive(true);
  };
  const cancelCompose = () => {
    setComposeActive(false);
    setSelectedIds(new Set());
    setAspectsById({});
    setComposeError(null);
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Deselecting a card drops its tagged aspects too.
        setAspectsById(({ [id]: _dropped, ...rest }) => rest);
      } else {
        next.add(id);
      }
      return next;
    });
  const toggleAspect = (bookmarkId: string, aspect: DesignAspect) =>
    setAspectsById((prev) => {
      const current = prev[bookmarkId] ?? [];
      return {
        ...prev,
        [bookmarkId]: current.includes(aspect)
          ? current.filter((a) => a !== aspect)
          : [...current, aspect],
      };
    });

  // Default mix name from its source domains: "stripe × linear +1".
  const suggestMixName = () => {
    const names = Array.from(selectedIds)
      .map((id) => bookmarks.find((b) => b.id === id)?.domain?.split(".")[0])
      .filter((n): n is string => !!n);
    const unique = [...new Set(names)];
    if (unique.length === 0) return "New mix";
    const head = unique.slice(0, 2).join(" × ");
    return unique.length > 2 ? `${head} +${unique.length - 2}` : head;
  };

  // Create the mix and open the brief rail — no page jump.
  const generateMix = async () => {
    if (selectedIds.size === 0 || creatingMix) return;
    setCreatingMix(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/workbenches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestMixName(),
          items: Array.from(selectedIds).map((id) => ({
            bookmark_id: id,
            aspects: aspectsById[id] ?? [],
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to create mix");
      }
      const wb = await res.json();
      announceMixesChanged();
      setPanelMixId(wb.id);
      cancelCompose();
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : "Failed to create mix");
    } finally {
      setCreatingMix(false);
    }
  };

  const title =
    selectedTagIds.length > 0
      ? tags
          .filter((t) => selectedTagIds.includes(t.id))
          .map((t) => t.name)
          .join(", ")
      : "All";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <Sidebar
        userEmail={userEmail}
        search={search}
        onSearchChange={setSearch}
        tags={tags}
        bookmarks={bookmarks}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        onClearTags={clearTags}
        onNewWorkbench={startCompose}
      />

      <ContentPanel>
        <div className="flex flex-col min-h-full">
        {/* Content header */}
        {composeActive ? (
          <div className="flex items-center justify-between px-6 md:px-10 pt-7">
            <div className="text-[15px] text-[var(--foreground)]">
              Compose a mix
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelCompose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={generateMix}
                loading={creatingMix}
                disabled={selectedIds.size === 0 || creatingMix}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate brief
                {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 md:px-10 pt-7">
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h1>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">
                {bookmarks.length}{" "}
                {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
              </p>
            </div>
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        )}

        {/* Compose hint */}
        {composeActive && (
          <div className="px-6 md:px-10 pt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-white text-xs font-semibold">
              {selectedIds.size}
            </span>
            Tap sites to add them, then tag what each one should lend — type,
            color, motion…
            {composeError && (
              <span className="text-red-500">{composeError}</span>
            )}
          </div>
        )}

        {/* Grid */}
        <main className="flex-1 px-6 md:px-10 py-7">
          <BookmarkGrid
            bookmarks={bookmarks}
            loading={bookmarksLoading}
            onEdit={(bookmark) => setEditingBookmark(bookmark)}
            onDelete={handleDeleteBookmark}
            onAnalyze={(bookmark) => setAnalyzingBookmark(bookmark)}
            selectable={composeActive}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            aspectsById={aspectsById}
            onToggleAspect={toggleAspect}
          />
        </main>
        </div>
      </ContentPanel>

      {/* The brief rail — generate and iterate without leaving the library */}
      {panelMixId && (
        <MixPanel
          workbenchId={panelMixId}
          onClose={() => setPanelMixId(null)}
        />
      )}

      {/* Hidden Add Bookmark Dialog Trigger */}
      <AddBookmarkDialog
        tags={tags}
        onSubmit={handleAddBookmark}
        onCreateTag={(name) => createTag({ name })}
        fetchMetadata={fetchMetadata}
        trigger={<button ref={addDialogTriggerRef} className="hidden" />}
      />

      <EditBookmarkDialog
        bookmark={editingBookmark}
        tags={tags}
        open={!!editingBookmark}
        onOpenChange={(open) => !open && setEditingBookmark(null)}
        onSubmit={handleUpdateBookmark}
        onCreateTag={(name) => createTag({ name })}
      />

      <SiteAnalysisDialog
        bookmark={analyzingBookmark}
        open={!!analyzingBookmark}
        onOpenChange={(open) => !open && setAnalyzingBookmark(null)}
      />

      <ConfirmDialog
        open={!!deletingBookmark}
        onOpenChange={(open) => !open && setDeletingBookmark(null)}
        title="Delete bookmark?"
        description={
          deletingBookmark
            ? `"${deletingBookmark.title}" will be removed from your library. This can't be undone.`
            : ""
        }
        onConfirm={async () => {
          if (deletingBookmark) await deleteBookmark(deletingBookmark.id);
        }}
      />

    </div>
  );
}
