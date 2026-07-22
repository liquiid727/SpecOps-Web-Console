# Issues: CLI-GUI Qoder UI 改造

> 从 SPEC `cli-gui/doc/spec-cli-gui-qoder-ui.md` 拆解
> Generated: 2026-07-22

---

## Issue #1: 建立 Design Token 系统与基础设施

**Labels**: `infrastructure`, `design-system`, `high-priority`

### Description

建立统一的设计变量层（Design Token），初始化 Tauri 工程，引入 Lucide Icons，为后续 UI 改造奠定基础。

### Acceptance Criteria

- [ ] 创建 `client/styles/tokens.css`，定义颜色、字体、间距、圆角、阴影 token
- [ ] 创建 `client/styles/themes/qoder-light.css`，实现 Qoder Light Theme
- [ ] 创建 `client/styles/themes/qoder-dark.css`（可选，基础框架）
- [ ] 修改 `client/styles/themes/neo.css`，清理与 token 冲突的硬编码
- [ ] 初始化 `src-tauri/` 目录（`Cargo.toml`, `tauri.conf.json`, `src/main.rs`）
- [ ] 安装 `lucide-react`，更新 `client/components/ui/Icon.tsx`
- [ ] 更新 `package.json` 添加新依赖
- [ ] 更新 `vite.config.ts` 配置 Tauri dev server 代理
- [ ] 更新 `index.html` 的 `theme-color` meta 标签

### Technical Notes

- Token 命名参考 Qoder PRD §5.1
- Tauri 使用 v2 API
- Lucide icons 映射表参考 PRD §5.4

---

## Issue #2: 实现 TitleBar 和 Sidebar 组件

**Labels**: `ui`, `component`, `high-priority`

### Description

实现 Qoder 风格的顶部标题栏和左侧导航栏，替代现有的 SessionNavigator。

### Acceptance Criteria

- [ ] 创建 `client/components/TitleBar.tsx`
  - 44px 高度，macOS 风格（交通灯 + 搜索 + 通知 + 用户头像）
  - 半透明毛玻璃效果
- [ ] 创建 `client/components/Sidebar.tsx`
  - New Quest 按钮（顶部，带 ⌘N 快捷键提示）
  - Quests 分区（列表项 40-44px，hover/active 态）
  - Chats 分区（空状态 / 会话列表）
  - 底部链接（Better Loop / Knowledge / Marketplace）
  - 用户卡片（头像 / 名称 / Pro badge / 设置）
- [ ] 迁移 `SessionNavigator.tsx` 核心逻辑到 Sidebar
- [ ] 更新 `client/styles/components.css` 重写 sidebar 相关样式
- [ ] 支持 sidebar 折叠/展开

### Technical Notes

- Sidebar 宽度 260px
- 使用新 Design Token
- 保持现有 drag-and-drop 功能

---

## Issue #3: 实现 MainArea（QuestHome + ChatView）

**Labels**: `ui`, `component`, `high-priority`

### Description

实现中间主内容区的 Quest Home 视图和 Chat 视图，替代现有的 SessionWorkspace。

### Acceptance Criteria

- [ ] 创建 `client/components/QuestHome.tsx`
  - 标题 "Quest on, hands off"
  - Start in 选择器行（工作区 / 环境 / Git 分支）
  - 主输入框（支持 @ 和 / 触发浮层）
  - Spec/Goal 开关行
  - 推荐任务卡片（3 个）
  - Security Banner
- [ ] 创建 `client/components/ChatView.tsx`
  - 消息气泡（用户右/深色，Agent 左/白色）
  - 消息列表滚动
  - 顶部 header（标题 + 分支/环境）
- [ ] 创建 `client/components/MainArea.tsx`（视图路由器）
- [ ] 迁移 `SessionWorkspace.tsx` 核心逻辑
- [ ] 更新 `client/styles/components.css` 重写 main-column 样式

### Technical Notes

- Quest Home 和 Chat View 共享 PromptComposer
- 使用新 Design Token
- 保持现有 transcript/terminal 功能

