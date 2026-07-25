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
  Zap,
  CreditCard,
  Settings as SettingsIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui";
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
    pathname.startsWith("/mix")
  );

  type Billing = {
    plan: "free" | "pro";
    usage: Record<"guide" | "analysis" | "scan", { used: number; limit: number }>;
  };
  const [billing, setBilling] = useState<Billing | null>(null);
  // Profile display name (falls back to the email prefix while loading /
  // when unset).
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/billing/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setBilling(d))
      .catch(() => {});
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const goBilling = async (endpoint: "checkout" | "portal") => {
    try {
      const res = await fetch(`/api/billing/${endpoint}`, { method: "POST" });
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
              <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)] border border-[var(--border)] rounded px-1.5 shrink-0">
                ⌘K
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

          <button
            className={navItem(wbActive)}
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
                "flex items-center flex-1 min-w-0 pr-2.5 transition-opacity duration-200 ease-in-out",
                collapsed ? "opacity-0" : "opacity-100 delay-[120ms]"
              )}
            >
              <span className="flex-1 text-left whitespace-nowrap">
                Mixes
              </span>
              <ChevronDown
                className={cn(
                  "w-2.5 h-2.5 transition-transform duration-300 shrink-0",
                  wbExpanded && "rotate-180"
                )}
              />
            </span>
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
                  <span>New mix</span>
                </button>
                {workbenches.map((w) => {
                  const active = pathname === `/mix/${w.id}`;
                  return (
                    <Link
                      key={w.id}
                      href={`/mix/${w.id}`}
                      className={cn(
                        "flex items-center gap-2 ml-2 px-2.5 py-[7px] rounded-lg text-[13px] transition-colors",
                        active
                          ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                      )}
                    >
                      <span className="flex-1 truncate">{w.name}</span>
                      {w.item_count != null && (
                        <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)]">
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
                    selectedTagIds.length === 0
                      ? "bg-[var(--sidebar-hover)] text-[var(--foreground)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--foreground)] mx-1" />
                  <span className="flex-1 text-left">All</span>
                  <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)]">
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
                      <span className="font-[family-name:var(--font-display)] text-[11px] text-[var(--text-muted)]">
                        {count}
                      </span>
                    </button>
                  );
                })}
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
                <div className="w-[26px] h-[26px] rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center text-[11px] font-semibold shrink-0">
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
                <div className="px-2 py-1.5 text-sm text-[var(--text-secondary)] truncate max-w-[220px]">
                  {userEmail}
                </div>
              )}
              {billing && (
                <div className="px-2 pb-2 mb-1 border-b border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-[11px] mb-1">
                    <span
                      className={cn(
                        "font-[family-name:var(--font-display)] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        billing.plan === "pro"
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--border)] text-[var(--text-secondary)]"
                      )}
                    >
                      {billing.plan}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {billing.usage.guide.used}/{billing.usage.guide.limit} briefs
                      this month
                    </span>
                  </div>
                </div>
              )}
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {billing?.plan === "pro" ? (
                <DropdownMenuItem onClick={() => goBilling("portal")}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage billing
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => goBilling("checkout")}>
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
