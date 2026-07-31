import { useState } from "react";
import { useI18n } from "../../i18n";
import { Button } from "../ui";
import { formatCardTime } from "./CardParser";
import type { StructuredCardData } from "./types";

/**
 * 审批卡片（dual-mode §11）：置顶直至处理，显示决定状态或操作按钮。
 * 五态：待决（Allow/Deny）/ loading / 定格 / 过期 / 回放静态记录。
 */
export function ApprovalCard({ card, decision, expired, onRespond }: {
  card: StructuredCardData;
  decision?: string;
  expired?: boolean;
  onRespond?: (choice: "allow" | "deny") => Promise<void>;
}) {
  const { t } = useI18n();
  const [pendingDecision, setPendingDecision] = useState<"allow" | "deny">();
  const actionable = !decision && !expired && Boolean(onRespond);

  const respond = (choice: "allow" | "deny") => {
    if (!onRespond || pendingDecision) return;
    setPendingDecision(choice);
    onRespond(choice).finally(() => setPendingDecision(undefined));
  };

  return <article className={`transcript-event card-approval${expired ? " expired" : ""}${!decision && !expired ? " pending" : ""}`} data-card-type="approval">
    <header>
      <span className="card-badge">{t("permissionRequest")}</span>
      <time>{formatCardTime(card.timestamp)}</time>
    </header>
    <p className="approval-description">{card.content}</p>
    {decision && <p className="approval-decision"><code className="lifecycle-status">{decision}</code></p>}
    {!decision && expired && <p className="approval-decision"><code className="lifecycle-status">{t("approvalExpired")}</code></p>}
    {actionable && <div className="approval-actions">
      <Button variant="primary" className="primary-button approval-allow" onClick={() => respond("allow")} loading={pendingDecision === "allow"} loadingLabel={t("loading")} disabled={Boolean(pendingDecision)}>{t("approvalAllow")}</Button>
      <Button variant="secondary" className="secondary-button approval-deny" onClick={() => respond("deny")} loading={pendingDecision === "deny"} loadingLabel={t("loading")} disabled={Boolean(pendingDecision)}>{t("approvalDeny")}</Button>
    </div>}
  </article>;
}
