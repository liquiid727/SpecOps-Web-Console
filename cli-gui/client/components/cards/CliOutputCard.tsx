import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { cleanPtyPreview } from "../../transcript-display";
import { Button } from "../ui";
import { formatCardTime } from "./CardParser";

/** 折叠态尾部预览行数（dual-mode §11：命令输出默认折叠，只渲染可见范围；尾部比头部更有信息量） */
const PREVIEW_TAIL_LINES = 12;

/**
 * CLI 输出卡片（dual-mode §11 ShellRunCard 形态）：终端风格底色 + TUI 噪音清洗后的尾部预览，
 * 支持展开完整输出、复制与“在终端查看”。原始字节流仍由 Terminal 视图忠实呈现（dual-mode §4.1）。
 */
export function CliOutputCard({ content, timestamp, onViewInTerminal }: { content: string; timestamp: string; onViewInTerminal?: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(() => cleanPtyPreview(content) || content.trim(), [content]);
  const previewLines = preview.split("\n");
  const tail = previewLines.slice(-PREVIEW_TAIL_LINES).join("\n");
  const collapsible = expanded || content.trim() !== tail;
  return <article className="transcript-event card-cli-output" data-card-type="cli-output">
    <header>
      <span className="card-badge">&gt;_</span>
      <span className="cli-output-title">{t("cliOutput")}</span>
      {!expanded && previewLines.length > PREVIEW_TAIL_LINES && <span className="cli-output-lines">{t("cliOutputLineCount", { count: previewLines.length })}</span>}
      <time>{formatCardTime(timestamp)}</time>
    </header>
    <pre className="cli-output-text">{expanded ? content : tail}</pre>
    <footer className="cli-output-actions">
      {collapsible && <Button variant="ghost" className="cli-output-toggle" onClick={() => setExpanded((value) => !value)}>{expanded ? t("collapse") : t("expandOutput")}</Button>}
      <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(content)}>{t("copy")}</Button>
      {onViewInTerminal && <Button variant="ghost" className="cli-output-terminal-link" onClick={onViewInTerminal}>{t("viewInTerminal")}</Button>}
    </footer>
  </article>;
}
