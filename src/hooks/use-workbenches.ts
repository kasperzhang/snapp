"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CreateWorkbenchInput,
  Workbench,
  WorkbenchItem,
  WorkbenchItemSelection,
  WorkbenchWithItems,
} from "@/types";

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
      { ...wb, item_count: input.bookmark_ids?.length ?? 0 },
      ...prev,
    ]);
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

  const generate = async () => {
    if (!id) return;
    setWorkbench((prev) =>
      prev ? { ...prev, guide_status: "generating" } : prev
    );
    const res = await fetch("/api/workbenches/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workbench_id: id }),
    });
    if (!res.ok) {
      const e = await res.json();
      setWorkbench((prev) => (prev ? { ...prev, guide_status: "error" } : prev));
      throw new Error(e.error || "Failed to generate guide");
    }
    const updated = await res.json();
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
