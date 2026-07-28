import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { cn } from "../../lib/utils";

export interface MenuItem { id: string; label: string; disabled?: boolean; danger?: boolean; onSelect: () => void; }

export function Menu({ ariaLabel, className, itemClassName, items, onClose, triggerRef, unstyled = false }: { ariaLabel: string; className?: string; itemClassName?: string | ((item: MenuItem) => string | undefined); items: readonly MenuItem[]; onClose: (restoreFocus?: boolean) => void; triggerRef: RefObject<HTMLElement | null>; unstyled?: boolean }) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => { const target = event.target as Node; if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) onClose(); };
    document.addEventListener("pointerdown", closeFromOutside);
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']:not(:disabled)")?.focus();
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [onClose, triggerRef]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const elements = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not(:disabled)") ?? [])];
    const current = elements.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); elements[(current + (event.key === "ArrowDown" ? 1 : -1) + elements.length) % elements.length]?.focus(); }
    if (event.key === "Home") { event.preventDefault(); elements[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); elements.at(-1)?.focus(); }
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
  }
  return <div ref={menuRef} className={unstyled ? className : cn("ui-menu", className)} role="menu" aria-label={ariaLabel} onKeyDown={onKeyDown}>{items.map((item) => <button type="button" role="menuitem" className={cn(item.danger && "danger", typeof itemClassName === "function" ? itemClassName(item) : itemClassName)} disabled={item.disabled} key={item.id} onClick={() => { item.onSelect(); onClose(false); }}>{item.label}</button>)}</div>;
}
