import { useI18n, type TranslationKey } from "../i18n";
import { Icon, type IconName } from "./ui/Icon";
import { Button } from "./ui";

export type ContextType = "file" | "folder" | "image" | "gitCommit" | "wiki" | "rule";

const contextItems: { type: ContextType; key: TranslationKey; icon: IconName }[] = [
  { type: "file", key: "qoderContextFile", icon: "file" },
  { type: "folder", key: "qoderContextFolder", icon: "folder" },
  { type: "image", key: "qoderContextImage", icon: "file-code" },
  { type: "gitCommit", key: "qoderContextCommit", icon: "git" },
  { type: "wiki", key: "qoderContextWiki", icon: "book" },
  { type: "rule", key: "qoderContextRule", icon: "shield" }
];

interface ContextMentionProps {
  onSelect: (type: ContextType) => void;
  onClose: () => void;
}

export function ContextMention({ onSelect, onClose }: ContextMentionProps) {
  const { t } = useI18n();
  return (
    <div className="composer-popover context-mention" role="listbox" aria-label={t("qoderContext")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <div className="composer-popover-heading">{t("qoderContext")}</div>
      {contextItems.map((item) => (
        <Button variant="ghost" role="option" key={item.type} className="composer-popover-item" onClick={() => onSelect(item.type)}>
          <Icon name={item.icon} />
          <span>{t(item.key)}</span>
        </Button>
      ))}
    </div>
  );
}

export function contextToken(type: ContextType): string {
  return `@${type} `;
}
