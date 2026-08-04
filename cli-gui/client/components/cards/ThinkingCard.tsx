import { useI18n } from "../../i18n";
import { Icon } from "../ui/Icon";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function ThinkingCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  return <article className="transcript-event card-thinking" data-card-type="thinking">
    <details>
      <summary><Icon name="sparkles" className="card-thinking-icon" /><span>{t("thinking")}</span><time>{formatCardTime(card.timestamp)}</time></summary>
      <pre className="transcript-plain">{card.content}</pre>
    </details>
  </article>;
}
