"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CreateWorkbenchInput,
  Workbench,
  WorkbenchItem,
  WorkbenchItemSelection,
  WorkbenchWithItems,
} from "@/types";

// Fired whenever a mix is created/deleted anywhere in the app so every
// mounted useWorkbenches instance (e.g. the sidebar list) stays in sync.
const MIXES_CHANGED = "snapp:mixes-changed";
export const announceMixesChanged = () =>
  window.dispatchEvent(new Event(MIXES_CHANGED));

// ── Library: saved workbenches ─────────────────────────────────────────────
export function useWorkbenches() {
  const [workbenches, setWorkbenches] = useState<Workbench[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/workbenches");
      if (!res.ok) throw new Error("Failed to load mixes");
      setWorkbenches(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mixes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(MIXES_CHANGED, refresh);
    return () => window.removeEventListener(MIXES_CHANGED, refresh);
  }, [refresh]);

  const createWorkbench = async (input: CreateWorkbenchInput) => {
    const res = await fetch("/api/workbenches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || "Failed to create mix");
    }
    const wb = await res.json();
    setWorkbenches((prev) => [
      {
        ...wb,
        item_count: (input.items ?? input.bookmark_ids ?? []).length,
      },
      ...prev,
    ]);
    announceMixesChanged();
    return wb as Workbench;
  };

  const deleteWorkbench = async (id: string) => {
    const res = await fetch("/api/workbenches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Failed to delete mix");
    setWorkbenches((prev) => prev.filter((w) => w.id !== id));
    announceMixesChanged();
  };

  return {
    workbenches,
    loading,
    error,
    refresh,
    createWorkbench,
    deleteWorkbench,
  };
}

// ── Editor: a single workbench with its items ──────────────────────────────
export function useWorkbench(id: string | null) {
  const [workbench, setWorkbench] = useState<WorkbenchWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workbenches?id=${id}`);
      if (!res.ok) throw new Error("Failed to load mix");
      setWorkbench(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mix");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patchWorkbench = async (
    patch: { name?: string; own_additions?: string }
  ) => {
    if (!id) return;
    setWorkbench((prev) => (prev ? { ...prev, ...patch } : prev));
    await fetch("/api/workbenches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
  };

  const addItem = async (bookmark_id: string) => {
    if (!id) return;
    const res = await fetch("/api/workbench-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workbench_id: id, bookmark_id }),
    });
    if (!res.ok) throw new Error("Failed to add source");
    const item = (await res.json()) as WorkbenchItem;
    setWorkbench((prev) =>
      prev ? { ...prev, items: [...prev.items, item] } : prev
    );
    return item;
  };

  const removeItem = async (itemId: string) => {
    await fetch("/api/workbench-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    setWorkbench((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev
    );
  };

  const updateItemSelection = async (
    itemId: string,
    selection: WorkbenchItemSelection
  ) => {
    setWorkbench((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, selection } : i
            ),
          }
        : prev
    );
    await fetch("/api/workbench-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, selection }),
    });
  };

  // Scan a source's underlying analysis (screenshot + fonts + colors)
  const scanItem = async (item: WorkbenchItem) => {
    if (!item.analysis_id || !item.bookmark?.url) return;
    // optimistic: mark scanning
    setWorkbench((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === item.id && i.analysis
                ? { ...i, analysis: { ...i.analysis, analysis_status: "scanning" } }
                : i
            ),
          }
        : prev
    );
    try {
      const res = await fetch("/api/analysis/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: item.analysis_id,
          url: item.bookmark.url,
        }),
      });
      if (!res.ok) {
        // Scan failed on the server — mark this source errored, keep its id
        setWorkbench((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        analysis: i.analysis
                          ? { ...i.analysis, analysis_status: "error" }
                          : i.analysis,
                      }
                    : i
                ),
              }
            : prev
        );
        return;
      }
      const analysis = await res.json();
      setWorkbench((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id ? { ...i, analysis } : i
              ),
            }
          : prev
      );
    } catch {
      setWorkbench((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id && i.analysis
                  ? { ...i, analysis: { ...i.analysis, analysis_status: "error" } }
                  : i
              ),
            }
          : prev
      );
    }
  };

  /* The guide streams back as NDJSON so the panel can show it being written.
     onDelta receives the text accumulated so far, not just the new chunk. */
  const generate = async (onDelta?: (partial: string) => void) => {
    if (!id) return;
    setWorkbench((prev) =>
      prev ? { ...prev, guide_status: "generating" } : prev
    );
    const failed = (message: string, status?: number) => {
      setWorkbench((prev) => (prev ? { ...prev, guide_status: "error" } : prev));
      // Carry the HTTP status so callers can react to 402 (plan limit).
      return Object.assign(new Error(message), { status });
    };

    const res = await fetch("/api/workbenches/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workbench_id: id }),
    });
    // Everything that can reject the request does so before the stream opens,
    // so a non-2xx here is still plain JSON.
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw failed(e.error || "Failed to generate guide", res.status);
    }
    if (!res.body) throw failed("Failed to generate guide", res.status);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let guide = "";
    let updated: Workbench | null = null;
    let streamError: string | null = null;

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const frame = JSON.parse(line);
      if (frame.t === "d") {
        guide += frame.v;
        onDelta?.(guide);
      } else if (frame.t === "done") {
        updated = frame.workbench as Workbench;
      } else if (frame.t === "err") {
        streamError = frame.message || "Failed to generate guide";
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // A frame can be split across chunks — keep the trailing partial line.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    }
    if (buffer.trim()) handleLine(buffer);

    if (streamError) throw failed(streamError);
    // No terminal frame means the connection dropped or the function died —
    // don't resolve as if it succeeded.
    if (!updated) throw failed("Generation was interrupted — try again");

    setWorkbench((prev) => (prev ? { ...prev, ...updated } : prev));
    return updated as Workbench;
  };

  return {
    workbench,
    loading,
    error,
    refresh,
    patchWorkbench,
    addItem,
    removeItem,
    updateItemSelection,
    scanItem,
    generate,
  };
}
