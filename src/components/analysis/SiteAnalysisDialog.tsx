"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { PreviewPanel } from "./PreviewPanel";
import { AnalysisPanel } from "./AnalysisPanel";
import { BookmarkWithRelations, SiteAnalysis } from "@/types";
import { notifyUsageChanged } from "@/lib/billing/usage-events";

interface SiteAnalysisDialogProps {
  bookmark: BookmarkWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SiteAnalysisDialog({
  bookmark,
  open,
  onOpenChange,
}: SiteAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  /* Why a guide didn't happen. This used to be dropped on the floor: the
     handler only looked at response.ok, so hitting the monthly limit — the one
     refusal every free account meets — stopped the spinner and said nothing.
     `overLimit` is what turns the message into a way out. */
  const [genError, setGenError] = useState<string | null>(null);
  const [overLimit, setOverLimit] = useState(false);

  const fetchOrCreateAnalysis = useCallback(async () => {
    if (!bookmark) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmark_id: bookmark.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load analysis. Make sure the site_analyses table exists in your database.");
      }
    } catch (err) {
      console.error("Error fetching analysis:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [bookmark]);

  useEffect(() => {
    if (open && bookmark) {
      fetchOrCreateAnalysis();
    } else {
      setAnalysis(null);
      setError(null);
    }
  }, [open, bookmark, fetchOrCreateAnalysis]);

  /* Said in the page, where the person who pressed Scan is looking. */
  const scanFailureMessage = (status: number) => {
    if (status === 504 || status === 502 || status === 503)
      return "The scan timed out — this site is unusually heavy to load. Try again, or open it and save a lighter page.";
    if (status === 402)
      return "You've used this month's scans.";
    if (status === 429) return "Too many scans at once — give it a moment.";
    return "Couldn't scan this page. Try again.";
  };

  const handleScan = async () => {
    if (!analysis || !bookmark) return;

    setScanning(true);
    try {
      const response = await fetch("/api/analysis/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysis.id,
          url: bookmark.url,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        notifyUsageChanged(); // a scan was consumed
      } else {
        /* Not every failure is ours to format. A platform timeout answers with
           an HTML error page, and parsing that as JSON threw a SyntaxError
           that buried the real cause — the console said "Unexpected token 'A'"
           when the truth was a 504. */
        const body = await response.json().catch(() => null);
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                analysis_status: "error",
                error_message: body?.error || scanFailureMessage(response.status),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Error scanning page:", error);
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              analysis_status: "error",
              error_message:
                "Couldn't reach the server to scan this page. Check your connection and try again.",
            }
          : null
      );
    } finally {
      setScanning(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!analysis) return;

    setGenerating(true);
    setGenError(null);
    setOverLimit(false);
    try {
      const response = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysis.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        notifyUsageChanged(); // a guide credit was consumed
        return;
      }

      const body = await response.json().catch(() => ({}));
      setGenError(body.error || "Couldn't write the guide. Try again.");
      setOverLimit(response.status === 402);
    } catch (error) {
      console.error("Error generating prompt:", error);
      setGenError("Couldn't reach the server. Check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  if (!bookmark) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3 pr-8">
            {bookmark.favicon_url && (
              <img
                src={bookmark.favicon_url}
                alt=""
                className="w-5 h-5 rounded flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <DialogTitle className="truncate">{bookmark.title}</DialogTitle>
            {bookmark.domain && (
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[13px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline transition-colors"
              >
                {bookmark.domain} ↗
              </a>
            )}
          </div>
          <DialogDescription className="sr-only">
            Analyze design elements from {bookmark.domain}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                You may need to run the database migration to create the site_analyses table.
              </p>
            </div>
          ) : (
            <>
              {/* Left Panel - Preview (60%) */}
              <div className="w-3/5 p-6 border-r border-[var(--border)] overflow-hidden">
                <PreviewPanel
                  url={bookmark.url}
                  screenshotUrl={analysis?.screenshot_url || null}
                />
              </div>

              {/* Right Panel - Analysis (40%) */}
              <div className="w-2/5 p-6 overflow-hidden">
                <AnalysisPanel
                  fonts={analysis?.fonts || null}
                  colors={analysis?.colors || null}
                  designPrompt={analysis?.design_prompt || null}
                  designTokens={analysis?.design_tokens || null}
                  analysisStatus={analysis?.analysis_status || "pending"}
                  onGeneratePrompt={handleGeneratePrompt}
                  generating={generating}
                  guideError={genError}
                  guideOverLimit={overLimit}
                  onScan={handleScan}
                  scanning={scanning}
                  scanError={analysis?.error_message || null}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
