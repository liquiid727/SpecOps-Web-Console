import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { CliProfileCapabilities, PromptEnhanceAction, SessionLaunchConfig } from "../../shared/types";
import { WORK_MODES, type ComposerWorkMode } from "../app/preferences";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { useSpeechInput } from "./useSpeechInput";
import { Button, IconButton, TextArea } from "./ui";
import { useClientRuntime } from "../runtime/client-runtime";

interface PromptComposerProps {
  disabled: boolean;
  onSend: (content: string, clientMessageId: string) => Promise<void>;
  capabilities?: CliProfileCapabilities;
  launchConfig?: SessionLaunchConfig;
  onLaunchConfigChange?: (change: Partial<SessionLaunchConfig>) => void;
  /** chat 会话：模型选择器改走即时生效通道（PATCH activeModel，frontend-spec §5.3） */
  interactionMode?: "chat" | "terminal";
  activeModel?: string;
  onActiveModelChange?: (model: string | null) => void;
  /** 轮次进行中：输入可编辑但提交禁用，提交按钮切为「停止」（frontend-spec §5.1/§5.2） */
  turnActive?: boolean;
  /** 审批挂起中：composer 提示「等待审批」（frontend-spec §5.4） */
  waitingApproval?: boolean;
  onCancelTurn?: () => void;
  /** MVP02 工作模式：状态提升到 App 层，并映射为真实的后端执行约束。 */
  workMode?: ComposerWorkMode;
  onWorkModeChange?: (mode: ComposerWorkMode) => void;
  /** 润色/压缩目标 profile（project-quest SPEC §5.7）；缺省时润色按钮禁用 */
  profileId?: string;
  /** capability.supportsPromptEnhancement；明确 false 时禁用并解释，undefined（未探测）时允许尝试由服务端兵底 */
  enhanceSupported?: boolean;
  /** 新建 Quest 草稿态：进入视图后自动聚焦输入框，用户可直接输入首条消息 */
  autoFocus?: boolean;
  /** Quest Home CLI/模型联动（QA 调节）：CLI 选择器与模型并排放在输入框上方，先选 CLI 才能选模型 */
  profiles?: { id: string; name: string }[];
  selectedProfileId?: string;
  onProfileChange?: (profileId: string) => void;
}

