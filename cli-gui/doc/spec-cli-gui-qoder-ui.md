# SPEC: CLI-GUI Qoder 风格 UI 改造与基础功能实现

> Technical specification derived from: `cli-gui/doc/todo/qoder-replica-prd.md` + `cli-gui/doc/prd-cli-gui.md`
> Generated: 2026-07-22 | Target branch: feature-cli-gui

---

## 1. Summary

### 1.1 What This SPEC Covers

本 SPEC 定义将现有 cli-gui 项目从 neobrutalism 风格改造为 Qoder Light Theme 风格的技术方案，同时实现初版 UI Demo 所需的基础功能。改造范围包括：Design Token 系统、UI Shell 四区布局、主题系统升级、输入框增强、视图路由、以及 Tauri 桌面端集成准备。

### 1.2 PRD Reference

- **Primary PRD**: `cli-gui/doc/todo/qoder-replica-prd.md` — Qoder 1:1 复刻 PRD
- **Secondary PRD**: `cli-gui/doc/prd-cli-gui.md` — Product AI OS MVP01
- **Design References**:
  - `cli-gui/doc/todo/qoder-sidebar-detail.md`
  - `cli-gui/doc/todo/qoder-input-detail.md`
  - `cli-gui/doc/todo/qoder-chat-detail.md`
  - `cli-gui/doc/todo/qoder-right-panel-detail.md`
  - `cli-gui/doc/todo/qoder-knowledge-detail.md`
  - `cli-gui/doc/todo/qoder-marketplace-detail.md`
  - `cli-gui/doc/todo/qoder-quest-replica.html` (interactive prototype)
  - `cli-gui/doc/todo/workbuddy-ide.html` (dark theme reference)

### 1.3 Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 主题策略 | 先 Light 后 Dark | Qoder Light Theme 是主要参考，深色基于 workbuddy-ide.html 后续实现 |
| UI 组件库 | 继续使用自建组件 + 引入 Lucide Icons | 现有组件已满足需求，Lucide 提供统一图标；不引入 Radix/shadcn 避免重构成本 |
| 状态管理 | 保持现有 React Context + useState | 当前状态简单，无需引入 Zustand/Redux；后续复杂度增长时再评估 |
| Tauri 优先级 | 先 Web 后 Tauri | 降低并行风险，Web 端稳定后再集成桌面壳 |
| 样式方案 | CSS 变量 + Tailwind 混合 | 现有方案已工作，逐步增强而非替换 |
| 多端策略 | Web 优先，Tauri 次之，App 未来 | 符合 PRD 推荐顺序，降低初期复杂度 |

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────┐
│  User Layer                                                 │
│  ├── Web Browser (localhost:3000)                          │
│  └── Tauri Desktop App (future)                             │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Vite 6 + TypeScript 5.6)             │
│  ├── UI Shell (TitleBar + Sidebar + MainArea + RightPanel) │
│  ├── Theme System (neo / classic / qoder-light)           │
│  ├── Components (SessionNavigator, SessionWorkspace, etc.)   │
│  └── API Client (REST + WebSocket)                         │
─────────────────────────────────────────────────────────────┤
│  Backend (Node/TS)                                          │
│  ├── HTTP Server (API routes)                              │
│  ├── WebSocket Server (real-time updates)                  │
│  ├── PTY Manager (node-pty)                                │
│  └── State Persistence (local JSON)                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Design

#### New Components

