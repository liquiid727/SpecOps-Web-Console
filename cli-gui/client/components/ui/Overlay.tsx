import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../../i18n";

interface OverlayProps {
  children: ReactNode;
  description?: string;
  kind?: "dialog" | "drawer";
  onClose: () => void;
  title: string;
}

export function Overlay({ children, description, kind = "dialog", onClose, title }: OverlayProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return <div className="overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`overlay-panel ${kind}`} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="overlay-title" aria-describedby={description ? "overlay-description" : undefined} tabIndex={-1}>
      <header className="overlay-header">
        <div><span className="eyebrow">PRODUCT AI OS</span><h2 id="overlay-title">{title}</h2>{description && <p id="overlay-description">{description}</p>}</div>
        <button className="icon-button" onClick={onClose} aria-label={t("close")}><Icon name="close" /></button>
      </header>
      <div className="overlay-body">{children}</div>
    </div>
  </div>;
}
