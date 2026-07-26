import { useCallback, useState } from "react";
import type { CliProfile, SendMessageResponse, Session, SessionLaunchConfig, Workspace } from "../../shared/types";
import type { AppView, CenterView } from "../app/preferences";
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
  activeProfile?: CliProfile;
  workspaces: Workspace[];
  readonly: boolean;
  onNewSession: () => void;
  centerView: CenterView;
  onCenterViewChange: (view: CenterView) => void;
  onLaunchConfigChange: (change: Partial<SessionLaunchConfig>) => void;
  onSendPrompt: (content: string, clientMessageId: string) => Promise<SendMessageResponse | void>;
  onStatus: () => void;
  onOpenSettings: () => void;
  onResume?: (id: string) => void;
  onStop?: (id: string) => void;
  onTurnActivity?: (sessionId: string, turnId?: string) => void;
}

export function MainArea({ currentView, activeSession, activeWorkspace, activeProfile, workspaces, readonly, centerView, onCenterViewChange, onLaunchConfigChange, onNewSession, onSendPrompt, onStatus, onOpenSettings, onResume, onStop, onTurnActivity }: MainAreaProps) {
  const { t } = useI18n();
  const [homePrompt, setHomePrompt] = useState("");

  const handleSendFromHome = useCallback((content: string) => {
    setHomePrompt(content);
    void onSendPrompt(content, crypto.randomUUID());
  }, [onSendPrompt]);

  if (currentView === "knowledge") return <KnowledgeView />;
  if (currentView === "marketplace") return <MarketplaceView />;
  if (currentView === "settings") return <SettingsView />;
  if (currentView === "chat" && activeSession) return <ChatView session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} centerView={centerView} onCenterViewChange={onCenterViewChange} onLaunchConfigChange={onLaunchConfigChange} onSend={onSendPrompt} onStatus={onStatus} onResume={onResume} onStop={onStop} onTurnActivity={onTurnActivity} />;
  return <QuestHome workspaces={workspaces} activeWorkspace={activeWorkspace} onSendPrompt={handleSendFromHome} onNewSession={onNewSession} onOpenSettings={onOpenSettings} t={t} />;
}
