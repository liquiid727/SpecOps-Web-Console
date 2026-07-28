# Issues: CLI-GUI Console Gaps 补全

> 从 SPEC `cli-gui/doc/console-gaps/spec-cli-gui-console-gaps.md` 拆解
> 需求来源：`cli-gui/doc/todo/0728.md`
> Generated: 2026-07-28
> 建议执行顺序：#1 → #4 → #3 → #6 → #2 → #7 → #5

---

## Issue #1: Chat 入口降级 terminal

**Labels**: `ui`, `feature-flag`, `high-priority`

### Description

chat 交互模式暂时封闭（战略回撤）：前端所有 chat 入口降级为 terminal，UI 保留但不可点击；服务端 chat 链路（headless / 常驻运行时 / 流式）保留不动。

### Acceptance Criteria

- [ ] 新建 `client/app/feature-flags.ts`：`CHAT_INTERACTION_ENABLED = false`
- [ ] `NewSessionDialog`：开关关闭时模式锁定 terminal，chat 选项置灰，展示 `chatTemporarilyDisabled` 说明（复用 chatLocked 展示路径）
- [ ] `App.quickCreateSession` / `App.createSession`：强制 `interactionMode: "terminal"`
- [ ] Sidebar Chats 分区：无存量 chat 会话时展示「暂未开放」空态；存量会话照常列出可查看
- [ ] 存量 chat 会话：transcript 可查看，composer disabled + `chatComposerDisabled` 提示
- [ ] 服务端零改动；`POST /api/sessions` 契约不变
- [ ] i18n en/zh 同批；单测覆盖开关关闭下的创建流与 composer 禁用；`npm run test` / `build` 通过

### Technical Notes

- SPEC §1；恢复 chat 仅需翻转开关，业务组件不感知具体决策

---

## Issue #2: 模型目录同步与导入

**Labels**: `backend`, `api`, `settings`, `high-priority`

### Description

模型列表从纯硬编码升级为三层来源合并：版本映射内置目录 + 本机 CLI 配置同步 + 手动导入；Settings > Models 从占位变为真实管理界面。

### Acceptance Criteria

- [ ] 新建 `server/model-catalog.ts`：adapter + 版本区间 → 内置模型表（codex 补 gpt-5.1 系列，claude 补 sonnet[1m]），`profile-adapters.ts` 改为消费目录
- [ ] `shared/state.ts`：`CliProfile.customModels?` / `syncedModels?` 可选字段（无迁移，读取缺省 []）
- [ ] `GET /api/profiles/:id/models`：合并列表 + source 标注（builtin/synced/custom）
- [ ] `POST /api/profiles/:id/models/sync`：读 `~/.codex/config.toml`（model / profiles.*.model）与 `~/.claude/settings.json`（model），容错缺失，回写 syncedModels
- [ ] `POST /api/profiles/:id/models/custom` + `DELETE .../custom/:model`：非空/去重/≤128 校验；readonly 403
- [ ] `resolveCapabilities().models` = builtin ∪ synced ∪ custom（default 首位、去重）→ composer / launchConfig / activeModel 校验自动生效
- [ ] SettingsView Models tab：分 profile 列表 + source badge + Sync 按钮（loading/结果反馈）+ 添加/删除；空/加载/失败/readonly 态
- [ ] server 单测（假 config fixture：正常/缺失/坏格式）；i18n en/zh；`npm run test` / `build` 通过

### Technical Notes

- SPEC §2；codex/claude 均无 list-models 命令，不做 provider API 直连

---

## Issue #3: 四态工作模式 + Ctrl+Tab 循环

**Labels**: `ui`, `composer`, `medium-priority`

### Description

composer 的 Spec/Goal 二态开关扩展为 default/spec/goal/plan 四态：点击下拉选择 + Ctrl+Tab 循环切换，默认 default，持久化到 UI preferences。本期仅 UI 状态，不改变发送内容。

### Acceptance Criteria

- [ ] `ComposerWorkMode` 四态类型；状态提升到 App 层，`PromptComposer` 二态内部 state 移除
- [ ] 模式 chip 点击弹下拉（四项 + 当前项标记），选择即生效
- [ ] Ctrl+Tab 正向循环 / Ctrl+Shift+Tab 反向；输入框聚焦时同样生效；注册进 `shortcuts.ts`（依赖 #4）
- [ ] `preferences.ts`：`composerWorkMode` 字段，parse 容错回退 "default"
- [ ] 发送内容不受模式影响（断言 prompt 原样）；语义注入记为 Non-Goal
- [ ] i18n：workModeLabel/Default/Spec/Goal/Plan（en/zh）
- [ ] 单测：循环顺序、下拉选择、持久化读写、发送内容不变；`npm run test` / `build` 通过

