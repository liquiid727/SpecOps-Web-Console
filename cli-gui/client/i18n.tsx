import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionStatus } from "../shared/types";

export type LanguageMode = "en" | "zh";

type TranslationParams = Record<string, string | number | undefined>;
export type TranslationKey = keyof typeof translations.en;

const storageKey = "product-ai-os-cli-gui-language";

const translations = {
  en: {
    appControls: "Application controls",
    brandTitle: "Product AI OS",
    cliProfile: "CLI profile",
    cliProfiles: "CLI profiles",
    close: "Close",
    closeSessionDetails: "Close session details",
    command: "Command",
    confirmAndStart: "Confirm and start",
    created: "Created",
    delete: "Delete",
    deleteCliProfile: "Delete CLI profile",
    deleteExistingSafe: "Existing project files and CLI installations are not changed.",
    deleteProfileDescription: "Remove this CLI profile. Existing project files and CLI installations are not changed.",
    deleteSession: "Delete session",
    deleteSessionDescription: "Delete {{name}} and its saved metadata. This does not delete project files.",
    deleteSessionTitle: "Delete session?",
    deleteSessionsFirst: "Delete its sessions first",
    deleteWorkspace: "Delete workspace",
    deleteWorkspaceDescription: "Remove this workspace registration. Existing project files and CLI installations are not changed.",
    details: "Details",
    directory: "Directory",
    dismiss: "Dismiss",
    error: "Error",
    exitCode: "Exit code",
    localMode: "Local mode",
    readonly: "Read-only",
    readonlyMode: "Read-only mode",
    rename: "Rename",
    renameSessionTitle: "Rename session",
    renameSessionDescription: "Use a short task-oriented name so parallel terminal work stays easy to identify.",
    resume: "Resume",
    resumeDescription: "Start {{profile}} in {{workspace}}. A fresh PTY will be opened.",
    resumeSession: "Resume session",
    saveName: "Save name",
    session: "Session",
    sessionDetails: "Session details",
    sessionInspector: "Session inspector",
    sessionIsStatus: "Session is {{status}}",
    sessionName: "Session name",
    sessions: "Sessions",
    settings: "Settings",
    setupFirst: "Set up a workspace and CLI profile first",
    setupFirstDescription: "Workspaces define where the terminal opens. Profiles define which CLI command runs.",
    startFirstSession: "Start your first CLI session",
    startFirstSessionDescription: "Choose a project and CLI profile. Product AI OS will open the native interactive terminal.",
    stop: "Stop",
    terminal: "Terminal",
    toggleLanguage: "Switch language",
    toggleSessions: "Toggle sessions",
    unknownProfile: "Unknown profile",
    unknownWorkspace: "Unknown workspace",
    workspace: "Workspace",
    workspaceSettings: "Workspace settings",
    workspaceSettingsDescription: "Manage local project directories and reusable CLI launch profiles.",
    workspaces: "Workspaces",
    noWorkspacesYet: "No workspaces yet",
    noWorkspacesDescription: "Add a local project in Settings to begin.",
    noWorkspacesRegistered: "No workspaces registered.",
    noSessions: "No sessions",
    newSession: "New session",
    newCliSession: "New CLI session",
    newSessionDescription: "Choose a local project and launch profile. The command stays in the official CLI terminal.",
    launchPreview: "Launch preview",
    selectWorkspace: "Select a workspace",
    name: "Name",
    localPath: "Local path",
    addWorkspace: "Add workspace",
    launchers: "Launchers",
    projects: "Projects",
    saveProfile: "Save profile",
    arguments: "Arguments",
    cancel: "Cancel",
    working: "Working…",
    starting: "Starting…",
    loadingWorkspace: "Loading workspace…",
    failedToLoadWorkspace: "failed to load workspace",
    operationFailed: "operation failed",
    openSettings: "Open settings",
    openSessionDetails: "Open session details",
    runNativeTerminal: "Run Claude Code and Codex sessions in their native terminal.",
    resumeFreshPty: "Resume to launch a fresh PTY in this workspace.",
    sessionStoppedWithError: "Session stopped with an error",
    cliWorkspace: "CLI workspace",
    officialCliTerminal: "official CLI terminal",
    profileFallback: "CLI",
    thisWorkspace: "this workspace",
    languageEnglish: "EN",
    languageChinese: "中文",
    lastActive: "Last active",
    status_running: "running",
    status_starting: "starting",
    status_stopped: "stopped",
    status_error: "error"
  },
  zh: {
    appControls: "应用控制",
    brandTitle: "Product AI OS",
    cliProfile: "CLI 配置",
    cliProfiles: "CLI 配置",
    close: "关闭",
    closeSessionDetails: "关闭会话详情",
    command: "命令",
    confirmAndStart: "确认并启动",
    created: "创建时间",
    delete: "删除",
    deleteCliProfile: "删除 CLI 配置",
    deleteExistingSafe: "不会修改已有项目文件和 CLI 安装。",
    deleteProfileDescription: "移除此 CLI 配置。不会修改已有项目文件和 CLI 安装。",
    deleteSession: "删除会话",
    deleteSessionDescription: "删除 {{name}} 及其保存的元数据。不会删除项目文件。",
    deleteSessionTitle: "删除会话？",
    deleteSessionsFirst: "请先删除关联会话",
    deleteWorkspace: "删除工作区",
    deleteWorkspaceDescription: "移除此工作区登记。不会修改已有项目文件和 CLI 安装。",
    details: "详情",
    directory: "目录",
    dismiss: "关闭",
    error: "错误",
    exitCode: "退出码",
    localMode: "本地模式",
    readonly: "只读",
    readonlyMode: "只读模式",
    rename: "重命名",
    renameSessionTitle: "重命名会话",
    renameSessionDescription: "使用简短的任务名，方便区分并行终端工作。",
    resume: "恢复",
    resumeDescription: "在 {{workspace}} 中启动 {{profile}}。将打开新的 PTY。",
    resumeSession: "恢复会话",
    saveName: "保存名称",
    session: "会话",
    sessionDetails: "会话详情",
    sessionInspector: "会话检查器",
    sessionIsStatus: "会话状态：{{status}}",
    sessionName: "会话名称",
    sessions: "会话",
    settings: "设置",
    setupFirst: "请先设置工作区和 CLI 配置",
    setupFirstDescription: "工作区定义终端打开目录；CLI 配置定义要运行的命令。",
    startFirstSession: "启动第一个 CLI 会话",
    startFirstSessionDescription: "选择项目和 CLI 配置，Product AI OS 会打开原生交互式终端。",
    stop: "停止",
    terminal: "终端",
    toggleLanguage: "切换语言",
    toggleSessions: "切换会话导航",
    unknownProfile: "未知配置",
    unknownWorkspace: "未知工作区",
    workspace: "工作区",
    workspaceSettings: "工作区设置",
    workspaceSettingsDescription: "管理本地项目目录和可复用 CLI 启动配置。",
    workspaces: "工作区",
    noWorkspacesYet: "还没有工作区",
    noWorkspacesDescription: "请在设置中添加本地项目。",
    noWorkspacesRegistered: "尚未登记工作区。",
    noSessions: "暂无会话",
    newSession: "新建会话",
    newCliSession: "新建 CLI 会话",
    newSessionDescription: "选择本地项目和启动配置。命令仍运行在官方 CLI 终端中。",
    launchPreview: "启动预览",
    selectWorkspace: "选择工作区",
    name: "名称",
    localPath: "本地路径",
    addWorkspace: "添加工作区",
    launchers: "启动器",
    projects: "项目",
    saveProfile: "保存配置",
    arguments: "参数",
    cancel: "取消",
    working: "处理中…",
    starting: "启动中…",
    loadingWorkspace: "正在加载工作区…",
    failedToLoadWorkspace: "加载工作区失败",
    operationFailed: "操作失败",
    openSettings: "打开设置",
    openSessionDetails: "打开会话详情",
    runNativeTerminal: "在原生终端中运行 Claude Code 和 Codex 会话。",
    resumeFreshPty: "恢复后将在此工作区启动新的 PTY。",
    sessionStoppedWithError: "会话因错误停止",
    cliWorkspace: "CLI 工作区",
    officialCliTerminal: "官方 CLI 终端",
    profileFallback: "CLI",
    thisWorkspace: "此工作区",
    languageEnglish: "EN",
    languageChinese: "中文",
    lastActive: "最后活动",
    status_running: "运行中",
    status_starting: "启动中",
    status_stopped: "已停止",
    status_error: "错误"
  }
} as const;

interface I18nContextValue {
  language: LanguageMode;
  setLanguage: (language: LanguageMode) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  statusLabel: (status: SessionStatus) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageMode>(() => readStoredLanguage());

  const value = useMemo<I18nContextValue>(() => {
    function setLanguage(next: LanguageMode) {
      setLanguageState(next);
      window.localStorage.setItem(storageKey, next);
      document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    }

    function t(key: TranslationKey, params: TranslationParams = {}) {
      const template = translations[language][key] ?? translations.en[key];
      return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value ?? "")), template);
    }

    return { language, setLanguage, t, statusLabel: (status) => t(`status_${status}` as TranslationKey) };
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}

function readStoredLanguage(): LanguageMode {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(storageKey);
  return stored === "zh" ? "zh" : "en";
}
