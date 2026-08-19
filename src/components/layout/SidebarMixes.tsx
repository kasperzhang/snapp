"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useWorkbenches } from "@/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils/cn";

/* How many mixes the rail lists inline. It used to print every one, so a
   dozen mixes pushed TAGS off the bottom and the sidebar became the thing you
   scrolled. The rail is a shortcut to what you were last working on; the full
   set lives on /mix, which the rail previously had no link to at all. */
const INLINE_LIMIT = 6;

export function SidebarMixes() {
  const pathname = usePathname();
  const router = useRouter();
  const { workbenches, deleteWorkbench, renameWorkbench } = useWorkbenches();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = workbenches.find((w) => w.id === deletingId);

  // Escape has to leave the name alone, and it unmounts the input — which
  // fires the blur that would otherwise save it.
  const abandoned = useRef(false);

  const activeId = pathname.startsWith("/mix/") ? pathname.split("/")[2] : null;

  /* The most recent few, plus whichever mix is open: being on a mix the rail
     doesn't list reads as having navigated out of the section entirely. */
  const shown = workbenches.slice(0, INLINE_LIMIT);
  const active = workbenches.find((w) => w.id === activeId);
  if (active && !shown.includes(active)) shown.push(active);

  const startRename = (id: string, name: string) => {
    setDraft(name);
    setEditingId(id);
  };

  const commitRename = async (id: string, original: string) => {
    if (abandoned.current) {
      abandoned.current = false;
      setEditingId(null);
      return;
    }
    const name = draft.trim();
    setEditingId(null);
    if (!name || name === original) return;
    await renameWorkbench(id, name);
  };

  return (
    <div className="flex flex-col gap-px pt-1 pb-0.5 ml-3.5 border-l border-[var(--border)]">
      {workbenches.length === 0 ? (
        <p className="ml-2 px-2.5 py-[7px] text-[13px] text-[var(--text-muted)]">
          No mixes yet
        </p>
      ) : (
        shown.map((w) => {
          const isActive = w.id === activeId;
          const menuOpen = menuOpenId === w.id;

          if (editingId === w.id) {
            return (
              <input
                key={w.id}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => commitRename(w.id, w.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    abandoned.current = true;
                    e.currentTarget.blur();
                  }
                }}
                className="ml-2 mr-0.5 my-px px-2 py-[6px] rounded-lg border border-[var(--accent)] bg-white text-[13px] text-[var(--foreground)] focus:outline-none"
              />
            );
          }

          return (
            <div
              key={w.id}
              className={cn(
                "group/mix flex items-center ml-2 rounded-lg transition-colors",
                isActive
                  ? "bg-[var(--sidebar-hover)]"
                  : "hover:bg-[var(--sidebar-hover)]"
              )}
            >
              {/* Full name on hover — these are generated from two domains and
                  routinely outrun the rail's width. */}
              <Link
                href={`/mix/${w.id}`}
                title={w.name}
                className={cn(
                  "flex-1 min-w-0 truncate px-2.5 py-[7px] text-[13px] transition-colors",
                  isActive
                    ? "text-[var(--foreground)] font-medium"
                    : "text-[var(--text-secondary)] group-hover/mix:text-[var(--foreground)]"
                )}
              >
                {w.name}
              </Link>

              {/* One slot, two occupants: the source count at rest, the row
                  menu once you're pointing at the row. Giving each its own
                  column would push the names even narrower. */}
              <span className="relative w-6 h-6 mr-1 shrink-0">
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)] transition-opacity",
                    "group-hover/mix:opacity-0",
                    menuOpen && "opacity-0"
                  )}
                >
                  {w.item_count ?? 0}
                </span>

                <DropdownMenu
                  onOpenChange={(open) => setMenuOpenId(open ? w.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      title="Mix options"
                      className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--border)] hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover/mix:opacity-100",
                        menuOpen && "opacity-100"
                      )}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => startRename(w.id, w.name)}
                    >
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeletingId(w.id)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </div>
          );
        })
      )}

      {workbenches.length > 0 && (
        <Link
          href="/mix"
          className={cn(
            "flex items-center gap-2 ml-2 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors",
            pathname === "/mix"
              ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
              : "text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
          )}
        >
          <span className="flex-1 text-left whitespace-nowrap">All mixes</span>
          <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)] mr-1">
            {workbenches.length}
          </span>
        </Link>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete mix?"
        description={
          deleting
            ? `"${deleting.name}" and its guide will be deleted. Your bookmarks stay in the library.`
            : ""
        }
        onConfirm={async () => {
          if (!deletingId) return;
          const wasOpen = deletingId === activeId;
          await deleteWorkbench(deletingId);
          // Otherwise the mix page sits there loading a row that's gone.
          if (wasOpen) router.push("/mix");
        }}
      />
    </div>
  );
}
