"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minimal?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search bookmarks...",
  className,
  minimal = false,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && focused) {
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focused]);

  return (
    <div
      className={cn(
        "relative flex items-center h-10 px-3 rounded-[var(--radius-button)] transition-all",
        minimal
          ? "bg-transparent border border-transparent"
          : "bg-[var(--surface)] border border-[var(--border)]",
        focused && (minimal ? "border-[var(--border)]" : "ring-2 ring-[var(--accent)] border-transparent"),
        className
      )}
    >
      <Search className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="flex-1 h-full px-2 bg-transparent text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:outline-none"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          className="p-1 rounded hover:bg-[var(--border)] transition-colors"
        >
          <X className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      ) : (
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs text-[var(--text-secondary)]">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      )}
    </div>
  );
}
