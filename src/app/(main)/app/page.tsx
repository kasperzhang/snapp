"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Layers, Loader2, Plus, Sparkles } from "lucide-react";
import { useBookmarks, useTags, announceMixesChanged } from "@/hooks";
import {
  BookmarkGrid,
  AddBookmarkDialog,
  EditBookmarkDialog,
  ExtensionInvite,
} from "@/components/bookmark";
import { SiteAnalysisDialog } from "@/components/analysis";
import { MixPanel } from "@/components/workbench";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { GuideCredits } from "@/components/billing";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BOOKMARKS_PAGE_SIZE } from "@/lib/pagination";
import { BookmarkWithRelations, DesignAspect } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [untaggedOnly, setUntaggedOnly] = useState(false);
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

  /* A page handed over by the extension's save button: /app?add=<url>&title=…
     Captured at mount, before the effect below strips the query string, so a
     reload or a shared link can't re-open the dialog. */
  const [addPrefill] = useState(() => {
    const url = searchParams.get("add");
    if (!url) return null;
    return { url, title: searchParams.get("title") ?? undefined };
  });

  /* The extension's "Add tags" / "Open" notification buttons land on
     /app?edit=<id>. The row has to arrive from the bookmarks query before the
     dialog can show it, so this is held until a match turns up — a save always
     lands on the first page, so in practice that's the first render with data. */
  const [pendingEditId, setPendingEditId] = useState(() =>
    searchParams.get("edit")
  );

  useEffect(() => {
    if (searchParams.get("compose") || searchParams.get("add") || searchParams.get("edit")) {
      router.replace("/app");
    }
  }, [searchParams, router]);

  const {
    bookmarks,
    total: totalBookmarks,
    libraryTotal,
    loading: bookmarksLoading,
    loadingMore,
    hasMore,
    loadMore,
    fetchMetadata,
    createBookmark,
    updateBookmark,
    deleteBookmark,
  } = useBookmarks({
    search: debouncedSearch,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    untagged: untaggedOnly,
  });

  useEffect(() => {
    if (!pendingEditId) return;
    const match = bookmarks.find((b) => b.id === pendingEditId);
    if (!match) return;
    setEditingBookmark(match);
    setPendingEditId(null);
  }, [pendingEditId, bookmarks]);

  // A cold load has nothing to show, so it gets skeletons. A page flip or
  // filter change already has the previous results on screen — swapping those
  // for skeletons makes the app feel slower than it is, so they stay put and
  // dim instead.
  const firstLoad = bookmarksLoading && bookmarks.length === 0;
  const refreshing = bookmarksLoading && bookmarks.length > 0;

  // Scrolling past the last card pulls the next page in and appends it, so the
  // library reads as one continuous list. The rail stays for jumping — it
  // re-anchors and replaces, which is why the two can coexist.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    // root: null is correct even though ContentPanel scrolls internally —
    // intersection is computed against the viewport with ancestor clipping
    // applied, so the sentinel registers exactly when it scrolls into sight.
    // The margin starts the fetch shortly before the sentinel is reached, so
    // the next rows are usually there by the time you get to them without
    // firing so early that it loads before you've really scrolled.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
    // composeActive matters: the sentinel unmounts during compose, so without
    // it here the observer would never re-attach to the new node afterwards
    // and scrolling would silently stop loading.
  }, [hasMore, loadMore, composeActive]);

  const gridTopRef = useRef<HTMLDivElement>(null);
  const scrollToTop = () =>
    gridTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });

  // Show "back to top" once the top of the grid is off screen. Observing a
  // marker beats a scroll listener here: ContentPanel scrolls internally, so
  // there is no window scroll to listen to, and this needs no knowledge of
  // which ancestor is the scroller.
  const topMarkerRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const el = topMarkerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowTop(!entry.isIntersecting),
      { rootMargin: "200px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { tags, untaggedCount, createTag, refresh: refreshTags } = useTags();

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
    refreshTags();
  };

  const handleUpdateBookmark = async (data: {
    title: string;
    description?: string;
    tag_ids: string[];
  }) => {
    if (editingBookmark) {
      await updateBookmark(editingBookmark.id, data);
      // Tag counts live on the tags endpoint now, so they don't follow the
      // bookmark list — re-read them when membership changes.
      refreshTags();
    }
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    setDeletingBookmark(bookmarks.find((b) => b.id === bookmarkId) ?? null);
  };

  const handleAddClick = () => addDialogTriggerRef.current?.click();

  // ── Tag filter ──
  const toggleTag = (id: string) => {
    // Picking a tag leaves the untagged view — they're mutually exclusive.
    setUntaggedOnly(false);
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  // "All" clears every filter, untagged included.
  const clearTags = () => {
    setSelectedTagIds([]);
    setUntaggedOnly(false);
  };

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

  // Create the mix and open the guide rail — no page jump.
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
        totalBookmarks={libraryTotal}
        untaggedCount={untaggedCount}
        untaggedActive={untaggedOnly}
        // The two are alternatives: "has this tag" and "has no tag" can't
        // both hold, so each clears the other.
        onToggleUntagged={() => {
          setUntaggedOnly((v) => !v);
          setSelectedTagIds([]);
        }}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTag}
        onClearTags={clearTags}
        onNewWorkbench={startCompose}
      />

      <ContentPanel>
        <div className="flex flex-col min-h-full">
        {/* Compose bar — mirrors the landing mockup: MIX badge, editable
            name, live counts, ink Generate. A direct child of the scrollable
            flex column (not nested inside the small header block below) so
            its containing block spans the whole scroll area — sticky only
            stays pinned while its own parent is still in view, and the
            header block alone is far shorter than the full bookmark list. */}
        {composeActive && (
          <div className="sticky top-0 z-20 bg-[var(--background)] px-6 md:px-10 pt-7 pb-2">
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
              <GuideCredits className="hidden sm:inline" />
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
                Generate guide
              </Button>
            </div>
          </div>
        )}

        {/* Content header */}
        {composeActive ? (
          <div className="px-6 md:px-10">
            {/* The big picture — direction for the whole mix, not one site */}
            <div className={composeClosing ? "rise-out" : "rise-in rise-in-1"}>
              <p className="mb-1.5 mt-3.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Mix notes
              </p>
              <textarea
                value={ownNotes}
                onChange={(e) => setOwnNotes(e.target.value)}
                placeholder="Overall direction — what you're building, who it's for, the mood, any brand rules. This shapes the whole guide."
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
                {totalBookmarks}{" "}
                {totalBookmarks === 1 ? "bookmark" : "bookmarks"}
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
        <main className="flex flex-1 gap-5 px-6 md:px-10 py-7">
          <div
            ref={gridTopRef}
            className={cn(
              "flex min-w-0 flex-1 flex-col scroll-mt-6 transition-opacity duration-200",
              refreshing && "pointer-events-none opacity-40"
            )}
            aria-busy={refreshing}
          >
          {/* Zero-height marker: once this scrolls out of sight the grid is
              deep enough to be worth offering a way back. */}
          <div ref={topMarkerRef} aria-hidden className="h-0" />
          <BookmarkGrid
            bookmarks={bookmarks}
            loading={firstLoad}
            // Two rows fills the viewport without building a grid of 18
            // placeholders the user will never scroll to.
            skeletonCount={Math.min(6, BOOKMARKS_PAGE_SIZE)}
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
                <div className="flex flex-col items-center gap-3">
                  <Button onClick={handleAddClick}>
                    <Plus className="w-4 h-4" />
                    Add your first bookmark
                  </Button>
                  <ExtensionInvite className="max-w-[19rem] text-center" />
                </div>
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
            {/* Sentinel + status line for the append-on-scroll behaviour. Only
                rendered when the grid is the whole story — during compose the
                selection is what matters and quietly growing the list under the
                user would move the cards they're picking from. */}
            {!composeActive && (hasMore || bookmarks.length > BOOKMARKS_PAGE_SIZE) && (
              <div ref={sentinelRef} className="py-6 text-center">
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading more…
                  </span>
                ) : !hasMore && bookmarks.length > BOOKMARKS_PAGE_SIZE ? (
                  <span className="text-[13px] text-[var(--text-muted)]">
                    That&apos;s everything — {totalBookmarks} bookmarks.
                  </span>
                ) : null}
              </div>
            )}
          </div>

        </main>
        </div>

        {/* Infinite scroll's own cost is the journey back. Hidden while the mix
            rail is open, which occupies this corner. */}
        {showTop && !panelMixId && (
          <button
            onClick={scrollToTop}
            className="pop-in fixed bottom-6 right-6 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-transparent bg-[var(--surface)] pl-3.5 pr-4 text-[13px] font-medium text-[var(--text-secondary)] shadow-lg transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ArrowUp className="h-4 w-4" />
            Back to top
          </button>
        )}
      </ContentPanel>

      {/* The guide rail — generate and iterate without leaving the library */}
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
        prefill={addPrefill}
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
          if (deletingBookmark) {
            await deleteBookmark(deletingBookmark.id);
            refreshTags();
          }
        }}
      />

    </div>
  );
}
