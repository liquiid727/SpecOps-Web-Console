import type { HTMLAttributes } from "react";

import { buildGlassSurfaceClassName, type GlassSurfaceTint } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Card({
  className,
  tint = "neutral",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tint?: GlassSurfaceTint }) {
  return (
    <div
      className={cn(
        buildGlassSurfaceClassName("panel", tint),
        "rounded-[24px] p-5",
        className
      )}
      {...props}
    />
  );
}
