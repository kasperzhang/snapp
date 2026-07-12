"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface NameWorkbenchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  defaultName?: string;
  onConfirm: (name: string) => Promise<void>;
}

export function NameWorkbenchDialog({
  open,
  onOpenChange,
  count,
  defaultName = "",
  onConfirm,
}: NameWorkbenchDialogProps) {
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName(defaultName);
      setError(null);
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Give your workbench a name");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create workbench");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Name your workbench</DialogTitle>
          <DialogDescription>
            Composing from {count} {count === 1 ? "site" : "sites"}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Fintech hero"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={submitting}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Create &amp; open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