### Technical Notes

- SPEC §3；浏览器可能抢占 Ctrl+Tab（标签切换），下拉为保底路径，Tauri 桌面端不受影响——风险随验证记录

---

## Issue #4: 快捷键集中管理 + 设置表格

**Labels**: `ui`, `settings`, `infrastructure`, `medium-priority`

### Description

快捷键从 App.tsx 散落硬编码收敛为 `client/app/shortcuts.ts` 单一定义源；SettingsView 新增 Shortcuts tab 渲染快捷键表格（落实 workbench US-024 的 Shortcuts 分类）。

### Acceptance Criteria

- [ ] 新建 `client/app/shortcuts.ts`：`ShortcutDefinition`（id/keys/labelKey/category）+ 全量清单（Mod+B/J/⇧I/N、Mod+1..5、Ctrl+Tab 系、Enter、Shift+Enter）+ `formatShortcut(keys, platform)`
- [ ] `App.tsx` onShortcut / viewShortcuts 改为由定义驱动，行为零回归
- [ ] SettingsView 新增 shortcuts tab：按 category 分组表格，按平台显示 ⌘/Ctrl，数据与定义同源
- [ ] i18n：各 labelKey + tab 标题（en/zh）
- [ ] 单测：formatShortcut 双平台、定义完整性（无重复 id/键位冲突）、App 快捷键行为回归；`npm run test` / `build` 通过

### Technical Notes

- SPEC §4；composer Enter/Shift+Enter 保持组件内实现，仅入表展示

---

## Issue #5: 语音输入 + 润色/压缩（执行 project-quest #8）

**Labels**: `ui`, `backend`, `composer`, `medium-priority`, `reference`

### Description

引用卡：直接执行 `cli-gui/doc/project-quest/issues-cli-gui-project-quest.md` Issue #8，规格以 project-quest SPEC §5.7–§5.8 为准。执行状态在本模块跟踪。

### Acceptance Criteria

- [ ] project-quest Issue #8 全部验收项通过（useSpeechInput、POST /api/prompt/enhance、supportsPromptEnhancement、composer 锁定/撤销/重试、单测三件套）
- [ ] 本卡回写执行证据

### Technical Notes

- 不重写 spec；原卡验收标准为准

---

## Issue #6: 语言切换收入设置 + 规则回写

**Labels**: `ui`, `settings`, `docs`, `low-priority`

### Description

移除左栏常驻 LanguageToggle，语言切换唯一入口为设置 Appearance（已实现）；同步修订两份 AGENTS.md 中「左栏语言切换常驻」的强制条款。

### Acceptance Criteria

- [ ] 移除 LanguageToggle 挂载点（组件文件保留）；语言切换在设置 Appearance 可用且持久化行为不变
- [ ] `cli-gui/AGENTS.md` 与 `cli-gui/doc/AGENTS.md` 条款改写为「语言切换位于设置且持久化」
- [ ] 涉及挂载断言的测试改为断言设置内切换；`npm run test` / `build` 通过

### Technical Notes

- SPEC §6；需求与现行规则冲突，需求优先并回写规则

---

## Issue #7: Knowledge Skills 只读管理

**Labels**: `ui`, `backend`, `knowledge`, `medium-priority`

### Description

KnowledgeView 新增 Skills tab：只读查看系统级（~/.claude/skills、~/.codex/skills）与 workspace 级技能列表及 SKILL.md 详情。启停/编辑/安装为 Non-Goal（MVP04）。

### Acceptance Criteria

- [ ] `GET /api/skills?scope=system|workspace&workspaceId=…`：一层子目录扫描，frontmatter 解析 name/description（回退目录名），目录缺失返回空
- [ ] `GET /api/skills/content`：id 必须命中服务端重扫结果（无客户端路径输入），≤256KiB 截断，symlink 越界拒绝
- [ ] KnowledgeView Skills tab：System/Workspace scope 分段控件（workspace 默认取当前活跃会话）、列表（name+source badge+描述）、详情只读渲染、搜索过滤
- [ ] 空（无技能/无 workspace）/加载/失败态齐全
- [ ] server 单测（假目录 fixture：正常/无 frontmatter/空目录/越界 symlink）+ 组件测试；i18n en/zh；`npm run test` / `build` 通过

### Technical Notes

- SPEC §7；frontmatter 手写轻量解析（顶层 key: value），不新增依赖
