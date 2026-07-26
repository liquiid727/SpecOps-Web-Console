import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptEvent } from "../../shared/types";
import { api, openTranscriptSubscription } from "../api";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { isNearBottom, projectTranscriptEvents, type TranscriptDisplayItem } from "../transcript-display";
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);
  const followRef = useRef(true);
  followRef.current = following;

  // 贴底自动跟随；用户上滚后停止跟随（frontend-spec §3.2）
  useEffect(() => {
    const element = listRef.current;
    if (element && followRef.current) element.scrollTop = element.scrollHeight;
  }, [displayEvents]);

  const handleScroll = () => {
    const element = listRef.current;
    if (!element) return;
    setFollowing(isNearBottom(element.scrollTop, element.scrollHeight, element.clientHeight));
  };

  const backToLatest = () => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
    setFollowing(true);
  };

  if (loading) return <AsyncState className="transcript-state" state="loading" title={t("loadingTranscript")} />;
  if (error) return <AsyncState className="transcript-state error" state="error" title={t("transcriptFailed")} actions={<Button variant="secondary" className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>{t("retry")}</Button>} />;
  if (!displayEvents.length) return <AsyncState className="transcript-state" state="empty" icon={<Icon name="terminal" />} title={t("emptyTranscript")} description={t("emptyTranscriptDescription")} />;

  return <div className="transcript-list" aria-label={t("transcript")} ref={listRef} onScroll={handleScroll}>
    <div className="transcript-status" aria-live="polite">
      {hasMore && <Button variant="secondary" className="secondary-button" onClick={() => void loadMore()} loading={loadingMore} loadingLabel={t("loading")}>{t("loadMore")}</Button>}
      {connectionState === "reconnecting" && <span>{t("reconnecting")}</span>}
      {connectionState === "offline" && <span>{t("offlineMode")}</span>}
    </div>
    {displayEvents.map((item) => <TranscriptMessage item={item} key={item.id} />)}
    {!following && <Button variant="secondary" className="secondary-button back-to-latest" onClick={backToLatest}>{t("backToLatest")}</Button>}
  </div>;
}

const INTERRUPTED_LIFECYCLE = new Set(["turn-failed", "turn-cancelled"]);

/** kind → 渲染全表（frontend-spec §3.1）；未知 kind 中性兜底，前向兼容不报错 */
export function TranscriptMessage({ item }: { item: TranscriptDisplayItem }) {
  const { t } = useI18n();
  const { event } = item;
  const kind = event.kind as string;
  const time = <time>{formatTime(event.occurredAt)}</time>;

  if (kind === "user_message") {
    // 右对齐纯文本气泡，不渲染 Markdown
    return <article className="transcript-event user_message">
      <header><span>{t("you")}</span>{time}</header>
      <pre className="transcript-plain">{item.content}</pre>
    </article>;
  }
  if (kind === "assistant_message") {
    return <article className="transcript-event assistant_message">
      <header><span>{t("assistantMessage")}</span>{time}</header>
      <MarkdownLite source={item.content} truncated={item.truncated} />
      <details className="transcript-output raw-source"><summary>{t("viewRawSource")}</summary><pre className="transcript-plain">{item.raw}</pre></details>
      <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(item.raw)}>{t("copy")}</Button>
    </article>;
  }
  if (kind === "tool_activity") {
    const tool = typeof event.metadata?.tool === "string" ? event.metadata.tool : summarizeCliOutput(item.content);
    return <article className="transcript-event tool_activity">
      <header><span>{t("toolActivity")}</span>{time}</header>
      <details className="transcript-output"><summary>{tool}</summary><pre className="transcript-plain">{item.raw}</pre></details>
    </article>;
  }
  if (kind === "file_change") {
    const path = typeof event.metadata?.path === "string" ? event.metadata.path : item.content;
    return <article className="transcript-event file_change">
      <header><span>{t("fileChangeEvent")}</span>{time}</header>
      <p className="file-change-path"><Icon name="file" /><code>{path}</code></p>
    </article>;
  }
  if (kind === "pty_output") {
    return <article className="transcript-event pty_output">
      <header><span>{t("cliOutput")}</span>{time}</header>
      <details className="transcript-output"><summary>{summarizeCliOutput(item.content)}</summary><pre className="transcript-plain">{item.content}</pre></details>
      <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(item.raw)}>{t("copy")}</Button>
    </article>;
  }
  if (kind === "lifecycle") {
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
    const interrupted = INTERRUPTED_LIFECYCLE.has(status);
    return <article className={`transcript-event lifecycle${interrupted ? " interrupted" : ""}`}>
      <header><span>{interrupted ? t("turnInterrupted") : t("lifecycleEvent")}</span>{time}</header>
      <p className="lifecycle-text">{item.content}{status && <code className="lifecycle-status">{status}</code>}</p>
    </article>;
  }
  if (kind === "error") {
    const code = typeof event.metadata?.code === "string" ? event.metadata.code : "";
    return <article className="transcript-event error">
      <header><span>{t("errorEvent")}</span>{time}</header>
      <p className="error-text">{item.content}</p>
      {code && <code className="error-code">{code}</code>}
    </article>;
  }
  if (kind === "approval_request" || kind === "approval_response") {
    // A 段中性系统条目；审批气泡交互属 B 段（frontend-spec §5.4）
    const decision = typeof event.metadata?.decision === "string" ? event.metadata.decision : "";
    return <article className={`transcript-event ${kind}`}>
      <header><span>{t("permissionRequest")}</span>{time}</header>
      <p className="lifecycle-text">{item.content}{decision && <code className="lifecycle-status">{decision}</code>}</p>
    </article>;
  }
  if (kind === "retention_marker") {
    return <article className="transcript-event retention_marker">
      <header><span>{t("retentionNotice")}</span>{time}</header>
      <p className="lifecycle-text">{item.content}</p>
    </article>;
  }
  return <article className="transcript-event unknown-kind" data-kind={kind}>
    <header><span>{kind}</span>{time}</header>
    <pre className="transcript-plain">{summarizeCliOutput(item.content)}</pre>
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
      a: ({ href, children, ...props }) => <a {...props} href={safeUrl(href) || "#"} target={isExternalUrl(href) ? "_blank" : undefined} rel={isExternalUrl(href) ? "noreferrer noopener" : undefined}>{children}</a>,
      // 图片不加载远程资源：渲染为链接文本（frontend-spec §4，避免 tracking/SSRF）
      img: ({ src, alt }) => {
        const href = safeUrl(typeof src === "string" ? src : undefined);
        const label = alt || (typeof src === "string" ? src : "");
        return href && isExternalUrl(href)
          ? <a className="markdown-image-link" href={href} target="_blank" rel="noreferrer noopener">{label}</a>
          : <span className="markdown-image-link">{label}</span>;
      },
      pre: ({ children }) => <CodeBlock>{children}</CodeBlock>
    }}>{rendered}</ReactMarkdown>
    {(bounded || truncated) && <p className="markdown-truncated">{t("truncatedMessage")}</p>}
  </div>;
}

/** 代码块：保留空白与语言标注，复制内容为 raw 源码（frontend-spec §4） */
function CodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const preRef = useRef<HTMLPreElement | null>(null);
  return <div className="markdown-code-block">
    <Button variant="ghost" className="copy-button code-copy" onClick={() => void navigator.clipboard?.writeText(preRef.current?.textContent ?? "")}>{t("copy")}</Button>
    <pre ref={preRef}>{children}</pre>
  </div>;
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
