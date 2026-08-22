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
  size?: "xs" | "sm" | "md";
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
    /* For dense pickers where a dozen tags share a row with the field that
       makes them — sm still reads as a control, xs as a label. */
    xs: "h-7 gap-1.5 text-[12px] px-2.5",
    sm: "h-8 gap-2 text-[13px] px-3",
    md: "h-9 gap-2 text-sm px-3.5",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all duration-150 select-none",
        sizes[size],
        onClick && "cursor-pointer",
        selected
          ? "bg-[var(--foreground)] text-[var(--background)] border border-[var(--foreground)]"
          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--foreground)]"
      )}
    >
      {color && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "xs" ? "w-1 h-1" : "w-1.5 h-1.5"
          )}
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
