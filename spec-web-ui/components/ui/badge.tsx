import type { HTMLAttributes } from "react";

import { buildGlassInteractiveClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        buildGlassInteractiveClassName("neutral"),
        "inline-flex items-center rounded-[14px] px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em]",
        className
      )}
      {...props}
    />
  );
}