| Component | Responsibility | File |
|-----------|---------------|------|
| `TitleBar` | 顶部标题栏（交通灯、搜索、通知、用户） | `client/components/TitleBar.tsx` |
| `Sidebar` | 左侧导航（New Quest、Quests、Chats、底部链接、用户卡） | `client/components/Sidebar.tsx` |
| `QuestHome` | Quest Home 视图（标题、Start in、输入框、推荐任务、Security Banner） | `client/components/QuestHome.tsx` |
| `ChatView` | Chat 视图（消息气泡、消息列表） | `client/components/ChatView.tsx` |
| `RightPanel` | 右侧信息面板（Summary/Terminal/Files/Spec/Review） | `client/components/RightPanel.tsx` |
| `ContextMention` | @ 触发上下文选择浮层 | `client/components/ContextMention.tsx` |
| `CommandPalette` | / 触发命令面板 | `client/components/CommandPalette.tsx` |
| `KnowledgeView` | Knowledge 页面（Repo Wiki / Knowledge Card / Memory） | `client/components/KnowledgeView.tsx` |
| `MarketplaceView` | Marketplace 页面（分类导航、插件卡片） | `client/components/MarketplaceView.tsx` |
| `SettingsView` | Settings 页面（账户、模型、MCP、安全） | `client/components/SettingsView.tsx` |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `App.tsx` | 添加视图路由、TitleBar、调整布局 |
| `SessionNavigator.tsx` | 迁移到 Sidebar 子组件或保留核心逻辑 |
| `SessionWorkspace.tsx` | 拆分为 QuestHome + ChatView |
| `SessionInspector.tsx` | 迁移到 RightPanel 子组件 |
| `PromptComposer.tsx` | 添加 Spec/Goal 开关、Agent/Model 选择器、@/ 浮层 |
| `TranscriptPanel.tsx` | 样式适配新主题 |
| `theme.tsx` | 添加 qoder-light 主题 |

### 2.3 Module Interactions

```
App.tsx
├── TitleBar (always visible)
├── Sidebar (navigator state)
│   ├── New Quest button → create new session
│   ├── Quests list → select session → switch to ChatView
│   ├── Chats list → select chat → switch to ChatView
│   ├── Knowledge link → switch to KnowledgeView
│   ├── Marketplace link → switch to MarketplaceView
│   └── Settings link → switch to SettingsView
├── MainArea (view router)
│   ├── QuestHome (default)
│   ├── ChatView (when session/chat selected)
│   ├── KnowledgeView
│   ├── MarketplaceView
│   └── SettingsView
├── RightPanel (Quest/Chat views only)
│   ├── Summary Tab
│   ├── Terminal Tab
│   ├── Files Tab
│   ├── Spec Tab
│   └── Review Tab
└── PromptComposer (QuestHome + ChatView shared)
    ├── Spec/Goal toggles
    ├── Agent/Model selectors
    ├── @ context mention
    ├── / command palette
    └── Send button
```

### 2.4 File Structure

```
cli-gui/
├── client/
│   ├── styles/
│   │   ├── tokens.css              [NEW] Design Token 定义
│   │   ├── themes/
│   │   │   ├── neo.css             [MODIFY] 保留，清理冲突
│   │   │   ├── classic.css         [MODIFY] 保留
│   │   │   └── qoder-light.css     [NEW] Qoder Light Theme
│   │   ├── base.css                [MODIFY] 更新字体、变量
│   │   ├── components.css          [MODIFY] 重写核心样式
│   │   ├── responsive.css          [MODIFY] 适配新布局
│   │   └── index.css               [MODIFY] 导入新主题
│   ├── components/
│   │   ├── TitleBar.tsx            [NEW]
│   │   ├── Sidebar.tsx             [NEW]
│   │   ├── QuestHome.tsx           [NEW]
│   │   ├── ChatView.tsx            [NEW]
│   │   ├── RightPanel.tsx          [NEW]
│   │   ├── ContextMention.tsx      [NEW]
│   │   ├── CommandPalette.tsx      [NEW]
│   │   ├── KnowledgeView.tsx       [NEW]
│   │   ├── MarketplaceView.tsx     [NEW]
│   │   ├── SettingsView.tsx        [NEW]
│   │   ├── SessionNavigator.tsx    [MODIFY] 迁移/适配
│   │   ├── SessionWorkspace.tsx    [MODIFY] 拆分
│   │   ├── SessionInspector.tsx    [MODIFY] 迁移
│   │   ├── PromptComposer.tsx      [MODIFY] 增强
│   │   ├── TranscriptPanel.tsx     [MODIFY] 样式
│   │   └── ui/
│   │       └── Icon.tsx            [MODIFY] 添加 Lucide 映射
│   ├── theme.tsx                   [MODIFY] 添加 qoder-light
│   ├── app/
│   │   ├── App.tsx                 [MODIFY] 视图路由
│   │   └── preferences.ts          [MODIFY] 添加视图偏好
│   └── lib/
│       └── platform.ts             [NEW] PlatformAdapter
├── src-tauri/                      [NEW] Tauri 工程
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       └── main.rs
├── index.html                      [MODIFY] theme-color
├── package.json                    [MODIFY] 添加依赖
├── vite.config.ts                  [MODIFY] Tauri 代理
└── tailwind.config.ts              [MODIFY] 扩展 token
```

