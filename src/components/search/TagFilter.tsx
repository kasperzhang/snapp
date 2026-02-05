"use client";

import { useState } from "react";
import { Tag } from "@/types";
import { TagChip } from "@/components/ui/TagChip";
import { TagManagerDialog } from "./TagManagerDialog";
import { Settings2 } from "lucide-react";

interface TagFilterProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag?: (name: string) => Promise<void>;
  onUpdateTag?: (id: string, name: string) => Promise<void>;
  onDeleteTag?: (id: string) => Promise<void>;
}

export function TagFilter({
  tags,
  selectedIds,
  onChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagFilterProps) {
  const [managerOpen, setManagerOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  if (tags.length === 0 && !onCreateTag) return null;

  const isAllSelected = selectedIds.length === 0;
  const canManageTags = onCreateTag && onUpdateTag && onDeleteTag;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {tags.length > 0 && (
          <>
            <TagChip
              name="All"
              selected={isAllSelected}
              onClick={() => onChange([])}
            />
            {tags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                selected={selectedIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              />
            ))}
          </>
        )}
        {canManageTags && (
          <button
            onClick={() => setManagerOpen(true)}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
            title="Manage tags"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {canManageTags && (
        <TagManagerDialog
          open={managerOpen}
          onOpenChange={setManagerOpen}
          tags={tags}
          onCreateTag={onCreateTag}
          onUpdateTag={onUpdateTag}
          onDeleteTag={onDeleteTag}
        />
      )}
    </>
  );
}
