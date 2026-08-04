import { useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface TabItem<T extends string> { id: T; label: ReactNode; disabled?: boolean; panelId?: string; buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled" | "onClick" | "role"> & { [key: `data-${string}`]: string | undefined }; }

export function Tabs<T extends string>({ ariaLabel, className, itemClassName, items, onChange, unstyled = false, value }: { ariaLabel: string; className?: string; itemClassName?: string | ((item: TabItem<T>) => string | undefined); items: readonly TabItem<T>[]; onChange: (value: T) => void; unstyled?: boolean; value: T }) {
  const generatedId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = items.map((item, index) => ({ item, index })).filter(({ item }) => !item.disabled);
    const current = enabled.findIndex(({ item }) => item.id === value);
    const target = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(current + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
    if (target) { onChange(target.item.id); refs.current[target.index]?.focus(); }
  }
  return <div className={unstyled ? className : cn("ui-tabs", className)} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
    {items.map((item, index) => <button {...item.buttonProps} ref={(node) => { refs.current[index] = node; }} id={item.buttonProps?.id ?? `${generatedId}-${item.id}`} type="button" role="tab" aria-selected={value === item.id} aria-controls={item.panelId} tabIndex={value === item.id ? 0 : -1} disabled={item.disabled} className={cn(value === item.id && "active", typeof itemClassName === "function" ? itemClassName(item) : itemClassName, item.buttonProps?.className)} key={item.id} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>;
}
