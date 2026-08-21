"use client";

import { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GuideCredits, LimitNotice } from "@/components/billing";
import { renderMarkdown } from "@/lib/markdown";
import { ColorPalette } from "./ColorPalette";
import { FontList } from "./FontList";
import { DesignTokensExport } from "./DesignTokensExport";
import { ExtractedFont, ExtractedColor, DesignTokens } from "@/types";

interface AnalysisPanelProps {
  fonts: ExtractedFont[] | null;
  colors: ExtractedColor[] | null;
  designPrompt: string | null;
  designTokens: DesignTokens | null;
  analysisStatus: string;
  onGeneratePrompt: () => void;
  generating: boolean;
  onScan: () => void;
  scanning: boolean;
  scanError: string | null;
  guideError: string | null;
  guideOverLimit: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          {title}
        </h3>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function AnalysisPanel({
  fonts,
  colors,
  designPrompt,
  designTokens,
  analysisStatus,
  onGeneratePrompt,
  generating,
  onScan,
  scanning,
  scanError,
  guideError,
  guideOverLimit,
}: AnalysisPanelProps) {
  const hasData = analysisStatus === "completed" && (fonts || colors);

  const [copied, setCopied] = useState(false);
  const copyGuide = async () => {
    if (!designPrompt) return;
    await navigator.clipboard.writeText(designPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Scanning is metered, so the button is only prominent (primary) until the
     first scan has produced something. It lives on this side because this is
     the panel it fills — the preview needs no scan to show a page. */
  const scanButton = (
    <Button
      onClick={onScan}
      loading={scanning}
      disabled={scanning}
      size="sm"
      variant={hasData ? "secondary" : "primary"}
    >
      {!scanning && <RefreshCw className="w-3.5 h-3.5" />}
      {scanning ? "Scanning…" : hasData ? "Re-scan" : "Scan page"}
    </Button>
  );

  const errorNotice = scanError ? (
    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-sm text-red-500">{scanError}</p>
    </div>
  ) : null;

  if (!hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-[var(--text-secondary)]" />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {analysisStatus === "pending"
            ? "Scan the page to extract design elements."
            : analysisStatus === "scanning"
              ? "Analyzing page..."
              : "No data available."}
        </p>
        <div className="mt-5">{scanButton}</div>
        {errorNotice && <div className="mt-4 w-full">{errorNotice}</div>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Re-scan stays put while the results scroll under it. */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          Design elements
        </h3>
        {scanButton}
      </div>

      {errorNotice && <div className="mb-3">{errorNotice}</div>}

      <div className="flex-1 overflow-y-auto">
        {/* Fonts Section */}
        <CollapsibleSection title="Fonts">
          <FontList fonts={fonts || []} />
        </CollapsibleSection>

        {/* Colors Section */}
        <CollapsibleSection title="Colors">
          <ColorPalette colors={colors || []} />
        </CollapsibleSection>

        {/* AI Design Guide Section */}
        <CollapsibleSection title="Design guide" defaultOpen={!!designPrompt}>
          {designPrompt ? (
            <div className="space-y-3">
              {/* Rendered, not dumped. This panel was printing "## Design
                  Philosophy" and "**bold**" as literal characters — the same
                  thing the mix pane used to do. */}
              <div
                className="guide-prose max-h-[420px] overflow-y-auto rounded-[10px] bg-[var(--background)] p-4"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(designPrompt),
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyGuide}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy for your agent"}
                </Button>
                {/* Regenerating was impossible once a guide existed — the
                    button it lived in had been replaced by the guide. */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onGeneratePrompt}
                  loading={generating}
                  disabled={generating}
                  title="Write a new guide (uses a credit)"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              {guideError && (
                <LimitNotice message={guideError} overLimit={guideOverLimit} />
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* What the button does, before it's pressed. It spends a metered
                  credit, so "Generate with Claude" alone was asking people to
                  pay to find out. */}
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                Reads this page&apos;s fonts, colours and screenshots and writes
                one design spec — hex values, type scale, spacing, components —
                to paste into Cursor, Claude Code or v0.
              </p>
              <Button
                onClick={onGeneratePrompt}
                loading={generating}
                disabled={generating}
                variant="secondary"
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                Generate with Claude
              </Button>
              {guideError ? (
                <LimitNotice message={guideError} overLimit={guideOverLimit} />
              ) : (
                <GuideCredits className="block text-center" />
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* Export Section */}
        {designTokens && (
          <CollapsibleSection title="Export">
            <DesignTokensExport tokens={designTokens} />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
