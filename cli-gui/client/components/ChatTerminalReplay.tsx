import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptEvent } from "../../shared/types";
import { api, openTranscriptSubscription } from "../api";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { sanitizePtyOutput } from "../transcript-display";
import { AsyncState } from "./patterns";
import { Icon } from "./ui/Icon";
import { useFeedback } from "./ui/Feedback";

/** chat 会话 Terminal tab 的回放分段：连续相同 turnId 的 pty_output 归为一段（frontend-spec §2，I-3 只读） */
export interface PtyReplaySegment {
  turnId?: string;
  content: string;
}

export function buildPtyReplaySegments(events: TranscriptEvent[]): PtyReplaySegment[] {
  const segments: PtyReplaySegment[] = [];
  let group: { turnId?: string; raws: string[] } | undefined;

  function flush() {
    if (!group) return;
    const content = sanitizePtyOutput(group.raws.join(""));
    if (content) segments.push({ turnId: group.turnId, content });
    group = undefined;
  }

  for (const event of events) {
    if (event.kind !== "pty_output") continue;
    const turnId = typeof event.metadata?.turnId === "string" ? event.metadata.turnId : undefined;
    if (!group || group.turnId !== turnId) {
      flush();
      group = { turnId, raws: [] };
    }
    group.raws.push(event.raw);
  }
  flush();
  return segments;
}

/**
 * chat 会话 Terminal tab：只读回放 pty_output（frontend-spec §2）。
 * 复用 transcript 拉取 + 既有 WS 订阅追加，不建立 terminal 写通道、不触发 start/spawn（domain-spec §4 I-3）。
 */
export function ChatTerminalReplay({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let closeSubscription: () => void = () => undefined;
    const controller = new AbortController();
    setEvents([]);
    setLoading(true);
    const isCurrent = () => generationRef.current === generation;

    void (async () => {
      // 全量翻页拉取历史（transcript API 单页上限 200）
      const all: TranscriptEvent[] = [];
      let after = 0;
      for (;;) {
        const page = await api.transcript(sessionId, after, 200, controller.signal);
        for (const event of page.events) if (event.sessionId === sessionId) all.push(event);
        after = Math.max(after + 1, page.nextAfterSequence);
        if (!page.hasMore) break;
      }
      if (!isCurrent()) return;
      setEvents(all);
      setLoading(false);
      const lastSequence = all.at(-1)?.sequence ?? 0;
      closeSubscription = openTranscriptSubscription(sessionId, lastSequence, {
        onEvent: (event) => {
          if (event.sessionId !== sessionId || !isCurrent()) return;
          setEvents((current) => (current.some((existing) => existing.id === event.id) ? current : [...current, event]));
        }
      });
    })().catch((cause) => {
      if (isCurrent() && cause?.name !== "AbortError") {
        setLoading(false);
        feedback.error(toFeedbackError(cause, t, "transcriptFailed", `pty-replay:${sessionId}`));
      }
    });

    return () => {
      controller.abort();
      closeSubscription();
    };
  }, [feedback, sessionId, t]);

  const segments = useMemo(() => buildPtyReplaySegments(events), [events]);
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [segments]);

  if (loading) return <AsyncState className="transcript-state" state="loading" title={t("loadingTranscript")} />;
  if (!segments.length) return <AsyncState className="transcript-state" state="empty" icon={<Icon name="terminal" />} title={t("chatTerminalEmpty")} />;

  return <PtyReplay segments={segments} listRef={listRef} />;
}

/** 展示层与数据层分离，便于组件测试（无输入焦点、无键盘写入路径） */
export function PtyReplay({ segments, listRef }: { segments: PtyReplaySegment[]; listRef?: React.Ref<HTMLDivElement> }) {
  const { t } = useI18n();
  return (
    <div className="pty-replay" role="log" aria-label={t("terminal")} ref={listRef}>
      {segments.map((segment, index) => (
        <section className="pty-replay-segment" key={`${segment.turnId ?? "session"}-${index}`}>
          <header className="pty-replay-header">
            {segment.turnId ? <code className="lifecycle-status">{segment.turnId}</code> : <span>{t("ptyReplaySession")}</span>}
          </header>
          <pre className="pty-replay-text">{segment.content}</pre>
        </section>
      ))}
    </div>
  );
}
