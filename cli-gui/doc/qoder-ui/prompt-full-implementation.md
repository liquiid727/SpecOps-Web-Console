# CLI-GUI Qoder UI 改造 — 完整实现提示词

> 覆盖所有 10 个 Issues 的详细实现指令
> 基于 SPEC: `cli-gui/doc/qoder-ui/spec-cli-gui-qoder-ui.md`
> 基于 Issues: `cli-gui/doc/qoder-ui/issues-cli-gui-qoder-ui.md`

---

## 全局上下文

### 项目结构
```
cli-gui/
├── client/                    # 前端 React 应用
│   ├── app/
│   │   ├── App.tsx            # 主应用（需要大规模修改）
│   │   ├── preferences.ts     # UI 偏好（需要扩展）
│   │   └── session-selectors.ts
│   ├── components/
│   │   ├── SessionNavigator.tsx   # 左侧导航（需要迁移到 Sidebar）
│   │   ├── SessionWorkspace.tsx   # 中央工作区（需要拆分为 QuestHome + ChatView）
│   │   ├── SessionInspector.tsx   # 右侧检查器（需要迁移到 RightPanel）
│   │   ├── TranscriptPanel.tsx    # 会话记录
│   │   ├── PromptComposer.tsx     # 底部输入框（需要增强）
│   │   ├── NewSessionDialog.tsx
│   │   ├── ActionDialog.tsx
│   │   ├── WorkspaceProfileManager.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ui/
│   │       ├── Icon.tsx           # 手写 SVG 图标（需要映射到 Lucide）
│   │       ├── Select.tsx
│   │       ├── Feedback.tsx
│   │       └── Overlay.tsx
│   ├── styles/
│   │   ├── index.css            # 样式入口
│   │   ├── base.css             # 基础样式
│   │   ├── components.css       # 组件样式（~300行，需要重写）
│   │   ├── responsive.css       # 响应式
│   │   └── themes/
│   │       ├── neo.css          # 当前默认主题（需要清理）
│   │       └── classic.css      # 深色主题
│   ├── theme.tsx                # 主题系统（需要扩展）
│   ├── terminal.tsx             # xterm.js 终端
│   ├── terminal-theme.ts
│   ├── api.ts                   # 前端 API
│   ├── i18n.tsx                 # 国际化
│   └── main.tsx                 # React 入口
├── server/                      # 后端 Node/TS
├── shared/                      # 共享类型
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### 现有技术栈
- **前端**: Vite 6 + React 19 + TypeScript 5.6 + Tailwind CSS 3.4
- **后端**: Node/TS + WebSocket + node-pty
- **样式**: 纯 CSS 变量 + 集中式 `components.css`，无 UI 组件库
- **主题**: `neo`（浅色粗边框，默认）+ `classic`（深色）
- **图标**: 手写 SVG（`client/components/ui/Icon.tsx`）

### 当前问题
1. neo 主题粗黑边框 + 硬阴影，视觉过重
2. 大量硬编码颜色，主题切换不统一
3. Tailwind 已装但几乎不用
4. 信息密度过高，字号过小（9-11px 常见）
5. 无 Tauri 工程

---

## Issue #1: Design Token + Infrastructure

### 目标
建立 Design Token 系统、初始化 Tauri、引入 Lucide Icons。

### 详细步骤

#### 1.1 创建 `client/styles/tokens.css`

```css
/* Design Token 定义层 */
/* 所有主题共享的基础变量 */

:root {
  /* 布局 */
  --sidebar-width: 260px;
  --inspector-width: 360px;
  --titlebar-height: 44px;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-pop: 0 4px 16px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06);

  /* 字体 */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;

  /* 字号层级 */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 15px;
  --text-xl: 16px;
  --text-2xl: 22px;
  --text-3xl: 26px;

  /* 间距 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  /* z-index */
  --z-rail: 20;
  --z-drawer-backdrop: 35;
  --z-drawer: 45;
  --z-menu: 70;
  --z-feedback: 160;
  --z-modal: 200;
}
```

#### 1.2 创建 `client/styles/themes/qoder-light.css`

```css
:root[data-theme="qoder-light"],
:root.theme-qoder-light {
  color-scheme: light;

  /* 背景 */
  --bg-page: #f6f6f6;
  --bg-panel: #ffffff;
  --bg-hover: #f2f2f2;
  --bg-active: #ebebeb;

  /* 边框 */
  --border: #e6e6e6;
  --border-subtle: #f0f0f0;

  /* 文字 */
  --text: #111111;
  --text-secondary: #6b6b6b;
  --text-tertiary: #9ca3af;
  --text-quaternary: #bfbfbf;

  /* 强调 */
  --accent: #1a1a1a;
  --accent-hover: #333333;
  --accent-contrast: #ffffff;
  --blue: #2563eb;
  --green: #4ade80;
  --green-bg: #eafbf3;
  --red: #ef4444;
  --yellow: #f59e0b;

  /* 状态 */
  --running: #22c55e;
  --starting: #f59e0b;
  --stopped: #9ca3af;
  --error: #ef4444;
  --warning: #f59e0b;
  --focus: #2563eb;

  /* 兼容旧变量名（映射到新变量） */
  --canvas: var(--bg-page);
  --surface: var(--bg-panel);
  --surface-raised: var(--bg-panel);
  --surface-hover: var(--bg-hover);
  --surface-selected: var(--bg-active);
  --navigator: var(--bg-panel);
  --terminal: var(--bg-page);
  --overlay: var(--bg-panel);
  --border-strong: var(--border);
  --muted: var(--text-tertiary);
  --faint: var(--text-quaternary);
  --danger: var(--red);
  --danger-muted: rgba(239, 68, 68, 0.1);
}
```

#### 1.3 修改 `client/styles/themes/neo.css`

保留 neo 主题但清理与 token 冲突的部分：
- 移除 `--neo-shadow: 5px 5px 0 #111827` 等硬编码阴影
- 将 `--canvas: #eef3f8` 等变量映射到兼容层
- 保留 `.primary-button` 等组件的 border-width 但改为 1px

#### 1.4 修改 `client/styles/themes/classic.css`

保持不变，确保深色主题仍然可用。

#### 1.5 修改 `client/styles/base.css`

```css
/* 更新基础样式 */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

:root {
  /* 移除旧变量定义，改为引用 tokens.css */
  font-synthesis: none;
}

/* 更新 body 样式 */
body {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--bg-page);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

/* 其他基础元素样式... */
```

#### 1.6 修改 `client/styles/index.css`

