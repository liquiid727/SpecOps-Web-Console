import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranscriptEvent } from "../../shared/types";
import { toFeedbackError, toFeedbackWarning } from "../feedback-errors";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";
import { isNearBottom, projectTranscriptEvents, buildTurnPrompts, buildApprovalStates, deriveActiveTurnId, deriveSessionLifecycleStatus, INTERRUPTED_LIFECYCLE_STATUSES, type ApprovalDisplayState, type SessionLifecycleStatus, type TranscriptDisplayItem } from "../transcript-display";
import type { TurnStatus } from "../../shared/websocket";
import { AsyncState } from "./patterns";
import { Button } from "./ui";
import { CliOutputCard, StructuredCardList } from "./cards";
import { useClientRuntime } from "../runtime/client-runtime";

const MAX_MARKDOWN_BYTES = 256 * 1024;

interface TranscriptPanelProps {
  sessionId: string;
  /** 发送响应里的 user_message 本地回显（与 WS 推送按 id 去重，frontend-spec §5.1） */
  localEvents?: TranscriptEvent[];
  onTurnStatus?: (turnId: string, status: TurnStatus) => void;
  /** 从事件流推导的进行中轮次（重连/回放后无 turn-status 补发，api-spec §4.2） */
  onDerivedTurn?: (turnId: string | undefined) => void;
  /** 失败轮次重试：回传原 prompt，调用方以新 clientMessageId 重发（frontend-spec §5.2） */
  onRetry?: (content: string) => void;
  /** 审批应答（frontend-spec §5.4）：仅 supportsApproval 且非只读时传入；409 竞态由调用方 toast 后抛出以定格气泡 */
  onApprove?: (approvalId: string, decision: "allow" | "deny") => Promise<void>;
  /** supportsApproval=false 兜底：失败轮次错误条目附权限指引文案（frontend-spec §5.4） */
  approvalFallback?: boolean;
  /** chat 会话聊天化渲染：过滤终端噪音（常规 lifecycle / pty_output），保留中断态提示（frontend-spec §3.1） */
  chatMode?: boolean;
  /** 轮次进行中：消息流底部渲染生成中指示器（含耗时计时），填补无流式增量时的等待空白 */
  turnPending?: boolean;
  /** 会话运行态（顶部 SessionLifecycleStatusBar 数据源） */
  onSessionLifecycle?: (status: SessionLifecycleStatus) => void;
  /** 切换到终端视图（dual-mode §11：ShellRun/CLI 输出卡片保留“在终端查看”入口） */
  onViewInTerminal?: () => void;
}

