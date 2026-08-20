"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkbench, useWorkbenches } from "@/hooks";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  AddSourceDialog,
  GuidePane,
  RecipeStrip,
  SourceCard,
} from "@/components/workbench";
import { GuideCredits, LimitNotice } from "@/components/billing";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

/* The mix workspace: the recipe on the left, the guide on the right. They used
   to be stacked, which put the thing you came for a full screen below the
   thing you already filled in — and made every regeneration a scroll down to
   see whether it had worked. */
export default function WorkbenchEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const {
    workbench,
    loading,
    patchWorkbench,
    addItem,
    removeItem,
    updateItemSelection,
    scanItem,
    generate,
  } = useWorkbench(id);
  const { deleteWorkbench } = useWorkbenches();

  const [userEmail, setUserEmail] = useState<string>();
  const [genError, setGenError] = useState<string | null>(null);
  // A 402 isn't a failure to fix, it's a plan to change — it gets a way out.
  const [overLimit, setOverLimit] = useState(false);
  // The guide as it streams in, before it's saved and handed back.
  const [partial, setPartial] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Under lg the two panes stack behind this switch.
  const [tab, setTab] = useState<"recipe" | "guide">("recipe");
  const autoScanned = useRef<Set<string>>(new Set());
  const titleRef = useRef<HTMLInputElement>(null);

  /* Every edit here saves itself on blur, silently — you tag six aspects and
     get no sign any of it stuck. */
  /* The title is controlled so the box can be as wide as the name and no
     wider — a stretched input reads as an empty form field across the header,
     rather than a name you can click. */
  const [nameInput, setNameInput] = useState("");
  useEffect(() => {
    if (workbench) setNameInput(workbench.name);
    // Only the name and the identity — tagging a source re-renders the whole
    // workbench, and depending on it would wipe what you were typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbench?.id, workbench?.name]);

  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1800);
  };
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const patchAndFlash = async (patch: Parameters<typeof patchWorkbench>[0]) => {
    await patchWorkbench(patch);
    flashSaved();
  };
  const changeSelection: typeof updateItemSelection = async (itemId, sel) => {
    await updateItemSelection(itemId, sel);
    flashSaved();
  };

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
  const removing = items.find((i) => i.id === removingId);

  const handleGenerate = async () => {
    setGenError(null);
    setOverLimit(false);
    setPartial("");
    try {
      await generate(setPartial);
    } catch (e) {
      const err = e as Error & { status?: number };
      setGenError(err.message || "Failed to generate guide");
      setOverLimit(err.status === 402);
    } finally {
      setPartial("");
    }
  };

  const generateButton = (
    <Button
      onClick={handleGenerate}
      loading={generating}
      disabled={!canGenerate || generating}
      size="sm"
      className="shrink-0"
    >
      <Sparkles className="w-4 h-4" />
      <span className="hidden sm:inline">
        {workbench?.design_guide ? "Regenerate guide" : "Generate guide"}
      </span>
    </Button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <Sidebar userEmail={userEmail} />
      {/* The panes scroll, not the panel — so the guide can stay in view while
          the recipe moves under it. */}
      <ContentPanel className="overflow-y-hidden">
        {loading ? (
          <p className="p-8 text-[var(--text-secondary)]">Loading…</p>
        ) : !workbench ? (
          <p className="p-8 text-[var(--text-secondary)]">Mix not found.</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="shrink-0 border-b border-[var(--border)] px-5 pb-3 pt-4 md:px-7">
              <Link
                href="/mix"
                className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All mixes
              </Link>

              <div className="flex items-center gap-2">
                {/* Editable in place — the old input gave no sign it was one. */}
                <input
                  ref={titleRef}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  // Chars, not pixels — close enough for a display face, and
                  // it costs no measuring pass.
                  size={Math.max(nameInput.length + 1, 8)}
                  onBlur={() => {
                    const v = nameInput.trim();
                    if (v && v !== workbench.name) patchAndFlash({ name: v });
                    else if (!v) setNameInput(workbench.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      setNameInput(workbench.name);
                      e.currentTarget.blur();
                    }
                  }}
                  title="Rename this mix"
                  className="-ml-2 min-w-0 max-w-full rounded-lg border border-transparent bg-transparent px-2 py-0.5 font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-[-0.02em] text-[var(--foreground)] transition-colors hover:border-[var(--border)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
                />

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <GuideCredits className="hidden md:inline" />
                  {generateButton}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        title="Mix options"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          // Defer past the menu's own focus restore.
                          setTimeout(() => {
                            titleRef.current?.focus();
                            titleRef.current?.select();
                          }, 0)
                        }
                      >
                        <Pencil />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setConfirmDelete(true)}
                      >
                        <Trash2 />
                        Delete mix
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {items.length} {items.length === 1 ? "source" : "sources"}
                {" · "}
                {workbench.design_guide
                  ? `guide updated ${timeAgo(workbench.updated_at) ?? "recently"}`
                  : "no guide yet"}
                <span
                  className={cn(
                    "ml-2 inline-flex items-center gap-1 text-[var(--brand)] transition-opacity duration-300",
                    saved ? "opacity-100" : "opacity-0"
                  )}
                >
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              </p>

              {genError && (
                <LimitNotice
                  message={genError}
                  overLimit={overLimit}
                  className="mt-2 max-w-md"
                />
              )}

              {(!allResolved && items.length > 0) ||
              (allResolved && completedCount < items.length) ? (
                <p className="mt-1 text-[12.5px] text-[var(--text-secondary)]">
                  {!allResolved ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Scanning sources — {completedCount} of {items.length} done
                    </span>
                  ) : (
                    <>
                      Some sources failed to scan — retry them, or generate from
                      the {completedCount} that worked.
                    </>
                  )}
                </p>
              ) : null}

              {/* Pane switch — only below the two-column breakpoint. */}
              <div className="mt-3 flex gap-1 rounded-lg bg-[var(--border)] p-0.5 lg:hidden">
                {(["recipe", "guide"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 rounded-md py-1 text-[13px] font-medium capitalize transition-colors",
                      tab === t
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--text-secondary)]"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </header>

            {/* ── Panes ──────────────────────────────────────────────── */}
            <div className="flex min-h-0 flex-1">
              <div
                className={cn(
                  "min-w-0 flex-1 overflow-y-auto px-5 py-5 md:px-7",
                  tab === "guide" && "hidden lg:block"
                )}
              >
                <RecipeStrip items={items} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {items.map((item) => (
                    <SourceCard
                      key={item.id}
                      item={item}
                      onChange={changeSelection}
                      onRemove={setRemovingId}
                      onScan={scanItem}
                    />
                  ))}

                  <button
                    onClick={() => setAddOpen(true)}
                    className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--foreground)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add a source
                  </button>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-[13px] font-medium text-[var(--foreground)]">
                    Your own additions
                  </label>
                  <textarea
                    key={workbench.id}
                    defaultValue={workbench.own_additions ?? ""}
                    onBlur={(e) => {
                      const v = e.currentTarget.value;
                      if (v !== (workbench.own_additions ?? ""))
                        patchAndFlash({ own_additions: v });
                    }}
                    placeholder="Anything you want to add from yourself — a mood, a constraint, a brand color…"
                    rows={3}
                    className="w-full resize-none rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div
                className={cn(
                  "min-h-0 shrink-0 border-l border-[var(--border)] p-4 lg:w-[46%] lg:max-w-[620px]",
                  tab === "guide"
                    ? "w-full border-l-0 lg:border-l"
                    : "hidden lg:block"
                )}
              >
                <GuidePane
                  guide={workbench.design_guide}
                  partial={partial}
                  generating={generating}
                  name={workbench.name}
                  action={canGenerate ? generateButton : undefined}
                  emptyHint={
                    items.length === 0
                      ? "This mix has no sources yet. Add one to get started."
                      : !allResolved
                        ? "Reading your sources — the guide can be written once they're all scanned."
                        : undefined
                  }
                />
              </div>
            </div>

          </div>
        )}

        <AddSourceDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          presentIds={new Set(items.map((i) => i.bookmark_id))}
          onAdd={addItem}
        />

        <ConfirmDialog
          open={!!removingId}
          onOpenChange={(open) => !open && setRemovingId(null)}
          title="Remove this source?"
          description={
            removing
              ? `"${removing.bookmark?.title ?? "This source"}" and everything you tagged on it leave this mix. The bookmark stays in your library.`
              : ""
          }
          confirmLabel="Remove"
          onConfirm={async () => {
            if (removingId) await removeItem(removingId);
          }}
        />

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete mix?"
          description={`"${workbench?.name ?? "This mix"}" and its guide will be deleted. Your bookmarks stay in the library.`}
          onConfirm={async () => {
            await deleteWorkbench(id);
            router.push("/mix");
          }}
        />
      </ContentPanel>
    </div>
  );
}
