"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bookmark,
  Briefcase,
  ChevronDown,
  Plus,
  LogOut,
  PanelLeft,
  PanelLeftOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  Bug,
  CreditCard,
  Settings as SettingsIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui";
import { useBilling, useSnappExtensionVersion } from "@/hooks";
import { Tag, BookmarkWithRelations } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { SidebarMixes } from "./SidebarMixes";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { PLANS } from "@/lib/billing/plans";

interface SidebarProps {
  userEmail?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  tags?: Tag[];
  bookmarks?: BookmarkWithRelations[];
  /** Library-wide bookmark total for the "All" row. The bookmarks prop is
      only the current page, so it can't be counted for this. */
  totalBookmarks?: number;
  selectedTagIds?: string[];
  onToggleTag?: (id: string) => void;
  onClearTags?: () => void;
  /** Bookmarks with no tag at all — a filter, not a tag. */
  untaggedCount?: number;
  untaggedActive?: boolean;
  onToggleUntagged?: () => void;
  /** Tag management lives here because this is where the tag list is. Absent
      on surfaces that don't own the tags (the mix pages), where the section
      isn't rendered at all. */
  onRenameTag?: (id: string, name: string) => void;
  onDeleteTag?: (id: string) => void;
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
  totalBookmarks,
  selectedTagIds = [],
  onToggleTag,
  onClearTags,
  untaggedCount = 0,
  untaggedActive = false,
  onToggleUntagged,
  onRenameTag,
  onDeleteTag,
  onNewWorkbench,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [tagMenuId, setTagMenuId] = useState<string | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wbExpanded, setWbExpanded] = useState(
    pathname.startsWith("/mix")
  );

  const billing = useBilling();
  const extensionVersion = useSnappExtensionVersion();
  // Profile display name (falls back to the email prefix while loading /
  // when unset).
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !alive) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (alive) setDisplayName(data?.full_name?.trim() || null);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A mailto rather than a form: at this stage a real inbox beats a table
     nobody reads, and it needs no infrastructure to keep alive.
     
     The context is prefilled because the questions that follow "it's broken"
     are always the same three, and none of them are things a person can
     answer from memory — which page, which plan, which browser, extension or
     not. It all lands in their mail client where they can read and edit it
     before sending; nothing is collected here. */
  const reportBug = () => {
    const lines = [
      "What happened?",
      "",
      "",
      "What did you expect instead?",
      "",
      "",
      "----- context (helps me reproduce it) -----",
      `Page: ${pathname}`,
      `Plan: ${billing?.plan ?? "unknown"}`,
      `Extension: ${extensionVersion ?? "not installed"}`,
      `Browser: ${typeof navigator === "undefined" ? "" : navigator.userAgent}`,
      `When: ${new Date().toISOString()}`,
    ];
    window.location.href =
      "mailto:kasperzhang.ai@gmail.com" +
      `?subject=${encodeURIComponent("snapp bug report")}` +
      `&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Only the portal opens directly from here. Choosing between Lite and Pro
  // belongs on the settings page where both are priced — this used to POST to
  // /api/billing/checkout with no plan, which the route now rejects outright.
  const goPortal = async () => {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Something went wrong. Please try again.");
    } catch {
      alert("Something went wrong. Please try again.");
    }
  };

  const startNewWorkbench = () => {
    if (onNewWorkbench) onNewWorkbench();
    else router.push("/app?compose=1");
  };

  const bookmarksActive = pathname === "/app";
  const wbActive = pathname.startsWith("/mix");

  // Fixed-width icon tile: keeps every icon on the same vertical axis so they
  // never shift horizontally as the rail collapses — only labels fade.
  const iconWrap = "flex items-center justify-center w-[38px] shrink-0";

  // Labels stay mounted; the item's overflow clips them while width animates,
  // so we only fade opacity (no compounding max-width animation).
  const labelReveal = cn(
    "min-w-0 whitespace-nowrap transition-opacity duration-200 ease-in-out",
    collapsed ? "opacity-0" : "opacity-100 delay-[120ms]"
  );

  // With px-3 kept in both states, the collapsed content area is exactly 40px,
  // so a `w-full h-10` item becomes a perfect 40×40 square when collapsed.
  const navItem = (active: boolean) =>
    cn(
      "group flex items-center w-full h-10 rounded-[10px] overflow-hidden text-[13.5px] transition-colors duration-200 cursor-pointer",
      active
        ? "bg-[var(--brand-tint)] text-[var(--foreground)] font-medium border border-transparent"
        : "text-[var(--text-secondary)] border border-transparent hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
    );

  return (
    <aside
      className={cn(
        "shrink-0 bg-[var(--sidebar)] flex flex-col h-full overflow-hidden transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-[196px]"
      )}
    >
      {/* Header: logo (left) + collapse toggle (top-right, expanded only) */}
      <div
        className={cn(
          "flex items-center h-7 mt-5 mb-5 shrink-0",
          collapsed ? "px-2 justify-center" : "px-4"
        )}
      >
        {collapsed ? (
          // Collapsed: logo tile that morphs into "open sidebar" on hover
          <button
            onClick={() => setCollapsed(false)}
            title="Open sidebar"
            className="group/logo relative w-[27px] h-[27px] rounded-lg shrink-0"
          >
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--brand)] text-white transition-opacity duration-150 group-hover/logo:opacity-0">
              <LogoMark className="w-[13px] h-[13px]" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--sidebar-hover)] text-[var(--foreground)] opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100">
              <PanelLeftOpen className="w-[18px] h-[18px]" />
            </span>
          </button>
        ) : (
          <>
            {/* Wordmark metrics mirror `.lp-wordmark` on the landing page —
                Bricolage 700 at 19px, 9px gap, 27px tile — so the app and the
                marketing site read as the same brand. */}
            <div className="flex items-center gap-[9px] flex-1 min-w-0">
              <div className="w-[27px] h-[27px] rounded-lg bg-[var(--brand)] text-white flex items-center justify-center shrink-0">
                <LogoMark className="w-[13px] h-[13px]" />
              </div>
              <span className="font-[family-name:var(--font-display)] font-bold text-[19px] tracking-[-0.02em] text-[var(--foreground)] whitespace-nowrap">
                snapp
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              title="Close sidebar"
              className="p-1 -mr-1 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors shrink-0"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>
          </>
        )}
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3">
        {/* Search */}
        {searchOpen && onSearchChange && !collapsed ? (
          // Same shell as the button below, down to the height and the icon
          // slot — anything different here shows up as the box resizing under
          // the cursor at the moment it's clicked.
          <div className="mb-5 flex items-center w-full h-10 bg-white border border-[var(--border)] rounded-[10px] overflow-hidden text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors duration-200 focus-within:border-[var(--accent)]">
            <span className={iconWrap}>
              <Search className="w-[15px] h-[15px] text-[var(--text-muted)]" />
            </span>
            <input
              autoFocus
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              placeholder="Search bookmarks…"
              className="flex-1 min-w-0 h-full bg-transparent pr-3 text-[13px] text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => {
              if (collapsed) setCollapsed(false);
              else if (onSearchChange) setSearchOpen(true);
              else router.push("/app");
            }}
            title={collapsed ? "Search" : undefined}
            className="mb-5 flex items-center w-full h-10 bg-white border border-[var(--border)] text-[var(--text-secondary)] rounded-[10px] overflow-hidden text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[var(--text-muted)] transition-colors duration-200"
          >
            <span className={iconWrap}>
              <Search className="w-[15px] h-[15px]" />
            </span>
            <span
              className={cn(
                "flex items-center gap-2 flex-1 min-w-0 pr-2.5 transition-opacity duration-200 ease-in-out",
                collapsed ? "opacity-0" : "opacity-100 delay-[120ms]"
              )}
            >
              <span className="flex-1 text-left truncate">
                {search ? search : "Search"}
              </span>
            </span>
          </button>
        )}

        {/* LIBRARY */}
        <div
          className={cn(
            "font-[family-name:var(--font-display)] text-[10px] tracking-[0.12em] text-[var(--text-muted)] px-2 overflow-hidden transition-all duration-300 ease-in-out",
            collapsed ? "max-h-0 opacity-0" : "max-h-8 opacity-100 pb-2 pt-1"
          )}
        >
          LIBRARY
        </div>
        <div className="flex flex-col gap-1.5 mb-5">
          <Link
            href="/app"
            className={navItem(bookmarksActive)}
            title={collapsed ? "Bookmarks" : undefined}
          >
            <span className={iconWrap}>
              <Bookmark className="w-[15px] h-[15px]" />
            </span>
            <span className={cn(labelReveal, "flex-1 text-left")}>Bookmarks</span>
          </Link>

          {/* Section header. New mix is its own control here rather than the
              first row of the list — it isn't a mix, and it was holding the
              slot the eye goes to for the most recent one. */}
          <div className={navItem(wbActive)}>
            <button
              className="flex items-center flex-1 min-w-0 h-full cursor-pointer"
              title={collapsed ? "Mixes" : undefined}
              onClick={() => {
                if (collapsed) router.push("/mix");
                else setWbExpanded((v) => !v);
              }}
            >
              <span className={iconWrap}>
                <Briefcase className="w-[15px] h-[15px]" />
              </span>
              <span
                className={cn(
                  "flex items-center flex-1 min-w-0 transition-opacity duration-200 ease-in-out",
                  collapsed ? "opacity-0" : "opacity-100 delay-[120ms]"
                )}
              >
                <span className="flex-1 text-left whitespace-nowrap">
                  Mixes
                </span>
                <ChevronDown
                  className={cn(
                    "w-2.5 h-2.5 mr-2 transition-transform duration-300 shrink-0",
                    wbExpanded && "rotate-180"
                  )}
                />
              </span>
            </button>
            {/* Unmounted when collapsed, so the row stays a clean 40x40. */}
            {!collapsed && (
              <button
                onClick={startNewWorkbench}
                title="New mix"
                className="shrink-0 flex items-center justify-center w-6 h-6 mr-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Workbench list — height animates via grid-template-rows */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-in-out",
              wbExpanded && !collapsed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            )}
          >
            <div className="overflow-hidden min-h-0">
              <SidebarMixes />
            </div>
          </div>
        </div>

        {/* TAGS (tag filter) — hidden when collapsed */}
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
                <span className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.12em] text-[var(--text-muted)]">
                  TAGS
                </span>
              </div>
              <div className="flex flex-col gap-0.5 pb-2">
                <button
                  onClick={() => onClearTags?.()}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] transition-colors",
                    selectedTagIds.length === 0 && !untaggedActive
                      ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground)] mx-1" />
                  <span className="flex-1 text-left">All</span>
                  <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)]">
                    {totalBookmarks ?? bookmarks?.length ?? 0}
                  </span>
                </button>
                {tags.map((t) => {
                  const active = selectedTagIds.includes(t.id);
                  // Counted server-side over the whole library. Counting the
                  // `bookmarks` prop would report only the current page —
                  // every tag reads 0 once you turn to page 2.
                  const count =
                    t.bookmark_count ??
                    bookmarks?.filter((b) => b.tags?.some((x) => x.id === t.id))
                      .length ??
                    0;
                  const menuOpen = tagMenuId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group/tag flex items-center rounded-[9px] transition-colors",
                        active
                          ? "bg-[var(--sidebar-hover)]"
                          : "hover:bg-[var(--sidebar-hover)]"
                      )}
                    >
                      <button
                        onClick={() => onToggleTag?.(t.id)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-[13.5px] transition-colors",
                          active
                            ? "text-[var(--foreground)] font-medium"
                            : "text-[var(--text-secondary)] group-hover/tag:text-[var(--foreground)]"
                        )}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mx-1 shrink-0"
                          style={{
                            background: active ? "var(--foreground)" : t.color,
                          }}
                        />
                        <span className="flex-1 truncate">{t.name}</span>
                      </button>

                      {/* Count at rest, the row's menu once you point at it —
                          the same slot, because a third column would squeeze
                          the names that are already truncating. */}
                      <span className="relative mr-1.5 h-6 w-6 shrink-0">
                        <span
                          className={cn(
                            "absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)] transition-opacity",
                            "group-hover/tag:opacity-0",
                            menuOpen && "opacity-0"
                          )}
                        >
                          {count}
                        </span>
                        <DropdownMenu
                          onOpenChange={(open) =>
                            setTagMenuId(open ? t.id : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              title="Tag options"
                              className={cn(
                                "absolute inset-0 flex items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--border)] hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover/tag:opacity-100",
                                menuOpen && "opacity-100"
                              )}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                const name = window.prompt(
                                  "Rename tag",
                                  t.name
                                );
                                const next = name?.trim();
                                if (next && next !== t.name)
                                  onRenameTag?.(t.id, next);
                              }}
                            >
                              <Pencil />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeletingTag(t)}
                            >
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </div>
                  );
                })}
                {onToggleUntagged && untaggedCount > 0 && (
                  <button
                    onClick={onToggleUntagged}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] transition-colors",
                      untaggedActive
                        ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {/* Hollow dot — the other rows use a filled tag colour, and
                        this row stands for having none. */}
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mx-1 border",
                        untaggedActive
                          ? "border-[var(--foreground)]"
                          : "border-[var(--text-muted)]"
                      )}
                    />
                    <span className="flex-1 text-left truncate">Untagged</span>
                    <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)]">
                      {untaggedCount}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* User footer — fades content out above it (no divider) */}
      <div className="relative shrink-0">
        <div className="pointer-events-none absolute left-0 right-0 -top-6 h-6 bg-gradient-to-t from-[var(--sidebar)] to-transparent" />
        <div
          className={cn(
            "flex items-center pb-4 pt-1",
            collapsed ? "px-2 justify-center" : "px-4"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center min-w-0 rounded-lg px-1 py-1 overflow-hidden hover:bg-[var(--sidebar-hover)] transition-colors",
                  collapsed ? "gap-0" : "flex-1 -mx-1 gap-2.5"
                )}
              >
                <div className="w-[26px] h-[26px] rounded-full bg-[var(--accent)] text-[var(--background)] flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {(displayName?.[0] || userEmail?.[0] || "K").toUpperCase()}
                </div>
                <span
                  className={cn(
                    "min-w-0 text-left text-[12.5px] text-[var(--text-secondary)] truncate whitespace-nowrap transition-all duration-200 ease-in-out",
                    collapsed
                      ? "max-w-0 opacity-0"
                      : "flex-1 max-w-[140px] opacity-100 delay-[120ms]"
                  )}
                >
                  {displayName ||
                    (userEmail ? userEmail.split("@")[0] : "Account")}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {userEmail && (
                <div className="px-2.5 py-1.5 text-[12.5px] text-[var(--text-muted)] truncate max-w-[220px]">
                  {userEmail}
                </div>
              )}
              {billing && (
                <div className="px-2.5 pb-2 mb-1 border-b border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-[11px] mb-1">
                    <span
                      className={cn(
                        "font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        billing.plan === "free"
                          ? "bg-[var(--border)] text-[var(--text-secondary)]"
                          : "bg-[var(--brand)] text-white"
                      )}
                    >
                      {PLANS[billing.plan]?.name ?? billing.plan}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {billing.usage.guide.used}/{billing.usage.guide.limit} guides
                      this month
                    </span>
                  </div>
                </div>
              )}
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              {billing && billing.plan !== "free" ? (
                <DropdownMenuItem onClick={goPortal}>
                  <CreditCard />
                  Manage billing
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => router.push("/settings?tab=plan")}>
                  <Zap />
                  See plans
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={reportBug}>
                <Bug />
                Report a bug
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ConfirmDialog
        open={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        title="Delete this tag?"
        description={
          deletingTag
            ? `"${deletingTag.name}" is removed from every bookmark that carries it. The bookmarks themselves stay.`
            : ""
        }
        onConfirm={async () => {
          if (deletingTag) await onDeleteTag?.(deletingTag.id);
          setDeletingTag(null);
        }}
      />
    </aside>
  );
}
