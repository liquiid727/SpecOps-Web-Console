import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> { unstyled?: boolean; }
export const Card = forwardRef<HTMLElement, CardProps>(function Card({ className, unstyled = false, ...props }, ref) { return <article ref={ref} className={unstyled ? className : cn("ui-card", className)} {...props} />; });