```css
@import "./themes/classic.css";
@import "./themes/neo.css";
@import "./themes/qoder-light.css";
@import "./tokens.css";
@import "./base.css";
@import "./components.css";
@import "./responsive.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### 1.7 初始化 Tauri 工程

```bash
# 在项目根目录执行
cd /Users/mac_liquiid/Desktop/SpecOps-Web-Console/cli-gui
npm install -D @tauri-apps/cli
npx tauri init
```

配置 `src-tauri/tauri.conf.json`：
```json
{
  "productName": "Product AI OS",
  "version": "0.1.0",
  "identifier": "com.productai.os",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev:client",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Product AI OS",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "decorations": false,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

#### 1.8 安装 Lucide Icons

```bash
npm install lucide-react
```

修改 `client/components/ui/Icon.tsx`，添加 Lucide 映射：
```typescript
import {
  Menu, X, Plus, ChevronRight, PanelLeft, PanelRight,
  Search, Bell, User, Settings, Folder, FileText, GitBranch,
  Terminal, MessageSquare, Zap, Star, Clock, Play, Stop,
  Trash, Pin, Archive, Check, AlertTriangle, Refresh,
  Send, Sparkles, Mic, Compress, Target, List, LayoutGrid,
  Filter, MoreHorizontal, Home, BookOpen, ShoppingBag,
  type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  menu: Menu,
  close: X,
  add: Plus,
  chevron: ChevronRight,
  panel: PanelRight,
  search: Search,
  bell: Bell,
  user: User,
  settings: Settings,
  folder: Folder,
  file: FileText,
  git: GitBranch,
  terminal: Terminal,
  message: MessageSquare,
  lightning: Zap,
  star: Star,
  clock: Clock,
  play: Play,
  stop: Stop,
  trash: Trash,
  pin: Pin,
  archive: Archive,
  check: Check,
  warning: AlertTriangle,
  refresh: Refresh,
  send: Send,
  sparkles: Sparkles,
  mic: Mic,
  compress: Compress,
  target: Target,
  list: List,
  grid: LayoutGrid,
  filter: Filter,
  more: MoreHorizontal,
  home: Home,
  book: BookOpen,
  shopping: ShoppingBag,
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) {
    // 回退到旧的手写 SVG
    return <span className={className}>{name}</span>;
  }
  return <LucideIcon size={size} className={className} />;
}
```

#### 1.9 修改 `package.json`

```json
{
  "scripts": {
    "dev": "concurrently -k \"npm:dev:server\" \"npm:dev:client\"",
    "dev:status": "tsx scripts/dev-status.ts",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite --host 127.0.0.1",
    "build": "tsc -p tsconfig.server.json && vite build",
    "start": "node dist-server/server/index.js",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test:e2e": "playwright test",
    "test": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.400.0",
    // ... 其他依赖
  }
}
```

#### 1.10 修改 `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f6f6f6" />
    <title>Product AI OS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/client/main.tsx"></script>
  </body>
</html>
```

---

## Issue #2: TitleBar + Sidebar

### 目标
实现 Qoder 风格的顶部标题栏和左侧导航栏。

### 详细步骤

#### 2.1 创建 `client/components/TitleBar.tsx`

```typescript
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface TitleBarProps {
  workspaceName?: string;
  onSearch?: () => void;
  onNotifications?: () => void;
  onUserMenu?: () => void;
}

export function TitleBar({ workspaceName, onSearch, onNotifications, onUserMenu }: TitleBarProps) {
  const { t } = useI18n();

  return (
    <header className="titlebar">
      <div className="titlebar-left">
        {/* macOS 交通灯（仅在桌面端显示） */}
        <div className="traffic-lights">
          <span className="traffic-light red" />
          <span className="traffic-light yellow" />
          <span className="traffic-light green" />
        </div>
        <button className="icon-btn" onClick={onSearch} aria-label={t("search")}>
          <Icon name="search" size={16} />
        </button>
      </div>

      <div className="titlebar-center">
        {workspaceName && <span className="workspace-name">{workspaceName}</span>}
      </div>

      <div className="titlebar-right">
        <button className="icon-btn" onClick={onNotifications} aria-label={t("notifications")}>
          <Icon name="bell" size={16} />
        </button>
        <button className="user-avatar" onClick={onUserMenu} aria-label={t("userMenu")}>
          <span className="avatar-text">L</span>
        </button>
      </div>
    </header>
  );
}
```

样式（添加到 `components.css`）：
```css
.titlebar {
  height: var(--titlebar-height);
  flex: 0 0 var(--titlebar-height);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 16px;
  z-index: var(--z-rail);
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.traffic-lights {
  display: flex;
  gap: 8px;
}

.traffic-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.traffic-light.red { background: #ff5f56; }
.traffic-light.yellow { background: #ffbd2e; }
.traffic-light.green { background: #27c93f; }

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  border: none;
  background: transparent;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.titlebar-center {
  flex: 1;
  text-align: center;
}

.workspace-name {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 500;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6b7280, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}

.avatar-text {
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 600;
}
```

#### 2.2 创建 `client/components/Sidebar.tsx`

```typescript
import { useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

export type AppView = "quest-home" | "chat" | "knowledge" | "marketplace" | "settings";

interface SidebarProps {
  sessions: Session[];
  workspaces: Workspace[];
  activeSessionId?: string;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onNewQuest: () => void;
  onSelectSession: (id: string) => void;
  onOpenSettings: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  sessions,
  workspaces,
  activeSessionId,
  currentView,
  onViewChange,
  onNewQuest,
  onSelectSession,
  onOpenSettings,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useI18n();
  const [menuSession, setMenuSession] = useState<string | null>(null);

  if (collapsed) {
    return (
      <button className="sidebar-toggle" onClick={onToggleCollapse} aria-label={t("expandSidebar")}>
        <Icon name="panel" size={18} />
      </button>
    );
  }

  return (
    <aside className="sidebar">
      {/* New Quest 按钮 */}
      <div className="sb-top">
        <button className="new-quest" onClick={onNewQuest}>
          <span className="l">
            <Icon name="lightning" size={16} />
            <span>New Quest</span>
          </span>
          <span className="k">⌘N</span>
        </button>
      </div>

      {/* Quests 分区 */}
      <div className="sb-scroll">
        <div className="section">
          <span className="t">Quests</span>
          <div className="icons">
            <button className="icw" aria-label={t("filter")}>
              <Icon name="filter" size={13} />
            </button>
            <button className="icw" aria-label={t("viewMode")}>
              <Icon name="list" size={13} />
            </button>
          </div>
        </div>

        {/* Workspace chips */}
        <div className="ws-chips">
          <span className="ws-label">Workspace:</span>
          {workspaces.slice(0, 3).map((ws) => (
            <button key={ws.id} className="chip">
              {ws.name}
            </button>
          ))}
        </div>

        {/* Quest 列表 */}
        <div className="q-list">
          {sessions.filter((s) => s.organizationStatus === "active").map((session) => (
            <div
              key={session.id}
              className={`q-item ${session.id === activeSessionId ? "active" : ""}`}
              onClick={() => {
                onSelectSession(session.id);
                onViewChange("chat");
              }}
            >
              <div className="txt">
                <span className="task-dot" />
                <span className="q-name">{session.name}</span>
              </div>
              <span className="time">{formatTime(session.updatedAt)}</span>
              <button
                className="more"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuSession(menuSession === session.id ? null : session.id);
                }}
              >
                <Icon name="more" size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Chats 分区 */}
        <div className="section">
          <span className="t">Chats</span>
        </div>
        {sessions.length === 0 ? (
          <div className="chats-empty">No Quest yet</div>
        ) : (
          <div className="chat-list">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className={`chat-item ${session.id === activeSessionId ? "active" : ""}`}
                onClick={() => {
                  onSelectSession(session.id);
                  onViewChange("chat");
                }}
              >
                <div className="chat-ava">{session.name.charAt(0).toUpperCase()}</div>
                <div className="chat-meta">
                  <div className="chat-top">
                    <span className="chat-name">{session.name}</span>
                    <span className="chat-time">{formatTime(session.updatedAt)}</span>
                  </div>
                  <span className="chat-last">Click to open session</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部链接 */}
      <div className="sb-bottom">
        <button
          className={`sb-link ${currentView === "quest-home" ? "active" : ""}`}
          onClick={() => onViewChange("quest-home")}
        >
          <span className="l">
            <Icon name="home" size={15} />
            <span>Better Loop</span>
          </span>
          <span className="tag">Help</span>
        </button>
        <button
          className={`sb-link ${currentView === "knowledge" ? "active" : ""}`}
          onClick={() => onViewChange("knowledge")}
        >
          <span className="l">
            <Icon name="book" size={15} />
            <span>Knowledge</span>
          </span>
        </button>
        <button
          className={`sb-link ${currentView === "marketplace" ? "active" : ""}`}
          onClick={() => onViewChange("marketplace")}
        >
          <span className="l">
            <Icon name="shopping" size={15} />
            <span>Marketplace</span>
          </span>
        </button>

        {/* 用户卡片 */}
        <div className="user-card">
          <div className="user-ava">L</div>
          <div className="user-info">
            <span className="user-name">liquid727</span>
            <span className="user-badge">Pro</span>
          </div>
          <button className="icon-btn" onClick={onOpenSettings}>
            <Icon name="settings" size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function formatTime(date: string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
```

样式（添加到 `components.css`，参考 `qoder-sidebar-detail.md`）：
```css
.sidebar {
  width: var(--sidebar-width);
  flex: 0 0 var(--sidebar-width);
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.sb-top {
  padding: 14px 14px 10px;
}

.new-quest {
  height: 38px;
  border-radius: var(--radius-lg);
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease, transform 0.08s ease;
  border: none;
  width: 100%;
}

.new-quest:hover {
  background: #e9e9e9;
}

.new-quest:active {
  transform: scale(0.985);
}

.new-quest .l {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
  font-size: var(--text-base);
  color: var(--text);
}

.new-quest .k {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
}

.sb-scroll {
  flex: 1;
  overflow: auto;
  padding: 0 8px;
}

.section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 8px 6px;
}

.section .t {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* ... 更多样式参考 qoder-sidebar-detail.md 和 qoder-quest-replica.html ... */
```

#### 2.3 迁移 `SessionNavigator.tsx`

保留 `SessionNavigator.tsx` 的核心逻辑（drag-and-drop、session 操作），但将其作为 `Sidebar` 的子组件或内联逻辑。

---

## Issue #3: MainArea (QuestHome + ChatView)

### 目标
实现中间主内容区的 Quest Home 视图和 Chat 视图。

### 详细步骤

#### 3.1 创建 `client/components/QuestHome.tsx`

```typescript
import { useState } from "react";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";

interface QuestHomeProps {
  workspaces: Array<{ id: string; name: string; path: string }>;
  onSendPrompt: (prompt: string) => void;
}

const RECOMMENDED_TASKS = [
  "Develop an online survey system",
  "Raise test coverage of the current project to 80%",
  "Research mainstream vector databases and produce a selection report",
];

export function QuestHome({ workspaces, onSendPrompt }: QuestHomeProps) {
  const { t } = useI18n();
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]?.id);
  const [environment] = useState("Local");
  const [branch] = useState("main");

  return (
    <div className="quest-home">
      {/* 页面标题 */}
      <h1 className="quest-title">Quest on, hands off</h1>

      {/* Start in 选择器 */}
      <div className="start-in-row">
        <span className="start-in-label">Start in</span>
        <div className="start-in-chips">
          <button className="start-chip">
            <Icon name="folder" size={14} />
            <span>{workspaces.find((w) => w.id === selectedWorkspace)?.name || "Select"}</span>
            <Icon name="chevron" size={12} />
          </button>
          <button className="start-chip">
            <Icon name="check" size={14} />
            <span>{environment}</span>
            <Icon name="chevron" size={12} />
          </button>
          <button className="start-chip">
            <Icon name="git" size={14} />
            <span>{branch}</span>
            <Icon name="chevron" size={12} />
          </button>
        </div>
      </div>

      {/* 推荐任务卡片 */}
      <div className="recommended-tasks">
        {RECOMMENDED_TASKS.map((task) => (
          <button key={task} className="task-card" onClick={() => onSendPrompt(task)}>
            {task}
          </button>
        ))}
      </div>

      {/* Security Banner */}
      <div className="security-banner">
        <div className="security-icon">
          <Icon name="check" size={20} />
        </div>
        <div className="security-content">
          <h3>Security, from the first line of code</h3>
          <p>
            Qoder embeds security into your dev workflow — three-tier progressive scanning and
            one-click fixes, keeping every line secure before commit.
          </p>
        </div>
        <div className="security-actions">
          <button className="secondary-button">Learn More</button>
          <button className="primary-button">Go to Settings</button>
        </div>
      </div>
    </div>
  );
}
```

#### 3.2 创建 `client/components/ChatView.tsx`

```typescript
import { useEffect, useRef } from "react";
import type { Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { TranscriptPanel } from "./TranscriptPanel";

interface ChatViewProps {
  session: Session;
  workspace?: Workspace;
}

export function ChatView({ session, workspace }: ChatViewProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session.id]);

  return (
    <div className="chat-view">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-header-info">
          <Icon name="folder" size={14} />
          <span className="chat-title">{session.name}</span>
        </div>
        <div className="chat-header-meta">
          <Icon name="git" size={12} />
          <span>{workspace?.name || "main"} · Local</span>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        <TranscriptPanel sessionId={session.id} />
      </div>
    </div>
  );
}
```

#### 3.3 创建 `client/components/MainArea.tsx`

```typescript
import type { AppView } from "./Sidebar";
import type { Session, Workspace } from "../../shared/types";
import { QuestHome } from "./QuestHome";
import { ChatView } from "./ChatView";
import { KnowledgeView } from "./KnowledgeView";
import { MarketplaceView } from "./MarketplaceView";
import { SettingsView } from "./SettingsView";

interface MainAreaProps {
  currentView: AppView;
  activeSession?: Session;
  activeWorkspace?: Workspace;
  workspaces: Workspace[];
  onSendPrompt: (prompt: string) => void;
}

export function MainArea({
  currentView,
  activeSession,
  activeWorkspace,
  workspaces,
  onSendPrompt,
}: MainAreaProps) {
  switch (currentView) {
    case "quest-home":
      return <QuestHome workspaces={workspaces} onSendPrompt={onSendPrompt} />;
    case "chat":
      return activeSession ? (
        <ChatView session={activeSession} workspace={activeWorkspace} />
      ) : (
        <QuestHome workspaces={workspaces} onSendPrompt={onSendPrompt} />
      );
    case "knowledge":
      return <KnowledgeView />;
    case "marketplace":
      return <MarketplaceView />;
    case "settings":
      return <SettingsView />;
    default:
      return <QuestHome workspaces={workspaces} onSendPrompt={onSendPrompt} />;
  }
}
```

---

## Issue #4: RightPanel

### 目标
实现右侧信息面板，包含 Summary/Terminal/Files/Spec/Review 五 Tab。

### 详细步骤

#### 4.1 创建 `client/components/RightPanel.tsx`

```typescript
import { useState } from "react";
import type { Session, Workspace } from "../../shared/types";
import { useI18n } from "../i18n";
import { Icon } from "./ui/Icon";
import { TerminalView } from "../terminal";

export type RightPanelTab = "summary" | "terminal" | "files" | "spec" | "review";

interface RightPanelProps {
  session?: Session;
  workspace?: Workspace;
  activeTab?: RightPanelTab;
  onTabChange?: (tab: RightPanelTab) => void;
  onClose?: () => void;
}

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "terminal", label: "Terminal" },
  { id: "files", label: "Files" },
  { id: "spec", label: "Spec" },
  { id: "review", label: "Review" },
];

export function RightPanel({ session, workspace, activeTab = "summary", onTabChange, onClose }: RightPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<RightPanelTab>(activeTab);

  const currentTab = onTabChange ? activeTab : tab;

  return (
    <aside className="right-panel">
      {/* Tab 栏 */}
      <div className="rp-tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`rp-tab ${currentTab === id ? "active" : ""}`}
            onClick={() => {
              setTab(id);
              onTabChange?.(id);
            }}
          >
            {label}
          </button>
        ))}
        <button className="rp-close" onClick={onClose} aria-label={t("closePanel")}>
          <Icon name="close" size={14} />
        </button>
      </div>

      {/* 内容区 */}
      <div className="rp-content">
        {currentTab === "summary" && <SummaryTab />}
        {currentTab === "terminal" && session && (
          <TerminalTab sessionId={session.id} />
        )}
        {currentTab === "files" && <FilesTab workspace={workspace} />}
        {currentTab === "spec" && <SpecTab />}
        {currentTab === "review" && <ReviewTab />}
      </div>
    </aside>
  );
}

function SummaryTab() {
  return (
    <div className="summary-tab">
      <div className="summary-section">
        <h4>Progress</h4>
        <p className="empty-text">Progress will appear here when tasks/todos generated</p>
      </div>
      <div className="summary-section">
        <h4>Artifacts</h4>
        <p className="empty-text">No Artifacts yet</p>
      </div>
      <div className="summary-section">
        <h4>References</h4>
        <p className="empty-text">No references yet</p>
      </div>
    </div>
  );
}

function TerminalTab({ sessionId }: { sessionId: string }) {
  return (
    <div className="terminal-tab">
      <div className="terminal-sidebar">
        <div className="terminal-head">
          <span>1 Terminal</span>
          <button className="icon-btn">
            <Icon name="add" size={14} />
          </button>
        </div>
      </div>
      <div className="terminal-main">
        <TerminalView sessionId={sessionId} />
      </div>
    </div>
  );
}

function FilesTab({ workspace }: { workspace?: Workspace }) {
  return (
    <div className="files-tab">
      <p className="empty-text">No files modified yet</p>
    </div>
  );
}

function SpecTab() {
  return (
    <div className="spec-tab">
      <p className="empty-text">No spec generated yet</p>
    </div>
  );
}

function ReviewTab() {
  return (
    <div className="review-tab">
      <p className="empty-text">No review pending</p>
    </div>
  );
}
```

样式（参考 `qoder-right-panel-detail.md`）：
```css
.right-panel {
  width: var(--inspector-width);
  flex: 0 0 var(--inspector-width);
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rp-tabs {
  height: 44px;
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.rp-tab {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-base);
  cursor: pointer;
  transition: color 0.12s ease;
  border: none;
  background: transparent;
  white-space: nowrap;
}

.rp-tab:hover {
  color: var(--text);
}

.rp-tab.active {
  color: var(--text);
  font-weight: 600;
  border-bottom: 2px solid var(--accent);
  border-radius: 0;
  margin-bottom: -1px;
}

.rp-close {
  margin-left: auto;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
}

.rp-close:hover {
  background: var(--bg-hover);
}

.rp-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.summary-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-section h4 {
  font-size: var(--text-md);
  font-weight: 600;
  margin: 0 0 8px;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: var(--text-base);
}
```

---

## Issue #5: Theme System Upgrade

### 目标
添加 Qoder Light Theme 为默认主题，清理硬编码值。

### 详细步骤

#### 5.1 修改 `client/theme.tsx`

```typescript
export type ThemeId = "classic" | "neo" | "qoder-light";

export const themeDefinitions = [
  { id: "qoder-light", labelKey: "themeQoderLight", colorScheme: "light", rootClassName: "theme-qoder-light" },
  { id: "neo", labelKey: "themeNeo", colorScheme: "light", rootClassName: "theme-neo" },
  { id: "classic", labelKey: "themeClassic", colorScheme: "dark", rootClassName: "theme-classic" }
] as const satisfies readonly ThemeDefinition[];

export function normalizeTheme(value: unknown): ThemeId {
  return value === "classic" || value === "neo" || value === "qoder-light" ? value : "qoder-light";
}
```

#### 5.2 清理 `client/styles/components.css`

将所有硬编码颜色替换为 CSS 变量：
- `#111827` → `var(--border)` 或 `var(--text)`
- `#5d3338` → `var(--danger-muted)`
- `#604f31` → `var(--warning-muted)`
- `#315343` → `var(--success-muted)`
- `#3b4d5d` → `var(--info-muted)`
- `#713b41` → `var(--danger-border)`
- `#e8b2b6` → `var(--danger-text)`
- `#e99a7f` → `var(--focus)`

#### 5.3 统一圆角

将所有硬编码圆角替换为变量：
- `border-radius: 6px` → `border-radius: var(--radius-sm)`
- `border-radius: 7px` → `border-radius: var(--radius-md)`
- `border-radius: 8px` → `border-radius: var(--radius-md)`
- `border-radius: 9px` → `border-radius: var(--radius-lg)`
- `border-radius: 10px` → `border-radius: var(--radius-lg)`
- `border-radius: 13px` → `border-radius: var(--radius-xl)`
- `border-radius: 14px` → `border-radius: var(--radius-xl)`
- `border-radius: 99px` → `border-radius: var(--radius-full)`

---

## Issue #6: PromptComposer Enhancement

### 目标
重写 PromptComposer，添加 Qoder 风格输入栏功能。

### 详细步骤

#### 6.1 修改 `client/components/PromptComposer.tsx`

```typescript
import { useState, type KeyboardEvent } from "react";
import type { CliProfileCapabilities, SessionLaunchConfig } from "../../shared/types";
import { toFeedbackError } from "../feedback-errors";
import { useI18n } from "../i18n";
import { useFeedback } from "./ui/Feedback";
import { Icon } from "./ui/Icon";

interface PromptComposerProps {
  disabled: boolean;
  onSend: (content: string, clientMessageId: string) => Promise<void>;
  capabilities?: CliProfileCapabilities;
  launchConfig?: SessionLaunchConfig;
  onLaunchConfigChange?: (change: Partial<SessionLaunchConfig>) => void;
}

export function PromptComposer({ disabled, onSend, capabilities, launchConfig, onLaunchConfigChange }: PromptComposerProps) {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [specEnabled, setSpecEnabled] = useState(true);
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const trimmed = content.trim();
  const tooLarge = new TextEncoder().encode(content).length > 65_536;
  const canSend = Boolean(trimmed) && !disabled && !sending && !tooLarge;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(content, crypto.randomUUID());
      setContent("");
      feedback.success({ title: t("messageSent") });
    } catch (cause) {
      feedback.error(toFeedbackError(cause, t, "composerFailed", "composer-send"));
    } finally {
      setSending(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "@") {
      setShowMention(true);
      setShowCommands(false);
    } else if (event.key === "/" && content === "") {
      setShowCommands(true);
      setShowMention(false);
    } else if (event.key === "Escape") {
      setShowMention(false);
      setShowCommands(false);
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="composer-wrapper">
      {/* Spec/Goal 开关 */}
      <div className="mode-toggles">
        <button
          className={`mode-toggle ${specEnabled ? "active" : ""}`}
          onClick={() => setSpecEnabled(!specEnabled)}
        >
          <Icon name="list" size={16} />
          <span>Spec</span>
          <span className={`toggle-switch ${specEnabled ? "on" : ""}`} />
        </button>
        <button
          className={`mode-toggle ${goalEnabled ? "active" : ""}`}
          onClick={() => setGoalEnabled(!goalEnabled)}
        >
          <Icon name="target" size={16} />
          <span>Goal</span>
          <span className={`toggle-switch ${goalEnabled ? "on" : ""}`} />
        </button>
      </div>

      {/* 输入框 */}
      <div className="composer-input-wrapper">
        <textarea
          className="composer-textarea"
          aria-label={t("prompt")}
          placeholder="Plan, @ for context, / for commands"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={keyDown}
          disabled={disabled || sending}
          rows={1}
        />

        {/* @ 浮层 */}
        {showMention && (
          <div className="mention-popup">
            <div className="mention-item">
              <Icon name="file" size={14} /> @file
            </div>
            <div className="mention-item">
              <Icon name="folder" size={14} /> @folder
            </div>
            <div className="mention-item">
              <Icon name="git" size={14} /> @gitCommit
            </div>
          </div>
        )}

        {/* / 命令面板 */}
        {showCommands && (
          <div className="command-popup">
            <div className="command-item">/learn — Learn current project</div>
            <div className="command-item">/chart — Draw flow chart</div>
            <div className="command-item">/test — Run tests</div>
            <div className="command-item">/commit — Generate commit message</div>
            <div className="command-item">/doc — Generate documentation</div>
          </div>
        )}
      </div>

      {/* 底部工具行 */}
      <div className="composer-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn">
            <Icon name="add" size={14} />
            <span>Agent</span>
          </button>
          <button className="toolbar-btn">
            <span>Qwen3.8-Max</span>
            <Icon name="chevron" size={12} />
          </button>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-icon-btn" title="Compress context">
            <Icon name="compress" size={16} />
          </button>
          <button className="toolbar-icon-btn" title="Polish">
            <Icon name="sparkles" size={16} />
          </button>
          <button className="toolbar-icon-btn" title="Voice input">
            <Icon name="mic" size={16} />
          </button>
          <button
            className="send-btn"
            onClick={submit}
            disabled={!canSend}
            aria-label={t("sendPrompt")}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

样式（参考 `qoder-input-detail.md`）：
```css
.composer-wrapper {
  margin: 0 12px 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--bg-panel);
  box-shadow: var(--shadow-md);
}

.mode-toggles {
  display: flex;
  gap: 14px;
  margin-bottom: 8px;
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.mode-toggle.active {
  color: var(--text);
}

.toggle-switch {
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: var(--border);
  position: relative;
  transition: background 0.2s ease;
}

.toggle-switch.on {
  background: var(--accent);
}

.toggle-switch::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-switch.on::after {
  transform: translateX(16px);
}

.composer-input-wrapper {
  position: relative;
}

.composer-textarea {
  width: 100%;
  min-height: 52px;
  max-height: 200px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-page);
  color: var(--text);
  font-size: 15px;
  line-height: 22px;
  resize: vertical;
  outline: none;
  font-family: var(--font-sans);
}

.composer-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.composer-textarea::placeholder {
  color: var(--text-tertiary);
}

/* Mention popup */
.mention-popup,
.command-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 6px;
  min-width: 200px;
  z-index: var(--z-menu);
}

.mention-item,
.command-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-base);
}

