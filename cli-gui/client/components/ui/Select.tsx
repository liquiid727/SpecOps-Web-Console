import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Select({ ariaLabel, className = "", disabled = false, options, value, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    optionRefs.current[selectedIndex]?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, selectedIndex]);

  function move(delta: number) {
    if (!options.length) return;
    let next = selectedIndex;
    for (let count = 0; count < options.length; count += 1) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) {
        onChange(options[next].value);
        optionRefs.current[next]?.focus();
        return;
      }
    }
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
    }
  }

  function onListboxKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
    if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
    if (event.key === "Home") { event.preventDefault(); optionRefs.current.find((_, index) => !options[index].disabled)?.focus(); }
    if (event.key === "End") { event.preventDefault(); [...optionRefs.current].reverse().find((_, index) => !options[options.length - 1 - index].disabled)?.focus(); }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); rootRef.current?.querySelector<HTMLButtonElement>(".custom-select-trigger")?.focus(); }
  }

  return <div ref={rootRef} className={`custom-select ${className} ${open ? "open" : ""}`}>
    <button type="button" className="custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} disabled={disabled || !selected} onClick={() => setOpen((current) => !current)} onKeyDown={onTriggerKeyDown}>
      <span>{selected?.label ?? "-"}</span><Icon name="chevron" />
    </button>
    <div id={listboxId} className="custom-select-menu" role="listbox" aria-label={ariaLabel} aria-hidden={!open} onKeyDown={onListboxKeyDown}>
      {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} tabIndex={open && index === selectedIndex ? 0 : -1} ref={(element) => { optionRefs.current[index] = element; }} key={option.value} onClick={() => { onChange(option.value); setOpen(false); rootRef.current?.querySelector<HTMLButtonElement>(".custom-select-trigger")?.focus(); }}>{option.label}</button>)}
    </div>
  </div>;
}
