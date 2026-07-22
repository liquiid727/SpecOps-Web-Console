import type { Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { PromptComposer } from "./PromptComposer";
import { Icon } from "./ui/Icon";

interface QuestHomeProps {
  workspaces: Workspace[];
  onSendPrompt: (content: string) => void;
  onNewSession: () => void;
  t: ReturnType<typeof useI18n>["t"];
}

export function QuestHome({ workspaces, onSendPrompt, onNewSession }: QuestHomeProps) {
  const { t } = useI18n();

  return (
    <div className="quest-home">
      <div className="quest-home-content">
        <h1 className="quest-home-title">{t("qoderBetterLoop")}</h1>
        <p className="quest-home-subtitle">{t("qoderHomeSubtitle")}</p>
        <div className="quest-home-input">
          <PromptComposer
            disabled={false}
            onSend={async (content) => {
              onSendPrompt(content);
            }}
          />
        </div>
        <div className="quest-home-workspaces">
          <h3>{t("qoderRecentWorkspaces")}</h3>
          <div className="workspace-grid">
            {workspaces.slice(0, 4).map((workspace) => (
              <button
                key={workspace.id}
                className="workspace-card"
                onClick={onNewSession}
              >
                <Icon name="folder" />
                <span>{workspace.name}</span>
              </button>
            ))}
            {workspaces.length === 0 && (
              <p className="workspace-empty">{t("qoderNoWorkspaces")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