.mention-item:hover,
.command-item:hover {
  background: var(--bg-hover);
}

/* Toolbar */
.composer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
}

.toolbar-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.toolbar-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: var(--accent-contrast);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease, transform 0.08s ease;
}

.send-btn:hover {
  background: var(--accent-hover);
}

.send-btn:active {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

---

## Issue #7: View Router

### 目标
实现应用内的视图路由。

### 详细步骤

#### 7.1 修改 `client/app/preferences.ts`

```typescript
export type AppView = "quest-home" | "chat" | "knowledge" | "marketplace" | "settings";
export type RightPanelTab = "summary" | "terminal" | "files" | "spec" | "review";

export interface UiPreferencesV1 {
  version: 1;
  navigatorOpen: boolean;
  inspectorOpen: boolean;
  sessionGrouping: SessionGrouping;
  sessionFilter: SessionFilter;
  inspectorTab: InspectorPreferenceTab;
  centerViewBySession: Record<string, CenterView>;
  currentView: AppView;              // NEW
  rightPanelTab: RightPanelTab;      // NEW
  sidebarCollapsed: boolean;        // NEW
  rightPanelCollapsed: boolean;     // NEW
}

export const defaultPreferences: UiPreferencesV1 = {
  version: 1,
  navigatorOpen: true,
  inspectorOpen: false,
  sessionGrouping: "project",
  sessionFilter: "active",
  inspectorTab: "details",
  centerViewBySession: {},
  currentView: "quest-home",         // NEW
  rightPanelTab: "summary",          // NEW
  sidebarCollapsed: false,           // NEW
  rightPanelCollapsed: false,        // NEW
};
```

#### 7.2 修改 `client/app/App.tsx`

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CliProfile, WorkspaceV2 } from "../../shared/types";
import { api, type ClientAppState, mergeState } from "../api";
import { useI18n, type TranslationKey } from "../i18n";
import { toFeedbackError } from "../feedback-errors";
import { ActionDialog } from "../components/ActionDialog";
import { NewSessionDialog } from "../components/NewSessionDialog";
import { TitleBar } from "../components/TitleBar";
import { Sidebar, type AppView } from "../components/Sidebar";
import { MainArea } from "../components/MainArea";
import { RightPanel, type RightPanelTab } from "../components/RightPanel";
import { WorkspaceProfileManager } from "../components/WorkspaceProfileManager";
import { PromptComposer } from "../components/PromptComposer";
import { Icon } from "../components/ui/Icon";
import { useFeedback } from "../components/ui/Feedback";
import { readPreferences, writePreferences, type UiPreferencesV1 } from "./preferences";
import { groupSessions } from "./session-selectors";

