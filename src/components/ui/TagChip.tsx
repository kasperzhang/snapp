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
  selected = false,
  removable = false,
  onClick,
  onRemove,
  size = "md",
}: TagChipProps) {
  const sizes = {
    sm: "h-8 text-sm px-3",
    md: "h-9 text-base px-4",
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150",
        sizes[size],
        onClick && "cursor-pointer",
        selected
          ? "bg-[var(--foreground)] text-[var(--background)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--border)]"
      )}
    >
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
