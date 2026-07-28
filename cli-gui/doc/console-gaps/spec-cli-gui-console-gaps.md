# SPEC: CLI-GUI Console Gaps 补全（MVP01 遗留与回撤）

> 需求来源：`cli-gui/doc/todo/0728.md`（7 项）
> 定位：MVP01 收尾 + 遗留补全，不占用 Roadmap 已定义的 MVP02（AI IDE）
> Issues：`cli-gui/doc/console-gaps/issues-cli-gui-console-gaps.md`
> Generated: 2026-07-28

---

## 0. 追溯映射

| 功能域 | 0728.md 条目 | 既有文档出处 | 性质 |
|---|---|---|---|
| §1 Chat 入口降级 | 1 | 无（chat 为 MVP01 双核之一；`.prd/prd-chat-streaming-and-persistent-runtime.md` 刚交付后端流式） | 新决策（战略回撤，仅封前端入口） |
| §2 模型同步与导入 | 2、5b | 无（仅 qoder-input-detail.md 视觉稿） | 新需求 |
| §3 四态工作模式 | 3 | qoder-ui spec/issue #6（Spec/Goal 二态开关） | 扩展 |
| §4 快捷键表格 | 4 | workbench PRD US-024（Settings 须含 Shortcuts 分类，当期占位） | 落实既有规划 |
| §5 语音/润色 | 5a | project-quest PRD US-B4/B5 + SPEC §5.7–§5.8 + issues #8；MVP01 PRD §8 定为 MVP01+ | 已有 spec，纯执行 |
| §6 语言切换收敛 | 6 | workbench US-024 Appearance 分类；与 `cli-gui/AGENTS.md`、`cli-gui/doc/AGENTS.md`「左栏语言切换常驻」条款冲突 | 新决策 + 规则回写 |
| §7 Skills 只读管理 | 7 | MVP01 PRD §8 Out of Scope（Skill 系统仅占位）、§11 Roadmap MVP04 | MVP04 提前拉入最小只读版 |

已拍板决策：
1. chat 全部降级 terminal（含 Quest Home 快速创建）；存量 chat 会话可查看，composer 只读。
2. spec/goal/plan/default 四模式本期仅 UI 状态，不改变发送 prompt 内容。
3. 文档链按既有模块约定放 `cli-gui/doc/console-gaps/`。

---

## 1. Chat 入口降级 terminal

### 1.1 原则

- **仅封前端入口**。服务端 chat 链路（headless turns、`persistentChatRuntime` 常驻运行时、`turn-delta` 流式、transcript、审批）全部保留不动，与 chat-streaming 特性成果不冲突。
- 前端以单一功能开关常量控制，后续恢复 chat 只需翻转开关。

### 1.2 功能开关

`client/app/feature-flags.ts`（新建）：

```ts
/** chat 交互模式暂时封闭（0728 决策）；恢复时置 true，无需改动业务组件 */
export const CHAT_INTERACTION_ENABLED = false;
```

### 1.3 行为契约

| 位置 | 关闭时行为 |
|---|---|
| `NewSessionDialog` 模式选择器 | 锁定 terminal；chat 选项 disabled；下方展示「Chat 暂未开放」i18n 说明（复用现有 `chatLocked` 置灰与说明文案的展示路径） |
| `App.quickCreateSession`（Quest Home 一次提交） | `interactionMode` 由 `"chat"` 改为 `"terminal"`；创建后仍进入会话视图 |
| `App.createSession` | 提交前强制 `interactionMode: "terminal"`（双保险，防对话框态残留） |
| Sidebar Chats 分区 | 保留分区标题；无存量 chat 会话时展示「暂未开放」空态；存量 chat 会话照常列出可选中 |
| 存量 chat 会话 | transcript 照常查看；chat composer 禁用（disabled + 只读提示文案），不再发起新轮次 |
| 服务端 | 不改。`POST /api/sessions` 仍接受 `interactionMode: "chat"`（API 契约不破坏） |

### 1.4 i18n 键

`chatTemporarilyDisabled`（选择器说明 / Chats 空态）、`chatComposerDisabled`（存量会话 composer 提示），en/zh 同批。