const emptyState: ClientAppState = { workspaces: [], profiles: [], sessions: [] };

export function App() {
  const { t } = useI18n();
  const feedback = useFeedback();
  const [state, setState] = useState<ClientAppState>(emptyState);
  const [readonly, setReadonly] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preferences, setPreferences] = useState<UiPreferencesV1>(() => readPreferences());
  const [overlay, setOverlay] = useState<string | undefined>();
  const [pendingDelete, setPendingDelete] = useState<{ type: string; item: any } | undefined>();

  // ... 保留现有的 refresh、updatePreferences 等逻辑 ...

  const activeSession = state.sessions.find((s) => s.id === activeSessionId);
  const activeWorkspace = state.workspaces.find((w) => w.id === activeSession?.workspaceId);
  const activeProfile = state.profiles.find((p) => p.id === activeSession?.profileId);

  // 视图切换
  const handleViewChange = useCallback((view: AppView) => {
    setPreferences((prev) => ({ ...prev, currentView: view }));
  }, []);

  // 右侧面板 Tab 切换
  const handleRightPanelTabChange = useCallback((tab: RightPanelTab) => {
    setPreferences((prev) => ({ ...prev, rightPanelTab: tab }));
  }, []);

  // 发送消息
  const handleSendPrompt = useCallback(async (content: string) => {
    if (!activeSession) return;
    await api.sendMessage(activeSession.id, {
      clientMessageId: crypto.randomUUID(),
      content,
      startIfStopped: true,
      confirmedStart: true,
    });
  }, [activeSession]);

  // 判断右侧面板是否显示
  const showRightPanel = preferences.currentView === "quest-home" || preferences.currentView === "chat";

  if (loading) {
    return (
      <main className="center-state">
        <span className="brand-orbit" aria-hidden="true">✦</span>
        {t("loadingWorkspace")}
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="center-state">
        <Icon name="warning" />
        <strong>{t("failedToLoadWorkspace")}</strong>
        <button className="secondary-button" onClick={() => { setLoading(true); void refresh(true); }}>
          <Icon name="refresh" />{t("retry")}
        </button>
      </main>
    );
  }

  return (
    <div className="app-root">
      <TitleBar workspaceName={activeWorkspace?.name} />

      <div className={`app-body ${preferences.navigatorOpen ? "sidebar-open" : ""} ${showRightPanel && preferences.inspectorOpen ? "right-panel-open" : ""}`}>
        <Sidebar
          sessions={state.sessions}
          workspaces={state.workspaces}
          activeSessionId={activeSessionId}
          currentView={preferences.currentView}
          onViewChange={handleViewChange}
          onNewQuest={() => setOverlay("new-session")}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            handleViewChange("chat");
          }}
          onOpenSettings={() => setOverlay("settings")}
          collapsed={!preferences.navigatorOpen}
          onToggleCollapse={() => setPreferences((prev) => ({ ...prev, navigatorOpen: !prev.navigatorOpen }))}
        />

        <div className="main-area">
          <MainArea
            currentView={preferences.currentView}
            activeSession={activeSession}
            activeWorkspace={activeWorkspace}
            workspaces={state.workspaces}
            onSendPrompt={handleSendPrompt}
          />

          {/* PromptComposer 在 quest-home 和 chat 视图下显示 */}
          {(preferences.currentView === "quest-home" || preferences.currentView === "chat") && (
            <PromptComposer
              key={activeSession?.id || "home"}
              disabled={readonly || (activeSession?.organizationStatus !== "active" && !!activeSession)}
              onSend={handleSendPrompt}
            />
          )}
        </div>

        {showRightPanel && preferences.inspectorOpen && (
          <RightPanel
            session={activeSession}
            workspace={activeWorkspace}
            activeTab={preferences.rightPanelTab}
            onTabChange={handleRightPanelTabChange}
            onClose={() => setPreferences((prev) => ({ ...prev, inspectorOpen: false }))}
          />
        )}
      </div>

      {/* Overlays */}
      {overlay === "new-session" && (
        <NewSessionDialog
          workspaces={state.workspaces}
          profiles={state.profiles}
          readonly={readonly}
          onClose={() => setOverlay(undefined)}
          onCreate={createSession}
          onOpenSettings={() => setOverlay("settings")}
        />
      )}
      {/* ... 其他 overlay ... */}
    </div>
  );
}
```

#### 7.3 更新 `client/styles/components.css` 中的布局

```css
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--bg-page);
}

