import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  unstyled?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ className, error, fieldClassName, hint, id, label, unstyled = false, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;
  const control = <textarea ref={ref} id={inputId} className={unstyled ? className : cn("ui-text-area", className)} aria-invalid={Boolean(error) || undefined} aria-describedby={descriptionId} {...props} />;
  if (!label && !hint && !error) return control;
  return <label className={cn("ui-field", fieldClassName)} htmlFor={inputId}>
    {label && <span className="ui-field-label">{label}</span>}
    {control}
    {(hint || error) && <small id={descriptionId} className={cn("ui-field-hint", error && "error")}>{error ?? hint}</small>}
  </label>;
});
