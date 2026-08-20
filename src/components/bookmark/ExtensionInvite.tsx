"use client";

import { Chrome } from "lucide-react";
import { useExtensionPrompt } from "@/hooks";
import { cn } from "@/lib/utils/cn";

/* The extension, offered to someone who has nothing saved yet.

   ExtensionBanner deliberately won't fire until a bookmark exists that is
   actually worse off without it — which means it cannot appear on day one,
   the one session where someone is deciding whether this fits how they work.
   This is the other half of that rule: no claim about degraded previews,
   because there's nothing to degrade yet. Just the faster way to save. */
export function ExtensionInvite({ className }: { className?: string }) {
  const { canInstall, storeUrl } = useExtensionPrompt();
  if (!canInstall || !storeUrl) return null;

  return (
    <p
      className={cn(
        "text-[13px] leading-relaxed text-[var(--text-secondary)]",
        className
      )}
    >
      Or{" "}
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-[var(--accent)] underline-offset-2 hover:underline"
      >
        <Chrome className="h-3.5 w-3.5" />
        add the Chrome extension
      </a>{" "}
      — save any page in one click, and every site previews live.
    </p>
  );
}
