import { useI18n } from "../../i18n";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function ProgressCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  return <article className="transcript-event card-progress" data-card-type="progress">
    <header><span>{t("progressEvent")}</span><time>{formatCardTime(card.timestamp)}</time></header>
    <p className="lifecycle-text">{card.content}</p>
  </article>;
}
