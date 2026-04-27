import React, { type HTMLAttributes, type ReactNode } from "react";

import {
  buildGlassSurfaceClassName,
  buildTrafficLightClassName,
  WINDOW_TRAFFIC_LIGHTS,
  type GlassSurfaceTint
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function WindowSection({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  contentClassName,
  tint = "neutral",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
  tint?: GlassSurfaceTint;
}) {
  return (
    <section className={cn(buildGlassSurfaceClassName("hero", tint), "window-section rounded-[28px]", className)} {...props}>
      <div className="window-titlebar">
        <div className="window-heading">
          <div className="traffic-lights" aria-hidden="true">
            {WINDOW_TRAFFIC_LIGHTS.map((tone) => (
              <span key={tone} className={buildTrafficLightClassName(tone)} data-testid="traffic-light" />
            ))}
          </div>
          <div className="window-heading-copy">
            {eyebrow ? <p className="window-eyebrow">{eyebrow}</p> : null}
            <h2 className="window-title">{title}</h2>
            {description ? <p className="window-description">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="window-actions">{actions}</div> : null}
      </div>
      <div className={cn("window-body", contentClassName)}>{children}</div>
    </section>
  );
}
