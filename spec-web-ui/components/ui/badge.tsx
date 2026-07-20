import React, { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "blue" | "green" | "yellow" | "red";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "neo-badge",
        `neo-badge-${tone}`,
        className
      )}
      {...props}
    />
  );
}
