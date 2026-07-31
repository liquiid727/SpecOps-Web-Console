import { useI18n } from "../../i18n";
import { Button } from "../ui";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

/** 命令执行卡片：暗色终端样式背景 + monospace 命令文本 + exit code badge + 复制按钮（issue-051） */
export function CommandCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const command = typeof card.metadata?.command === "string" ? card.metadata.command : card.content;
  const exitCode = typeof card.metadata?.exitCode === "number" ? card.metadata.exitCode : undefined;
  return <article className="transcript-event card-command" data-card-type="command">
    <header>
      <span className="card-badge">$</span>
      {exitCode !== undefined && <span className={`card-exit-badge ${exitCode === 0 ? "success" : "failure"}`}>exit {exitCode}</span>}
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    <pre className="card-command-text">{command}</pre>
    <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(command)}>{t("copy")}</Button>
  </article>;
}
