"use client";

import { useState } from "react";
import {
  Trash2,
  Camera,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  DESIGN_ASPECTS,
  DesignAspect,
  WorkbenchItem,
  WorkbenchItemSelection,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface SourceCardProps {
  item: WorkbenchItem;
  onChange: (itemId: string, selection: WorkbenchItemSelection) => void;
  onRemove: (itemId: string) => void;
  onScan: (item: WorkbenchItem) => void;
}

const EMPTY: WorkbenchItemSelection = {
  aspects: [],
  fonts: [],
  colors: [],
  comment: "",
};

export function SourceCard({ item, onChange, onRemove, onScan }: SourceCardProps) {
  const selection: WorkbenchItemSelection = { ...EMPTY, ...(item.selection || {}) };
  const [comment, setComment] = useState(selection.comment);
  /* Configured cards start summarised. Twelve chips, a font row, sixteen
     swatches and a textarea per source made two sources a page and a half,
     and every card a different height. */
  const [open, setOpen] = useState(selection.aspects.length === 0);
  const analysis = item.analysis;
  const status = analysis?.analysis_status ?? "pending";
  const bookmark = item.bookmark;

  const update = (patch: Partial<WorkbenchItemSelection>) =>
    onChange(item.id, { ...selection, ...patch });

  const toggleAspect = (aspect: DesignAspect) => {
    const has = selection.aspects.includes(aspect);
    update({
      aspects: has
        ? selection.aspects.filter((a) => a !== aspect)
        : [...selection.aspects, aspect],
    });
  };

  const toggleFont = (family: string) => {
    const has = selection.fonts.includes(family);
    update({
      fonts: has
        ? selection.fonts.filter((f) => f !== family)
        : [...selection.fonts, family],
    });
  };

  const toggleColor = (hex: string) => {
    const has = selection.colors.includes(hex);
    update({
      colors: has
        ? selection.colors.filter((c) => c !== hex)
        : [...selection.colors, hex],
    });
  };

  const showFonts =
    selection.aspects.includes("typography") && !!analysis?.fonts?.length;
  const showColors =
    (selection.aspects.includes("colors") ||
      selection.aspects.includes("background")) &&
    !!analysis?.colors?.length;

  /* Aspect chips carry their own hue — the same one the recipe strip uses, so
     "Typography" is the same colour wherever you meet it. Selected is a tint
     of that hue rather than the hue itself: half of them are pale enough that
     white label text on top would be unreadable. */
  const aspectChip = (a: (typeof DESIGN_ASPECTS)[number], on: boolean) => (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        on
          ? "text-[var(--foreground)]"
          : "border-transparent bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
      )}
      style={
        on
          ? { background: `${a.hue}1F`, borderColor: `${a.hue}66` }
          : undefined
      }
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: on ? a.hue : "var(--text-muted)" }}
      />
      {a.label}
    </span>
  );

  const picked = DESIGN_ASPECTS.filter((a) => selection.aspects.includes(a.id));

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      {/* Screenshot / status */}
      <div className="relative flex aspect-[16/10] items-center justify-center bg-[var(--border)]">
        {status === "completed" && analysis?.screenshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={analysis.screenshot_url}
            alt={bookmark?.title || ""}
            className="h-full w-full object-cover object-top"
          />
        ) : status === "scanning" ? (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Scanning…</span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-2 text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Scan failed</span>
            <Button size="sm" variant="secondary" onClick={() => onScan(item)}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <Camera className="h-5 w-5" />
            <span className="text-xs">Not scanned</span>
            <Button size="sm" variant="secondary" onClick={() => onScan(item)}>
              Scan
            </Button>
          </div>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute right-2 top-2 rounded-full bg-[var(--surface)]/90 p-1.5 text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--surface)] hover:text-[var(--danger)]"
          title="Remove source"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Title row — also the collapse toggle. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 pb-2 pt-3 text-left"
      >
        {bookmark?.favicon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bookmark.favicon_url}
            alt=""
            className="h-4 w-4 shrink-0 rounded"
          />
        ) : (
          <span className="h-4 w-4 shrink-0 rounded bg-[var(--border)]" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
          {bookmark?.title}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="space-y-4 px-4 pb-4">
          <div>
            <p className="mb-2 text-xs text-[var(--text-secondary)]">
              Borrow from this site
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DESIGN_ASPECTS.map((a) => (
                <button key={a.id} onClick={() => toggleAspect(a.id)}>
                  {aspectChip(a, selection.aspects.includes(a.id))}
                </button>
              ))}
            </div>
          </div>

          {showFonts && (
            <div>
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Pick fonts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis!.fonts!.map((f) => {
                  const sel = selection.fonts.includes(f.family);
                  return (
                    <button
                      key={f.family}
                      onClick={() => toggleFont(f.family)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        sel
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                          : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
                      )}
                      style={{ fontFamily: f.family }}
                    >
                      {sel && <Check className="h-3 w-3" />}
                      {f.family}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showColors && (
            <div>
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Pick colors
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis!.colors!.slice(0, 16).map((c) => {
                  const sel = selection.colors.includes(c.hex);
                  return (
                    <button
                      key={c.hex}
                      onClick={() => toggleColor(c.hex)}
                      title={`${c.hex} (${c.context})`}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md border transition-transform hover:scale-110",
                        sel
                          ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]"
                          : "border-[var(--border)]"
                      )}
                      style={{ backgroundColor: c.hex }}
                    >
                      {sel && (
                        <Check
                          className="h-3.5 w-3.5"
                          color={
                            (c.rgb.r + c.rgb.g + c.rgb.b) / 3 > 128
                              ? "#000"
                              : "#fff"
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-[var(--text-secondary)]">Note</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => {
                if (comment !== selection.comment) update({ comment });
              }}
              placeholder="e.g. love the slow fade-in on scroll"
              rows={2}
              className="w-full resize-none rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      ) : (
        /* Summary: what this source is actually contributing. */
        <button
          onClick={() => setOpen(true)}
          className="w-full px-4 pb-4 text-left"
        >
          <div className="flex flex-wrap gap-1.5">
            {picked.length ? (
              picked.map((a) => <span key={a.id}>{aspectChip(a, true)}</span>)
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">
                Nothing marked yet — tap to choose what to borrow.
              </span>
            )}
          </div>
          {(selection.fonts.length > 0 || selection.colors.length > 0) && (
            <div className="mt-2.5 flex items-center gap-2">
              {selection.colors.slice(0, 8).map((hex) => (
                <span
                  key={hex}
                  title={hex}
                  className="h-3.5 w-3.5 rounded-[4px] border border-[var(--border)]"
                  style={{ background: hex }}
                />
              ))}
              {selection.fonts.length > 0 && (
                <span className="truncate text-[11.5px] text-[var(--text-muted)]">
                  {selection.fonts.join(", ")}
                </span>
              )}
            </div>
          )}
          {selection.comment && (
            <p className="mt-2 line-clamp-2 text-[12px] italic leading-relaxed text-[var(--text-secondary)]">
              “{selection.comment}”
            </p>
          )}
        </button>
      )}
    </div>
  );
}
