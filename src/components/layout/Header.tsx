"use client";

import { LogOut, User, Plus, Layers } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  userEmail?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  onAddClick?: () => void;
  // Workbench compose (select) mode — only provided by the Bookmarks page
  compose?: {
    active: boolean;
    count: number;
    onStart: () => void;
    onConfirm: () => void;
    onCancel: () => void;
  };
}

export function Header({
  userEmail,
  search,
  onSearchChange,
  onAddClick,
  compose,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const logo = (
    <Link
      href="/"
      className="text-2xl text-[var(--foreground)]"
      style={{ fontFamily: "var(--font-playpen)" }}
    >
      snapp
    </Link>
  );

  // ── Compose (select) mode: focused toolbar ────────────────────────────────
  if (compose?.active) {
    return (
      <header className="h-16 flex items-center justify-between px-6 md:px-12 border-b border-[var(--border)]">
        <div className="flex items-center gap-4 min-w-0">
          {logo}
          <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
            Select sites for your workbench
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={compose.onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={compose.onConfirm}
            disabled={compose.count === 0}
          >
            Confirm{compose.count > 0 ? ` (${compose.count})` : ""}
          </Button>
        </div>
      </header>
    );
  }

  // ── Normal header ─────────────────────────────────────────────────────────
  const navItem = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
      active
        ? "bg-[var(--foreground)] text-[var(--background)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
    );

  return (
    <header className="h-16 flex items-center justify-between px-6 md:px-12">
      <div className="flex items-center gap-8">
        {logo}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className={navItem(pathname === "/")}>
            Bookmarks
          </Link>
          {/* Workbench = compose trigger. On the Bookmarks page it toggles
              select-mode; elsewhere it navigates home into select-mode. */}
          {compose ? (
            <button className={navItem(false)} onClick={compose.onStart}>
              Workbench
            </button>
          ) : (
            <Link href="/?compose=1" className={navItem(false)}>
              Workbench
            </Link>
          )}
          <Link
            href="/workbench"
            className={cn(
              navItem(pathname.startsWith("/workbench")),
              "inline-flex items-center gap-1.5"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Saved
          </Link>
        </nav>
        {onSearchChange && (
          <SearchBar
            value={search || ""}
            onChange={onSearchChange}
            minimal
            className="hidden md:flex w-64"
          />
        )}
      </div>
      <div className="flex items-center gap-3">
        {onAddClick && (
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-[var(--border)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
                <User className="w-4 h-4 text-[var(--background)]" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userEmail && (
              <div className="px-2 py-1.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] mb-1">
                {userEmail}
              </div>
            )}
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
