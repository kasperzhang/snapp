"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useBookmarks, useTags } from "@/hooks";
import { BookmarkGrid, AddBookmarkDialog, EditBookmarkDialog } from "@/components/bookmark";
import { SiteAnalysisDialog } from "@/components/analysis";
import { NameWorkbenchDialog } from "@/components/workbench";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { BookmarkWithRelations } from "@/types";
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
  const addDialogTriggerRef = useRef<HTMLButtonElement>(null);

  // Workbench compose (select) mode
  const [composeActive, setComposeActive] = useState(
    searchParams.get("compose") === "1"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nameOpen, setNameOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("compose")) router.replace("/");
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

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      await deleteBookmark(bookmarkId);
    }
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
    setComposeActive(true);
  };
  const cancelCompose = () => {
    setComposeActive(false);
    setSelectedIds(new Set());
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const confirmCompose = () => {
    if (selectedIds.size > 0) setNameOpen(true);
  };
  const createWorkbench = async (name: string) => {
    const res = await fetch("/api/workbenches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bookmark_ids: Array.from(selectedIds) }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || "Failed to create workbench");
    }
    const wb = await res.json();
    router.push(`/workbench/${wb.id}`);
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
              Select sites for your workbench
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelCompose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmCompose}
                disabled={selectedIds.size === 0}
              >
                Confirm
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
              <p className="text-[13px] text-[#8a8a8a] mt-1">
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
            Tap sites to add them to your new workbench, then press Confirm.
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
          />
        </main>
        </div>
      </ContentPanel>

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

      <NameWorkbenchDialog
        open={nameOpen}
        onOpenChange={setNameOpen}
        count={selectedIds.size}
        onConfirm={createWorkbench}
      />
    </div>
  );
}