---

## 2. 模型目录同步与导入

### 2.1 背景与约束

- 现状：模型硬编码在 `server/profile-adapters.ts`（codex: default/gpt-5/gpt-5-codex；claude: default/sonnet/opus/haiku）。
- codex / claude CLI 均无「列出模型」命令 → 无法真正在线枚举。采用**三层来源合并**。

### 2.2 三层来源

1. **内置目录（版本映射）**：`server/model-catalog.ts`（新建）按 adapter + 探测版本区间维护内置型号表，替代 profile-adapters 内联数组：
   - codex `>=0.145.0`：`gpt-5`、`gpt-5-codex`、`gpt-5.1`、`gpt-5.1-codex`、`gpt-5.1-codex-mini`
   - claude `>=2.0.0`：`sonnet`、`opus`、`haiku`、`sonnet[1m]`
   - kimi/glm/generic：维持现状（`default` / 空）
2. **本机 CLI 配置同步**：sync 时读取（只读，容错缺失）：
   - codex：`~/.codex/config.toml` 顶层 `model` 与 `[profiles.*].model`
   - claude 家族：`~/.claude/settings.json` 的 `model`
   - 解析出的模型 id 若不在内置目录中，并入结果并标记来源 `synced`
3. **手动导入**：用户在 Settings > Models 为某 profile 添加自定义模型 id，持久化。

### 2.3 持久化（schema v3 增量，不升版本）

`shared/state.ts`：`CliProfile` 增加可选字段：

```ts
/** 用户导入的自定义模型 id（Settings > Models 管理；可选，缺省等价 []） */
customModels?: string[];
/** 最近一次模型同步发现的模型 id（缓存展示用；可选） */
syncedModels?: string[];
```

可选字段纯增量、旧数据无需迁移（读取时缺省 `[]`），`server/store.ts` 校验放行未知可选字段即可。

### 2.4 API

| Method | Path | 语义 |
|---|---|---|
| GET | `/api/profiles/:id/models` | 返回合并模型列表 `{ models: [{ id, source: "builtin"\|"synced"\|"custom" }] }`（builtin 来自 capability 探测结果） |
| POST | `/api/profiles/:id/models/sync` | 读取本机 CLI 配置，回写 `syncedModels`，返回合并列表；配置缺失/解析失败返回 `synced: []` 不报错 |
| POST | `/api/profiles/:id/models/custom` | body `{ model: string }`；校验非空、去重、长度 ≤ 128；回写 `customModels` |
| DELETE | `/api/profiles/:id/models/custom/:model` | 移除自定义模型 |

- readonly 模式：sync / custom 写操作 403（复用现有 readonly gating）。
- 错误码：`PROFILE_NOT_FOUND`、`VALIDATION_FAILED`（复用现有语义）。

### 2.5 能力探测合并

`resolveCapabilities` 的 `models` 输出 = 内置目录（按版本）∪ `syncedModels` ∪ `customModels`（去重、`default` 恒在首位）。由此 composer 模型选择器、launchConfig 校验（`--model` 透传）、chat `activeModel` 校验自动获得新模型，无需改动消费方。

### 2.6 UI（SettingsView > Models tab）

- 按 profile 分组列出合并模型（badge 标注 builtin / synced / custom）。
- 「Sync」按钮触发 `models/sync`（loading / 成功计数 / 失败 toast）。
- 添加表单（输入 model id + 提交）与 custom 条目删除按钮。
- 空态（无 profile）、加载、失败态齐全；readonly 禁用写入口。

---

## 3. 四态工作模式 + Ctrl+Tab

### 3.1 模式定义

`ComposerWorkMode = "default" | "spec" | "goal" | "plan"`，默认 `default`。

- 本期**仅 UI 状态**：不改变发送 prompt 内容、不注入模板、不映射 CLI 参数（Non-Goal，语义注入留待后续 spec）。
- 现有 `PromptComposer` 内部 `composerMode: "spec" | "goal"` 二态被四态取代，状态提升到 App 层（快捷键与 composer 共享）。

### 3.2 交互

