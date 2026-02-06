"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
        <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
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
}: AnalysisPanelProps) {
  const hasData = analysisStatus === "completed" && (fonts || colors);

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
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Fonts Section */}
      <CollapsibleSection title="Fonts">
        <FontList fonts={fonts || []} />
      </CollapsibleSection>

      {/* Colors Section */}
      <CollapsibleSection title="Colors">
        <ColorPalette colors={colors || []} />
      </CollapsibleSection>

      {/* AI Design Prompt Section */}
      <CollapsibleSection title="AI Design Prompt" defaultOpen={!!designPrompt}>
        {designPrompt ? (
          <div className="prose prose-sm max-w-none">
            <div className="p-3 bg-[var(--border)] rounded-lg text-sm text-[var(--foreground)] whitespace-pre-wrap max-h-64 overflow-y-auto">
              {designPrompt}
            </div>
          </div>
        ) : (
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
        )}
      </CollapsibleSection>

      {/* Export Section */}
      {designTokens && (
        <CollapsibleSection title="Export">
          <DesignTokensExport tokens={designTokens} />
        </CollapsibleSection>
      )}
    </div>
  );
}