---

## 3. Data Model

### 3.1 Schema Changes

No database schema changes. All data models remain in-memory or local JSON.

### 3.2 Entity Definitions

#### New: View State

```typescript
// client/app/preferences.ts
export type AppView = "quest-home" | "chat" | "knowledge" | "marketplace" | "settings";

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
  sidebarCollapsed: boolean;          // NEW
  rightPanelCollapsed: boolean;      // NEW
}

export type RightPanelTab = "summary" | "terminal" | "files" | "spec" | "review";
```

#### New: Quest (for future Agentic features)

```typescript
// shared/types.ts (append)
export interface Quest {
  id: string;
  title: string;
  status: "draft" | "planning" | "running" | "paused" | "review" | "completed" | "failed";
  mode: "quest" | "agent" | "ask";
  workspaceId: string;
  branch?: string;
  prompt: string;
  spec?: Spec;
  steps: Step[];
  checkpoints: Checkpoint[];
  messages: Message[];
  artifacts: Artifact[];
  references: Reference[];
  createdAt: string;
  updatedAt: string;
}

export interface Spec {
  id: string;
  summary: string;
  requirements: string[];
  plan: string[];
  techStack?: string[];
  estimatedSteps: number;
}
```

### 3.3 Relationships

```
AppView determines which MainArea component renders:
- "quest-home" → QuestHome
- "chat" → ChatView (requires activeSessionId)
- "knowledge" → KnowledgeView
- "marketplace" → MarketplaceView
- "settings" → SettingsView

RightPanel only renders when view is "quest-home" or "chat":
- "knowledge" and "marketplace" hide RightPanel
```

### 3.4 Migration Plan

- **Backward Compatibility**: `UiPreferencesV1` 添加可选字段，旧数据自动使用默认值
- **Theme Migration**: 新用户默认 `qoder-light`，旧用户保留现有选择
- **Rollback**: 保留 `neo` 和 `classic` 主题，用户可随时切换回旧主题

---

## 4. API Design

### 4.1 Endpoints

No new backend endpoints needed for UI Demo phase. All new features are frontend-only.

