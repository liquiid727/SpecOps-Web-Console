import { useI18n } from "../../i18n";
import { Button } from "../ui";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

export function TurnStatusCard({ card, onRetry, fallbackHint }: { card: StructuredCardData; onRetry?: () => void; fallbackHint?: boolean }) {
  const { t } = useI18n();
  const status = typeof card.metadata?.status === "string" ? card.metadata.status : "";
  const code = typeof card.metadata?.code === "string" ? card.metadata.code : typeof card.metadata?.errorCode === "string" ? card.metadata.errorCode : "";
  const permissionDenied = code === "CLI_PERMISSION_DENIED";
  const fallbackAttempted = card.metadata?.fallbackAttempted === true;
  const interrupted = status === "turn-failed" || status === "turn-cancelled" || Boolean(code);
  return <article className={`transcript-event card-turn-status${interrupted ? " interrupted" : ""}`} data-card-type="turn-status">
    <header><span>{interrupted ? t("turnInterrupted") : t("turnStatus")}</span><time>{formatCardTime(card.timestamp)}</time></header>
    <p className="lifecycle-text">{card.content}{status && <code className="lifecycle-status">{status}</code>}</p>
    {code && <code className="error-code">{code}</code>}
    {permissionDenied && <p className="turn-failure-guidance">{t("chat.cliPermissionDeniedHint")}</p>}
    {fallbackAttempted && <p className="turn-fallback-summary">{t("chat.fallbackAttempted")}</p>}
    {fallbackHint && <p className="approval-fallback-hint">{t("chat.approvalFallbackHint")}</p>}
    {onRetry && <Button variant="secondary" className="secondary-button retry-turn" onClick={onRetry}>{t("retry")}</Button>}
  </article>;
}
