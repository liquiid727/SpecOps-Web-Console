import { useEffect, useState } from "react";
import type { ExecutionSnapshot } from "../../shared/execution-attempt";
import { useI18n } from "../i18n";
import { Badge, Button, Icon, Overlay } from "./ui";
import { DialogActions } from "./patterns";

interface AttemptTimelineProps {
  snapshots: ExecutionSnapshot[];
  pendingTaskId?: string;
  onConfirmRetry?: (snapshot: ExecutionSnapshot) => Promise<void>;
  onCancel?: (snapshot: ExecutionSnapshot) => Promise<void>;
}

export function AttemptTimeline({ snapshots, pendingTaskId, onConfirmRetry, onCancel }: AttemptTimelineProps) {
  const { t } = useI18n();
  return <section className="attempt-timeline" aria-label={t("attemptTimeline")} data-attempt-timeline>
    {snapshots.map((snapshot) => <AttemptTask key={snapshot.task.id} snapshot={snapshot} pending={pendingTaskId === snapshot.task.id} onConfirmRetry={onConfirmRetry} onCancel={onCancel} />)}
  </section>;
}

function AttemptTask({ snapshot, pending, onConfirmRetry, onCancel }: { snapshot: ExecutionSnapshot; pending: boolean; onConfirmRetry?: (snapshot: ExecutionSnapshot) => Promise<void>; onCancel?: (snapshot: ExecutionSnapshot) => Promise<void> }) {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(snapshot.task.state === "awaiting_confirmation");
  useEffect(() => {
    if (snapshot.task.state === "awaiting_confirmation") setDialogOpen(true);
    else setDialogOpen(false);
  }, [snapshot.task.state]);
  const firstFailure = snapshot.attempts.find((attempt) => attempt.state === "failed" && attempt.failure);
  const nextAttempt = snapshot.attempts.find((attempt) => attempt.state === "created") ?? undefined;
  return <article className="attempt-task" data-task-id={snapshot.task.id} data-task-state={snapshot.task.state}>
    <header className="attempt-task-header"><div><span className="attempt-task-label">{t("attemptTimeline")}</span><strong>{t(`attemptTask${capitalize(snapshot.task.state)}` as "attemptTaskRunning")}</strong></div><Badge>{t(`attemptTask${capitalize(snapshot.task.state)}` as "attemptTaskRunning")}</Badge></header>
    <ol className="attempt-list">
      {snapshot.attempts.map((attempt) => <li className="attempt-item" key={attempt.id} data-attempt-id={attempt.id} data-attempt-state={attempt.state} data-attempt-trigger={attempt.trigger}>
        <div className="attempt-marker" aria-hidden="true"><span>{attempt.ordinal}</span></div>
        <div className="attempt-content">
          <header><strong>{attempt.deployment.deploymentName}</strong><span>{attempt.deployment.modelId}</span><Badge>{t(`attemptTrigger${capitalize(attempt.trigger)}` as "attemptTriggerPrimary")}</Badge></header>
          <div className="attempt-meta"><span>{t(`attemptState${capitalize(attempt.state)}` as "attemptStateRunning")}</span><span>{formatDuration(attempt.startedAt, attempt.completedAt)}</span><span>{t(`attemptEffect${capitalize(attempt.sideEffect.state)}` as "attemptEffectClean")}</span></div>
          {attempt.failure && <p className="attempt-failure"><Icon name="warning" /><code>{attempt.failure.code}</code><span>{redact(attempt.failure.message)}</span></p>}
        </div>
      </li>)}
    </ol>
    {snapshot.task.state === "awaiting_confirmation" && onConfirmRetry && <FallbackConfirmationDialog snapshot={snapshot} pending={pending} onConfirm={async () => { await onConfirmRetry(snapshot); setDialogOpen(false); }} onCancel={onCancel ? async () => { await onCancel(snapshot); setDialogOpen(false); } : undefined} open={dialogOpen} onClose={() => setDialogOpen(false)} firstFailure={firstFailure} nextAttempt={nextAttempt} />}
  </article>;
}

interface FallbackConfirmationDialogProps {
  snapshot: ExecutionSnapshot;
  pending: boolean;
  open: boolean;
  firstFailure?: ExecutionSnapshot["attempts"][number];
  nextAttempt?: ExecutionSnapshot["attempts"][number];
  onConfirm: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onClose: () => void;
}

export function FallbackConfirmationDialog({ snapshot, pending, open, firstFailure, nextAttempt, onConfirm, onCancel, onClose }: FallbackConfirmationDialogProps) {
  const { t } = useI18n();
  if (!open) return null;
  return <Overlay title={t("attemptConfirmationTitle")} description={t("attemptConfirmationDescription")} onClose={() => { if (!pending) onClose(); }}>
    <div className="fallback-confirmation" data-fallback-confirmation="true" data-task-id={snapshot.task.id}>
      <p>{t("attemptConfirmationEffect", { effect: firstFailure?.sideEffect.state ?? "unknown" })}</p>
      {firstFailure?.sideEffect.evidenceEventIds.length ? <p className="attempt-evidence"><Icon name="info" />{t("attemptConfirmationEvidence", { ids: firstFailure.sideEffect.evidenceEventIds.join(", ") })}</p> : null}
      {nextAttempt && <p>{t("attemptConfirmationNext", { name: nextAttempt.deployment.deploymentName, model: nextAttempt.deployment.modelId })}</p>}
      <DialogActions>
        {onCancel && <Button variant="secondary" disabled={pending} onClick={() => void onCancel()}><Icon name="close" />{t("attemptCancel")}</Button>}
        <Button variant="primary" loading={pending} loadingLabel={t("loading")} onClick={() => void onConfirm()}><Icon name="refresh" />{t("attemptConfirm")}</Button>
      </DialogActions>
    </div>
  </Overlay>;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1).replace(/[-_]([a-z])/g, (_, character: string) => character.toUpperCase());
}

function formatDuration(startedAt?: string, completedAt?: string) {
  if (!startedAt) return "";
  const start = Date.parse(startedAt);
  const end = completedAt ? Date.parse(completedAt) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  return `${Math.max(0, end - start)}ms`;
}

function redact(value: string) {
  return value.replace(/bearer\s+[^\s]+/gi, "bearer [redacted]").replace(/\b(sk|key|token|secret)[-_:=][^\s,;]+/gi, "$1=[redacted]");
}
