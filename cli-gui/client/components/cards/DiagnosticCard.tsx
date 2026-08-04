import { useI18n } from "../../i18n";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function DiagnosticCard({ card }: { card: StructuredCardData }) {
  const { t } = useI18n();
  const vendorType = typeof card.metadata?.vendorType === "string" ? card.metadata.vendorType : undefined;
  return <article className="transcript-event card-diagnostic" data-card-type="diagnostic">
    <header>
      <span>{t("diagnosticEvent")}</span>
      {vendorType && <code className="lifecycle-status">{vendorType}</code>}
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    <details className="transcript-output">
      <summary>{t("details")}</summary>
      <pre className="transcript-plain">{card.raw || card.content}</pre>
    </details>
  </article>;
}
