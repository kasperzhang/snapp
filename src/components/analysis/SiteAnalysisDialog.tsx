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
      } else {
        const error = await response.json();
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                analysis_status: "error",
                error_message: error.error || "Failed to scan page",
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
              error_message: "Failed to scan page",
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
    try {
      const response = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysis.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
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
                  onScan={handleScan}
                  scanning={scanning}
                  analysisStatus={analysis?.analysis_status || "pending"}
                  errorMessage={analysis?.error_message || null}
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
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
