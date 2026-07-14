"use client";

import { useState } from "react";
import { Eye, ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface PreviewPanelProps {
  url: string;
  screenshotUrl: string | null;
  onScan: () => void;
  scanning: boolean;
  analysisStatus: string;
  errorMessage: string | null;
}

type ViewMode = "iframe" | "screenshot";

export function PreviewPanel({
  url,
  screenshotUrl,
  onScan,
  scanning,
  analysisStatus,
  errorMessage,
}: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    screenshotUrl ? "screenshot" : "iframe"
  );
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // A fresh scan just produced a screenshot — show it (many sites block the
  // live iframe anyway). State-during-render, per React's derived-state docs.
  const [prevScreenshotUrl, setPrevScreenshotUrl] = useState(screenshotUrl);
  if (screenshotUrl !== prevScreenshotUrl) {
    setPrevScreenshotUrl(screenshotUrl);
    if (screenshotUrl) setViewMode("screenshot");
  }

  return (
    <div className="h-full flex flex-col">
      {/* View toggle + scan action. Scanning is metered, so the button is only
          prominent (primary) until the first scan has completed. */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 p-0.5 bg-[var(--border)] rounded-lg">
          <button
            onClick={() => setViewMode("iframe")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
              viewMode === "iframe"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            )}
          >
            <Eye className="w-3 h-3" />
            Live
          </button>
          <button
            onClick={() => setViewMode("screenshot")}
            disabled={!screenshotUrl}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
              viewMode === "screenshot"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--foreground)]",
              !screenshotUrl && "opacity-50 cursor-not-allowed"
            )}
          >
            <ImageIcon className="w-3 h-3" />
            Screenshot
          </button>
        </div>

        <Button
          onClick={onScan}
          loading={scanning}
          disabled={scanning}
          size="sm"
          variant={analysisStatus === "completed" ? "secondary" : "primary"}
        >
          {!scanning && <RefreshCw className="w-3.5 h-3.5" />}
          {scanning
            ? "Scanning…"
            : analysisStatus === "completed"
              ? "Re-scan"
              : "Scan page"}
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative bg-[var(--border)] rounded-lg overflow-hidden min-h-[300px]">
        {viewMode === "iframe" ? (
          <>
            {iframeLoading && !iframeError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--border)]">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {iframeError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <AlertCircle className="w-10 h-10 text-[var(--text-secondary)] mb-3" />
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  This site cannot be displayed in an iframe.
                  <br />
                  Use Scan page to capture a screenshot.
                </p>
              </div>
            ) : (
              <iframe
                src={url}
                title="Website preview"
                className={cn(
                  "w-full h-full border-0",
                  iframeLoading && "opacity-0"
                )}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                onLoad={() => setIframeLoading(false)}
                onError={() => {
                  setIframeError(true);
                  setIframeLoading(false);
                }}
              />
            )}
          </>
        ) : screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Website screenshot"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <ImageIcon className="w-10 h-10 text-[var(--text-secondary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              No screenshot available.
              <br />
              Use Scan page above to capture one.
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-500">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
