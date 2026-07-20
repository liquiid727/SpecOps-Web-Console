import { useState, type KeyboardEvent } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface PromptComposerProps {
  disabled: boolean;
  onSend: (content: string, clientMessageId: string) => Promise<void>;
}

export function PromptComposer({ disabled, onSend }: PromptComposerProps) {
  const { t } = useI18n();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const trimmed = content.trim();
  const tooLarge = new TextEncoder().encode(content).length > 65_536;
  const canSend = Boolean(trimmed) && !disabled && !sending && !tooLarge;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    setError(undefined);
    try {
      await onSend(content, crypto.randomUUID());
      setContent("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("composerFailed"));
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
    {error && <div className="composer-error" role="alert">{error}</div>}
    <div className="composer-controls" aria-label={t("launchControls")}>
      <select disabled aria-label={t("permission")}><option>{t("permissionDefault")}</option></select>
      <select disabled aria-label={t("mode")}><option>{t("modeDefault")}</option></select>
      <select disabled aria-label={t("model")}><option>{t("modelDefault")}</option></select>
    </div>
    <div className="composer-box">
      <textarea aria-label={t("prompt")} placeholder={t("promptPlaceholder")} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={keyDown} disabled={disabled || sending} />
      <button className="primary-button icon-only" disabled={!canSend} aria-label={t("sendPrompt")} title={tooLarge ? t("promptTooLarge") : t("sendPrompt")}><Icon name="chevron" /></button>
    </div>
    <small>{tooLarge ? t("promptTooLarge") : t("enterToSend")}</small>
  </form>;
}
