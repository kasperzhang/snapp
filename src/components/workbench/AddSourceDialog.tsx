"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useBookmarks } from "@/hooks";
import { cn } from "@/lib/utils/cn";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bookmarks already in the mix — listed, but not addable twice. */
  presentIds: Set<string>;
  onAdd: (bookmarkId: string) => Promise<unknown>;
}

/* Adding a source used to mean leaving for the Bookmarks page and composing a
   new mix from scratch. This picks from the same library in place. */
export function AddSourceDialog({
  open,
  onOpenChange,
  presentIds,
  onAdd,
}: AddSourceDialogProps) {
  const [search, setSearch] = useState("");
  const { bookmarks, loading } = useBookmarks({ search });
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const add = async (id: string) => {
    setAdding(id);
    try {
      await onAdd(id);
      setAdded((prev) => new Set(prev).add(id));
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription className="pt-1">
            Pick another saved site to borrow from. It gets scanned as soon as
            you add it.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 focus-within:border-[var(--accent)]">
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your bookmarks…"
            className="h-full flex-1 bg-transparent text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        <div className="mt-3 max-h-[46vh] min-h-[180px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-secondary)]">
              {search ? "Nothing matches that." : "No bookmarks yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-px">
              {bookmarks.map((b) => {
                const inMix = presentIds.has(b.id) || added.has(b.id);
                return (
                  <li key={b.id}>
                    <button
                      disabled={inMix || adding === b.id}
                      onClick={() => add(b.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                        inMix
                          ? "cursor-default opacity-55"
                          : "hover:bg-[var(--sidebar-hover)]"
                      )}
                    >
                      {b.favicon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.favicon_url}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded"
                        />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded bg-[var(--border)]" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-[var(--foreground)]">
                          {b.title}
                        </span>
                        <span className="block truncate text-[11.5px] text-[var(--text-muted)]">
                          {b.domain}
                        </span>
                      </span>
                      {adding === b.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--text-muted)]" />
                      ) : inMix ? (
                        <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