Future endpoints (for Agentic features):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/quest` | Create new quest |
| GET | `/api/quest/:id` | Get quest details |
| POST | `/api/quest/:id/message` | Send message to quest |
| GET | `/api/quest/:id/stream` | SSE stream for quest updates |

### 4.2 Request/Response Schemas

See PRD §8.1 for full data model.

### 4.3 Error Responses

Reuse existing error handling pattern in `client/feedback-errors.ts`.

### 4.4 Breaking Changes

- `ThemeId` adds `"qoder-light"` — non-breaking (union type扩展)
- `UiPreferencesV1` 添加可选字段 — non-breaking

---

## 5. Business Logic

### 5.1 Core Algorithms

#### View Router Logic

```
function getMainView(currentView: AppView, activeSessionId?: string): ReactElement {
  switch (currentView) {
    case "quest-home": return <QuestHome />;
    case "chat": return activeSessionId ? <ChatView sessionId={activeSessionId} /> : <QuestHome />;
    case "knowledge": return <KnowledgeView />;
    case "marketplace": return <MarketplaceView />;
    case "settings": return <SettingsView />;
  }
}
```

#### RightPanel Visibility

```
function shouldShowRightPanel(currentView: AppView): boolean {
  return currentView === "quest-home" || currentView === "chat";
}
```

#### Theme Application

```
function applyTheme(theme: ThemeId) {
  const definition = themeDefinitions.find(t => t.id === theme);
  document.documentElement.dataset.theme = definition.id;
  document.documentElement.style.colorScheme = definition.colorScheme;
  document.documentElement.classList.remove(...themeDefinitions.map(t => t.rootClassName));
  document.documentElement.classList.add(definition.rootClassName);
}
```

### 5.2 Validation Rules

- `activeSessionId` must exist in `state.sessions` before switching to `"chat"` view
- `rightPanelTab` only valid when `shouldShowRightPanel` returns true
- Theme ID must be one of `"neo" | "classic" | "qoder-light"`

### 5.3 State Machine

```
AppView State Machine:

[quest-home] --select session--> [chat]
    ↑                               |
    |                               |
    +--new quest / back------------+
    |
[knowledge] --back--> [quest-home]
    |
[marketplace] --back--> [quest-home]
    |
