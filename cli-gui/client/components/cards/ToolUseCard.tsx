import { useI18n } from "../../i18n";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

/** 工具使用卡片：工具名 badge + 折叠详情 + exitCode 状态指示（绿 0 / 红非 0，issue-051） */
export function ToolUseCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const tool = typeof card.metadata?.tool === "string" ? card.metadata.tool : t("toolActivity");
  const exitCode = typeof card.metadata?.exitCode === "number" ? card.metadata.exitCode : undefined;
  return <article className="transcript-event card-tool-use" data-card-type="tool-use">
    <header>
      <span className="card-badge">{tool}</span>
      {exitCode !== undefined && <span className={`card-exit-badge ${exitCode === 0 ? "success" : "failure"}`}>exit {exitCode}</span>}
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    <details className="transcript-output">
      <summary>{summarize(card.content)}</summary>
      <pre className="transcript-plain">{card.raw}</pre>
    </details>
  </article>;
}

function summarize(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}
