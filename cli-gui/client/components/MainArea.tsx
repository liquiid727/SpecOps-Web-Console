import { useCallback, useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import type { AppView } from "../app/preferences";
import { useI18n } from "../i18n";
import { ChatView } from "./ChatView";
import { KnowledgeView } from "./KnowledgeView";
import { MarketplaceView } from "./MarketplaceView";
import { QuestHome } from "./QuestHome";
import { SettingsView } from "./SettingsView";

interface MainAreaProps {
  currentView: AppView;
  activeSession?: Session;
  activeWorkspace?: Workspace;
  workspaces: Workspace[];
  readonly: boolean;
  onNewSession: () => void;
  onSendPrompt: (content: string) => void;
}

export function MainArea({ currentView, activeSession, activeWorkspace, workspaces, onNewSession, onSendPrompt }: MainAreaProps) {
  const { t } = useI18n();
  const [homePrompt, setHomePrompt] = useState("");

  const handleSendFromHome = useCallback((content: string) => {
    setHomePrompt(content);
    onSendPrompt(content);
  }, [onSendPrompt]);

  if (currentView === "knowledge") return <KnowledgeView />;
  if (currentView === "marketplace") return <MarketplaceView />;
  if (currentView === "settings") return <SettingsView />;
  if (currentView === "chat" && activeSession) return <ChatView session={activeSession} workspace={activeWorkspace} onSend={onSendPrompt} />;
  return <QuestHome workspaces={workspaces} onSendPrompt={handleSendFromHome} onNewSession={onNewSession} t={t} />;
}
