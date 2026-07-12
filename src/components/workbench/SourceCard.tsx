"use client";

import { useState } from "react";
import { Trash2, Camera, Loader2, AlertCircle, Check } from "lucide-react";
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

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      {/* Screenshot / status */}
      <div className="relative aspect-[16/10] bg-[var(--border)] flex items-center justify-center">
        {status === "completed" && analysis?.screenshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={analysis.screenshot_url}
            alt={bookmark?.title || ""}
            className="w-full h-full object-cover object-top"
          />
        ) : status === "scanning" ? (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Scanning…</span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="text-xs">Scan failed</span>
            <Button size="sm" variant="secondary" onClick={() => onScan(item)}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <Camera className="w-5 h-5" />
            <span className="text-xs">Not scanned</span>
            <Button size="sm" variant="secondary" onClick={() => onScan(item)}>
              Scan
            </Button>
          </div>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--surface)]/90 hover:bg-[var(--surface)] text-[var(--text-secondary)] shadow-sm"
          title="Remove source"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          {bookmark?.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bookmark.favicon_url}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
            />
          ) : (
            <span className="w-4 h-4 rounded bg-[var(--border)] flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-[var(--foreground)] truncate">
            {bookmark?.title}
          </span>
        </div>

        {/* Aspects */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Borrow from this site
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DESIGN_ASPECTS.map((a) => {
              const sel = selection.aspects.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleAspect(a.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    sel
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]"
                  )}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font picker */}
        {showFonts && (
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
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
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors",
                      sel
                        ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    )}
                    style={{ fontFamily: f.family }}
                  >
                    {sel && <Check className="w-3 h-3" />}
                    {f.family}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Color picker */}
        {showColors && (
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
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
                      "w-7 h-7 rounded-md border transition-transform hover:scale-110 flex items-center justify-center",
                      sel
                        ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]"
                        : "border-[var(--border)]"
                    )}
                    style={{ backgroundColor: c.hex }}
                  >
                    {sel && (
                      <Check
                        className="w-3.5 h-3.5"
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

        {/* Comment */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-2">Note</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => {
              if (comment !== selection.comment) update({ comment });
            }}
            placeholder="e.g. love the slow fade-in on scroll"
            rows={2}
            className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