export function PromptComposer({ disabled, onSend, capabilities, launchConfig, onLaunchConfigChange, interactionMode, activeModel, onActiveModelChange, turnActive = false, waitingApproval = false, onCancelTurn, workMode = "default", onWorkModeChange, profileId, enhanceSupported, autoFocus = false, profiles, selectedProfileId, onProfileChange }: PromptComposerProps) {
  const { t, language } = useI18n();
  const feedback = useFeedback();
  const runtime = useClientRuntime();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [interim, setInterim] = useState("");
  const [enhancing, setEnhancing] = useState<PromptEnhanceAction | null>(null);
  const [undoContent, setUndoContent] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => { if (autoFocus) textareaRef.current?.focus(); }, [autoFocus]);

  // 听写（project-quest SPEC §5.8）：interim 灰显回填，final 落定追加到光标位置
  const speech = useSpeechInput({
    locale: language,
    onInterim: setInterim,
    onFinal: (text) => {
      const el = textareaRef.current;
      const caret = el?.selectionStart ?? undefined;
      setContent((previous) => {
        const at = caret ?? previous.length;
        return previous.slice(0, at) + text + previous.slice(at);
      });
    }
  });
  const listening = speech.status === "listening";
  useEffect(() => {
    if (speech.status === "permission-denied") feedback.error({ title: t("qoderMic"), description: t("micPermissionDenied"), key: "mic-permission" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status]);

  const trimmed = content.trim();
  const tooLarge = new TextEncoder().encode(content).length > 65_536;
  const busy = sending || enhancing !== null;
  const canSend = Boolean(trimmed) && !disabled && !busy && !tooLarge && !turnActive;
  const chatMode = interactionMode === "chat";
  // 润色可用性：空输入/处理中/无 profile 禁用；capability 明确不支持时禁用并解释（project-quest SPEC §5.7）
  const enhanceDisabled = disabled || busy || !trimmed || !profileId || enhanceSupported === false;
  const enhanceTitle = (fallback: string) => (enhanceSupported === false ? t("enhanceUnavailable") : fallback);
  const workModeLabels: Record<ComposerWorkMode, string> = { default: t("workModeDefault"), spec: t("workModeSpec"), goal: t("workModeGoal"), plan: t("workModePlan") };

  async function submit() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(content, crypto.randomUUID());
      setContent("");
      setUndoContent(null);
      // 成功静默：消息以 user_message 事件即时回显到 transcript，弹 toast 是冗余噪音
    } catch (cause) {
      // start-and-send 确认弹窗被取消：保留输入，不报错（frontend-spec §5.1）
      if ((cause as Error | undefined)?.name !== "ComposerCancelled") feedback.error(toFeedbackError(cause, t, "composerFailed", "composer-send"));
    } finally {
      setSending(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
      return;
    }
  }

  function handleChange(next: string) {
    setContent(next);
    // 听写中手动编辑：interim 缓冲丢弃（project-quest SPEC §5.11）
    if (interim) setInterim("");
  }

  function toggleMic() {
    if (!speech.supported) {
      feedback.info({ title: t("qoderMic"), description: t("qoderInstallUnavailable") });
      return;
    }
    if (listening) {
      speech.stop();
      setInterim("");
      return;
    }
    speech.start();
  }

  async function enhance(kind: PromptEnhanceAction) {
    if (enhanceDisabled || !profileId) return;
    setEnhancing(kind);
    const original = content;
    try {
      const result = await runtime.engines.enhancePrompt({ profileId, action: kind, content: original, locale: language === "zh" ? "zh" : "en" });
      // 卸载（切换会话/视图）后结果丢弃，不误写其它 composer 实例（project-quest SPEC §5.11）
      if (!mountedRef.current) return;
      setUndoContent(original);
      setContent(result.content);
      if (result.truncated) feedback.info({ title: t(kind === "polish" ? "qoderPolish" : "qoderCompress"), description: t("enhanceTruncated") });
    } catch (cause) {
      // 失败保留原文可重试：content 未动，仅提示错误
      if (mountedRef.current) feedback.error(toFeedbackError(cause, t, "enhanceFailed", "prompt-enhance"));
    } finally {
      if (mountedRef.current) setEnhancing(null);
    }
  }

  function undoEnhance() {
    if (undoContent === null) return;
    setContent(undoContent);
    setUndoContent(null);
  }

  // 发送/停止按钮两布局共用；chat 布局用上箭头圆钮（Qoder 样式）
  const sendOrStop = turnActive
    ? <Button variant="secondary" className="composer-send composer-stop icon-only" onClick={() => onCancelTurn?.()} disabled={disabled} aria-label={t("stopTurn")} title={t("stopTurn")}><Icon name="stop" /></Button>
    : <Button type="submit" variant="accent" className="composer-send icon-only" disabled={!canSend} aria-label={t("sendPrompt")} title={waitingApproval ? t("approvalWaiting") : tooLarge ? t("promptTooLarge") : t("sendPrompt")}><Icon name={chatMode ? "arrow-up" : "send"} /></Button>;

  return (
    <form className={`prompt-composer qoder-composer${chatMode ? " chat-layout" : ""}`} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {!chatMode && <div className="composer-controls" aria-label={t("launchControls")}>
        {profiles && <label className="capability-selector cli-selector" title={t("cliProfile")}>
          <span>{t("cliProfile")}</span>
          <Select ariaLabel={t("cliProfile")} value={selectedProfileId ?? ""} options={[...(selectedProfileId ? [] : [{ value: "", label: t("selectCliPlaceholder") }]), ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))]} disabled={disabled} onChange={(next) => next && onProfileChange?.(next)} />
        </label>}
        <CapabilitySelector label={t("model")} defaultLabel={t("modelDefault")} hint={profiles && !selectedProfileId ? t("selectCliFirst") : capabilities?.models?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.model} options={profiles && !selectedProfileId ? undefined : capabilities?.models} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ model: value })} />
        <CapabilitySelector label={t("permission")} defaultLabel={t("permissionDefault")} hint={capabilities?.permissions?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.permission} options={capabilities?.permissions} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ permission: value })} />
        <WorkModeSelector mode={workMode} onChange={(mode) => onWorkModeChange?.(mode)} label={t("workModeLabel")} labels={workModeLabels} />
      </div>}
      <div className="composer-box">
        <TextArea ref={textareaRef} aria-label={t("prompt")} placeholder={t("qoderPromptPlaceholder")} value={content} onChange={(event) => handleChange(event.target.value)} onKeyDown={keyDown} disabled={disabled || busy} />
        {chatMode
          ? <div className="composer-toolbar">
            <div className="composer-toolbar-group">
              <CapabilitySelector label={t("model")} defaultLabel={t("modelDefault")} hint={capabilities?.models?.length ? t("modelNextTurn") : t("capabilityUnavailable")} value={activeModel} options={capabilities?.models} disabled={disabled} onChange={(value) => onActiveModelChange?.(value)} />
              <WorkModeSelector chip mode={workMode} onChange={(mode) => onWorkModeChange?.(mode)} label={t("workModeLabel")} labels={workModeLabels} />
            </div>
            <div className="composer-toolbar-group">
              <IconButton appearance="composer" onClick={() => enhance("polish")} disabled={enhanceDisabled} label={t("qoderPolish")} title={enhanceTitle(t("qoderPolish"))} icon="sparkles" />
              <IconButton appearance="composer" className={listening ? "active" : ""} onClick={toggleMic} disabled={disabled} label={t("qoderMic")} title={t("qoderMic")} icon="mic" />
              {sendOrStop}
            </div>
          </div>
          : <div className="composer-actions">
            <IconButton appearance="composer" className={listening ? "active" : ""} onClick={toggleMic} disabled={disabled} label={t("qoderMic")} title={t("qoderMic")} icon="mic" />
            <IconButton appearance="composer" onClick={() => enhance("polish")} disabled={enhanceDisabled} label={t("qoderPolish")} title={enhanceTitle(t("qoderPolish"))} icon="wand" />
            <IconButton appearance="composer" onClick={() => enhance("compress")} disabled={enhanceDisabled} label={t("qoderCompress")} title={enhanceTitle(t("qoderCompress"))} icon="compress" />
            {sendOrStop}
          </div>}
      </div>
      <small>
        {enhancing ? t("enhanceBusy") : waitingApproval ? t("approvalWaiting") : turnActive ? t("waitForTurn") : tooLarge ? t("promptTooLarge") : t("enterToSend")}
        {interim && <span className="composer-interim">{interim}</span>}
        {undoContent !== null && !enhancing && <Button unstyled className="composer-undo" onClick={undoEnhance}>{t("enhanceUndo")}</Button>}
      </small>
    </form>
  );
}

