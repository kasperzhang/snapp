import { cn } from "@/lib/utils/cn";

/**
 * The right-hand content area rendered as a floating rounded panel sitting on
 * the sidebar's warm-gray background. It fills the viewport height and scrolls
 * internally, so the panel's rounded corners stay visible while content moves.
 */
export function ContentPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex-1 min-w-0 min-h-0 p-2 md:p-3 md:pl-1">
      <div
        className={cn(
          "h-full overflow-y-auto bg-[var(--background)] rounded-[22px] border border-[var(--border-light)] shadow-[var(--shadow-card)]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
