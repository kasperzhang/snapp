"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { pageCount } from "@/lib/pagination";
import { cn } from "@/lib/utils/cn";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/* A window of page numbers around the current one, so a long library doesn't
   grow an unbounded rail. Returns e.g. [1, "gap", 4, 5, 6, "gap", 12]. */
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

/* A vertical rail that sits beside the grid rather than bracketing it: a
   hairline with zero-padded mono numerals, the current page marked by an
   accent tick on the line. Sticky, so it stays reachable while the grid
   scrolls under it. */
export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  const last = pageCount(total, pageSize);
  // One page needs no navigation — take up no space at all.
  if (last <= 1) return null;

  const go = (p: number) => onPageChange(Math.min(last, Math.max(1, p)));

  // Disabled arrows fade out instead of grey out — a dead control shouldn't
  // draw the eye in a rail this quiet.
  const arrow =
    "flex h-6 w-full items-center justify-center text-[var(--text-muted)] transition-opacity hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-0";

  return (
    <nav
      aria-label="Bookmark pages"
      className={cn(
        "sticky top-7 flex shrink-0 flex-col items-stretch self-start",
        className
      )}
    >
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={arrow}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-col border-l border-[var(--border)] py-1">
        {pageItems(page, last).map((item, i) =>
          item === "gap" ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="py-1 pl-3 font-mono text-[10px] leading-none text-[var(--text-muted)]"
            >
              ·
            </span>
          ) : (
            <button
              key={item}
              onClick={() => go(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                // -ml-px pulls the tick over the container's hairline so the
                // active segment replaces it rather than sitting beside it.
                "-ml-px border-l-2 py-1.5 pl-3 pr-0.5 text-left font-mono text-[11px] tabular-nums tracking-[0.08em] transition-colors",
                item === page
                  ? "border-[var(--accent)] font-medium text-[var(--foreground)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              )}
            >
              {String(item).padStart(2, "0")}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => go(page + 1)}
        disabled={page >= last}
        aria-label="Next page"
        className={arrow}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}
