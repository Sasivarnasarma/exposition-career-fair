import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card surface-panel p-6 sm:p-8",
        className,
      )}
      {...props}
    />
  );
}
