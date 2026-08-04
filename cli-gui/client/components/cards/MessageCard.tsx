import { MarkdownLite } from "../MarkdownLite";
import { Button } from "../ui";
import { useI18n } from "../../i18n";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function MessageCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  return <article className="transcript-event assistant_message card-message" data-card-type="message">
    <MarkdownLite source={card.content} />
    <footer className="card-inline-actions">
      <time>{formatCardTime(card.timestamp)}</time>
      <Button variant="ghost" className="copy-button" onClick={() => void navigator.clipboard?.writeText(card.content)}>{t("copy")}</Button>
    </footer>
  </article>;
}