---

## Issue #4: 实现 RightPanel（Summary/Terminal/Files/Spec/Review）

**Labels**: `ui`, `component`, `high-priority`

### Description

实现右侧信息面板，包含五个 Tab，替代现有的 SessionInspector。

### Acceptance Criteria

- [ ] 创建 `client/components/RightPanel.tsx`
  - Tab 栏（Summary / Terminal / Files / Spec / Review）
  - 选中态：文字加粗 + 底部 2px accent 下划线
  - 右侧关闭/折叠按钮
- [ ] Summary Tab：Progress / Artifacts / References 空状态
- [ ] Terminal Tab：左右分栏（终端列表 + 输出区）
- [ ] Files Tab：A/M/D 文件列表
- [ ] Spec Tab：Markdown 渲染
- [ ] Review Tab：代码审查（空状态）
- [ ] 迁移 `SessionInspector.tsx` 核心逻辑
- [ ] 更新 `client/styles/components.css` 重写 inspector 样式

### Technical Notes

- RightPanel 在 Knowledge/Marketplace 视图下自动隐藏
- Terminal 复用现有 xterm.js 实现
- 保持现有 file preview / diff / git 功能

---

## Issue #5: 升级主题系统（Qoder Light Theme）

**Labels**: `ui`, `theme`, `medium-priority`

### Description

添加 Qoder Light Theme 为默认主题，清理硬编码颜色、圆角、阴影。

### Acceptance Criteria

- [ ] 修改 `client/theme.tsx`
  - 添加 `"qoder-light"` 到 ThemeId
  - 设为默认主题
  - 更新 themeDefinitions
- [ ] 清理 `client/styles/components.css` 硬编码颜色
- [ ] 统一圆角使用 `--radius-*` 变量
- [ ] 统一阴影定义
- [ ] 确保 neo 和 classic 主题仍然可用
- [ ] 主题切换动画（可选）

### Technical Notes

- 使用 CSS 变量实现主题切换
- 避免使用 JS 切换样式
- 测试所有三个主题

---

## Issue #6: 增强 PromptComposer（输入框）

**Labels**: `ui`, `component`, `medium-priority`

### Description

重写 PromptComposer，添加 Qoder 风格的输入栏功能。

### Acceptance Criteria

- [ ] 修改 `client/components/PromptComposer.tsx`
  - 添加 Spec/Goal 开关（Toggle 34×18px）
  - 添加 Agent/Model 选择器（圆角 pill）
  - 添加 @ 触发上下文选择浮层
  - 添加 / 触发命令面板
  - 添加语音输入、润色、压缩按钮
  - 发送按钮（圆形，深色背景）
- [ ] 创建 `client/components/ContextMention.tsx`
  - @file/@folder/@image/@gitCommit/@wiki/@rule
- [ ] 创建 `client/components/CommandPalette.tsx`
  - /learn /chart /test /commit /doc
- [ ] 更新 `client/styles/components.css` 重写 prompt-composer 样式

### Technical Notes

- 输入框 placeholder: "Plan, @ for context, / for commands"
- 保持现有发送逻辑
- 使用新 Design Token

---

## Issue #7: 实现视图路由（View Router）

**Labels**: `feature`, `routing`, `medium-priority`

### Description

实现应用内的视图路由，支持 Quest Home、Chat、Knowledge、Marketplace、Settings 之间的切换。

### Acceptance Criteria

- [ ] 修改 `client/app/App.tsx`
  - 添加视图状态管理
  - 根据当前视图渲染不同 MainArea 组件
  - 右侧面板根据视图自动显示/隐藏
- [ ] 修改 `client/app/preferences.ts`
  - 添加 `AppView` 类型
  - 添加 `currentView` 到 preferences
- [ ] Sidebar 导航项点击切换视图
- [ ] 支持键盘快捷键（⌘+1/2/3/4/5 切换视图）
- [ ] URL 同步（可选，future）

### Technical Notes

