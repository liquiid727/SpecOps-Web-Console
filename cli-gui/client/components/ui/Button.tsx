import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      primary: "primary-button",
      secondary: "secondary-button",
      danger: "danger-button",
      ghost: "ui-button-ghost",
      accent: "ui-button-accent"
    },
    size: { sm: "ui-button-sm", md: "ui-button-md" },
    block: { true: "ui-button-block", false: "" }
  },
  defaultVariants: { variant: "ghost", size: "md", block: false }
});

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: ReactNode;
  unstyled?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ block, children, className, disabled, loading = false, loadingLabel, size, type = "button", unstyled = false, variant, ...props }, ref) {
  return <button ref={ref} type={type} className={unstyled ? className : cn(buttonVariants({ block, size, variant }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && loadingLabel ? loadingLabel : children}</button>;
});

export { buttonVariants };
