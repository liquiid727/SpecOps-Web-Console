import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function AsyncState({ action, actions, className, description, icon, kind, message, state, title }: { action?: ReactNode; actions?: ReactNode; className?: string; description?: ReactNode; icon?: ReactNode; kind?: "loading" | "empty" | "error" | "success"; message?: ReactNode; state?: "loading" | "empty" | "error" | "success"; title?: ReactNode }) {
  const resolvedState = state ?? kind ?? "empty";
  return <div className={cn("ui-async-state", resolvedState, className)} role={resolvedState === "error" ? "status" : undefined}>{icon}{(title ?? message) && <strong>{title ?? message}</strong>}{description && <p>{description}</p>}{actions ?? action}</div>;
}