- 使用 React Context 或 useState 管理视图状态
- 不引入 react-router（单页应用，无 URL 路由需求）

---

## Issue #8: 实现 Knowledge、Marketplace、Settings 页面

**Labels**: `ui`, `page`, `low-priority`

### Description

实现 Knowledge、Marketplace、Settings 三个页面的空壳结构。

### Acceptance Criteria

- [ ] 创建 `client/components/KnowledgeView.tsx`
  - Repo Wiki / Knowledge Card / Memory 三 Tab
  - 左侧 Wiki 目录树
  - 右侧详情面板
- [ ] 创建 `client/components/MarketplaceView.tsx`
  - 分类导航（200px）
  - 插件搜索
  - 卡片网格（2 列）
- [ ] 创建 `client/components/SettingsView.tsx`
  - 账户 / Credits
  - 模型配置
  - MCP / Skills / Plugins
  - 安全与隐私
- [ ] 更新 `client/styles/components.css`

### Technical Notes

- 先做静态 UI，后续接入真实数据
- Marketplace 卡片使用 mock 数据
- Settings 使用现有 WorkspaceProfileManager 逻辑

---

## Issue #9: Tauri 桌面端集成

**Labels**: `desktop`, `tauri`, `low-priority`

### Description

完成 Tauri 桌面端的配置和集成。

### Acceptance Criteria

- [ ] 配置 `src-tauri/tauri.conf.json`
  - 窗口大小、标题、菜单
  - 允许的文件系统访问权限
- [ ] 实现 `src-tauri/src/main.rs`
  - 注册 Tauri 命令
  - 文件系统读写
  - 终端命令执行
- [ ] 创建 `client/lib/platform.ts`
  - PlatformAdapter 接口
  - Web 实现和 Tauri 实现
- [ ] 修改相关组件使用 PlatformAdapter
- [ ] 构建并测试 macOS/Windows

### Technical Notes

- Tauri v2 API
- 前端通过 feature flag 切换 Web/Tauri 模式
- 文件系统操作使用 Tauri fs API

---

## Issue #10: 多端适配与验证

**Labels**: `testing`, `responsive`, `low-priority`

### Description

完成多端适配、响应式优化、测试验证。

### Acceptance Criteria

- [ ] Web 端功能完整验证
- [ ] Tauri 桌面端构建验证
- [ ] 移动端响应式优化（< 640px）
  - 侧边栏折叠为 drawer
  - 右侧面板隐藏
  - 输入框适配
- [ ] Playwright E2E 测试
  - 主题切换
  - 视图路由
  - 响应式布局
- [ ] 性能测试（Lighthouse score >= 90）
- [ ] 文档更新（README、设计文档）

### Technical Notes

- 使用 Playwright 进行截图对比
- Lighthouse CI 集成（可选）
- 测试覆盖率 >= 80%

---

## Issue 映射关系

```
#1 (Infrastructure)
├── #2 (TitleBar + Sidebar)
├── #3 (MainArea)
├── #4 (RightPanel)
└── #5 (Theme System)
    ├── #6 (PromptComposer)
    ├── #7 (View Router)
    └── #8 (Knowledge/Marketplace/Settings)
        └── #9 (Tauri)
            └── #10 (Validation)
```

---

## 优先级汇总

| Issue | 标题 | Priority | Estimate |
|-------|------|----------|----------|
| #1 | Design Token + Infrastructure | High | 1-2 days |
| #2 | TitleBar + Sidebar | High | 2-3 days |
| #3 | MainArea (QuestHome + ChatView) | High | 2-3 days |
| #4 | RightPanel | High | 2-3 days |
| #5 | Theme System Upgrade | Medium | 2 days |
| #6 | PromptComposer Enhancement | Medium | 2-3 days |
| #7 | View Router | Medium | 1-2 days |
| #8 | Knowledge/Marketplace/Settings | Low | 3-4 days |
| #9 | Tauri Desktop | Low | 3-5 days |
| #10 | Multi-platform Validation | Low | 2-3 days |
