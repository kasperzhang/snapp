"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ExtractedColor } from "@/types";
import { cn } from "@/lib/utils/cn";

interface ColorPaletteProps {
  colors: ExtractedColor[];
}

interface ColorSwatchProps {
  color: ExtractedColor;
}

function ColorSwatch({ color }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLight = (color.rgb.r + color.rgb.g + color.rgb.b) / 3 > 128;

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "group relative w-10 h-10 rounded-lg border border-[var(--border)] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
      )}
      style={{ backgroundColor: color.hex }}
      title={`${color.hex} - Click to copy`}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          isLight ? "text-black" : "text-white"
        )}
      >
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </span>
    </button>
  );
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  const groupedColors = colors.reduce(
    (acc, color) => {
      if (!acc[color.context]) {
        acc[color.context] = [];
      }
      acc[color.context].push(color);
      return acc;
    },
    {} as Record<string, ExtractedColor[]>
  );

  const contextLabels: Record<string, string> = {
    background: "Background",
    text: "Text",
    accent: "Accent",
    border: "Border",
    other: "Other",
  };

  const contextOrder = ["background", "text", "accent", "border", "other"];

  return (
    <div className="space-y-4">
      {contextOrder.map((context) => {
        const contextColors = groupedColors[context];
        if (!contextColors || contextColors.length === 0) return null;

        return (
          <div key={context}>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              {contextLabels[context]}
            </p>
            <div className="flex flex-wrap gap-2">
              {contextColors.slice(0, 6).map((color, index) => (
                <ColorSwatch key={`${color.hex}-${index}`} color={color} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
