"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageCount } from "@/lib/pagination";
import { cn } from "@/lib/utils/cn";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/* Page numbers with ellipses, always showing first, last, current and its
   neighbours — so the control keeps a stable width however many pages there
   are. Returns e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageItems(current: number, last: number): (number | "gap")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < last - 1) items.push("gap");

  items.push(last);
  return items;
}

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const last = pageCount(total, pageSize);
  // Nothing to navigate — don't take up the space.
  if (last <= 1) return null;

  const go = (p: number) => onPageChange(Math.min(last, Math.max(1, p)));

  const arrow =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)]";

  return (
    <nav
      aria-label="Bookmark pages"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={arrow}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems(page, last).map((item, i) =>
        item === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden
            className="px-1 text-[13px] text-[var(--text-muted)]"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => go(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 rounded-full px-2.5 text-[13px] font-medium transition-colors",
              item === page
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => go(page + 1)}
        disabled={page >= last}
        aria-label="Next page"
        className={arrow}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
