"use client";

import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface TagChipProps {
  name: string;
  color?: string;
  selected?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: "sm" | "md";
}

export function TagChip({
  name,
  color,
  selected = false,
  removable = false,
  onClick,
  onRemove,
  size = "md",
}: TagChipProps) {
  const sizes = {
    sm: "h-8 text-[13px] px-3",
    md: "h-9 text-sm px-3.5",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium transition-all duration-150 select-none",
        sizes[size],
        onClick && "cursor-pointer",
        selected
          ? "bg-[var(--foreground)] text-[var(--background)] border border-[var(--foreground)]"
          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--foreground)]"
      )}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: selected ? "var(--background)" : color }}
        />
      )}
      {name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
}
