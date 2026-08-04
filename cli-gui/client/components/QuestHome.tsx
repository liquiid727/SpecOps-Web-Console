import { useEffect, useMemo, useRef, useState } from "react";
import type { CliProfile, CliProfileCapabilities, EngineReadiness, Workspace } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { PromptComposer } from "./PromptComposer";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { Badge, Button, EmptyState } from "./ui";
import { useClientRuntime } from "../runtime/client-runtime";

interface QuestHomeProps {
  workspaces: Workspace[];
  profiles: CliProfile[];
  /** 一次提交创建流：创建会话 + start-and-send 首轮（frontend-spec §2、§6）；失败时必须 reject 以保留输入；model 仅在显式选择时携带 */
  onQuickCreate: (input: { content: string; workspaceId: string; profileId: string; model?: string }) => Promise<void>;
  onOpenSettings: () => void;
  /** 高级创建：打开 NewSessionDialog 完整表单（issue-054） */
  onAdvancedCreate?: () => void;
  /** 新建 Quest 草稿态：隐藏引擎就绪/安全横幅/最近工作区，只保留干净的输入界面 */
  draftMode?: boolean;
  /** 由 Workspace 分组入口传入；缺省时按最近使用目录选择 */
  initialWorkspaceId?: string;
}

export function QuestHome({ workspaces, profiles, onQuickCreate, onOpenSettings, onAdvancedCreate, draftMode, initialWorkspaceId }: QuestHomeProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const [engineReadiness, setEngineReadiness] = useState<EngineReadiness[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessFailed, setReadinessFailed] = useState(false);
  const [readinessAttempt, setReadinessAttempt] = useState(0);
  // Start in 工作区按最近使用排序（lastOpenedAt 优先，缺省回退 createdAt）
  const recentWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt)),
    [workspaces]
  );
  const [workspaceChoice, setWorkspaceChoice] = useState(initialWorkspaceId ?? "");
  const previousDraftMode = useRef(draftMode);
  const previousInitialWorkspaceId = useRef(initialWorkspaceId);
  const [profileChoice, setProfileChoice] = useState("");
  // CLI/模型联动（QA 调节）：模型列表来自所选 CLI 的 capabilities，切 CLI 即重置模型
  const [modelChoice, setModelChoice] = useState<string | null>(null);
  const [profileCapabilities, setProfileCapabilities] = useState<CliProfileCapabilities>();
  const [taskBusy, setTaskBusy] = useState(false);
  // context bar 内联 popover（issue-054）：选中/再次点击即关；CLI 选择器已移到 composer 上方
  const [openPopover, setOpenPopover] = useState<"workspace">();
  const workspaceId = recentWorkspaces.some((workspace) => workspace.id === workspaceChoice) ? workspaceChoice : recentWorkspaces[0]?.id ?? "";
  const profileId = profiles.some((profile) => profile.id === profileChoice) ? profileChoice : profiles[0]?.id ?? "";
  const activeWorkspace = recentWorkspaces.find((workspace) => workspace.id === workspaceId);
  const ready = Boolean(workspaceId && profileId);
  const recommendedTasks = [t("qoderTaskSample1"), t("qoderTaskSample2"), t("qoderTaskSample3")];

  useEffect(() => {
    const enteredDraft = Boolean(draftMode && !previousDraftMode.current);
    const contextChanged = initialWorkspaceId !== previousInitialWorkspaceId.current;
    if (initialWorkspaceId && recentWorkspaces.some((workspace) => workspace.id === initialWorkspaceId)) {
      setWorkspaceChoice(initialWorkspaceId);
    } else if (draftMode && (enteredDraft || contextChanged)) {
      // A global new-session action clears the prior folder selection. A folder
      // action supplies initialWorkspaceId and takes the branch above.
      setWorkspaceChoice("");
    }
    previousDraftMode.current = draftMode;
    previousInitialWorkspaceId.current = initialWorkspaceId;
  }, [draftMode, initialWorkspaceId, recentWorkspaces]);

  useEffect(() => {
    const controller = new AbortController();
    setReadinessLoading(true);
    setReadinessFailed(false);
    void runtime.engines.engineReadiness(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setEngineReadiness(Array.isArray(result?.engines) ? result.engines : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setReadinessFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReadinessLoading(false);
      });
    return () => controller.abort();
  }, [readinessAttempt, runtime.engines]);

  // 所选 CLI 的 capabilities：提供模型列表（联动数据源）；加载失败静默，模型选择器降级为不可用
  useEffect(() => {
    if (!profileId) { setProfileCapabilities(undefined); return; }
    const controller = new AbortController();
    setProfileCapabilities(undefined);
    runtime.engines.profileCapabilities(profileId, controller.signal)
      .then((next) => { if (!controller.signal.aborted) setProfileCapabilities(next); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [profileId, runtime.engines]);

  // 推荐任务卡不经过 composer，失败在此提示（composer 路径由 PromptComposer 自带 toast + 输入保留）
  async function createFromTask(task: string) {
    if (!ready || taskBusy) return;
    setTaskBusy(true);
    try {
      await onQuickCreate({ content: task, workspaceId, profileId, ...(modelChoice ? { model: modelChoice } : {}) });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "composerFailed", "quest-home-task"));
    } finally {
      setTaskBusy(false);
    }
  }

  return (
    <div className={`quest-home${draftMode ? " draft-mode" : ""}`}>
      <div className="quest-home-content">
        <h1 className="quest-home-title">{t("qoderQuestTitle")}</h1>
        <p className="quest-home-subtitle">{t("qoderHomeSubtitle")}</p>
        {!draftMode && <section className="engine-readiness" aria-label={t("engineReadiness")}>
          <div className="engine-readiness-heading">
            <span>{t("engineReadiness")}</span>
            {readinessLoading && <small>{t("engineChecking")}</small>}
            {readinessFailed && <Button variant="ghost" onClick={() => setReadinessAttempt((attempt) => attempt + 1)}>{t("retry")}</Button>}
          </div>
          {!readinessLoading && !readinessFailed && (
            <div className="engine-readiness-list">
              {engineReadiness.map((engine) => {
                const ready = engine.installation === "available"
                  && engine.authentication !== "required"
                  && engine.compatibility === "supported";
                // 单屏精简（QA 调节）：每个引擎只保留一行概览，能力明细不再展开
                return (
                  <div className="engine-readiness-item" key={engine.engineId}>
                    <Icon name="terminal" />
                    <strong>{engine.engineId === "codex" ? "Codex" : "Claude"}</strong>
                    <Badge className={ready ? "running" : "stopped"}>{ready ? t("engineReady") : t("engineNeedsAttention")}</Badge>
                    <small>{engine.version ?? t("engineVersionUnknown")} · {engine.selectedTransport ?? "—"}</small>
                    {!ready && <Button variant="ghost" className="engine-remediation" onClick={onOpenSettings}>{engine.remediation?.label ?? t("engineResolve")}</Button>}
                  </div>
                );
              })}
            </div>
          )}
        </section>}

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
            <div className="quest-context-bar" role="group" aria-label={t("qoderStartIn")}>
              <span className="start-in-label">{t("qoderStartIn")}</span>
              <div className="context-chip-wrap">
                <Button
                  unstyled
                  className="context-chip"
                  aria-haspopup="listbox"
                  aria-expanded={openPopover === "workspace"}
                  aria-label={t("workspace")}
                  onClick={() => setOpenPopover(openPopover === "workspace" ? undefined : "workspace")}
                >
                  <Icon name="folder" />
                  <span>{activeWorkspace?.name}</span>
                  <Icon name="chevron-down" />
                </Button>
                {openPopover === "workspace" && (
                  <div className="context-popover" role="listbox" aria-label={t("workspace")}>
                    {recentWorkspaces.slice(0, 3).map((workspace) => (
                      <Button
                        unstyled
                        key={workspace.id}
                        type="button"
                        role="option"
                        aria-selected={workspace.id === workspaceId}
                        className="context-popover-item"
                        onClick={() => { setWorkspaceChoice(workspace.id); setOpenPopover(undefined); }}
                      >
                        <Icon name="folder" />
                        <span>{workspace.name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {onAdvancedCreate && (
                <Button unstyled className="advanced-create-link" onClick={onAdvancedCreate}>
                  {t("qoderAdvancedCreate")}
                </Button>
              )}
            </div>

            <div className="quest-home-input">
              <PromptComposer
                disabled={taskBusy}
                autoFocus
                profileId={profileId || undefined}
                profiles={profiles}
                selectedProfileId={profileId || undefined}
                onProfileChange={(next) => { setProfileChoice(next); setModelChoice(null); }}
                capabilities={profileCapabilities}
                defaultModel={profileCapabilities?.defaultModel}
                launchConfig={{ permission: null, mode: null, model: modelChoice }}
                onLaunchConfigChange={(change) => { if ("model" in change) setModelChoice(change.model ?? null); }}
                onSend={async (content) => {
                  await onQuickCreate({ content, workspaceId, profileId, ...(modelChoice ? { model: modelChoice } : {}) });
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
      </div>
    </div>
  );
}
