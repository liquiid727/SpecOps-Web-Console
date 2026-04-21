import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-transparent px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300",
        className
      )}
      {...props}
    />
  );
}
