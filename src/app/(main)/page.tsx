"use client";

import { useState, useEffect, useRef } from "react";
import { useBookmarks, useTags } from "@/hooks";
import { BookmarkGrid, AddBookmarkDialog, EditBookmarkDialog } from "@/components/bookmark";
import { SearchBar, TagFilter } from "@/components/search";
import { Header } from "@/components/layout";
import { BookmarkWithRelations } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>();
  const [editingBookmark, setEditingBookmark] = useState<BookmarkWithRelations | null>(null);
  const addDialogTriggerRef = useRef<HTMLButtonElement>(null);

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

  const { tags, createTag, updateTag, deleteTag } = useTags();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Get user email
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email);
    });
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
    if (editingBookmark) {
      await updateBookmark(editingBookmark.id, data);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      await deleteBookmark(bookmarkId);
    }
  };

  const handleAddClick = () => {
    addDialogTriggerRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header
        userEmail={userEmail}
        search={search}
        onSearchChange={setSearch}
        onAddClick={handleAddClick}
      />

      <main className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Mobile Search */}
        <div className="md:hidden mb-6">
          <SearchBar
            value={search}
            onChange={setSearch}
            className="w-full"
          />
        </div>

        {/* Tag Filter */}
        {tags.length > 0 && (
          <div className="mb-8">
            <TagFilter
              tags={tags}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onCreateTag={async (name) => {
                await createTag({ name });
              }}
              onUpdateTag={updateTag}
              onDeleteTag={deleteTag}
            />
          </div>
        )}

        {/* Bookmarks Grid */}
        <BookmarkGrid
          bookmarks={bookmarks}
          loading={bookmarksLoading}
          onEdit={(bookmark) => setEditingBookmark(bookmark)}
          onDelete={handleDeleteBookmark}
        />
      </main>

      {/* Hidden Add Bookmark Dialog Trigger */}
      <AddBookmarkDialog
        tags={tags}
        onSubmit={handleAddBookmark}
        onCreateTag={(name) => createTag({ name })}
        fetchMetadata={fetchMetadata}
        trigger={<button ref={addDialogTriggerRef} className="hidden" />}
      />

      {/* Edit Bookmark Dialog */}
      <EditBookmarkDialog
        bookmark={editingBookmark}
        tags={tags}
        open={!!editingBookmark}
        onOpenChange={(open) => !open && setEditingBookmark(null)}
        onSubmit={handleUpdateBookmark}
        onCreateTag={(name) => createTag({ name })}
      />
    </div>
  );
}
