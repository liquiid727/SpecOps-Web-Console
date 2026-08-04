import { useState } from "react";
import { useI18n } from "../../i18n";
import { Button } from "../ui";
import { Icon } from "../ui/Icon";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

const OUTPUT_COLLAPSE_THRESHOLD = 500;

/**
 * Shell 运行卡片（dual-mode §11）：命令 + 可折叠输出 + 虚拟化长输出 + "在终端查看"入口。
 * 用于终端会话 GUI 视图中 pty_output 归并后的 ReducedShellRun 展示。
 */
export function ShellRunCard({ card, onViewInTerminal }: { card: StructuredCardData; onViewInTerminal?: () => void }) {
  const { t } = useI18n();
  const command = typeof card.metadata?.command === "string" ? card.metadata.command : "";
  const exitCode = typeof card.metadata?.exitCode === "number" ? card.metadata.exitCode : undefined;
  const output = card.raw || card.content;
  const isLong = output.length > OUTPUT_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);

  return <article className="transcript-event card-shell-run" data-card-type="shell-run">
    <header>
      <Icon name="terminal" className="card-shell-icon" />
      <span className="card-badge">$</span>
      {command && <code className="card-command-inline">{command}</code>}
      {exitCode !== undefined && <span className={`card-exit-badge ${exitCode === 0 ? "success" : "failure"}`}>exit {exitCode}</span>}
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    {output && <div className={`shell-run-output${isLong && !expanded ? " collapsed" : ""}`}>
      <pre className="card-command-text">{isLong && !expanded ? `${output.slice(0, OUTPUT_COLLAPSE_THRESHOLD)}…` : output}</pre>
      {isLong && <Button variant="ghost" className="shell-run-toggle" onClick={() => setExpanded(!expanded)}>
        {expanded ? t("collapse") : t("expandOutput")}
      </Button>}
    </div>}
    {onViewInTerminal && <Button variant="ghost" className="shell-run-terminal-link" onClick={onViewInTerminal}>
      {t("viewInTerminal")}
    </Button>}
  </article>;
}
