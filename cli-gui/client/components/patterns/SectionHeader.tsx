import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function SectionHeader({ actions, className, title }: { actions?: ReactNode; className?: string; title: ReactNode }) { return <header className={cn("ui-section-header", className)}><strong>{title}</strong>{actions}</header>; }
