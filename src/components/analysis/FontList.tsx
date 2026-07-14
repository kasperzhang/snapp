"use client";

import { Type } from "lucide-react";
import { ExtractedFont } from "@/types";
import { cn } from "@/lib/utils/cn";

interface FontListProps {
  fonts: ExtractedFont[];
}

export function FontList({ fonts }: FontListProps) {
  const sourceLabels: Record<string, string> = {
    google: "Google Fonts",
    system: "System",
    custom: "Custom",
  };

  // Custom fonts are the interesting find — they get the brand tint; the rest
  // stay neutral so the panel doesn't read as a traffic light.
  const sourceStyles: Record<string, string> = {
    google: "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]",
    system: "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]",
    custom: "bg-[var(--brand-tint)] border border-transparent text-[var(--accent)]",
  };

  return (
    <div className="space-y-3">
      {fonts.map((font, index) => (
        <div
          key={`${font.family}-${index}`}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--border)] transition-colors"
        >
          <Type className="w-4 h-4 text-[var(--text-secondary)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-medium text-[var(--foreground)] truncate"
                style={{
                  // Try the real font if the visitor has it; otherwise fall
                  // back to the UI sans instead of the browser's serif.
                  fontFamily: `"${font.family}", var(--font-geist-sans), sans-serif`,
                }}
              >
                {font.family}
              </span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  sourceStyles[font.source]
                )}
              >
                {sourceLabels[font.source]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[var(--text-secondary)]">
                Weights: {font.weights.join(", ")}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                &middot; {font.usage}
              </span>
            </div>
          </div>
        </div>
      ))}
      {fonts.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)] text-center py-4">
          No fonts detected
        </p>
      )}
    </div>
  );
}
