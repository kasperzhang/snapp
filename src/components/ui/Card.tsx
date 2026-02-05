"use client";

import { cn } from "@/lib/utils/cn";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border-light)] shadow-[var(--shadow-card)]",
          hoverable &&
            "transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-4", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";