[settings] --back--> [quest-home]
```

### 5.4 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User selects session but it no longer exists | Fall back to QuestHome, show toast warning |
| RightPanel tab invalid for current view | Reset to default tab |
| Theme CSS file fails to load | Fallback to inline default styles |
| Mobile viewport < 640px | Collapse sidebar and right panel by default |
| Tauri API unavailable | Graceful fallback to Web APIs |

---

## 6. Error Handling

### 6.1 Error Taxonomy

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| `VIEW_INVALID` | Attempt to switch to invalid view | "Invalid view state" |
| `SESSION_NOT_FOUND` | Selected session no longer exists | "Session not found" |
| `THEME_LOAD_FAILED` | Theme CSS fails to load | "Failed to load theme" |

### 6.2 Retry Strategy

- Theme loading: retry once, then fallback to default
- API calls: reuse existing retry logic in `client/api.ts`

### 6.3 Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Tauri init fails | Desktop features unavailable | Continue in Web mode |
| Lucide icons fail | Icons missing | Fallback to text labels |
| CSS variable undefined | Visual glitches | Define fallback values |

---

## 7. Security

### 7.1 Authentication & Authorization

- No auth for UI Demo phase (single-user local tool)
- Future: GitHub OAuth or API key

### 7.2 Input Validation

- `@` mention: validate file paths exist before sending
- `/` commands: whitelist allowed commands
- Theme ID: validate against known themes

### 7.3 Data Protection

- All data stays local (no cloud upload)
- Session data stored in local JSON files
- Future: encrypt sensitive data (API keys)

---

## 8. Performance

### 8.1 Expected Load

- Single user, local usage
- Max 4 concurrent sessions (per PRD)
- UI should be responsive at 60fps

### 8.2 Optimization Strategy

- Use `React.memo` for Sidebar items (avoid re-render on every state change)
- Lazy load Knowledge/Marketplace/Settings views
- Debounce input for @ mention search
- Virtualize long chat message lists

### 8.3 CSS Considerations

- Use CSS variables for theme colors (GPU accelerated)
- Avoid layout thrashing (batch DOM reads/writes)
- Use `will-change` sparingly for animated elements

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Test | Mock |
|-----------|------|------|
| `ThemeProvider` | theme switch, persistence | localStorage |
| `App` | view routing | useState |
| `Sidebar` | navigation click | callback props |
| `PromptComposer` | send message | onSend prop |

### 9.2 Integration Tests

| Flow | Test |
|------|------|
| Theme switch | neo → qoder-light → classic |
| View navigation | QuestHome → Chat → Knowledge → back |
| Session lifecycle | Create → Select → Chat → Delete |
| Responsive | Desktop → Tablet → Mobile layout |

### 9.3 E2E Tests (Playwright)

| Scenario | Steps |
|----------|-------|
| Theme persistence | Switch theme → refresh → verify |
| View routing | Click sidebar links → verify URL/view |
| RightPanel tabs | Click each tab → verify content |
| Mobile responsive | Resize to 375px → verify layout |

### 9.4 Acceptance Criteria Mapping

| PRD Requirement | Test | Type |
|-----------------|------|------|
| UI 1:1 复刻 | Screenshot comparison | E2E |
| Quest Home 完整 | Component render | Unit |
| Chat View 消息气泡 | Message rendering | Unit |
| 右侧 Tab 可切换 | Tab interaction | Integration |
| 主题切换正常 | Theme persistence | E2E |
| 移动端响应式 | Layout at breakpoints | E2E |

---

## 10. Implementation Plan

### 10.1 Phases

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 0: Infrastructure | 1-2 days | Design Token, Tauri init, Lucide Icons |
| Phase 1: UI Shell | 3-5 days | TitleBar, Sidebar, MainArea, RightPanel, PromptComposer |
| Phase 2: Theme System | 2-3 days | Qoder Light Theme, cleanup hardcoded values |
| Phase 3: Base Features | 5-7 days | Input enhancements, view routing, Knowledge, Marketplace, Settings |
| Phase 4: Tauri Desktop | 3-5 days | Tauri config, commands, frontend adapter |
| Phase 5: Multi-platform | 2-3 days | Web, desktop, mobile responsive |
| Phase 6: Validation | 2-3 days | Tests, build, docs |
| **Total** | **18-28 days** | **UI Demo + Base Features + Tauri** |

### 10.2 Issue Mapping

| Issue | SPEC Sections | Priority | Depends On |
|-------|--------------|----------|------------|
| #1 | Phase 0 | High | — |
| #2 | Phase 1 (TitleBar + Sidebar) | High | #1 |
| #3 | Phase 1 (MainArea + RightPanel) | High | #1 |
| #4 | Phase 1 (PromptComposer) | High | #1 |
| #5 | Phase 2 | Medium | #2, #3 |
| #6 | Phase 3 (Input enhancements) | Medium | #4 |
| #7 | Phase 3 (View routing) | Medium | #2, #3 |
| #8 | Phase 3 (Knowledge/Marketplace/Settings) | Low | #7 |
| #9 | Phase 4 | Low | #1-#7 |
| #10 | Phase 5-6 | Low | #1-#9 |

### 10.3 Incremental Delivery

- **Week 1**: Phase 0 + Phase 1 (UI Shell visible, basic layout)
- **Week 2**: Phase 2 + Phase 3 (Theme + Features, functional demo)
- **Week 3**: Phase 4 (Tauri desktop build)
- **Week 4**: Phase 5-6 (Polish, tests, docs)

---

## 11. Open Questions & Risks

### 11.1 Unresolved Questions

1. **Monaco Editor integration**: Will we integrate Monaco for code editing in this phase, or defer to future?
2. **Backend for Agentic features**: Do we need a backend service for Quest/Agent/Ask modes, or mock for Demo?
3. **Tauri command scope**: Which file system operations need Tauri commands vs Web APIs?

### 11.2 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSS variable conflicts | Theme switching breaks | Comprehensive testing, fallback values |
| Component refactoring regression | Existing features break | Preserve old components during migration |
| Tauri learning curve | Desktop delivery delayed | Defer Tauri to Phase 4, Web first |
| Performance with many sessions | UI becomes sluggish | Virtualization, memoization |
| Cross-platform compatibility | macOS/Windows differences | Test on both platforms |

### 11.3 Assumptions

- User has Node.js 18+ and npm installed
- Development on macOS (primary target)
- Existing backend API remains stable
- No breaking changes to shared types
