import { useI18n, type TranslationKey } from "../i18n";
import { Icon, type IconName } from "./ui/Icon";
import { Button } from "./ui";

export type CommandId = "learn" | "chart" | "test" | "commit" | "doc";

const commandItems: { id: CommandId; token: string; key: TranslationKey; icon: IconName }[] = [
  { id: "learn", token: "learn", key: "qoderCmdLearn", icon: "book" },
  { id: "chart", token: "chart", key: "qoderCmdChart", icon: "grid" },
  { id: "test", token: "test", key: "qoderCmdTest", icon: "shield" },
  { id: "commit", token: "commit", key: "qoderCmdCommit", icon: "git" },
  { id: "doc", token: "doc", key: "qoderCmdDoc", icon: "file" }
];

interface CommandPaletteProps {
  onSelect: (token: string) => void;
  onClose: () => void;
}

export function CommandPalette({ onSelect, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  return (
    <div className="composer-popover command-palette" role="listbox" aria-label={t("qoderCommands")} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <div className="composer-popover-heading">{t("qoderCommands")}</div>
      {commandItems.map((item) => (
        <Button variant="ghost" role="option" key={item.id} className="composer-popover-item" onClick={() => onSelect(item.token)}>
          <Icon name={item.icon} />
          <span className="command-token">/ {item.token}</span>
          <small>{t(item.key)}</small>
        </Button>
      ))}
    </div>
  );
}

export function commandToken(token: string): string {
  return `/${token} `;
}
