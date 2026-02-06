"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DesignTokens } from "@/types";
import { cn } from "@/lib/utils/cn";

interface DesignTokensExportProps {
  tokens: DesignTokens;
}

type ExportFormat = "tailwind" | "css" | "json";

function generateTailwindConfig(tokens: DesignTokens): string {
  const config = {
    theme: {
      extend: {
        colors: tokens.tailwind.colors,
        fontFamily: tokens.tailwind.fontFamily,
      },
    },
  };

  return `// tailwind.config.js
module.exports = ${JSON.stringify(config, null, 2)}`;
}

function generateCSSVariables(tokens: DesignTokens): string {
  const vars = Object.entries(tokens.cssVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  return `:root {\n${vars}\n}`;
}

function generateStyleDictJSON(tokens: DesignTokens): string {
  return JSON.stringify(tokens.styleDict, null, 2);
}

export function DesignTokensExport({ tokens }: DesignTokensExportProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("tailwind");
  const [copied, setCopied] = useState(false);

  const formats: { id: ExportFormat; label: string }[] = [
    { id: "tailwind", label: "Tailwind" },
    { id: "css", label: "CSS" },
    { id: "json", label: "JSON" },
  ];

  const getContent = () => {
    switch (activeFormat) {
      case "tailwind":
        return generateTailwindConfig(tokens);
      case "css":
        return generateCSSVariables(tokens);
      case "json":
        return generateStyleDictJSON(tokens);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getContent();
    const extensions: Record<ExportFormat, string> = {
      tailwind: "js",
      css: "css",
      json: "json",
    };
    const filename = `design-tokens.${extensions[activeFormat]}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Format Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--border)] rounded-lg">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => setActiveFormat(format.id)}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              activeFormat === format.id
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            )}
          >
            {format.label}
          </button>
        ))}
      </div>

      {/* Code Preview */}
      <div className="relative">
        <pre className="p-3 bg-[var(--border)] rounded-lg text-xs text-[var(--foreground)] overflow-x-auto max-h-48">
          <code>{getContent()}</code>
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>
    </div>
  );
}
