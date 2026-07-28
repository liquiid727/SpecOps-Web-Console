import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { Icon, type IconName } from "./Icon";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  label: string;
  appearance?: "default" | "qoder" | "section" | "composer";
  unstyled?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ appearance = "default", className, icon, label, title = label, type = "button", unstyled = false, ...props }, ref) {
  const appearanceClass = appearance === "qoder" ? "qoder-icon-button" : appearance === "section" ? "section-icon" : appearance === "composer" ? "composer-icon" : "icon-button";
  return <button ref={ref} type={type} className={unstyled ? className : cn("ui-icon-button", appearanceClass, className)} aria-label={label} title={title} {...props}><Icon name={icon} /></button>;
});
