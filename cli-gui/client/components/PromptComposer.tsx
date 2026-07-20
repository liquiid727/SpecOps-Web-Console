import { useState, type KeyboardEvent } from "react";
import type { CliProfileCapabilities, SessionLaunchConfig } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";

interface PromptComposerProps {
  disabled: boolean;
  onSend: (content: string, clientMessageId: string) => Promise<void>;
  capabilities?: CliProfileCapabilities;
  launchConfig?: SessionLaunchConfig;
  onLaunchConfigChange?: (change: Partial<SessionLaunchConfig>) => void;
}

export function PromptComposer({ disabled, onSend, capabilities, launchConfig, onLaunchConfigChange }: PromptComposerProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = content.trim();
  const tooLarge = new TextEncoder().encode(content).length > 65_536;
  const canSend = Boolean(trimmed) && !disabled && !sending && !tooLarge;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(content, crypto.randomUUID());
      setContent("");
      feedback.success({ title: t("messageSent") });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "composerFailed", "composer-send"));
    } finally {
      setSending(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submit();
  }

  return <form className="prompt-composer" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <div className="composer-controls" aria-label={t("launchControls")}>
      <CapabilitySelector label={t("permission")} defaultLabel={t("permissionDefault")} hint={capabilities?.permissions?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.permission} options={capabilities?.permissions} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ permission: value })} />
      <CapabilitySelector label={t("mode")} defaultLabel={t("modeDefault")} hint={capabilities?.modes?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.mode} options={capabilities?.modes} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ mode: value })} />
      <CapabilitySelector label={t("model")} defaultLabel={t("modelDefault")} hint={capabilities?.models?.length ? t("capabilityApplies") : t("capabilityUnavailable")} value={launchConfig?.model} options={capabilities?.models} disabled={disabled} onChange={(value) => onLaunchConfigChange?.({ model: value })} />
    </div>
    <div className="composer-box">
      <textarea aria-label={t("prompt")} placeholder={t("promptPlaceholder")} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={keyDown} disabled={disabled || sending} />
      <button className="primary-button icon-only" disabled={!canSend} aria-label={t("sendPrompt")} title={tooLarge ? t("promptTooLarge") : t("sendPrompt")}><Icon name="chevron" /></button>
    </div>
    <small>{tooLarge ? t("promptTooLarge") : t("enterToSend")}</small>
  </form>;
}

function CapabilitySelector({ label, defaultLabel, hint, value, options, disabled, onChange }: { label: string; defaultLabel: string; hint: string; value?: string | null; options?: CliProfileCapabilities["permissions"]; disabled: boolean; onChange: (value: string | null) => void }) {
  const unavailable = !options || options.length === 0;
  const selectOptions = [{ value: "default", label: defaultLabel }, ...(options ?? []).map((option) => ({ value: option.id, label: option.id }))];
  return <label className="capability-selector" title={hint}>
    <span>{label}</span>
    <Select ariaLabel={label} value={value ?? "default"} options={selectOptions} disabled={disabled || unavailable} onChange={(next) => onChange(next === "default" ? null : next)} />
  </label>;
}
