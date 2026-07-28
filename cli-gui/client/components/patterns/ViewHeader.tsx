import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function ViewHeader({ actions, className, title }: { actions?: ReactNode; className?: string; title: ReactNode }) { return <header className={cn("view-header", className)}><h2>{title}</h2>{actions}</header>; }
