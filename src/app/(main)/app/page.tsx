"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, Plus, Sparkles } from "lucide-react";
import { useBookmarks, useTags, announceMixesChanged } from "@/hooks";
import { BookmarkGrid, AddBookmarkDialog, EditBookmarkDialog } from "@/components/bookmark";
import { SiteAnalysisDialog } from "@/components/analysis";
import { MixPanel } from "@/components/workbench";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BookmarkWithRelations, DesignAspect } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

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
  const [commentsById, setCommentsById] = useState<Record<string, string>>({});
  const [ownNotes, setOwnNotes] = useState("");
  // The mix name shown in the compose bar: live-suggested from the selected
  // domains until the user edits it.
  const [mixName, setMixName] = useState("");
  const nameTouched = useRef(false);
  const [creatingMix, setCreatingMix] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  // Plays the exit animation before compose unmounts.
  const [composeClosing, setComposeClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
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
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setComposeClosing(false);
    setSelectedIds(new Set());
    setAspectsById({});
    setCommentsById({});
    setOwnNotes("");
    setMixName("");
    nameTouched.current = false;
    setComposeError(null);
    setComposeActive(true);
  };
  const teardownCompose = () => {
    setComposeClosing(false);
    setComposeActive(false);
    setSelectedIds(new Set());
    setAspectsById({});
    setCommentsById({});
    setOwnNotes("");
    setMixName("");
    nameTouched.current = false;
    setComposeError(null);
  };
  // Fade the compose block out, then unmount it.
  const cancelCompose = () => {
    if (composeClosing) return;
    setComposeClosing(true);
    closeTimer.current = window.setTimeout(teardownCompose, 220);
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Deselecting a card drops its tagged aspects and note too.
        setAspectsById(({ [id]: _dropped, ...rest }) => rest);
        setCommentsById(({ [id]: _dropped, ...rest }) => rest);
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
  const changeComment = (bookmarkId: string, comment: string) =>
    setCommentsById((prev) => ({ ...prev, [bookmarkId]: comment }));

  const aspectCount = Object.values(aspectsById).reduce(
    (n, arr) => n + arr.length,
    0
  );

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
  const displayMixName = nameTouched.current ? mixName : suggestMixName();

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
          name: displayMixName.trim() || suggestMixName(),
          own_additions: ownNotes,
          items: Array.from(selectedIds).map((id) => ({
            bookmark_id: id,
            aspects: aspectsById[id] ?? [],
            comment: commentsById[id] ?? "",
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
          <div className="px-6 md:px-10 pt-7">
            {/* Compose bar — mirrors the landing mockup: MIX badge, editable
                name, live counts, ink Generate */}
            <div
              className={cn(
                composeClosing ? "rise-out" : "rise-in",
                "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#DECDB4] bg-gradient-to-r from-[#F8F2E7] to-[#FDFBF6] py-2.5 pl-4 pr-2.5"
              )}
            >
              <span className="rounded-md border border-[var(--brand)] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--brand)]">
                Mix
              </span>
              <input
                value={displayMixName}
                onChange={(e) => {
                  nameTouched.current = true;
                  setMixName(e.target.value);
                }}
                title="Name your mix"
                className="w-[150px] min-w-0 truncate border-none bg-transparent text-[14px] font-medium text-[var(--foreground)] focus:outline-none focus:ring-0 sm:w-[190px]"
              />
              <span className="hidden text-[13px] text-[var(--text-secondary)] sm:inline">
                <b className="font-semibold text-[var(--foreground)]">
                  {selectedIds.size}{" "}
                  {selectedIds.size === 1 ? "source" : "sources"}
                </b>
                {" · "}
                {aspectCount} {aspectCount === 1 ? "aspect" : "aspects"} tagged
              </span>
              <span className="flex-1" />
              <Button variant="ghost" size="sm" onClick={cancelCompose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={generateMix}
                loading={creatingMix}
                disabled={selectedIds.size === 0 || creatingMix}
                className="bg-[var(--foreground)] hover:bg-black"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate brief
              </Button>
            </div>

            {/* The big picture — direction for the whole mix, not one site */}
            <div className={composeClosing ? "rise-out" : "rise-in rise-in-1"}>
              <p className="mb-1.5 mt-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Mix notes
              </p>
              <textarea
                value={ownNotes}
                onChange={(e) => setOwnNotes(e.target.value)}
                placeholder="Overall direction — what you're building, who it's for, the mood, any brand rules. This shapes the whole brief."
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
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
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={startCompose}>
                <Layers className="w-4 h-4" />
                New mix
              </Button>
              <Button size="sm" onClick={handleAddClick}>
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Compose hint */}
        {composeActive && (
          <div
            className={cn(
              composeClosing ? "rise-out" : "rise-in rise-in-2",
              "px-6 md:px-10 pt-3 text-[13px] text-[var(--text-muted)]"
            )}
          >
            Tap sites to add them ·{" "}
            <b className="font-medium text-[var(--text-secondary)]">+ Borrow</b>{" "}
            tags aspects ·{" "}
            <b className="font-medium text-[var(--text-secondary)]">+ Note</b>{" "}
            says what tags can&apos;t
            {composeError && (
              <span className="ml-2 text-red-500">{composeError}</span>
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
            emptyMessage={
              debouncedSearch || selectedTagIds.length > 0
                ? "Nothing matches"
                : "Save your first site"
            }
            emptyHint={
              debouncedSearch || selectedTagIds.length > 0
                ? "Try a different search or clear the tag filter."
                : "Paste any URL — snapp grabs the preview, favicon, fonts, and colors. Free and unlimited."
            }
            emptyAction={
              !composeActive &&
              !debouncedSearch &&
              selectedTagIds.length === 0 ? (
                <Button onClick={handleAddClick}>
                  <Plus className="w-4 h-4" />
                  Add your first bookmark
                </Button>
              ) : undefined
            }
            selectable={composeActive}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            aspectsById={aspectsById}
            onToggleAspect={toggleAspect}
            commentsById={commentsById}
            onCommentChange={changeComment}
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
