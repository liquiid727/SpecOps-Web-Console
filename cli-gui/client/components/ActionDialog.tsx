import { useState, type FormEvent } from "react";
import { Overlay } from "./ui/Overlay";
import { useI18n } from "../i18n";
import { Button, TextField } from "./ui";
import { DialogActions } from "./patterns";

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
      {inputLabel && <TextField autoFocus label={inputLabel} value={value} onChange={(event) => setValue(event.target.value)} />}
      <DialogActions><Button variant="secondary" className="secondary-button" onClick={onClose}>{t("cancel")}</Button><Button type="submit" variant={danger ? "danger" : "primary"} className={danger ? "danger-button" : "primary-button"} loading={submitting} loadingLabel={t("working")}>{confirmLabel}</Button></DialogActions>
    </form>
  </Overlay>;
}
