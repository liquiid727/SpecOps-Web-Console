import type { CliProfile, SendMessageResponse, Session, SessionLaunchConfig, Workspace } from "../../shared/types";
import type { AppView, CenterView, ComposerWorkMode } from "../app/preferences";
import { ChatView } from "./ChatView";
import { KnowledgeView } from "./KnowledgeView";
import { MarketplaceView } from "./MarketplaceView";
import { QuestBoardView } from "./QuestBoardView";
import { QuestHome } from "./QuestHome";
import { SettingsView } from "./SettingsView";

interface MainAreaProps {
  currentView: AppView;
  activeSession?: Session;
  activeWorkspace?: Workspace;
  activeProfile?: CliProfile;
  workspaces: Workspace[];
  profiles: CliProfile[];
  /** View all quests 看板数据源：全量会话，由看板自行按 Quest 口径过滤 */
  sessions: Session[];
  onSelectSession: (id: string) => void;
  readonly: boolean;
  onNewSession: () => void;
  centerView: CenterView;
  onCenterViewChange: (view: CenterView) => void;
  onLaunchConfigChange: (change: Partial<SessionLaunchConfig>) => void;
  onSendPrompt: (content: string, clientMessageId: string) => Promise<SendMessageResponse | void>;
  /** Quest Home 一次提交创建流（frontend-spec §2、§6）；model 仅在显式选择时携带 */
  onQuickCreate: (input: { content: string; workspaceId: string; profileId: string; model?: string }) => Promise<void>;
  /** 新建 Quest 草稿态：Quest Home 隐藏周边区块，只保留干净的输入界面 */
  questDraftMode?: boolean;
  onStatus: () => void;
  onOpenSettings: () => void;
  onResume?: (id: string) => void;
  onStop?: (id: string) => void;
  onTurnActivity?: (sessionId: string, turnId?: string) => void;
  /** MVP02 工作模式：App 层持久化后下发至 composer。 */
  workMode: ComposerWorkMode;
  onWorkModeChange: (mode: ComposerWorkMode) => void;
}

export function MainArea({ currentView, activeSession, activeWorkspace, activeProfile, workspaces, profiles, sessions, onSelectSession, readonly, onNewSession, centerView, onCenterViewChange, onLaunchConfigChange, onSendPrompt, onQuickCreate, questDraftMode, onStatus, onOpenSettings, onResume, onStop, onTurnActivity, workMode, onWorkModeChange }: MainAreaProps) {
  if (currentView === "quests") return <QuestBoardView sessions={sessions} workspaces={workspaces} onSelectSession={onSelectSession} />;
  if (currentView === "knowledge") return <KnowledgeView workspaces={workspaces} activeWorkspaceId={activeWorkspace?.id} />;
  if (currentView === "marketplace") return <MarketplaceView />;
  if (currentView === "settings") return <SettingsView />;
  if (currentView === "chat" && activeSession) return <ChatView session={activeSession} workspace={activeWorkspace} profile={activeProfile} readonly={readonly} centerView={centerView} onCenterViewChange={onCenterViewChange} onLaunchConfigChange={onLaunchConfigChange} onSend={onSendPrompt} onStatus={onStatus} onResume={onResume} onStop={onStop} onTurnActivity={onTurnActivity} workMode={workMode} onWorkModeChange={onWorkModeChange} />;
  return <QuestHome workspaces={workspaces} profiles={profiles} draftMode={questDraftMode} onQuickCreate={onQuickCreate} onOpenSettings={onOpenSettings} onAdvancedCreate={onNewSession} />;
}
