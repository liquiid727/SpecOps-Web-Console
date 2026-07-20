import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import { Icon, type IconName } from "./Icon";

export type FeedbackKind = "success" | "info" | "warning" | "error";
export type FeedbackPresentation = "toast" | "message" | "notification";

export interface FeedbackAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface FeedbackOptions {
  title?: string;
  description?: string;
  action?: FeedbackAction;
  duration?: number;
  key?: string;
}

export interface FeedbackNotice extends Required<Pick<FeedbackOptions, "title" | "duration">> {
  id: string;
  kind: FeedbackKind;
  presentation: FeedbackPresentation;
  description?: string;
  action?: FeedbackAction;
  key?: string;
}

interface FeedbackContextValue {
  show: (kind: FeedbackKind, presentation: FeedbackPresentation, options: FeedbackOptions | string) => string;
  toast: (options: FeedbackOptions | string) => string;
  message: (kind: FeedbackKind, options: FeedbackOptions | string) => string;
  notification: (kind: FeedbackKind, options: FeedbackOptions | string) => string;
  success: (options: FeedbackOptions | string) => string;
  info: (options: FeedbackOptions | string) => string;
  warning: (options: FeedbackOptions | string) => string;
  error: (options: FeedbackOptions | string) => string;
  promise: <T>(task: Promise<T> | (() => Promise<T>), states: { loading: FeedbackOptions | string; success: FeedbackOptions | string; error: FeedbackOptions | string }) => Promise<T>;
  dismiss: (id: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

const defaultDuration: Record<FeedbackPresentation, number> = {
  toast: 4000,
  message: 4000,
  notification: 6500
};

const defaultIcon: Record<FeedbackKind, IconName> = {
  success: "check",
  info: "info",
  warning: "warning",
  error: "warning"
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [notices, setNotices] = useState<FeedbackNotice[]>([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id: string) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const show = useCallback((kind: FeedbackKind, presentation: FeedbackPresentation, input: FeedbackOptions | string) => {
    const options = typeof input === "string" ? { title: input } : input;
    const id = `feedback-${++sequence.current}`;
    const title = options.title ?? t(defaultTitleKey[kind]);
    const notice: FeedbackNotice = {
      id,
      kind,
      presentation,
      title,
      description: options.description,
      action: options.action,
      duration: options.duration ?? defaultDuration[presentation],
      key: options.key
    };
    setNotices((current) => {
      const withoutDuplicate = notice.key ? current.filter((item) => item.key !== notice.key) : current;
      return [...withoutDuplicate, notice].slice(-4);
    });
    return id;
  }, [t]);

  const context = useMemo<FeedbackContextValue>(() => ({
    show,
    toast: (options) => show("info", "toast", options),
    message: (kind, options) => show(kind, "message", options),
    notification: (kind, options) => show(kind, "notification", options),
    success: (options) => show("success", "toast", options),
    info: (options) => show("info", "message", options),
    warning: (options) => show("warning", "notification", options),
    error: (options) => show("error", "notification", options),
    promise: async <T,>(task: Promise<T> | (() => Promise<T>), states: { loading: FeedbackOptions | string; success: FeedbackOptions | string; error: FeedbackOptions | string }) => {
      const loadingId = show("info", "message", { ...toOptions(states.loading), duration: 0 });
      try {
        const result = await (typeof task === "function" ? task() : task);
        dismiss(loadingId);
        show("success", "toast", states.success);
        return result;
      } catch (cause) {
        dismiss(loadingId);
        show("error", "notification", states.error);
        throw cause;
      }
    },
    dismiss
  }), [dismiss, show]);

  const viewport = <FeedbackViewport notices={notices} onClose={dismiss} />;
  return <FeedbackContext.Provider value={context}>{children}{typeof document === "undefined" ? viewport : createPortal(viewport, document.body)}</FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used within FeedbackProvider");
  return context;
}

function FeedbackViewport({ notices, onClose }: { notices: FeedbackNotice[]; onClose: (id: string) => void }) {
  const { t } = useI18n();
  if (!notices.length) return null;
  return <div className="feedback-viewport" aria-label={t("feedbackRegion")}>
    {notices.map((notice) => {
      const props = { key: notice.id, notice, onClose: () => onClose(notice.id) };
      if (notice.presentation === "toast") return <Toast {...props} />;
      if (notice.presentation === "message") return <Message {...props} />;
      return <Notification {...props} />;
    })}
  </div>;
}

export function Toast({ notice, onClose }: { notice: FeedbackNotice; onClose: () => void }) {
  return <FeedbackNoticeView notice={notice} onClose={onClose} />;
}

export function Message({ notice, onClose }: { notice: FeedbackNotice; onClose: () => void }) {
  return <FeedbackNoticeView notice={notice} onClose={onClose} />;
}

export function Notification({ notice, onClose }: { notice: FeedbackNotice; onClose: () => void }) {
  return <FeedbackNoticeView notice={notice} onClose={onClose} />;
}

function FeedbackNoticeView({ notice, onClose }: { notice: FeedbackNotice; onClose: () => void }) {
  const { t } = useI18n();
  const [actionBusy, setActionBusy] = useState(false);
  useEffect(() => {
    if (notice.duration <= 0 || actionBusy) return;
    const timer = window.setTimeout(onClose, notice.duration);
    return () => window.clearTimeout(timer);
  }, [actionBusy, notice.duration, onClose]);

  async function runAction() {
    if (!notice.action || actionBusy) return;
    setActionBusy(true);
    try {
      await notice.action.onClick();
      onClose();
    } finally {
      setActionBusy(false);
    }
  }

  const role = notice.kind === "error" || notice.kind === "warning" ? "alert" : "status";
  return <article className={`feedback-notice ${notice.presentation} ${notice.kind}`} role={role} aria-live={role === "alert" ? "assertive" : "polite"}>
    <span className="feedback-icon"><Icon name={defaultIcon[notice.kind]} /></span>
    <div className="feedback-copy"><strong>{notice.title}</strong>{notice.description && <p>{notice.description}</p>}</div>
    {notice.action && <button className="feedback-action" onClick={() => void runAction()} disabled={actionBusy}>{actionBusy ? t("working") : notice.action.label}</button>}
    <button className="feedback-close" onClick={onClose} aria-label={t("close")} title={t("close")}><Icon name="close" /></button>
  </article>;
}

function toOptions(input: FeedbackOptions | string): FeedbackOptions {
  return typeof input === "string" ? { title: input } : input;
}

const defaultTitleKey = {
  success: "success" as const,
  info: "info" as const,
  warning: "warning" as const,
  error: "error" as const
};
