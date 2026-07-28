import type { SessionLifecycleStatus } from "../transcript-display";
import { useI18n } from "../i18n";

interface SessionLifecycleStatusBarProps {
  status: SessionLifecycleStatus;
  /** 会话交互模式，决定状态条展示策略 */
  interactionMode?: "chat" | "terminal";
}

/**
 * 会话运行态顶部状态条（frontend-spec §3.2 补强）：
 * - sticky 吸顶：放在 TranscriptPanel 之外的容器，避免随消息列表滚动消失
 * - 颜色与文案通过 i18n，不出现 raw 文本（"Session starting." 等）
 * - idle 状态不渲染，避免长期空条干扰视觉
 */
export function SessionLifecycleStatusBar({ status, interactionMode }: SessionLifecycleStatusBarProps) {
  const { t } = useI18n();
  if (status === "idle") return null;

  const labels: Record<Exclude<SessionLifecycleStatus, "idle">, string> = {
    starting: t("lifecycleSessionStarting"),
    running: t("lifecycleSessionRunning"),
    stopped: t("lifecycleSessionStopped"),
    failed: t("lifecycleSessionFailed")
  };

  return (
    <div className={`session-lifecycle-bar ${status}`} role="status" aria-live="polite" data-mode={interactionMode}>
      <span className={`session-lifecycle-dot ${status}`} aria-hidden="true" />
      <span className="session-lifecycle-label">{labels[status]}</span>
    </div>
  );
}