- composer 内模式 chip 点击弹下拉（复用 `Select` / 现有 popover 模式），展示四项 + 当前项勾选。
- `Ctrl+Tab` 循环切换 default → spec → goal → plan → default（`Ctrl+Shift+Tab` 反向）。快捷键在输入框聚焦时同样生效（编辑器内 Ctrl+Tab 无输入语义）；浏览器/系统可能抢占 Ctrl+Tab（Tab 切换），下拉点击为保底路径，风险记录于 issues。
- 切换即时生效并 toast 轻提示当前模式（可选，仅键盘切换时）。

### 3.3 持久化

`client/app/preferences.ts` `UiPreferencesV1` 增加 `composerWorkMode: ComposerWorkMode`（默认 `"default"`；parse 容错回退默认值，不升 preferences 版本）。

### 3.4 i18n 键

`workModeLabel`、`workModeDefault`、`workModeSpec`、`workModeGoal`、`workModePlan`、`workModeSwitched`。

---

## 4. 快捷键集中管理 + 设置表格

### 4.1 集中定义

`client/app/shortcuts.ts`（新建）：

```ts
export interface ShortcutDefinition {
  id: string;                 // 稳定 id，如 "toggle-sidebar"
  keys: string[];             // 平台无关按键序列，如 ["Mod", "B"]（Mod = ⌘/Ctrl）
  labelKey: TranslationKey;   // i18n 描述键
  category: "navigation" | "session" | "composer";
}
export const shortcuts: ShortcutDefinition[] = [...];
export function formatShortcut(keys: string[], platform: "mac" | "other"): string;
```

收录：Mod+B（左栏）、Mod+J（右栏 Runtime Monitor）、Mod+Shift+I（右栏）、Mod+N（新建会话）、Mod+1..5（视图切换）、Ctrl+Tab / Ctrl+Shift+Tab（工作模式循环，§3）、Enter（发送）、Shift+Enter（换行）。

### 4.2 App 消费

`App.tsx` 的 `onShortcut` 与 `viewShortcuts` 映射改为从 `shortcuts.ts` 定义驱动（行为不变，来源单一化）；composer 的 Enter/Shift+Enter 保持组件内实现，仅在表格中展示。

### 4.3 设置表格

`SettingsView` 新增 `shortcuts` tab（icon: keyboard）：按 category 分组渲染表格（描述 + 按平台格式化的按键），数据与 `shortcuts.ts` 同源，无第二份清单。平台判定：`navigator.platform`/UA 含 Mac → ⌘，否则 Ctrl。

---

## 5. 语音输入 + 润色/压缩（执行既有 spec）

**不重写 spec。** 直接执行 `cli-gui/doc/project-quest/issues-cli-gui-project-quest.md` Issue #8，规格以 `cli-gui/doc/project-quest/spec-cli-gui-project-quest.md` §5.7–§5.8 为准：

- `client/components/useSpeechInput.ts`：Web Speech API、supported 探测、interim 灰显回填、final 落定、lang 跟随 i18n（en-US/zh-CN）、权限拒绝恢复指引。
- `POST /api/prompt/enhance`：polish/compress 两 action；32KiB 入 / 64KiB 出；30s 超时；错误码 `ENHANCE_UNAVAILABLE` / `ENHANCE_FAILED` / `ENHANCE_TIMEOUT`；经 `ProfileAdapterRegistry` 一次性调用 `codex exec` / `claude -p`（参数数组）。
- `shared/capabilities.ts`：`supportsPromptEnhancement`（codex/claude true、generic false）。
- composer：处理中锁定、成功一步撤销、失败保留原文可重试、profile 不支持禁用并解释。

本模块 issues 文件放一张引用卡（Issue #5）记录执行归属与状态。

---

## 6. 语言切换收入设置

- 移除左栏/标题栏常驻 `LanguageToggle` 挂载点（组件文件保留，供设置内复用或后续恢复）。
- 语言切换唯一入口：设置 Appearance（`WorkspaceProfileManager` AppearanceSettings，已实现，行为不变：localStorage 持久化 + `document.documentElement.lang` 同步）。
- **规则回写**（需求与现行规则冲突，需求优先）：
  - `cli-gui/AGENTS.md`：「Keep the rail `LanguageToggle` persistent and user-switchable」→「Language switching lives in Settings (Appearance) and stays persistent」。
  - `cli-gui/doc/AGENTS.md`：「Keep the left rail language switcher available and persistent…」同步改写；Implementation Pointers 中 switcher 指向设置入口。
