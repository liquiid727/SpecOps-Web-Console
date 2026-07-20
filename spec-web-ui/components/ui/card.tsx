import React, { type HTMLAttributes } from "react";

import { buildNeoSurfaceClassName, type NeoSurfaceTint } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Card({
  className,
  tint = "neutral",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tint?: NeoSurfaceTint }) {
  return (
    <div
      className={cn(
        buildNeoSurfaceClassName("panel", tint),
        "p-5",
        className
      )}
      {...props}
    />
  );
}