function WorkModeSelector({ mode, onChange, label, labels, chip = false }: { mode: ComposerWorkMode; onChange: (mode: ComposerWorkMode) => void; label: string; labels: Record<ComposerWorkMode, string>; chip?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="work-mode-selector">
      <Button unstyled className={chip ? "composer-chip" : "work-mode-trigger"} aria-haspopup="menu" aria-expanded={open} title={label} onClick={() => setOpen((value) => !value)}>
        <Icon name="list" /><span>{labels[mode]}</span><Icon name="chevron-down" />
      </Button>
      {open && (
        <div className="work-mode-menu" role="menu" aria-label={label}>
          {WORK_MODES.map((option) => (
            <Button unstyled key={option} role="menuitemradio" aria-checked={option === mode} className={`work-mode-option${option === mode ? " active" : ""}`} onClick={() => { onChange(option); setOpen(false); }}>
              <span>{labels[option]}</span>
              {option === mode && <Icon name="check" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function CapabilitySelector({ label, defaultLabel, hint, value, options, disabled, onChange }: { label: string; defaultLabel: string; hint: string; value?: string | null; options?: CliProfileCapabilities["permissions"]; disabled: boolean; onChange: (value: string | null) => void }) {
  const unavailable = !options || options.length === 0;
  // 适配器选项里的 "default" 与合成默认项语义重复（均映射为 null 不传参），过滤避免重复 key
  const selectOptions = [{ value: "default", label: defaultLabel }, ...(options ?? []).filter((option) => option.id !== "default").map((option) => ({ value: option.id, label: option.id }))];
  return <label className="capability-selector" title={hint}>
    <span>{label}</span>
    <Select ariaLabel={label} value={value ?? "default"} options={selectOptions} disabled={disabled || unavailable} onChange={(next) => onChange(next === "default" ? null : next)} />
  </label>;
}