.app-body.sidebar-open .sidebar {
  width: var(--sidebar-width);
}

.app-body.right-panel-open .right-panel {
  width: var(--inspector-width);
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
```

---

## Issue #8: Knowledge / Marketplace / Settings 页面

### 目标
实现三个页面的空壳结构。

### 详细步骤

#### 8.1 创建 `client/components/KnowledgeView.tsx`

```typescript
import { useState } from "react";
import { Icon } from "./ui/Icon";

type KnowledgeTab = "repo-wiki" | "knowledge-card" | "memory";

export function KnowledgeView() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("repo-wiki");

  return (
    <div className="knowledge-view">
      <div className="kw-tabs">
        <button className={`kw-tab ${activeTab === "repo-wiki" ? "active" : ""}`} onClick={() => setActiveTab("repo-wiki")}>
          Repo Wiki
        </button>
        <button className={`kw-tab ${activeTab === "knowledge-card" ? "active" : ""}`} onClick={() => setActiveTab("knowledge-card")}>
          Knowledge Card
        </button>
        <button className={`kw-tab ${activeTab === "memory" ? "active" : ""}`} onClick={() => setActiveTab("memory")}>
          Memory
        </button>
      </div>
      <div className="kw-body">
        <div className="kw-tree">
          <div className="kw-search">
            <Icon name="search" size={14} />
            <input type="text" placeholder="Search wiki..." />
          </div>
          <div className="kw-treescroll">
            <div className="kw-node">README.md</div>
            <div className="kw-node">src/</div>
            <div className="kw-node">docs/</div>
          </div>
        </div>
        <div className="kw-detail">
          <div className="kw-top">
            <h3>README.md</h3>
            <span className="branch">main · Local</span>
          </div>
          <div className="kw-content">
            <p>Select a file to view its wiki content.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 8.2 创建 `client/components/MarketplaceView.tsx`

```typescript
import { useState } from "react";
import { Icon } from "./ui/Icon";

const CATEGORIES = [
  { id: "featured", label: "Featured", count: 0 },
  { id: "coding", label: "Coding", count: 12 },
  { id: "database", label: "DataBase", count: 5 },
  { id: "debug", label: "Debug & Testing", count: 8 },
  { id: "devtools", label: "Developer Tools", count: 15 },
  { id: "devops", label: "DevOps", count: 6 },
  { id: "design", label: "Product Design", count: 4 },
  { id: "workflow", label: "Workflow", count: 9 },
];

const PLUGINS = [
  { id: "1", name: "Docker Deploy", desc: "One-click Docker deployment for your projects", author: "qoder", downloads: "2.3k", icon: "🐳" },
  { id: "2", name: "API Tester", desc: "Test REST APIs with custom headers and payloads", author: "dev1", downloads: "1.1k", icon: "🧪" },
];

export function MarketplaceView() {
  const [activeCategory, setActiveCategory] = useState("featured");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="marketplace-view">
      <div className="mp-head">
        <div>
          <h1 className="mp-title">Marketplace</h1>
          <p className="mp-subtitle">Discover and install plugins to enhance your workflow</p>
        </div>
        <div className="mp-search">
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="mp-body">
        <div className="mp-cats">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`mp-cat ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && <span className="cb">{cat.count}</span>}
            </button>
          ))}
        </div>
        <div className="mp-content">
          <h2 className="mp-section">Featured</h2>
          <div className="mp-grid">
            {PLUGINS.map((plugin) => (
              <div key={plugin.id} className="mp-card">
                <div className="mp-ic">{plugin.icon}</div>
                <div className="body">
                  <div className="name">{plugin.name}</div>
                  <div className="desc">{plugin.desc}</div>
                  <div className="meta">
                    <span className="ava">{plugin.author.charAt(0)}</span>
                    <span>{plugin.author}</span>
                    <span>·</span>
                    <span>{plugin.downloads} downloads</span>
                  </div>
                </div>
                <div className="act">
                  <button className="mp-install">Install</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 8.3 创建 `client/components/SettingsView.tsx`

```typescript
import { useState } from "react";
import { useTheme } from "../theme";
import { Icon } from "./ui/Icon";

type SettingsTab = "account" | "models" | "mcp" | "security";

export function SettingsView() {
  const { theme, setTheme, themes } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  return (
    <div className="settings-view">
      <div className="sv-sidebar">
        <button className={`sv-tab ${activeTab === "account" ? "active" : ""}`} onClick={() => setActiveTab("account")}>
          <Icon name="user" size={16} />
          Account
        </button>
        <button className={`sv-tab ${activeTab === "models" ? "active" : ""}`} onClick={() => setActiveTab("models")}>
          <Icon name="sparkles" size={16} />
          Models
        </button>
        <button className={`sv-tab ${activeTab === "mcp" ? "active" : ""}`} onClick={() => setActiveTab("mcp")}>
          <Icon name="terminal" size={16} />
          MCP & Skills
        </button>
        <button className={`sv-tab ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
          <Icon name="check" size={16} />
          Security
        </button>
      </div>
      <div className="sv-content">
        {activeTab === "account" && (
          <div>
            <h2>Account</h2>
            <div className="sv-section">
              <h3>Theme</h3>
              <div className="theme-list">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-option ${theme === t.id ? "active" : ""}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span>{t.labelKey}</span>
                    <small>{t.colorScheme}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="sv-section">
              <h3>Credits</h3>
              <p>Available: 1,234 credits</p>
              <p>Used this month: 567</p>
            </div>
          </div>
        )}
        {/* ... 其他 tabs ... */}
      </div>
    </div>
  );
}
```

---

## Issue #9: Tauri Desktop Integration

### 目标
完成 Tauri 桌面端的配置和集成。

### 详细步骤

#### 9.1 配置 `src-tauri/tauri.conf.json`

已在上面的 Issue #1 中完成基础配置。

#### 9.2 创建 `src-tauri/src/main.rs`

```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_decorations(false).unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 注册前端可调用的命令
            greet,
            open_folder,
            read_file,
            write_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
async fn open_folder() -> Result<String, String> {
    // 使用 rfd 或 tauri 的 dialog API
    Ok("/path/to/folder".to_string())
}

#[tauri::command]
async fn read_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: &str, content: &str) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}
```

#### 9.3 创建 `client/lib/platform.ts`

```typescript
export interface PlatformAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  openFolder(): Promise<string | null>;
  copyToClipboard(text: string): Promise<void>;
  isDesktop(): boolean;
}

