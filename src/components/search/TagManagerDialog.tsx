"use client";

import { useState, useRef, useEffect } from "react";
import { Tag } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Trash2, Plus } from "lucide-react";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  onCreateTag: (name: string) => Promise<void>;
  onUpdateTag: (id: string, name: string) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
}

export function TagManagerDialog({
  open,
  onOpenChange,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditValue(tag.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }

    const originalTag = tags.find((t) => t.id === editingId);
    if (originalTag && originalTag.name === editValue.trim()) {
      setEditingId(null);
      return;
    }

    try {
      setLoading(true);
      await onUpdateTag(editingId, editValue.trim());
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update tag:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await onDeleteTag(id);
    } catch (error) {
      console.error("Failed to delete tag:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    try {
      setLoading(true);
      await onCreateTag(newTagName.trim());
      setNewTagName("");
      newTagInputRef.current?.focus();
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-1">
          {tags.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">
              No tags yet
            </p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 group py-2 px-1 -mx-1 rounded-md hover:bg-[var(--border)]/50 transition-colors"
              >
                {editingId === tag.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                    disabled={loading}
                    className="flex-1 h-8 px-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                ) : (
                  <span
                    onClick={() => handleStartEdit(tag)}
                    className="flex-1 text-sm text-[var(--foreground)] cursor-pointer truncate"
                  >
                    {tag.name}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(tag.id)}
                  disabled={loading}
                  className="p-1.5 rounded-md text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  title="Delete tag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--text-secondary)]" />
            <input
              ref={newTagInputRef}
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleAddTag)}
              disabled={loading}
              placeholder="Add new tag..."
              className="flex-1 h-8 px-2 text-sm bg-transparent text-[var(--foreground)] placeholder:text-[var(--text-secondary)] focus:outline-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