export function TranscriptPanel({ sessionId, localEvents, onTurnStatus, onDerivedTurn, onRetry, onApprove, approvalFallback, chatMode, turnPending, onSessionLifecycle, onViewInTerminal }: TranscriptPanelProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [nextHistorySequence, setNextHistorySequence] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const [retryKey, setRetryKey] = useState(0);
  // 流式气泡（streaming-spec FR-5）：turn-delta 累积临时文本，assistant_message 落盘或轮次终态后清除
  const [stream, setStream] = useState<{ turnId: string; text: string }>();
  // rAF 批处理（dual-mode §12/17.2）：多个 delta 帧合并为单次 state 更新，避免每 delta 触发重渲染
  const deltaBufferRef = useRef<{ turnId: string; text: string } | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
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
    setStream(undefined);

    const isCurrent = () => !cancelled && generationRef.current === generation;
    const acceptEvent = (event: TranscriptEvent) => {
      if (event.sessionId !== sessionId || !isCurrent()) return;
      // 落盘去重：同轮 assistant_message 事件到达后流式气泡退场，避免双气泡
      if (event.kind === "assistant_message") setStream((current) => current && current.turnId === event.metadata?.turnId ? undefined : current);
      mergeEvent(event);
    };
    const acceptTurnStatus = (turnId: string, status: TurnStatus) => {
      if (!isCurrent()) return;
      // 终态兜底清除（失败/取消轮无 assistant_message 落盘）
      if (status === "completed" || status === "failed" || status === "cancelled") setStream((current) => current && current.turnId === turnId ? undefined : current);
      onTurnStatus?.(turnId, status);
    };
    const acceptTurnDelta = (turnId: string, delta: string) => {
      if (!isCurrent()) return;
      // rAF 批处理（dual-mode §12/17.2）：累积 delta 到 buffer，单帧内合并后统一 flush
      const buf = deltaBufferRef.current;
      if (buf && buf.turnId === turnId) {
        buf.text += delta;
      } else {
        deltaBufferRef.current = { turnId, text: delta };
      }
      if (rafRef.current === undefined) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = undefined;
          const pending = deltaBufferRef.current;
          if (!pending) return;
          deltaBufferRef.current = undefined;
          setStream((current) => current && current.turnId === pending.turnId
            ? { turnId: pending.turnId, text: current.text + pending.text }
            : { turnId: pending.turnId, text: pending.text });
        });
      }
    };

    runtime.events.transcript(sessionId, 0, 200, controller.signal).then((page) => {
      if (!isCurrent()) return;
      const events = Array.isArray(page.events) ? page.events : [];
      const sessionEvents = events.filter((event) => event.sessionId === sessionId);
      setEvents(sessionEvents);
      const historySequence = typeof page.nextAfterSequence === "number" ? page.nextAfterSequence : 0;
      setNextHistorySequence(historySequence);
      latestSequenceRef.current = sessionEvents.at(-1)?.sequence ?? historySequence;
      setHasMore(page.hasMore === true);
      setLoading(false);
      closeSubscription = runtime.events.subscribe(sessionId, latestSequenceRef.current, {
        onReady: () => { if (isCurrent()) setConnectionState("connected"); },
        onEvent: acceptEvent,
        onTurnStatus: acceptTurnStatus,
        onTurnDelta: acceptTurnDelta,
        onWarning: () => { if (isCurrent()) feedback.warning(toFeedbackWarning(undefined, t, "recordingWarning", `transcript-warning:${sessionId}`)); },
        onError: () => { if (isCurrent()) { setConnectionState("reconnecting"); feedback.error(toFeedbackError(undefined, t, "transcriptConnectionFailed", `transcript-connection:${sessionId}`)); } },
        onClose: () => {
          if (!isCurrent()) return;
          setConnectionState("reconnecting");
          // 断线后增量不补发：丢弃未完成的流式文本，等 assistant_message 回放（streaming-spec FR-2）
          setStream(undefined);
          reconnectTimer.current = window.setTimeout(() => {
            if (isCurrent()) {
              closeSubscription();
              closeSubscription = runtime.events.subscribe(sessionId, latestSequenceRef.current, {
                onEvent: acceptEvent,
                onTurnStatus: acceptTurnStatus,
                onTurnDelta: acceptTurnDelta,
                onReady: () => { if (isCurrent()) setConnectionState("connected"); },
                onWarning: () => { if (isCurrent()) feedback.warning(toFeedbackWarning(undefined, t, "recordingWarning", `transcript-warning:${sessionId}`)); },
                onError: () => { if (isCurrent()) { setConnectionState("reconnecting"); feedback.error(toFeedbackError(undefined, t, "transcriptConnectionFailed", `transcript-connection:${sessionId}`)); } },
                onClose: () => { if (isCurrent()) setConnectionState("offline"); }
              });
            }
          }, 500);
        }
      });
      void runtime.capabilities().then(({ sessionStreaming }) => {
        if (isCurrent() && !sessionStreaming) setConnectionState("offline");
      });
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
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      deltaBufferRef.current = undefined;
      closeSubscription();
    };
  }, [feedback, mergeEvent, onTurnStatus, retryKey, runtime, sessionId, t]);

  // 发送响应中的 user_message 事件立即回显（mergeEvent 按 id 去重，WS 重复推送无双气泡）
  useEffect(() => {
    for (const event of localEvents ?? []) if (event.sessionId === sessionId) mergeEvent(event);
  }, [localEvents, mergeEvent, sessionId]);

  // 顶部 SessionLifecycleStatusBar 数据源：从 events 派生 session-* 状态
  useEffect(() => {
    const fallback: SessionLifecycleStatus = events.length === 0 ? "idle" : "stopped";
    onSessionLifecycle?.(deriveSessionLifecycleStatus(events, fallback));
  }, [events, onSessionLifecycle]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const generation = generationRef.current;
    const requestedSessionId = sessionId;
    setLoadingMore(true);
    try {
      const page = await runtime.events.transcript(requestedSessionId, nextHistorySequence, 200);
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

  const displayEvents = useMemo(() => projectTranscriptEvents(events, { chatMode }), [chatMode, events]);
  const turnPrompts = useMemo(() => buildTurnPrompts(events), [events]);
  const approvalStates = useMemo(() => buildApprovalStates(events), [events]);
  useEffect(() => { onDerivedTurn?.(deriveActiveTurnId(events)); }, [events, onDerivedTurn]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);
  const followRef = useRef(true);
  followRef.current = following;

  // 贴底自动跟随；用户上滚后停止跟随（frontend-spec §3.2）
  useEffect(() => {
    const element = listRef.current;
    if (element && followRef.current) element.scrollTop = element.scrollHeight;
  }, [displayEvents, turnPending, stream]);

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
  if (!displayEvents.length && !turnPending && !stream) return <AsyncState className="transcript-state" state="empty" icon={<Icon name="terminal" />} title={t("emptyTranscript")} description={t("emptyTranscriptDescription")} />;

  return <div className={`transcript-list${chatMode ? " chat-mode" : ""}`} aria-label={t("transcript")} ref={listRef} onScroll={handleScroll}>
    <div className="transcript-status" aria-live="polite">
      {hasMore && <Button variant="secondary" className="secondary-button" onClick={() => void loadMore()} loading={loadingMore} loadingLabel={t("loading")}>{t("loadMore")}</Button>}
      {connectionState === "reconnecting" && <span>{t("reconnecting")}</span>}
      {connectionState === "offline" && <span>{t("offlineMode")}</span>}
    </div>
    <StructuredCardList items={displayEvents} chatMode={chatMode} onApprove={onApprove} onViewInTerminal={onViewInTerminal} renderFallback={(item) => {
      const turnId = typeof item.event.metadata?.turnId === "string" ? item.event.metadata.turnId : undefined;
      const prompt = item.event.kind === "error" && turnId ? turnPrompts.get(turnId) : undefined;
      const approvalId = item.event.kind === "approval_request" && typeof item.event.metadata?.approvalId === "string" ? item.event.metadata.approvalId : undefined;
      return <TranscriptMessage
        item={item}
        chatMode={chatMode}
        onRetry={onRetry && prompt ? () => onRetry(prompt) : undefined}
        approval={approvalId ? approvalStates.get(approvalId) : undefined}
        onRespondApproval={onApprove && approvalId ? (decision) => onApprove(approvalId, decision) : undefined}
        fallbackHint={approvalFallback && item.event.kind === "error" && Boolean(turnId)}
        onViewInTerminal={onViewInTerminal}
      />;
    }} />
    {stream && <StreamingMessage text={stream.text} chatMode={chatMode} />}
    {turnPending && !stream && <TurnPendingIndicator chatMode={chatMode} />}
    {!following && <Button variant="secondary" className="secondary-button back-to-latest" onClick={backToLatest}>{t("backToLatest")}</Button>}
  </div>;
}

/** 流式气泡（streaming-spec FR-5）：turn-delta 累积文本 + 光标，落盘 assistant_message 到达后退场；不显示名称 */
export function StreamingMessage({ text }: { text: string; chatMode?: boolean }) {
  return <article className="transcript-event assistant_message streaming" aria-live="polite">
    <MarkdownLite source={text} />
    <span className="streaming-cursor" aria-hidden="true" />
  </article>;
}

/** 生成中指示器：每轮 spawn CLI + 模型推理无流式增量，用计时气泡填补等待空白；仅保留耗时小字 */
export function TurnPendingIndicator(_props: { chatMode?: boolean } = {}) {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return <article className="transcript-event turn-pending" aria-live="polite">
    <header><time>{t("turnElapsed", { seconds })}</time></header>
    <p className="turn-pending-text"><span className="turn-pending-dots" aria-hidden="true"><i /><i /><i /></span>{t("turnThinking")}</p>
  </article>;
}

/** kind → 渲染全表（frontend-spec §3.1）；未知 kind 中性兜底，前向兼容不报错；user/assistant 不显示名称（类终端直显输入输出） */
export function TranscriptMessage({ item, onRetry, approval, onRespondApproval, fallbackHint, chatMode = false, onViewInTerminal }: { item: TranscriptDisplayItem; onRetry?: () => void; approval?: ApprovalDisplayState; onRespondApproval?: (decision: "allow" | "deny") => Promise<void>; fallbackHint?: boolean; chatMode?: boolean; onViewInTerminal?: () => void }) {
  const { t } = useI18n();
  const { event } = item;
  const kind = event.kind as string;
  const time = <time>{formatTime(event.occurredAt)}</time>;
  // 审批气泡交互态：loading（待接口返回）/ 409 竞态定格过期（frontend-spec §5.4）
  const [pendingDecision, setPendingDecision] = useState<"allow" | "deny">();
  const [locallyExpired, setLocallyExpired] = useState(false);

  if (kind === "user_message") {
    // 右对齐纯文本气泡，不渲染 Markdown；不带名称/时间
    return <article className="transcript-event user_message">
      <pre className="transcript-plain">{item.content}</pre>
    </article>;
  }
  if (kind === "assistant_message") {
    return <article className="transcript-event assistant_message">
      <MarkdownLite source={item.content} truncated={item.truncated} />
      {!chatMode && <details className="transcript-output raw-source"><summary>{t("viewRawSource")}</summary><pre className="transcript-plain">{item.raw}</pre></details>}
      {!chatMode && <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(item.content)}>{t("copy")}</Button>}
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
    // 终端风格卡片（dual-mode §11）：噪音清洗尾部预览，完整字节流由 Terminal 视图呈现
    return <CliOutputCard content={item.content} timestamp={event.occurredAt} onViewInTerminal={onViewInTerminal} />;
  }
  if (kind === "lifecycle") {
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
    const interrupted = INTERRUPTED_LIFECYCLE_STATUSES.has(status);
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
      {fallbackHint && <p className="approval-fallback-hint">{t("chat.approvalFallbackHint")}</p>}
      {onRetry && <Button variant="secondary" className="secondary-button retry-turn" onClick={onRetry}>{t("retry")}</Button>}
    </article>;
  }
  if (kind === "approval_request") {
    // 审批气泡五态：待决（Allow/Deny）/ loading / 定格 / 过期 / 回放静态记录（frontend-spec §5.4）
    const decision = approval?.decision;
    const expired = locallyExpired || approval?.expired === true;
    const actionable = !decision && !expired && Boolean(onRespondApproval);
    const respond = (choice: "allow" | "deny") => {
      if (!onRespondApproval || pendingDecision) return;
      setPendingDecision(choice);
      onRespondApproval(choice)
        .catch(() => setLocallyExpired(true))
        .finally(() => setPendingDecision(undefined));
    };
    return <article className={`transcript-event approval_request${expired ? " expired" : ""}`}>
      <header><span>{t("permissionRequest")}</span>{time}</header>
      <p className="lifecycle-text">{item.content}</p>
      {decision && <p className="approval-decision">{t("approvalDecided")}<code className="lifecycle-status">{decision}</code></p>}
      {!decision && expired && <p className="approval-decision"><code className="lifecycle-status">{t("approvalExpired")}</code></p>}
      {actionable && <div className="approval-actions">
        <Button variant="primary" className="primary-button approval-allow" onClick={() => respond("allow")} loading={pendingDecision === "allow"} loadingLabel={t("loading")} disabled={Boolean(pendingDecision)}>{t("approvalAllow")}</Button>
        <Button variant="secondary" className="secondary-button approval-deny" onClick={() => respond("deny")} loading={pendingDecision === "deny"} loadingLabel={t("loading")} disabled={Boolean(pendingDecision)}>{t("approvalDeny")}</Button>
      </div>}
    </article>;
  }
  if (kind === "approval_response") {
    // 决定记录保留独立条目（回放与实时同构，event-protocol-spec §3）
    const decision = typeof event.metadata?.decision === "string" ? event.metadata.decision : "";
    return <article className="transcript-event approval_response">
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
  const runtime = useClientRuntime();
  const preRef = useRef<HTMLPreElement | null>(null);
  return <div className="markdown-code-block">
    <Button variant="ghost" className="copy-button code-copy" onClick={() => void runtime.platform.copyText(preRef.current?.textContent ?? "")}>{t("copy")}</Button>
    <pre ref={preRef}>{children}</pre>
  </div>;
}

function safeUrl(value: string | undefined) {
  if (!value) return "";
  if (value.startsWith("//")) return "";
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  try {
    const parsed = new URL(value, "https://local.invalid");
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
