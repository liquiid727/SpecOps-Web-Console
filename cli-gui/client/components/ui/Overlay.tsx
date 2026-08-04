import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../../i18n";

interface OverlayProps {
  children: ReactNode;
  description?: string;
  drawerSide?: "left" | "right";
  kind?: "dialog" | "drawer";
  onClose: () => void;
  title: string;
}

export function Overlay({ children, description, drawerSide = "right", kind = "dialog", onClose, title }: OverlayProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [closing, setClosing] = useState(false);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => onCloseRef.current(), 160);
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
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
      if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
      previous?.focus();
    };
  }, [requestClose]);

  const drawerPlacementClass = kind === "drawer" ? ` drawer-${drawerSide}` : "";
  return <div className={`overlay-backdrop${drawerPlacementClass} ${closing ? "closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div className={`overlay-panel ${kind}${drawerPlacementClass} ${closing ? "closing" : ""}`} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
      <header className="overlay-header">
        <div><span className="eyebrow">{t("brandTitle").toUpperCase()}</span><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
        <button className="icon-button" onClick={requestClose} aria-label={t("close")}><Icon name="close" /></button>
      </header>
      <div className="overlay-body">{children}</div>
    </div>
  </div>;
}
