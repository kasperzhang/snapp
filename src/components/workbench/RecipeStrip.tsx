"use client";

import { DESIGN_ASPECTS, WorkbenchItem } from "@/types";

/* The mix at a glance: which site each borrowed aspect comes from. Reading it
   off the cards means holding two lists in your head, and it hid the case that
   matters — the same aspect marked on more than one site, where the guide has
   to blend or choose and you couldn't see that you'd asked for it. */
export function RecipeStrip({ items }: { items: WorkbenchItem[] }) {
  const label = (item: WorkbenchItem) => {
    const d = item.bookmark?.domain ?? "";
    return d.replace(/^www\./, "").split(".")[0] || item.bookmark?.title || "source";
  };

  const rows = DESIGN_ASPECTS.map((a) => ({
    ...a,
    from: items.filter((i) => i.selection?.aspects?.includes(a.id)).map(label),
  })).filter((r) => r.from.length > 0);

  if (rows.length === 0) {
    return (
      <p className="mb-6 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        Nothing marked — so every source contributes its{" "}
        <span className="font-medium text-[var(--foreground)]">
          overall feel
        </span>{" "}
        and the guide blends them whole. Tag aspects below to borrow specific
        things from specific sites instead.
      </p>
    );
  }

  return (
    <div className="mb-6">
      <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        The mix
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span
            key={r.id}
            title={
              r.from.length > 1
                ? `${r.label} is marked on ${r.from.length} sources — the guide will blend them.`
                : `${r.label} from ${r.from[0]}`
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[12px]"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: r.hue }}
            />
            <span className="font-medium text-[var(--foreground)]">
              {r.label}
            </span>
            <span className="text-[var(--text-muted)]">{r.from.join(" + ")}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
