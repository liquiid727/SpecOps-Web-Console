import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function ResourceRow({ actions, className, icon, primary, secondary }: { actions?: ReactNode; className?: string; icon?: ReactNode; primary: ReactNode; secondary?: ReactNode }) { return <div className={cn("resource-row", className)}>{icon}<div><strong>{primary}</strong>{secondary && <small>{secondary}</small>}</div>{actions}</div>; }
