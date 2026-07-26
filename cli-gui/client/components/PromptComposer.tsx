import { useRef, useState, type KeyboardEvent } from "react";
import type { CliProfileCapabilities, SessionLaunchConfig } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";
import { ContextMention, contextToken, type ContextType } from "./ContextMention";
import { CommandPalette, commandToken } from "./CommandPalette";
import { Button, IconButton, TextArea } from "./ui";

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
  onCancelTurn?: () => void;
}

export function PromptComposer({ disabled, onSend, capabilities, launchConfig, onLaunchConfigChange, interactionMode, activeModel, onActiveModelChange, turnActive = false, onCancelTurn }: PromptComposerProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [composerMode, setComposerMode] = useState<"spec" | "goal">("spec");
  const [popover, setPopover] = useState<null | "context" | "command">(null);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const tooLarge = new TextEncoder().encode(content).length > 65_536;
  const canSend = Boolean(trimmed) && !disabled && !sending && !tooLarge && !turnActive;
  const chatMode = interactionMode === "chat";

  async function submit() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(content, crypto.randomUUID());
      setContent("");
      setPopover(null);
      setTriggerIndex(null);
      feedback.success({ title: t("messageSent") });
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
    if (event.key === "Escape" && popover) {
      event.preventDefault();
      setPopover(null);
      setTriggerIndex(null);
    }
  }

  function detectPopover(value: string, caret: number) {
    const before = value.slice(0, caret);
    const match = before.match(/(^|\s)([@/])$/);
    if (!match) {
      setPopover(null);
      setTriggerIndex(null);
      return;
    }
    setTriggerIndex(caret - 1);
    setPopover(match[2] === "@" ? "context" : "command");
  }

  function handleChange(next: string) {
    setContent(next);
    const el = textareaRef.current;
    detectPopover(next, el?.selectionStart ?? next.length);
  }

  function applyToken(token: string) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const idx = triggerIndex ?? caret;
    const next = content.slice(0, idx) + token + content.slice(caret);
    setContent(next);
    setPopover(null);
    setTriggerIndex(null);
    const pos = idx + token.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function openExplicit(kind: "context" | "command") {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const triggerChar = kind === "context" ? "@" : "/";
    setContent(content.slice(0, caret) + triggerChar + content.slice(caret));
    setTriggerIndex(caret);
    setPopover(kind);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret + 1, caret + 1);
    });
  }

  function selectContext(type: ContextType) {
    applyToken(contextToken(type));
  }

  function selectCommand(token: string) {
    applyToken(commandToken(token));
  }

  function toggleMic() {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setListening((value) => !value);
      return;
    }
    feedback.info({ title: t("qoderMic"), description: t("qoderInstallUnavailable") });
  }

  function enhance(kind: "polish" | "compress") {
    feedback.info({ title: t(kind === "polish" ? "qoderPolish" : "qoderCompress") });
  }

  return (
    <form className="prompt-composer qoder-composer" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="composer-controls" aria-label={t("launchControls")}>
        <SpecGoalToggle mode={composerMode} onChange={setComposerMode} label={t("qoderModeToggle")} specLabel={t("qoderSpec")} goalLabel={t("qoderGoal")} />
        <CapabilitySelector label={t("permission")} defaultLabel={t("permissionDefault")} hint={capabilities?.permissions?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.permission} options={capabilities?.permissions} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ permission: value })} />
        <CapabilitySelector label={t("mode")} defaultLabel={t("modeDefault")} hint={capabilities?.modes?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.mode} options={capabilities?.modes} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ mode: value })} />
        {chatMode
          ? <CapabilitySelector label={t("model")} defaultLabel={t("modelDefault")} hint={capabilities?.models?.length ? t("modelNextTurn") : t("capabilityUnavailable")} value={activeModel} options={capabilities?.models} disabled={disabled} onChange={(value) => onActiveModelChange?.(value)} />
          : <CapabilitySelector label={t("model")} defaultLabel={t("modelDefault")} hint={capabilities?.models?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.model} options={capabilities?.models} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ model: value })} />}
        {chatMode && Boolean(capabilities?.models?.length) && <small className="model-next-turn-hint">{t("modelNextTurn")}</small>}
      </div>
      <div className="composer-box">
        <TextArea ref={textareaRef} aria-label={t("prompt")} placeholder={t("qoderPromptPlaceholder")} value={content} onChange={(event) => handleChange(event.target.value)} onKeyDown={keyDown} disabled={disabled || sending} />
        {popover === "context" && (
          <div className="composer-popover-anchor">
            <ContextMention onSelect={selectContext} onClose={() => { setPopover(null); setTriggerIndex(null); }} />
          </div>
        )}
        {popover === "command" && (
          <div className="composer-popover-anchor">
            <CommandPalette onSelect={selectCommand} onClose={() => { setPopover(null); setTriggerIndex(null); }} />
          </div>
        )}
        <div className="composer-actions">
          <IconButton appearance="composer" className={listening ? "active" : ""} onClick={toggleMic} disabled={disabled} label={t("qoderMic")} title={t("qoderMic")} icon="mic" />
          <IconButton appearance="composer" onClick={() => enhance("polish")} disabled={disabled} label={t("qoderPolish")} title={t("qoderPolish")} icon="wand" />
          <IconButton appearance="composer" onClick={() => enhance("compress")} disabled={disabled} label={t("qoderCompress")} title={t("qoderCompress")} icon="compress" />
          <IconButton appearance="composer" onClick={() => openExplicit("context")} disabled={disabled} label={t("qoderContext")} title={t("qoderContext")} icon="at" />
          <IconButton appearance="composer" onClick={() => openExplicit("command")} disabled={disabled} label={t("qoderCommands")} title={t("qoderCommands")} icon="command" />
          {turnActive
            ? <Button variant="secondary" className="composer-send composer-stop icon-only" onClick={() => onCancelTurn?.()} disabled={disabled} aria-label={t("stopTurn")} title={t("stopTurn")}><Icon name="stop" /></Button>
            : <Button type="submit" variant="accent" className="composer-send icon-only" disabled={!canSend} aria-label={t("sendPrompt")} title={tooLarge ? t("promptTooLarge") : t("sendPrompt")}><Icon name="send" /></Button>}
        </div>
      </div>
      <small>{turnActive ? t("waitForTurn") : tooLarge ? t("promptTooLarge") : t("enterToSend")}</small>
    </form>
  );
}

