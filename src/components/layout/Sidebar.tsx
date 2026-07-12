"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bookmark,
  Briefcase,
  ChevronDown,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkbenches } from "@/hooks";
import { Tag, BookmarkWithRelations } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  userEmail?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  tags?: Tag[];
  bookmarks?: BookmarkWithRelations[];
  selectedTagIds?: string[];
  onToggleTag?: (id: string) => void;
  onClearTags?: () => void;
  // Start the compose flow on the current page (Bookmarks). If absent, we
  // navigate home into compose mode.
  onNewWorkbench?: () => void;
}

export function Sidebar({
  userEmail,
  search,
  onSearchChange,
  tags,
  bookmarks,
  selectedTagIds = [],
  onToggleTag,
  onClearTags,
  onNewWorkbench,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { workbenches } = useWorkbenches();

  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wbExpanded, setWbExpanded] = useState(
    pathname.startsWith("/workbench")
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const startNewWorkbench = () => {
    if (onNewWorkbench) onNewWorkbench();
    else router.push("/?compose=1");
  };

  const label = (uc: string) => (
    <div className="font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.12em] text-[var(--text-muted)] px-2 pb-2 pt-1">
      {uc}
    </div>
  );

  const bookmarksActive = pathname === "/";

  // ── Collapsed rail ─────────────────────────────────────────────────────────
  if (collapsed) {
    const railBtn = (active: boolean) =>
      cn(
        "w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors",
        active
          ? "bg-white text-[var(--foreground)] border border-[var(--foreground)] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
      );
    return (
      <aside className="w-16 shrink-0 bg-[var(--sidebar)] flex flex-col items-center py-5 gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--foreground)] text-white flex items-center justify-center font-[family-name:var(--font-space-grotesk)] font-bold text-sm mb-3">
          s
        </div>
        <Link href="/" className={railBtn(bookmarksActive)} title="Bookmarks">
          <Bookmark className="w-[18px] h-[18px]" />
        </Link>
        <Link
          href="/workbench"
          className={railBtn(pathname.startsWith("/workbench"))}
          title="Workbench"
        >
          <Briefcase className="w-[18px] h-[18px]" />
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-hover)]"
          title="Expand"
        >
          <PanelLeftOpen className="w-[18px] h-[18px]" />
        </button>
      </aside>
    );
  }

  // ── Full sidebar ───────────────────────────────────────────────────────────
  const navItem = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 px-2.5 py-2.5 rounded-[9px] text-[13.5px] transition-colors cursor-pointer",
      active
        ? "bg-white text-[var(--foreground)] font-medium border border-[var(--foreground)] shadow-sm"
        : "text-[var(--text-secondary)] border border-transparent hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
    );

  return (
    <aside className="w-[236px] shrink-0 bg-[var(--sidebar)] flex flex-col px-3 py-5 h-full overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-[var(--foreground)] text-white flex items-center justify-center font-[family-name:var(--font-space-grotesk)] font-bold text-[15px]">
          s
        </div>
        <span className="font-[family-name:var(--font-space-grotesk)] font-semibold text-lg tracking-tight text-[var(--foreground)]">
          snapp
        </span>
      </div>

      {/* Search */}
      {searchOpen && onSearchChange ? (
        <input
          autoFocus
          value={search || ""}
          onChange={(e) => onSearchChange(e.target.value)}
          onBlur={() => setSearchOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
          placeholder="Search bookmarks…"
          className="mb-5 w-full rounded-[10px] bg-white border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      ) : (
        <button
          onClick={() => (onSearchChange ? setSearchOpen(true) : router.push("/"))}
          className="mb-5 flex items-center gap-2.5 w-full bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-[10px] px-2.5 py-2.5 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#c9c9c4] transition-colors"
        >
          <Search className="w-[15px] h-[15px]" />
          <span className="flex-1 text-left">
            {search ? search : "Search"}
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5">
            ⌘K
          </span>
        </button>
      )}

      {/* LIBRARY */}
      {label("LIBRARY")}
      <div className="flex flex-col gap-0.5 mb-5">
        <Link href="/" className={navItem(bookmarksActive)}>
          <Bookmark className="w-[15px] h-[15px]" />
          <span>Bookmarks</span>
        </Link>

        <button
          className={navItem(pathname.startsWith("/workbench"))}
          onClick={() => setWbExpanded((v) => !v)}
        >
          <Briefcase className="w-[15px] h-[15px]" />
          <span className="flex-1 text-left">Workbench</span>
          <ChevronDown
            className={cn(
              "w-2.5 h-2.5 transition-transform",
              wbExpanded && "rotate-180"
            )}
          />
        </button>

        {wbExpanded && (
          <div className="flex flex-col gap-px pt-1 pb-0.5 ml-3.5 border-l border-[var(--border)]">
            <button
              onClick={startNewWorkbench}
              className="flex items-center gap-2 ml-2 px-2.5 py-[7px] rounded-lg text-[13px] text-[var(--foreground)] font-medium hover:bg-[var(--sidebar-hover)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New workbench</span>
            </button>
            {workbenches.map((w) => {
              const active = pathname === `/workbench/${w.id}`;
              return (
                <Link
                  key={w.id}
                  href={`/workbench/${w.id}`}
                  className={cn(
                    "flex items-center gap-2 ml-2 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors",
                    active
                      ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.item_count != null && (
                    <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--text-muted)]">
                      {w.item_count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* TABS (tag filter) */}
      {tags && tags.length > 0 && (
        <>
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.12em] text-[var(--text-muted)]">
              TABS
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onClearTags?.()}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] transition-colors",
                selectedTagIds.length === 0
                  ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground)] mx-1" />
              <span className="flex-1 text-left">All</span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--text-muted)]">
                {bookmarks?.length ?? 0}
              </span>
            </button>
            {tags.map((t) => {
              const active = selectedTagIds.includes(t.id);
              const count =
                bookmarks?.filter((b) => b.tags?.some((x) => x.id === t.id))
                  .length ?? 0;
              return (
                <button
                  key={t.id}
                  onClick={() => onToggleTag?.(t.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] transition-colors",
                    active
                      ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mx-1"
                    style={{ background: active ? "var(--foreground)" : t.color }}
                  />
                  <span className="flex-1 text-left truncate">{t.name}</span>
                  <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--text-muted)]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* User footer */}
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg -mx-1 px-1 py-1 hover:bg-[var(--sidebar-hover)] transition-colors">
              <div className="w-[26px] h-[26px] rounded-full bg-[#dcdcd8] text-[#555] flex items-center justify-center text-[11px] font-semibold shrink-0">
                {(userEmail?.[0] || "K").toUpperCase()}
              </div>
              <span className="flex-1 min-w-0 text-left text-[12.5px] text-[var(--text-secondary)] truncate">
                {userEmail ? userEmail.split("@")[0] : "Account"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {userEmail && (
              <div className="px-2 py-1.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] mb-1 truncate max-w-[200px]">
                {userEmail}
              </div>
            )}
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse"
          className="p-1 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
