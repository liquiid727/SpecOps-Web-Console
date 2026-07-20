import { useEffect, useState } from "react";
import type { TranscriptEvent } from "../../shared/types";
import { api } from "../api";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface TranscriptPanelProps {
  sessionId: string;
  refreshKey: number;
}

export function TranscriptPanel({ sessionId, refreshKey }: TranscriptPanelProps) {
  const { t } = useI18n();
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    api.transcript(sessionId).then((page) => {
      if (!cancelled) setEvents(Array.isArray(page.events) ? page.events : []);
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : t("transcriptFailed"));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionId, refreshKey, t]);

  if (loading) return <div className="transcript-state">{t("loadingTranscript")}</div>;
  if (error) return <div className="transcript-state error" role="alert">{error}</div>;
  if (!events.length) return <div className="transcript-state"><Icon name="terminal" /><strong>{t("emptyTranscript")}</strong><p>{t("emptyTranscriptDescription")}</p></div>;

  return <div className="transcript-list" aria-label={t("transcript")}>
    {events.map((event) => <article className={`transcript-event ${event.kind}`} key={event.id}>
      <header><span>{event.kind === "user_input" ? t("you") : t("cliOutput")}</span><time>{formatTime(event.occurredAt)}</time></header>
      <MarkdownLite source={event.raw} />
      <button className="copy-button" onClick={() => void navigator.clipboard?.writeText(event.raw)}>{t("copy")}</button>
    </article>)}
  </div>;
}

export function MarkdownLite({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const blocks: JSX.Element[] = [];
  let code: string[] = [];
  let inCode = false;

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
        code = [];
      }
      inCode = !inCode;
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    if (line.startsWith("# ")) blocks.push(<h3 key={index}>{line.slice(2)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h4 key={index}>{line.slice(3)}</h4>);
    else if (/^[-*] \[[ xX]\] /.test(line)) blocks.push(<p className="task-line" key={index}><input type="checkbox" readOnly checked={/^[-*] \[[xX]\]/.test(line)} />{line.replace(/^[-*] \[[ xX]\] /, "")}</p>);
    else if (/^[-*] /.test(line)) blocks.push(<p className="list-line" key={index}>{line.slice(2)}</p>);
    else if (line.trim()) blocks.push(<p key={index}>{line}</p>);
  });
  if (code.length) blocks.push(<pre key="code-open"><code>{code.join("\n")}</code></pre>);
  return <div className="markdown-lite">{blocks}</div>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
