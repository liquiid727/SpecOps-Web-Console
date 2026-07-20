import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { buildNeoInteractiveClassName } from "@/lib/theme";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition duration-150 ease-out disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: buildNeoInteractiveClassName("accent"),
        secondary: buildNeoInteractiveClassName("neutral"),
        ghost: "border-2 border-transparent bg-transparent text-slate-600 hover:border-ink hover:bg-panel hover:text-ink"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
