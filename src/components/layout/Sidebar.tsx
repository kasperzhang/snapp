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

  const bookmarksActive = pathname === "/";
  const wbActive = pathname.startsWith("/workbench");

  const navItem = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-[9px] text-[13.5px] transition-colors cursor-pointer",
      collapsed
        ? "w-10 h-10 justify-center px-0 mx-auto shrink-0"
        : "w-full px-2.5 py-2.5",
      active
        ? "bg-white text-[var(--foreground)] font-medium border border-[var(--foreground)] shadow-sm"
        : "text-[var(--text-secondary)] border border-transparent hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
    );

  return (
    <aside
      className={cn(
        "matte-texture shrink-0 bg-[var(--sidebar)] flex flex-col py-5 h-full overflow-x-hidden overflow-y-auto transition-[width,padding] duration-300 ease-in-out",
        collapsed ? "w-16 px-2" : "w-[196px] px-3"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2.5 mb-5 h-7",
          collapsed ? "justify-center px-0" : "px-1"
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--foreground)] text-white flex items-center justify-center font-[family-name:var(--font-space-grotesk)] font-bold text-[15px] shrink-0">
          s
        </div>
        {!collapsed && (
          <span className="font-[family-name:var(--font-space-grotesk)] font-semibold text-lg tracking-tight text-[var(--foreground)] whitespace-nowrap">
            snapp
          </span>
        )}
      </div>

      {/* Search */}
      {searchOpen && onSearchChange && !collapsed ? (
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
          onClick={() => {
            if (collapsed) setCollapsed(false);
            else if (onSearchChange) setSearchOpen(true);
            else router.push("/");
          }}
          title={collapsed ? "Search" : undefined}
          className={cn(
            "mb-5 flex items-center gap-2.5 bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-[10px] text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#c9c9c4] transition-colors",
            collapsed
              ? "w-10 h-10 justify-center px-0 mx-auto shrink-0"
              : "w-full px-2.5 py-2.5"
          )}
        >
          <Search className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap">
                {search ? search : "Search"}
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-[11px] text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5 shrink-0">
                ⌘K
              </span>
            </>
          )}
        </button>
      )}

      {/* LIBRARY */}
      {!collapsed && (
        <div className="font-[family-name:var(--font-space-grotesk)] text-[10px] tracking-[0.12em] text-[var(--text-muted)] px-2 pb-2 pt-1">
          LIBRARY
        </div>
      )}
      <div className={cn("flex flex-col gap-1.5 mb-5", collapsed && "mt-1")}>
        <Link
          href="/"
          className={navItem(bookmarksActive)}
          title={collapsed ? "Bookmarks" : undefined}
        >
          <Bookmark className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Bookmarks</span>}
        </Link>

        <button
          className={navItem(wbActive)}
          title={collapsed ? "Workbench" : undefined}
          onClick={() => {
            if (collapsed) router.push("/workbench");
            else setWbExpanded((v) => !v);
          }}
        >
          <Briefcase className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && (
            <span className="flex-1 text-left whitespace-nowrap">Workbench</span>
          )}
          {!collapsed && (
            <ChevronDown
              className={cn(
                "w-2.5 h-2.5 transition-transform duration-300 shrink-0",
                wbExpanded && "rotate-180"
              )}
            />
          )}
        </button>

        {/* Workbench list — height animates via grid-template-rows */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            wbExpanded && !collapsed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex flex-col gap-px pt-1 pb-0.5 ml-3.5 border-l border-[var(--border)]">
              <button
                onClick={startNewWorkbench}
                className="flex items-center gap-2 ml-2 px-2.5 py-[7px] rounded-lg text-[13px] text-[var(--foreground)] font-medium hover:bg-[var(--sidebar-hover)] transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
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
          </div>
        </div>
      </div>

      {/* TABS (tag filter) — hidden when collapsed */}
      <div
        className={cn(
          "flex flex-col transition-opacity duration-200",
          collapsed
            ? "opacity-0 pointer-events-none h-0 overflow-hidden"
            : "opacity-100"
        )}
      >
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
                      style={{
                        background: active ? "var(--foreground)" : t.color,
                      }}
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
      </div>

      <div className="flex-1" />

      {/* User footer */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-1 pt-2",
          collapsed && "flex-col gap-3"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 min-w-0 rounded-lg -mx-1 px-1 py-1 hover:bg-[var(--sidebar-hover)] transition-colors",
                !collapsed && "flex-1"
              )}
            >
              <div className="w-[26px] h-[26px] rounded-full bg-[#dcdcd8] text-[#555] flex items-center justify-center text-[11px] font-semibold shrink-0">
                {(userEmail?.[0] || "K").toUpperCase()}
              </div>
              {!collapsed && (
                <span className="flex-1 min-w-0 text-left text-[12.5px] text-[var(--text-secondary)] truncate">
                  {userEmail ? userEmail.split("@")[0] : "Account"}
                </span>
              )}
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
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
