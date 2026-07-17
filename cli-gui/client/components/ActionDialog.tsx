import { useState, type FormEvent } from "react";
import { Overlay } from "./ui/Overlay";
import { useI18n } from "../i18n";

interface ActionDialogProps {
  confirmLabel: string;
  danger?: boolean;
  description: string;
  initialValue?: string;
  inputLabel?: string;
  onClose: () => void;
  onConfirm: (value?: string) => Promise<void> | void;
  title: string;
}

export function ActionDialog({ confirmLabel, danger, description, initialValue, inputLabel, onClose, onConfirm, title }: ActionDialogProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inputLabel && !value.trim()) return;
    setSubmitting(true);
    try { await onConfirm(inputLabel ? value.trim() : undefined); } finally { setSubmitting(false); }
  }

  return <Overlay title={title} description={description} onClose={onClose}>
    <form className="dialog-form" onSubmit={submit}>
      {inputLabel && <label><span>{inputLabel}</span><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} /></label>}
      <footer className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>{t("cancel")}</button><button className={danger ? "danger-button" : "primary-button"} disabled={submitting}>{submitting ? t("working") : confirmLabel}</button></footer>
    </form>
  </Overlay>;
}
