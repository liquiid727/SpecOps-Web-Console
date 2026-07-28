import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { unstyled?: boolean; }
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge({ className, unstyled = false, ...props }, ref) { return <span ref={ref} className={unstyled ? className : cn("ui-badge", className)} {...props} />; });
