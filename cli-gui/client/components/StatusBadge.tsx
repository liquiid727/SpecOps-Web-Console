import type { SessionStatus } from "../../shared/types";
import { useI18n } from "../i18n";

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { statusLabel } = useI18n();
  return <span className={`status-badge ${status}`}><span className={`status-dot ${status}`} />{statusLabel(status)}</span>;
}
