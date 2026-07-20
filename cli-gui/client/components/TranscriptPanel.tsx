import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptEvent } from "../../shared/types";
import { api, openTranscriptSubscription } from "../api";
import { useI18n, type TranslationKey } from "../i18n";
import { Icon } from "./ui/Icon";

const MAX_MARKDOWN_BYTES = 256 * 1024;

interface TranscriptPanelProps {
  sessionId: string;
  refreshKey: number;
}

export function TranscriptPanel({ sessionId, refreshKey }: TranscriptPanelProps) {
  const { t } = useI18n();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [nextAfterSequence, setNextAfterSequence] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const [warning, setWarning] = useState<string>();
  const reconnectTimer = useRef<number | undefined>(undefined);
  const latestSequenceRef = useRef(0);

  const mergeEvent = useCallback((event: TranscriptEvent) => {
    setEvents((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      const previous = byId.get(event.id);
      if (!previous || event.sequence > previous.sequence) byId.set(event.id, event);
      return [...byId.values()].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
    });
    setNextAfterSequence((current) => Math.max(current, event.sequence));
    latestSequenceRef.current = Math.max(latestSequenceRef.current, event.sequence);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let closeSubscription: () => void = () => undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setWarning(undefined);
    setEvents([]);
    setNextAfterSequence(0);
    latestSequenceRef.current = 0;
    setHasMore(false);
    setConnectionState("connecting");

    api.transcript(sessionId, 0, 200, controller.signal).then((page) => {
      if (cancelled) return;
      const events = Array.isArray(page.events) ? page.events : [];
      setEvents(events);
      setNextAfterSequence(typeof page.nextAfterSequence === "number" ? page.nextAfterSequence : 0);
      latestSequenceRef.current = typeof page.nextAfterSequence === "number" ? page.nextAfterSequence : 0;
      setHasMore(page.hasMore === true);
      setLoading(false);
      closeSubscription = openTranscriptSubscription(sessionId, page.nextAfterSequence, {
        onReady: () => setConnectionState("connected"),
        onEvent: mergeEvent,
        onWarning: (code) => setWarning(code === "TRANSCRIPT_WRITE_FAILED" ? t("recordingWarning") : code),
        onError: (message) => { setWarning(message); setConnectionState("reconnecting"); },
        onClose: () => {
          if (cancelled) return;
          setConnectionState("reconnecting");
          reconnectTimer.current = window.setTimeout(() => {
            if (!cancelled) {
              closeSubscription();
              closeSubscription = openTranscriptSubscription(sessionId, latestSequenceRef.current, { onEvent: mergeEvent, onReady: () => setConnectionState("connected"), onClose: () => setConnectionState("offline") });
            }
          }, 500);
        }
      });
      if (typeof WebSocket === "undefined") setConnectionState("offline");
    }).catch((cause) => {
      if (!cancelled && cause?.name !== "AbortError") {
        setError(cause instanceof Error ? cause.message : t("transcriptFailed"));
        setLoading(false);
        setConnectionState("offline");
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
      if (reconnectTimer.current !== undefined) window.clearTimeout(reconnectTimer.current);
      closeSubscription();
    };
  }, [mergeEvent, refreshKey, sessionId, t]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await api.transcript(sessionId, nextAfterSequence, 200);
      for (const event of page.events) mergeEvent(event);
      setNextAfterSequence((current) => Math.max(current, page.nextAfterSequence));
      setHasMore(page.hasMore);
    } catch (cause) {
      setWarning(cause instanceof Error ? cause.message : t("transcriptFailed"));
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <div className="transcript-state">{t("loadingTranscript")}</div>;
  if (error) return <div className="transcript-state error" role="alert">{error}</div>;
  if (!events.length) return <div className="transcript-state"><Icon name="terminal" /><strong>{t("emptyTranscript")}</strong><p>{t("emptyTranscriptDescription")}</p></div>;

  return <div className="transcript-list" aria-label={t("transcript")}>
    <div className="transcript-status" aria-live="polite">
      {hasMore && <button className="secondary-button" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? t("loading") : t("loadMore")}</button>}
      {connectionState === "reconnecting" && <span>{t("reconnecting")}</span>}
      {connectionState === "offline" && <span>{t("offlineMode")}</span>}
      {warning && <span className="warning">{warning}</span>}
    </div>
    {events.map((event) => <article className={`transcript-event ${event.kind}`} key={event.id}>
      <header><span>{eventLabel(event.kind, t)}</span><time>{formatTime(event.occurredAt)}</time></header>
      <MarkdownLite source={event.raw} truncated={event.truncated} />
      <button className="copy-button" onClick={() => void navigator.clipboard?.writeText(event.raw)}>{t("copy")}</button>
    </article>)}
  </div>;
}

export function MarkdownLite({ source, truncated = false }: { source: string; truncated?: boolean }) {
  const { t } = useI18n();
  const bytes = new TextEncoder().encode(source);
  const bounded = bytes.length > MAX_MARKDOWN_BYTES;
  const rendered = new TextDecoder().decode(bytes.subarray(0, MAX_MARKDOWN_BYTES));
  return <div className="markdown-lite">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeUrl} components={{
      a: ({ href, children, ...props }) => <a {...props} href={safeUrl(href) || "#"} target={isExternalUrl(href) ? "_blank" : undefined} rel={isExternalUrl(href) ? "noreferrer noopener" : undefined}>{children}</a>
    }}>{rendered}</ReactMarkdown>
    {(bounded || truncated) && <p className="markdown-truncated">{t("truncatedMessage")}</p>}
  </div>;
}

function eventLabel(kind: TranscriptEvent["kind"], t: (key: TranslationKey) => string) {
  const keys: Partial<Record<TranscriptEvent["kind"], TranslationKey>> = {
    user_input: "you",
    pty_output: "cliOutput",
    markdown: "cliOutput",
    lifecycle: "lifecycleEvent",
    error: "errorEvent",
    tool_activity: "toolActivity",
    permission_request: "permissionRequest",
    retention_marker: "retentionNotice"
  };
  return t(keys[kind] ?? "cliOutput");
}

function safeUrl(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("//")) return "";
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  try {
    const parsed = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? value : "";
  } catch {
    return "";
  }
}

function isExternalUrl(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
