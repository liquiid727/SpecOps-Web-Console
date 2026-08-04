import { useI18n } from "../../i18n";
import { Icon } from "../ui/Icon";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

/** 文件变更卡片：文件图标 + 路径 code 标签 + 操作类型颜色区分（issue-051） */
export function FileChangeCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const path = typeof card.metadata?.path === "string" ? card.metadata.path : card.content;
  const action = typeof card.metadata?.action === "string" ? card.metadata.action : typeof card.metadata?.kind === "string" ? card.metadata.kind : undefined;
  return <article className="transcript-event card-file-change" data-card-type="file-change">
    <header><span>{t("fileChangeEvent")}</span>{action && <span className="card-badge" data-action={action}>{action}</span>}<time>{formatCardTime(card.timestamp)}</time></header>
    <p className="file-change-path"><Icon name="file" /><code>{path}</code></p>
  </article>;
}