// Web 实现
export const webAdapter: PlatformAdapter = {
  async readFile(path: string): Promise<string> {
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error("Failed to read file");
    return response.text();
  },
  async writeFile(path: string, content: string): Promise<void> {
    const response = await fetch(`/api/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) throw new Error("Failed to write file");
  },
  async openFolder(): Promise<string | null> {
    // Web 端不支持，返回 null
    return null;
  },
  async copyToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
  },
  isDesktop: () => false,
};

// Tauri 实现
export const tauriAdapter: PlatformAdapter = {
  async readFile(path: string): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("read_file", { path });
  },
  async writeFile(path: string, content: string): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("write_file", { path, content });
  },
  async openFolder(): Promise<string | null> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("open_folder");
  },
  async copyToClipboard(text: string): Promise<void> {
    const { writeText } = await import("@tauri-apps/api/clipboard");
    await writeText(text);
  },
  isDesktop: () => true,
};

// 自动检测平台
export function getPlatformAdapter(): PlatformAdapter {
  if (typeof window !== "undefined" && "__TAURI__" in window) {
    return tauriAdapter;
  }
  return webAdapter;
}
```

---

## Issue #10: Multi-platform Validation

### 目标
完成多端适配、响应式优化、测试验证。

### 详细步骤

#### 10.1 响应式样式

更新 `client/styles/responsive.css`：

```css
/* 平板：折叠右侧面板 */
@media (max-width: 1279px) {
  .app-body.right-panel-open .right-panel {
    position: fixed;
    z-index: var(--z-drawer);
    top: var(--titlebar-height);
    right: 0;
    bottom: 0;
    width: min(var(--inspector-width), 92vw);
    box-shadow: -24px 0 70px rgba(0, 0, 0, 0.42);
    animation: drawer-in-right 0.18s ease-out;
  }
}

/* 手机：折叠侧边栏和右侧面板 */
@media (max-width: 899px) {
  .app-body .sidebar {
    position: fixed;
    z-index: var(--z-drawer);
    top: var(--titlebar-height);
    left: 0;
    bottom: 0;
    width: min(var(--sidebar-width), 92vw);
    box-shadow: 24px 0 70px rgba(0, 0, 0, 0.28);
    animation: drawer-in-left 0.18s ease-out;
  }

  .app-body:not(.sidebar-open) .sidebar {
    transform: translateX(-100%);
  }

  .titlebar {
    padding-left: 16px;
  }
}

/* 小屏手机 */
@media (max-width: 639px) {
  .quest-title {
    font-size: 22px;
  }

  .start-in-chips {
    flex-direction: column;
  }

  .recommended-tasks {
    flex-direction: column;
  }

  .composer-wrapper {
    margin: 0 8px 8px;
    padding: 8px;
  }

  .composer-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }
}
```

#### 10.2 Playwright E2E 测试

创建 `e2e/ui-theme.spec.ts`：

```typescript
import { test, expect } from "@playwright/test";

test.describe("UI Theme", () => {
  test("default theme is qoder-light", async ({ page }) => {
    await page.goto("http://localhost:3000");
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("qoder-light");
  });

  test("theme switch works", async ({ page }) => {
    await page.goto("http://localhost:3000");
    // 打开设置
    await page.click('[aria-label="Open settings"]');
    // 切换主题
    await page.click('text=classic');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("classic");
  });
});

test.describe("View Routing", () => {
  test("can navigate between views", async ({ page }) => {
    await page.goto("http://localhost:3000");
    // 点击 Knowledge
    await page.click("text=Knowledge");
    await expect(page.locator("text=Repo Wiki")).toBeVisible();
    // 点击 Marketplace
    await page.click("text=Marketplace");
    await expect(page.locator("text=Discover and install")).toBeVisible();
  });
});

test.describe("Responsive", () => {
  test("mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:3000");
    // 侧边栏应该隐藏
    await expect(page.locator(".sidebar")).not.toBeVisible();
  });
});
```

---

## 执行顺序建议

```
Phase 1 (并行):
├── Issue #1: Design Token + Infrastructure
│   └── 完成后可并行:
│       ├── Issue #2: TitleBar + Sidebar
│       ├── Issue #3: MainArea (QuestHome + ChatView)
│       └── Issue #4: RightPanel
│
Phase 2:
├── Issue #5: Theme System Upgrade
│   └── 依赖: #1
│
Phase 3 (并行):
├── Issue #6: PromptComposer Enhancement
│   └── 依赖: #1, #3
├── Issue #7: View Router
│   └── 依赖: #2, #3, #4
│
Phase 4:
├── Issue #8: Knowledge/Marketplace/Settings
│   └── 依赖: #7
│
Phase 5:
├── Issue #9: Tauri Desktop
│   └── 依赖: #1-#8
│
Phase 6:
├── Issue #10: Multi-platform Validation
│   └── 依赖: #1-#9
```

---

## 关键注意事项

1. **向后兼容**: 保留 `neo` 和 `classic` 主题，用户可随时切换回旧主题
2. **渐进式改造**: 不要一次性删除旧组件，先创建新组件，测试通过后再移除旧代码
3. **CSS 变量优先**: 所有新样式使用 CSS 变量，避免硬编码
4. **TypeScript 严格**: 所有新代码使用严格类型检查
5. **测试覆盖**: 每个 Issue 完成后运行 `npm test` 和 `npm run test:e2e`
6. **Git 提交**: 每个 Issue 单独提交，使用 conventional commits:
   - `feat(ui): add TitleBar component`
   - `feat(theme): add qoder-light theme`
   - `feat(desktop): initialize Tauri project`
