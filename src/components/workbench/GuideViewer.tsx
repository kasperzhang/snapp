"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface GuideViewerProps {
  guide: string;
  name: string;
}

export function GuideViewer({ guide, name }: GuideViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(guide);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([guide], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "design-guide"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Combined design guide
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--foreground)] leading-relaxed">
          {guide}
        </pre>
      </div>
    </div>
  );
}