function SpecGoalToggle({ mode, onChange, label, specLabel, goalLabel }: { mode: "spec" | "goal"; onChange: (mode: "spec" | "goal") => void; label: string; specLabel: string; goalLabel: string }) {
  return (
    <div className="spec-goal-toggle" role="group" aria-label={label}>
      <Button variant="ghost" className={mode === "spec" ? "active" : ""} aria-pressed={mode === "spec"} onClick={() => onChange("spec")}>{specLabel}</Button>
      <Button variant="ghost" className={mode === "goal" ? "active" : ""} aria-pressed={mode === "goal"} onClick={() => onChange("goal")}>{goalLabel}</Button>
    </div>
  );
}

function CapabilitySelector({ label, defaultLabel, hint, value, options, disabled, onChange }: { label: string; defaultLabel: string; hint: string; value?: string | null; options?: CliProfileCapabilities["permissions"]; disabled: boolean; onChange: (value: string | null) => void }) {
  const unavailable = !options || options.length === 0;
  const selectOptions = [{ value: "default", label: defaultLabel }, ...(options ?? []).map((option) => ({ value: option.id, label: option.id }))];
  return <label className="capability-selector" title={hint}>
    <span>{label}</span>
    <Select ariaLabel={label} value={value ?? "default"} options={selectOptions} disabled={disabled || unavailable} onChange={(next) => onChange(next === "default" ? null : next)} />
  </label>;
}
