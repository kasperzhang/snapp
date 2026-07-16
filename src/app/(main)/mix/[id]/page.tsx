"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkbench } from "@/hooks";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { SourceCard, GuideViewer } from "@/components/workbench";

export default function WorkbenchEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const {
    workbench,
    loading,
    patchWorkbench,
    removeItem,
    updateItemSelection,
    scanItem,
    generate,
  } = useWorkbench(id);

  const [userEmail, setUserEmail] = useState<string>();
  const [genError, setGenError] = useState<string | null>(null);
  const autoScanned = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email));
  }, []);

  // Auto-scan any source that hasn't been analyzed yet (once each)
  useEffect(() => {
    if (!workbench) return;
    for (const item of workbench.items) {
      const status = item.analysis?.analysis_status ?? "pending";
      if (status === "pending" && !autoScanned.current.has(item.id)) {
        autoScanned.current.add(item.id);
        scanItem(item);
      }
    }
  }, [workbench, scanItem]);

  const items = workbench?.items ?? [];
  const statusOf = (s?: string) => s ?? "pending";
  // Every source has finished scanning (completed or error) …
  const allResolved =
    items.length > 0 &&
    items.every((i) => {
      const s = statusOf(i.analysis?.analysis_status);
      return s === "completed" || s === "error";
    });
  const completedCount = items.filter(
    (i) => i.analysis?.analysis_status === "completed"
  ).length;
  // … and at least one scanned successfully (has a screenshot to compose from)
  const canGenerate = allResolved && completedCount > 0;
  const generating = workbench?.guide_status === "generating";

  const handleGenerate = async () => {
    setGenError(null);
    try {
      await generate();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate brief");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <Sidebar userEmail={userEmail} />
      <ContentPanel>
        <main className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 md:py-10">
        <Link
          href="/mix"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          All mixes
        </Link>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : !workbench ? (
          <p className="text-[var(--text-secondary)]">Mix not found.</p>
        ) : (
          <>
            <input
              key={workbench.id}
              defaultValue={workbench.name}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                if (v && v !== workbench.name) patchWorkbench({ name: v });
              }}
              className="text-2xl font-semibold text-[var(--foreground)] bg-transparent border-none focus:outline-none focus:ring-0 w-full mb-1"
            />
            <p className="text-[var(--text-secondary)] mb-8">
              Mark what to borrow from each site, add your own notes, then
              generate one design brief.
            </p>

            {/* Sources */}
            {items.length === 0 ? (
              <p className="text-[var(--text-secondary)]">
                No sources in this workbench.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {items.map((item) => (
                  <SourceCard
                    key={item.id}
                    item={item}
                    onChange={updateItemSelection}
                    onRemove={removeItem}
                    onScan={scanItem}
                  />
                ))}
              </div>
            )}

            {/* Your own additions */}
            <div className="mb-8 max-w-2xl">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Your own additions
              </label>
              <textarea
                key={workbench.id}
                defaultValue={workbench.own_additions ?? ""}
                onBlur={(e) => {
                  const v = e.currentTarget.value;
                  if (v !== (workbench.own_additions ?? ""))
                    patchWorkbench({ own_additions: v });
                }}
                placeholder="Anything you want to add from yourself — a mood, a constraint, a brand color…"
                rows={3}
                className="w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              />
            </div>

            {/* Generate */}
            <div className="flex items-center gap-3 mb-10">
              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={!canGenerate || generating}
              >
                <Sparkles className="w-4 h-4" />
                {workbench.design_guide ? "Regenerate brief" : "Generate brief"}
              </Button>
              {!allResolved && items.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for all sources to finish scanning…
                </span>
              )}
              {allResolved && completedCount < items.length && (
                <span className="text-sm text-[var(--text-secondary)]">
                  Some sources failed to scan — you can retry or generate from
                  the {completedCount} that succeeded.
                </span>
              )}
              {genError && <span className="text-sm text-red-500">{genError}</span>}
            </div>

            {/* Guide */}
            {generating && !workbench.design_guide && (
              <p className="text-sm text-[var(--text-secondary)]">
                Generating your design brief — this can take a minute…
              </p>
            )}
            {workbench.design_guide && (
              <GuideViewer guide={workbench.design_guide} name={workbench.name} />
            )}
          </>
        )}
        </main>
      </ContentPanel>
    </div>
  );
}
