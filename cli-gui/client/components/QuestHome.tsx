import { useMemo, useState } from "react";
import type { CliProfile, Workspace } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { PromptComposer } from "./PromptComposer";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { Button, EmptyState } from "./ui";

interface QuestHomeProps {
  workspaces: Workspace[];
  profiles: CliProfile[];
  /** 一次提交创建流：创建 chat 会话 + start-and-send 首轮（frontend-spec §2、§6）；失败时必须 reject 以保留输入 */
  onQuickCreate: (input: { content: string; workspaceId: string; profileId: string }) => Promise<void>;
  onOpenSettings: () => void;
}

export function QuestHome({ workspaces, profiles, onQuickCreate, onOpenSettings }: QuestHomeProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  // Start in 工作区下拉按最近使用排序（lastOpenedAt 优先，缺省回退 createdAt）
  const recentWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt)),
    [workspaces]
  );
  const [workspaceChoice, setWorkspaceChoice] = useState("");
  const [profileChoice, setProfileChoice] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const workspaceId = recentWorkspaces.some((workspace) => workspace.id === workspaceChoice) ? workspaceChoice : recentWorkspaces[0]?.id ?? "";
  const profileId = profiles.some((profile) => profile.id === profileChoice) ? profileChoice : profiles[0]?.id ?? "";
  const ready = Boolean(workspaceId && profileId);
  const recommendedTasks = [t("qoderTaskSample1"), t("qoderTaskSample2"), t("qoderTaskSample3")];

  // 推荐任务卡不经过 composer，失败在此提示（composer 路径由 PromptComposer 自带 toast + 输入保留）
  async function createFromTask(task: string) {
    if (!ready || taskBusy) return;
    setTaskBusy(true);
    try {
      await onQuickCreate({ content: task, workspaceId, profileId });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "composerFailed", "quest-home-task"));
    } finally {
      setTaskBusy(false);
    }
  }

  return (
    <div className="quest-home">
      <div className="quest-home-content">
        <h1 className="quest-home-title">{t("qoderQuestTitle")}</h1>
        <p className="quest-home-subtitle">{t("qoderHomeSubtitle")}</p>

        {!ready ? (
          <EmptyState
            className="setup-required"
            icon={<div className="empty-icon"><Icon name="settings" /></div>}
            title={t("setupFirst")}
            description={t("setupFirstDescription")}
            actions={<Button variant="primary" className="primary-button" onClick={onOpenSettings}><Icon name="settings" />{t("openSettings")}</Button>}
          />
        ) : (
          <>
            <div className="start-in-row" role="group" aria-label={t("qoderStartIn")}>
              <span className="start-in-label">{t("qoderStartIn")}</span>
              <Select
                ariaLabel={t("workspace")}
                className="start-in-select"
                value={workspaceId}
                options={recentWorkspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))}
                onChange={setWorkspaceChoice}
              />
              <Select
                ariaLabel={t("cliProfile")}
                className="start-in-select"
                value={profileId}
                options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))}
                onChange={setProfileChoice}
              />
              <Button variant="ghost" className="start-in-chip" onClick={onOpenSettings}>
                <Icon name="git" />
                <span>{t("qoderDefaultBranch")}</span>
                <Icon name="chevron-down" />
              </Button>
            </div>

            <div className="quest-home-input">
              <PromptComposer
                disabled={taskBusy}
                onSend={async (content) => {
                  await onQuickCreate({ content, workspaceId, profileId });
                }}
              />
            </div>

            <div className="recommended-tasks" aria-label={t("qoderRecommendedTasks")}>
              {recommendedTasks.map((task) => (
                <Button variant="ghost"
                  key={task}
                  type="button"
                  className="task-card"
                  disabled={taskBusy}
                  onClick={() => void createFromTask(task)}
                >
                  {task}
                </Button>
              ))}
            </div>
          </>
        )}

        <section className="security-banner" aria-label={t("qoderSecurityTitle")}>
          <span className="security-banner-accent" aria-hidden="true" />
          <div className="security-banner-body">
            <h3 className="security-banner-title">{t("qoderSecurityTitle")}</h3>
            <p className="security-banner-text">{t("qoderSecurityDescription")}</p>
          </div>
          <div className="security-banner-actions">
            <Button variant="secondary" className="security-banner-secondary" onClick={onOpenSettings}>
              {t("qoderLearnMore")}
            </Button>
            <Button variant="primary" className="security-banner-primary" onClick={onOpenSettings}>
              {t("qoderGoToSettings")}
            </Button>
          </div>
        </section>

        {recentWorkspaces.length > 0 && (
          <div className="quest-home-workspaces">
            <h3>{t("qoderRecentWorkspaces")}</h3>
            <div className="workspace-grid">
              {recentWorkspaces.slice(0, 4).map((workspace) => (
                <Button variant="ghost"
                  key={workspace.id}
                  className="workspace-card"
                  aria-pressed={workspace.id === workspaceId}
                  onClick={() => setWorkspaceChoice(workspace.id)}
                >
                  <Icon name="folder" />
                  <span>{workspace.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