- 相关测试同步：涉及 LanguageToggle 挂载断言的测试改为断言设置内切换可用。

---

## 7. Knowledge Skills 只读管理

### 7.1 范围

本期只做**只读查看**（列表 + 详情预览 + system/workspace 两级 scope）。启停、编辑、安装、Marketplace 联动均为 Non-Goal（MVP04 完整版）。

### 7.2 扫描目录

| Scope | 目录 |
|---|---|
| system | `~/.claude/skills/*/SKILL.md`、`~/.codex/skills/*/SKILL.md` |
| workspace | `<workspace.path>/.claude/skills/*/SKILL.md`、`<workspace.path>/.codex/skills/*/SKILL.md` |

- 仅一层子目录扫描；目录缺失静默返回空列表。
- 解析 `SKILL.md` YAML frontmatter 的 `name` / `description`（无 frontmatter 时 name 回退目录名，description 空）。frontmatter 解析用轻量手写解析（仅 `key: value` 顶层字段），不新增依赖。

### 7.3 API（只读）

| Method | Path | 语义 |
|---|---|---|
| GET | `/api/skills?scope=system` | `{ skills: [{ id, name, description, source: "claude"\|"codex", scope, path }] }` |
| GET | `/api/skills?scope=workspace&workspaceId=…` | 同上；workspaceId 缺失/不存在 → 400 `VALIDATION_FAILED` / 404 `WORKSPACE_NOT_FOUND` |
| GET | `/api/skills/content?scope=…&workspaceId=…&id=…` | 返回 SKILL.md 正文 `{ content }`（≤ 256KiB 截断）；id 必须命中扫描结果集（服务端重扫校验），路径不接受客户端任意输入 → 无路径穿越面 |

- `path` 字段返回展示用相对/缩略路径（`~/.claude/skills/foo`），不泄露完整机器路径之外的信息（本产品本地单用户，保持与 workspace 文件 API 同级安全约束：realpath 校验、symlink 越界拒绝）。
- readonly 模式不受影响（纯只读端点）。

### 7.4 UI（KnowledgeView 新增 Skills tab）

- tab 排列：wiki / card / memory（现状占位不动）+ **skills**（icon: zap 或 sparkles 区分）。
- Skills tab 内：scope 切换（System / Workspace 分段控件；Workspace 需选择 workspace，默认当前活跃会话的 workspace，无 workspace 时提示先注册）。
- 左列技能列表（name + source badge + description 截断）；右侧详情只读渲染 SKILL.md 原文（`<pre>` 或现有 Markdown 渲染管线）。
- 空态（无技能/无 workspace）、加载态、失败态齐全；搜索框复用现有 KnowledgeView 搜索过滤 name/description。

---

## 8. 测试与验收

- 单测：feature-flag 行为（#1）、shortcuts 定义与格式化（#4）、工作模式循环与持久化（#3）、model-catalog 合并与 sync 解析（假 config fixture，#2）、skills 扫描与 frontmatter 解析（假目录 fixture，#7）、enhance 端点与 speech hook（#5，按 project-quest test 清单）。
- 组件测试在 `I18nProvider` 下渲染；新增文案 en/zh 同批。
- 每 issue：`npm --prefix cli-gui run test` / `build` / `ui:check` 全绿；交互项补 Playwright e2e 或 Chrome 手动验证记录。
- 执行状态回写 `cli-gui/.loop-state.json`（source 切至本模块 issues 文件）。

## 9. Non-Goals

- 四态工作模式的语义注入（模板前缀 / CLI 参数映射）。
- Skills 启停、编辑、安装与 Marketplace 联动。
- knowledge wiki / card / memory 真数据接入。
- 服务端 chat 链路的任何删改。
- 在线拉取 provider 模型清单（无官方 CLI list 命令，不做 API 直连）。
