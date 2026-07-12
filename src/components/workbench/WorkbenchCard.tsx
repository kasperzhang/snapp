"use client";

import Link from "next/link";
import { Layers, Trash2, Sparkles } from "lucide-react";
import { Workbench } from "@/types";
import { Card } from "@/components/ui/Card";

interface WorkbenchCardProps {
  workbench: Workbench;
  onDelete?: (id: string) => void;
}

export function WorkbenchCard({ workbench, onDelete }: WorkbenchCardProps) {
  const count = workbench.item_count ?? 0;
  return (
    <Card hoverable className="relative group">
      <Link href={`/workbench/${workbench.id}`} className="block p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-card)] bg-[var(--border)] flex items-center justify-center flex-shrink-0">
            <Layers className="w-4.5 h-4.5 text-[var(--foreground)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--foreground)] truncate">
              {workbench.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {count} {count === 1 ? "site" : "sites"}
            </p>
          </div>
        </div>
        {workbench.guide_status === "completed" && (
          <span className="inline-flex items-center gap-1 mt-4 text-xs text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5" />
            Guide ready
          </span>
        )}
      </Link>
      {onDelete && (
        <button
          onClick={() => onDelete(workbench.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-[var(--border)] text-[var(--text-secondary)]"
          title="Delete workbench"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Card>
  );
}
