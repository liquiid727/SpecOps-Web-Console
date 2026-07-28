import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Icon, type IconName } from "./Icon";

export function EmptyState({ action, actions, className, description, icon, title }: { action?: ReactNode; actions?: ReactNode; className?: string; description?: ReactNode; icon?: IconName | ReactNode; title?: ReactNode }) {
  const renderedIcon = typeof icon === "string" ? <Icon name={icon as IconName} /> : icon;
  return <div className={cn("ui-empty-state", className)}>{renderedIcon}{title && <h3>{title}</h3>}{description && <p>{description}</p>}{actions ?? action}</div>;
}
