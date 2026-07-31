// 客户端状态管理统一收敛到 Zustand（frontend-spec §9）。三个切片：
// - useAppStore：服务端状态镜像（/api/state 轮询 + 会话焦点 + 轮次活动），服务端仍是唯一事实源
// - usePreferencesStore：版本化 UI 偏好，写入 localStorage（preferences.ts 负责 parse/persist）
// - useUiStore：瞬态 UI 状态（弹窗、待删除项、picker 忙碌），不持久化
// 纪律：store 不弹 toast、不做 i18n——副作用编排（feedback/t）留在组件层；action 返回错误由调用方决定呈现。
import { create } from "zustand";
import type { CliProfile, WorkspaceV2 } from "../../shared/types";
import { type ClientAppState, mergeState } from "../api";
import { getDefaultClientRuntime } from "../runtime/client-runtime";
import { defaultPreferences, readPreferences, writePreferences, type UiPreferencesV1 } from "./preferences";

const emptyState: ClientAppState = { workspaces: [], profiles: [], sessions: [] };

export type OverlayState = "new-session" | "settings" | "resume" | "rename" | "delete-session" | "archive-session" | "complete-session" | "fork-session" | undefined;
export type PendingDelete = { type: "workspace"; item: WorkspaceV2 } | { type: "profile"; item: CliProfile } | undefined;

interface AppStore {
  state: ClientAppState;
  readonly: boolean;
  loading: boolean;
  loadError: boolean;
  activeSessionId?: string;
  /** 会话列表的轮次进行中指示（frontend-spec §6）：sessionId → turnId */
  activeTurns: Record<string, string>;
  /** 拉取 /api/state 并合并；失败时返回 cause 交由调用方决定是否 toast。竞态用请求序号守卫。 */
  refresh: () => Promise<unknown | undefined>;
  /** 重试入口：恢复 loading 态后由调用方再触发 refresh */
  markLoading: () => void;
  setActiveSessionId: (id: string | undefined) => void;
  reportTurnActivity: (sessionId: string, turnId?: string) => void;
}

let refreshRequest = 0;
let hasLoaded = false;

export const useAppStore = create<AppStore>()((set) => ({
  state: emptyState,
  readonly: false,
  loading: true,
  loadError: false,
  activeSessionId: undefined,
  activeTurns: {},
  refresh: async () => {
    const requestId = ++refreshRequest;
    try {
      const next = await getDefaultClientRuntime().sessions.state();
      if (requestId !== refreshRequest) return undefined;
      hasLoaded = true;
      set((current) => ({
        state: mergeState(current.state, next),
        readonly: next.readonly,
        activeSessionId: current.activeSessionId && next.sessions.some((session) => session.id === current.activeSessionId) ? current.activeSessionId : next.sessions[0]?.id,
        loadError: false,
        loading: false
      }));
      return undefined;
    } catch (cause) {
      if (requestId !== refreshRequest) return undefined;
      set((current) => ({ loadError: hasLoaded ? current.loadError : true, loading: false }));
      return cause;
    }
  },
  markLoading: () => set({ loading: true }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  reportTurnActivity: (sessionId, turnId) => set((current) => {
    if (turnId) return current.activeTurns[sessionId] === turnId ? current : { activeTurns: { ...current.activeTurns, [sessionId]: turnId } };
    if (!(sessionId in current.activeTurns)) return current;
    const next = { ...current.activeTurns };
    delete next[sessionId];
    return { activeTurns: next };
  })
}));

interface PreferencesStore {
  preferences: UiPreferencesV1;
  /** 合并更新并同步写入 localStorage（写失败静默，内存态仍可用） */
  update: (change: Partial<UiPreferencesV1>) => void;
}

export const usePreferencesStore = create<PreferencesStore>()((set) => ({
  preferences: readPreferences(),
  update: (change) => set((current) => {
    const preferences = { ...current.preferences, ...change, centerViewBySession: change.centerViewBySession ?? current.preferences.centerViewBySession };
    writePreferences(preferences);
    return { preferences };
  })
}));

interface UiStore {
  overlay: OverlayState;
  pendingDelete: PendingDelete;
  pickerBusy: boolean;
  newSessionDefaultMode: "chat" | "terminal";
  /** 新建 Quest 草稿态：侧栏展示虚线占位行，右侧进入干净输入界面；发送成功或切走时清除 */
  questDraftActive: boolean;
  setOverlay: (overlay: OverlayState) => void;
  setPendingDelete: (pendingDelete: PendingDelete) => void;
  setPickerBusy: (pickerBusy: boolean) => void;
  setNewSessionDefaultMode: (mode: "chat" | "terminal") => void;
  setQuestDraftActive: (questDraftActive: boolean) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  overlay: undefined,
  pendingDelete: undefined,
  pickerBusy: false,
  newSessionDefaultMode: "chat",
  questDraftActive: false,
  setOverlay: (overlay) => set({ overlay }),
  setPendingDelete: (pendingDelete) => set({ pendingDelete }),
  setPickerBusy: (pickerBusy) => set({ pickerBusy }),
  setNewSessionDefaultMode: (newSessionDefaultMode) => set({ newSessionDefaultMode }),
  setQuestDraftActive: (questDraftActive) => set({ questDraftActive })
}));

/** 测试隔离：store 是模块级单例，每个用例前必须重置（client/test/setup.ts 调用） */
export function resetClientStores() {
  refreshRequest = 0;
  hasLoaded = false;
  useAppStore.setState({ state: emptyState, readonly: false, loading: true, loadError: false, activeSessionId: undefined, activeTurns: {} });
  usePreferencesStore.setState({ preferences: typeof window === "undefined" ? { ...defaultPreferences, centerViewBySession: {}, modelPreferences: { lastUsedModel: {} } } : readPreferences() });
  useUiStore.setState({ overlay: undefined, pendingDelete: undefined, pickerBusy: false, newSessionDefaultMode: "chat", questDraftActive: false });
}
