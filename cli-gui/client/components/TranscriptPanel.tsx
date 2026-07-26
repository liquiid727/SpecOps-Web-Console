import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptEvent } from "../../shared/types";
import { api, openTranscriptSubscription } from "../api";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n, type TranslationKey } from "../i18n";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { projectTranscriptEvents, type TranscriptDisplayItem } from "../transcript-display";
import { AsyncState } from "./patterns";
import { Button } from "./ui";

const MAX_MARKDOWN_BYTES = 256 * 1024;

interface TranscriptPanelProps {
  sessionId: string;
}

export function TranscriptPanel({ sessionId }: TranscriptPanelProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [nextHistorySequence, setNextHistorySequence] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const [retryKey, setRetryKey] = useState(0);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const latestSequenceRef = useRef(0);
  const generationRef = useRef(0);

  const mergeEvent = useCallback((event: TranscriptEvent) => {
    setEvents((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      const previous = byId.get(event.id);
      if (!previous || event.sequence > previous.sequence) byId.set(event.id, event);
      return [...byId.values()].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
    });
    latestSequenceRef.current = Math.max(latestSequenceRef.current, event.sequence);
  }, []);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let cancelled = false;
    let closeSubscription: () => void = () => undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setEvents([]);
    setNextHistorySequence(0);
    latestSequenceRef.current = 0;
    setHasMore(false);
    setConnectionState("connecting");

    const isCurrent = () => !cancelled && generationRef.current === generation;
    const acceptEvent = (event: TranscriptEvent) => {
      if (event.sessionId === sessionId && isCurrent()) mergeEvent(event);
    };

    api.transcript(sessionId, 0, 200, controller.signal).then((page) => {
      if (!isCurrent()) return;
      const events = Array.isArray(page.events) ? page.events : [];
      const sessionEvents = events.filter((event) => event.sessionId === sessionId);
      setEvents(sessionEvents);
      const historySequence = typeof page.nextAfterSequence === "number" ? page.nextAfterSequence : 0;
      setNextHistorySequence(historySequence);
      latestSequenceRef.current = sessionEvents.at(-1)?.sequence ?? historySequence;
      setHasMore(page.hasMore === true);
      setLoading(false);
      closeSubscription = openTranscriptSubscription(sessionId, latestSequenceRef.current, {
        onReady: () => { if (isCurrent()) setConnectionState("connected"); },
        onEvent: acceptEvent,
        onWarning: () => { if (isCurrent()) feedback.warning(toFeedbackWarning(undefined, t, "recordingWarning", `transcript-warning:${sessionId}`)); },
        onError: () => { if (isCurrent()) { setConnectionState("reconnecting"); feedback.error(toFeedbackError(undefined, t, "transcriptConnectionFailed", `transcript-connection:${sessionId}`)); } },
        onClose: () => {
          if (!isCurrent()) return;
          setConnectionState("reconnecting");
          reconnectTimer.current = window.setTimeout(() => {
            if (isCurrent()) {
              closeSubscription();
              closeSubscription = openTranscriptSubscription(sessionId, latestSequenceRef.current, {
                onEvent: acceptEvent,
                onReady: () => { if (isCurrent()) setConnectionState("connected"); },
                onWarning: () => { if (isCurrent()) feedback.warning(toFeedbackWarning(undefined, t, "recordingWarning", `transcript-warning:${sessionId}`)); },
                onError: () => { if (isCurrent()) { setConnectionState("reconnecting"); feedback.error(toFeedbackError(undefined, t, "transcriptConnectionFailed", `transcript-connection:${sessionId}`)); } },
                onClose: () => { if (isCurrent()) setConnectionState("offline"); }
              });
            }
          }, 500);
        }
      });
      if (isCurrent() && typeof WebSocket === "undefined") setConnectionState("offline");
    }).catch((cause) => {
      if (isCurrent() && cause?.name !== "AbortError") {
        setError(true);
        feedback.error(toFeedbackError(cause, t, "transcriptFailed", `transcript-load:${sessionId}`));
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
  }, [feedback, mergeEvent, retryKey, sessionId, t]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const generation = generationRef.current;
    const requestedSessionId = sessionId;
    setLoadingMore(true);
    try {
      const page = await api.transcript(requestedSessionId, nextHistorySequence, 200);
      if (generationRef.current !== generation || requestedSessionId !== sessionId) return;
      for (const event of page.events) if (event.sessionId === requestedSessionId) mergeEvent(event);
      setNextHistorySequence((current) => Math.max(current, page.nextAfterSequence));
      setHasMore(page.hasMore);
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "transcriptFailed", `transcript-page:${sessionId}`));
    } finally {
      setLoadingMore(false);
    }
  }

  const displayEvents = useMemo(() => projectTranscriptEvents(events), [events]);
  if (loading) return <AsyncState className="transcript-state" state="loading" title={t("loadingTranscript")} />;
  if (error) return <AsyncState className="transcript-state error" state="error" title={t("transcriptFailed")} actions={<Button variant="secondary" className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{t("retry")}</Button>} />;
  if (!displayEvents.length) return <AsyncState className="transcript-state" state="empty" icon={<Icon name="terminal" />} title={t("emptyTranscript")} description={t("emptyTranscriptDescription")} />;

  return <div className="transcript-list" aria-label={t("transcript")}>
    <div className="transcript-status" aria-live="polite">
      {hasMore && <Button variant="secondary" className="secondary-button" onClick={() => void loadMore()} loading={loadingMore} loadingLabel={t("loading")}>{t("loadMore")}</Button>}
      {connectionState === "reconnecting" && <span>{t("reconnecting")}</span>}
      {connectionState === "offline" && <span>{t("offlineMode")}</span>}
    </div>
    {displayEvents.map((item) => <TranscriptMessage item={item} key={item.id} />)}
  </div>;
}

function TranscriptMessage({ item }: { item: TranscriptDisplayItem }) {
  const { t } = useI18n();
  const { event } = item;
  return <article className={`transcript-event ${event.kind}`}>
    <header><span>{eventLabel(event.kind, t)}</span><time>{formatTime(event.occurredAt)}</time></header>
    {event.kind === "assistant_message" ? <MarkdownLite source={item.content} truncated={item.truncated} /> : event.kind === "pty_output" ? <details className="transcript-output"><summary>{summarizeCliOutput(item.content)}</summary><pre className="transcript-plain">{item.content}</pre></details> : <pre className="transcript-plain">{item.content}</pre>}
    <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(item.raw)}>{t("copy")}</Button>
  </article>;
}

function summarizeCliOutput(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
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
    user_message: "you",
    pty_output: "cliOutput",
    assistant_message: "cliOutput",
    lifecycle: "lifecycleEvent",
    error: "errorEvent",
    tool_activity: "toolActivity",
    file_change: "toolActivity",
    approval_request: "permissionRequest",
    approval_response: "permissionRequest",
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
