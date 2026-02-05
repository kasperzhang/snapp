"use client";

import { LogOut, User, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
}

export function Header({ userEmail, search, onSearchChange, onAddClick }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 md:px-12">
      <div className="flex items-center gap-8">
        <span className="text-lg font-semibold text-[var(--foreground)]">Snapp</span>
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
