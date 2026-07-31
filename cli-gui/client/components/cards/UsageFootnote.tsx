import { useI18n } from "../../i18n";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

/** 用量注脚：token 用量以单行低视觉权重呈现，不占用一张完整卡片（dual-mode §11 usage 事件） */
export function UsageFootnote({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const input = typeof card.metadata?.inputTokens === "number" ? card.metadata.inputTokens : undefined;
  const output = typeof card.metadata?.outputTokens === "number" ? card.metadata.outputTokens : undefined;
  if (input === undefined && output === undefined) return null;
  return <p className="transcript-event usage-footnote" data-card-type="usage">
    <span>{t("usageTokens", { input: (input ?? 0).toLocaleString(), output: (output ?? 0).toLocaleString() })}</span>
    <time>{formatCardTime(card.timestamp)}</time>
  </p>;
}
