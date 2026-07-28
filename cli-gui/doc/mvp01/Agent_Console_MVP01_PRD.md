# Agent Console MVP01 PRD（整合版）

## Multi-Agent CLI Runtime Workspace — Qoder-like Experience

版本：v0.3\
状态：Draft（整合修订 + 架构评审修订：Orchestrator 分层、approval 事件预留、MVP01-A/B 拆分）

> 本版整合以下 PRD / 设计文档，作为 MVP01 的唯一入口 PRD：
>
> - `cli-gui/doc/mvp01/prd-cli-gui.md` — Workspace / Profile / Session 生命周期与 PTY（Session Manager 基线）
> - `cli-gui/doc/workbench/prd-cli-gui-workbench.md` — 三栏工作台、transcript 事件持久化与回放、Markdown、composer（Chat 可视化基线）
> - `cli-gui/doc/project-quest/prd-cli-gui-project-quest.md` — 项目入口、Quest Home 创建流、内置对话（Qoder 体验基线）
> - `cli-gui/doc/qoder-ui/reference/qoder-replica-prd.md`、`qoder-ui/reference/qoder-chat-detail.md` — Qoder UI 1:1 参照规范
>
> v0.1 草稿中丢失的两块核心能力——**Session Manager 管理**与 **Chat 可视化**——在本版恢复为 MVP01 的双核心（见 §4.1、§4.2）。

------------------------------------------------------------------------

## 1. 项目背景

随着 AI Coding Agent 的发展，Codex CLI、Claude Code、Gemini CLI、Kimi
CLI 等工具已经具备较强的代码理解、修改和执行能力。

但是当前 CLI 使用方式存在：

- 交互体验差
- Session 管理困难
- 多 Agent 切换困难
- Tool 执行过程不可视化

因此需要构建一个统一的可视化 AI Agent 工作台，MVP01 的体验基准是
**Qoder（Quest 工作台）**：极简三栏布局、自然语言输入优先、
会话即任务（Quest）、右侧信息面板实时反馈运行状态。

------------------------------------------------------------------------

## 2. 产品定位

Agent Console 是一个面向开发者的多 Agent CLI 可视化运行平台。

核心架构：

    GUI (React 三栏工作台)
      ↓
    Session Manager (会话生命周期 / 组织 / 持久化)
      ↓
    Runtime Orchestrator (执行上下文 / 队列 / 超时 / 取消 / 重试 / 并发上限)
      ↓
    CLI Adapter (argv 组装 + 事件解析，纯函数式)
      ↓
    Codex / Claude / GLM / Kimi

分层纪律：

- **Session Manager** 管「会话是什么」：元数据、组织状态、持久化。
- **Runtime Orchestrator** 管「怎么跑」：每个运行中会话对应一个
  Runtime Worker；超时、取消、重试、审批等待、单会话轮次互斥、
  全局并发上限全部收在这一层。
- **CLI Adapter** 只做无状态翻译：capability 声明、argv 组装、
  输出流 → transcript 事件解析。执行控制逻辑禁止下沉到 Adapter。

定位边界：**不重新实现** Codex / Claude 的 agent loop，本产品是本地
CLI 的启动、组织、会话管理和可视化层。

------------------------------------------------------------------------

## 3. 产品目标（MVP01）

MVP01 = 类 Qoder 体验的最小闭环，用户可以：

1. 接入项目目录（Workspace），管理 CLI Profile
2. 创建 AI Agent 会话（Quest），选择 Agent Runtime / 模型
3. 绑定项目目录并发送开发任务
4. 以**结构化 Chat 消息流**查看实时执行过程（Markdown、Tool 事件、文件变更）
5. 保存、恢复、组织多个 Session（重命名 / 置顶 / 归档 / 完成 / Fork / 手动排序）
6. 管理多个 CLI Agent 并发运行（≥ 4 个并发 Session）
7. 需要时随时回落到原始交互式终端

体验基线（来自 Qoder 参照）：

- 从启动到进入历史会话 ≤ 10 秒；创建并启动会话主路径 ≤ 4 步。
- New Quest 进入中间 Quest Home 创建视图，一次提交完成
  「创建 → 启动 → 发送首条 prompt → 进入 Chat View」。
- 会话默认呈现为对话消息流，而不是终端字节流。

------------------------------------------------------------------------

## 4. 核心模块

### 4.1 Session Manager（核心一）

负责 Agent 会话的完整生命周期、组织管理与持久化。这是 MVP01 的
第一核心，不可裁剪。

#### 4.1.1 生命周期（承接 `prd-cli-gui.md` US-003 ~ US-006）

- 创建：填写名称 → 选 Workspace → 选 CLI Profile →
  启动前展示最终命令、参数、工作目录并确认。
- 启动：每个运行中的 Session 独占一个 PTY（或 headless 轮次执行器）。
- 运行状态：`starting` / `running` / `stopped` / `error`。
- 停止：停止单个 Session 不影响其他 Session；显示退出码（如可获得）。
- 恢复：服务重启后无法确认存活的进程统一标记 `stopped`；
  恢复时复用原 Workspace / Profile / 名称，创建新 PTY，不复用失效句柄。
- 删除：运行中删除需二次确认；删除后不能再向该 Session 发送输入；
  按文档化策略级联删除 transcript，绝不删除工作区磁盘文件。

#### 4.1.2 组织管理（承接 `prd-cli-gui-workbench.md` US-007 ~ US-013）

组织状态与运行状态**相互独立**：

- 组织状态：`active` / `completed` / `archived`。
- 会话动作：Rename、Pin/Unpin、Archive/Restore、Complete/Reopen、
  Fork、Delete，全部通过键盘可达的右键/上下文菜单提供。
- 分组与排序：按项目分组、按时间桶（今天/昨天/近 7 天/更早）、
  按最近活跃、手动拖拽排序（含键盘等价操作）；置顶区独立展示。
- Fork：以最新持久化 transcript 事件为分叉边界，继承 Workspace /
  Profile / 启动配置，记录 `parentSessionId` + `forkEventId`；
  子会话以 stopped 启动，不克隆父 PTY；Fork 是会话分支，不是 Git 分支。
- Archive / Complete 运行中会话时：先确认、再停 PTY、再变更组织状态。

#### 4.1.3 Workspace 与 Profile

- Workspace：注册本地项目目录，路径必须存在且为目录，
  canonical 路径去重；被会话引用时受删除保护。
- 项目入口（承接 project-quest Feature A，MVP01 至少落地 Open Folder）：
  通过系统文件夹选择器导入，保留手动绝对路径回退；
  Set Up Workspace / Connect SSH 为 MVP01+ 扩展位，入口下拉预留。
- CLI Profile：默认内置 Codex CLI、Claude CLI；包含名称、可执行文件、
  参数数组（禁止 shell 字符串拼接）；可新增/编辑/删除。

#### 4.1.4 持久化

- Workspace、Profile、Session 元数据本地持久化，重启不丢失。
- 持久化 state 带显式 schema 版本，legacy 数据无损迁移，
  新字段有文档化默认值；损坏 state 产生可恢复错误，不静默覆盖源文件。

### 4.2 Conversation Engine / Chat 可视化（核心二）

Agent 对话不是简单 Message，而是 **Event 流 + 结构化渲染**。这是
MVP01 的第二核心，不可裁剪。

#### 4.2.1 事件协议（承接 workbench US-003 / project-quest FR-43）

每个事件包含：稳定 ID、sessionId、单调 sequence、时间戳、kind、
source、raw payload（或引用）。事件按会话 append-only 存储。

事件类型（最小集）：

| kind | 说明 | 示例 |
|------|------|------|
| `user_message` | composer 提交的用户消息 | `实现支付退款接口` |
| `assistant_message` / `markdown` | assistant 结构化回复 | Markdown 正文 |
| `tool_activity` | 工具调用 / 命令执行 | `bash: go test ./...` |
| `file_change` | 文件变更 | `payment.go` |
| `pty_output` | 原始 CLI 输出（中性） | ANSI 字节流 |
| `lifecycle` | 启动/停止/错误等状态转移 | `running → stopped` |
| `error` | 应用/轮次错误 | 启动失败原因 |
| `approval_request` | CLI 请求执行许可（协议预留） | `command: npm install` |
| `approval_response` | 用户审批决定（协议预留） | `allow` / `deny` |

> `approval_request` / `approval_response` 在 MVP01 即进入事件协议
> （协议预留零成本，事后补协议代价高），但 UI 审批中心按所选 CLI
> headless 协议的支持度在 MVP01-B 落地，兜底路径仍是轮次失败 + 指引。

分类纪律：**不发明 CLI 语义**。无法识别的 PTY 输出保持中性
`pty_output`，绝不伪装成 assistant 或 tool 消息；原始 payload
始终保留以便回放与排障。

#### 4.2.2 持久化与回放（承接 workbench US-003 / US-004）

- 事件写入独立于 PTY：transcript 写失败不终止进程。
- 回放端点按 sequence 顺序返回，支持 `afterSequence` 游标分页，
  声明是否还有更多事件。
- 实时推送在回放的最新 sequence 之后接续；按事件 ID 去重，
  重连零重复。
- 服务重启后历史完整可回放；stopped / completed / archived
  会话保持可读。

#### 4.2.3 Chat View 渲染（承接 project-quest US-C1 ~ US-C2 / qoder-chat-detail）

- 消息流形态：user 右对齐气泡，assistant 左对齐 Markdown 块，
  时间戳、进入视图自动滚底、空态「暂无消息」。
- Markdown：GFM（标题/列表/任务列表/表格/引用/代码块），
  经 sanitize 渲染——禁用或清洗原始 HTML、限制链接协议、
  保留 raw source 供对照；代码块保留空白并提供复制。
- Tool 活动呈现为可折叠条目，不混入正文；文件变更事件独立展示。
- 流式渲染：assistant 回复逐段可见，不等整轮结束。
- 轮次失败在消息流中呈现错误条目，支持重试该轮。
- 四态齐全：loading / empty / reconnecting / failure（含截断态）。

#### 4.2.4 对话执行形态

MVP01 支持两种交互模式（`interactionMode`）：

- `chat`（默认，Qoder 体验）：每条用户消息经所选 CLI 的 headless
  非交互模式逐轮执行（如 `codex exec --json`、
  `claude -p --output-format stream-json`），经 CLI 原生
  resume/continue 机制保持多轮上下文；进行中轮次可取消，
  同一会话同时只允许一个进行中轮次。
- `terminal`（兜底）：交互式 PTY，xterm.js 全保真（键盘输入、
  Ctrl+C、ANSI、resize），用于登录、TUI 审批等 chat 无法覆盖的场景。

Profile 不支持 headless 多轮时，创建时明确降级为 terminal 并解释。
chat 会话的 Terminal tab 提供各轮原始输出的只读回放。

#### 4.2.5 Composer（承接 workbench US-016 / US-017）

- 多行输入；Enter 提交、Shift+Enter 换行（UI 内说明）。
- 空白内容不可提交；提交即持久化为 `user_message` 事件；
  运行中会话恰好送达一次；停止会话提供显式 start-and-send 流。
- 权限 / 模式 / 模型选择器：选项来自所选 Profile 的 capability
  adapter，均含 `CLI default`；不支持的选择器禁用并解释；
  需重启生效的变更明确标注「下次启动 / Fork 时生效」；
  UI 绝不谎报「已应用」。
- chat 会话内可切换模型，下一轮生效并随会话持久化。

### 4.3 Runtime Orchestrator

位于 Session Manager 与 Adapter 之间的执行编排层（对齐现有
`application.ts` 中 per-session `Runtime` 的职责，显式化为独立契约）：

- **执行上下文**：为每个运行中会话创建 Runtime Worker（terminal 模式
  = PTY 进程 + 订阅者集合；chat 模式 = headless 轮次执行器）。
- **生命周期控制**：start / stop / kill 的幂等语义；进程退出与
  `lifecycle` 事件写入的一致性。
- **轮次互斥**：同一 chat 会话同时只允许一个进行中轮次（§4.2.4）。
- **取消**：进行中轮次可取消，取消后会话保持可用。
- **超时与重试**：轮次级超时（可配置）；失败轮次由用户显式重试，
  不自动重放。
- **并发上限**：全局运行中 Session 上限（MVP01 验收基线 ≥ 4），
  超限时排队或明确拒绝并解释。
- **审批等待**：收到 `approval_request` 时挂起轮次，等待
  `approval_response` 或超时（协议就绪，UI 见 MVP01-B）。

Orchestrator 不理解任何 CLI 的具体语义——语义翻译全部在 Adapter。

### 4.4 Agent Adapter Layer

统一不同 CLI Agent 的接口（TypeScript，对齐现有
`cli-gui/server` ports/adapters 架构；v0.1 的 Go 接口定义废弃）。
Adapter 是**无状态纯翻译层**，不持有进程句柄、不做执行控制：

```ts
interface AgentAdapter {
  /** 声明 capability：支持的模型、权限模式、headless 能力 */
  capabilities(profile: CliProfile): AgentCapabilities;
  /** 组装交互式启动 argv（terminal 模式） */
  buildLaunch(config: LaunchConfig): CommandSpec;
  /** 组装 headless 单轮 argv（chat 模式），含原生 resume */
  buildTurn(config: TurnConfig): CommandSpec;
  /** 将 CLI 输出解析为 transcript 事件流 */
  parseEvents(stream: Readable): AsyncIterable<TranscriptEvent>;
}
```

MVP01 支持：

- Codex CLI Adapter
- Claude CLI Adapter
- Generic Adapter（仅 `CLI default`，无 headless，terminal-only）

GLM / Kimi Adapter 为 MVP01+ 扩展位，接口保持兼容。

> Profile 演化说明：MVP01 的 CLI Profile 是**物理层**定义（可执行文件
> + 参数 + capability）。MVP03 将在其上引入 **Agent Profile 逻辑层**
> （角色 = CLI Profile 引用 + model + system prompt + skills，如
> `Backend Engineer`），届时用户选择的是角色而非 CLI。MVP01 不实现，
> 但 profiles schema 演进须保持该方向兼容。

### 4.5 Runtime Monitor（右栏）

展示当前会话运行状态：

- Agent 类型 / Profile
- Model（当前生效值）
- Project（Workspace 路径、Git 分支）
- 运行状态 + 组织状态
- Tool 执行数量、文件修改数量（由 transcript 事件聚合）
- Token 消耗（仅当 CLI 事件流提供时展示，不估算）

右栏同时承载只读检查视图（Files / Preview / Diff / Git status，
详见 `prd-cli-gui-workbench.md` US-019 ~ US-023；Git 严格只读）。

------------------------------------------------------------------------

## 5. UI 设计（Qoder 三栏）

> 分段说明：本节描述的是 MVP01-B 完成后的完整形态。MVP01-A 仅需：
> 最简会话列表（左）+ Chat View + 常驻 composer（中），右栏、
> Quest Home、分组排序、折叠 drawer 均在 B 段落地（见 §8）。

整体布局（参照 `qoder-ui/reference/qoder-replica-prd.md` §4 / §6）：

    +--------------------------------------------------+
    | TitleBar（搜索 · 折叠左/右栏 · 通知 · 账户）        |
    +---------+---------------------------+------------+
    | Sidebar | Main Area                 | RightPanel |
    | Quests  |  Quest Home ↔ Chat View   |  Runtime   |
    | Chats   |  + Composer（常驻）        |  Files     |
    | 底部区   |  + Terminal（备用视图）    |  Diff/Git  |
    +---------+---------------------------+------------+

### 左侧 Sidebar

- 顶部 New Quest 按钮（⌘N），点击切回 Quest Home。
- Quests 区：会话列表，支持分组（项目/时间/最近/手动）、置顶区、
  归档/完成过滤器、右键上下文菜单、拖拽排序。
- 项目入口下拉（Open Folder，预留 Set Up Workspace / Connect SSH）。
- 底部：Knowledge / Marketplace 占位入口 + Settings（固定在底部）。
- 可折叠（⌘B），窄屏渲染为带遮罩的 drawer。

### 中间 Main Area（双舞台 + 常驻 composer）

- **Quest Home**（默认）：大标题 → `Start in [项目 ▾] [环境 ▾] [分支 ▾]`
  → composer → 推荐任务。
- **Chat View**（选中会话）：header（项目名 · 分支 · 环境）→
  结构化消息流 → composer（模型/权限/模式选择器）。
- **Terminal**：Transcript / Terminal tab 切换，切换不新建 PTY。

### 右侧 RightPanel

- Runtime 状态 + Files / Preview / Diff / Git 只读 tab。
- 可折叠（⌘J），窄屏渲染为 drawer。

### 通用要求

- EN / ZH 文案同批交付（复用现有 i18n）。
- 键盘可达：菜单、对话框、tab、选择器、拖拽排序均有键盘路径；
  模态焦点圈定与归还；状态不只靠颜色表达；尊重 reduced-motion。
- 所有用户可见流程覆盖 empty / loading / success / failure 四态。
- readonly 部署模式禁用全部写操作（启动进程、会话写、项目创建）。

------------------------------------------------------------------------

## 6. 数据模型

对齐 `cli-gui/shared/types` 现有契约，schema 版本化演进。

### sessions

- `id`、`name`
- `workspaceId`、`profileId`
- `interactionMode`：`chat` | `terminal`
- `runtimeStatus`：`starting` | `running` | `stopped` | `error`
- `organizationStatus`：`active` | `completed` | `archived`
- `pinned`、`manualOrder`
- `parentSessionId`、`forkEventId`、`forkedAt`（Fork 血缘）
- `launchConfig`：permission / mode / model / branch
- `chatContext`：resume token、当前模型（chat 模式）
- `createdAt`、`updatedAt`、`lastActiveAt`

### events（transcript，按会话 append-only）

- `id`、`sessionId`、`sequence`、`timestamp`
- `kind`（见 §4.2.1）、`source`
- `payload` / `payloadRef`（原始内容或引用）

### workspaces

- `id`、`name`、`path`（canonical）
- `kind`：`local-folder`（MVP01）｜`managed-workspace` / `ssh-remote`（预留）

### profiles

- `id`、`name`、`executable`、`args[]`
- `adapter`：`codex` | `claude` | `generic`

------------------------------------------------------------------------

## 7. 技术架构

> 修正说明：v0.1 草稿的 Go / Gin / SQLite 方案废弃。MVP01 沿用
> `cli-gui/` 现有实现栈，避免重写已交付能力。

### Frontend

- React + TypeScript + 现有 tokenized CSS（Tailwind 兼容）
- xterm.js（Terminal 视图）
- sanitize 的 GFM Markdown 渲染器
- 复用现有组件壳：`App.tsx` / `SessionNavigator` /
  `SessionWorkspace` / `SessionInspector` / `Overlay` / i18n

### Backend（本地 Session Manager）

- Node.js HTTP + WebSocket 服务（localhost）
- PTY 生命周期管理（node-pty）+ headless 轮次执行器
- 版本化 JSON state（原子临时文件替换）+ 按会话 append 的
  transcript repository
- ports/adapters 边界：filesystem / Git / directory-picker /
  persistence / PTY 均走平台中立接口，为后续 Tauri 桌面壳保留
  替换点（Tauri 不阻塞 MVP01）

### 安全基线

- 进程启动一律参数数组，不执行拼接 shell 字符串。
- 启动前展示最终命令 + cwd 并要求确认。
- 文件/Git 访问限定注册 Workspace 根内，拒绝 `..`、绝对路径替换、
  symlink 逃逸；Git 仅 allowlist 只读子命令。
- Markdown 渲染 sanitize；WebSocket / loopback 端点做 origin 防护。

------------------------------------------------------------------------

## 8. MVP01 范围（拆分为 A / B 两个交付段）

拆分原则：**A 段先跑通一条完整可用的最小闭环**（一个 CLI、一种模式、
能创建能对话能恢复），避免「UI 还没跑通、底层一直改」；B 段在稳定的
协议和数据模型之上补齐体验。事件协议、schema 版本化这类**地基必须在
A 段一次到位**，B 段只加数据、不改协议。

### MVP01-A：核心闭环（一个人能用）

**目标：单 CLI 单模式的完整可用闭环——创建 → 对话 → 关掉 → 回来 → 继续。**

- Workspace（Open Folder + 手动路径）+ CLI Profile 管理与持久化
- Session 创建 / 启动确认 / 停止 / 恢复 / 删除（运行状态四态）
- **schema 版本化 + 迁移框架**（地基，必须在 A）
- Runtime Orchestrator：执行上下文、轮次互斥、取消、超时
- Codex CLI Adapter（headless 逐轮 + 原生 resume）
- **事件协议全量 kind 定义**（含 approval 两个预留 kind）+
  append-only transcript + `afterSequence` 回放 + 实时去重
- Chat View 消息流：气泡、sanitize Markdown、tool_activity、
  流式渲染、轮次错误 + 重试
- Composer：多行输入、Enter/Shift+Enter、模型选择（capability 驱动）
- **最简会话列表**（平铺 + 最近活跃排序，不做分组/置顶/拖拽）——
  没有列表就没有 Resume 入口，闭环不成立
- readonly 保护、四态覆盖（新增流程范围内）

**A 段验收：** 用 Codex 完成一次真实多轮任务；重启服务后回放完整、
resume 继续对话成功；`npm test` / `npm run build` 通过。

### MVP01-B：体验完备（对齐 Qoder）

**目标：多 CLI、多会话组织、完整 Qoder 三栏体验。**

- Claude CLI Adapter + Generic Adapter（terminal-only）
- Terminal 兜底视图（xterm.js、Transcript/Terminal tab 切换）
- 会话组织：Rename / Pin / Archive / Complete / Fork / 手动排序
- 分组（项目 / 时间 / 最近 / 手动）+ 过滤器 + 上下文菜单
- ≥ 4 并发 Session 验收 + Orchestrator 全局并发上限
- Qoder 三栏完整壳（可折叠、drawer、面板偏好持久化）
- Quest Home 创建流（Start in 下拉 + 一次提交进入 Chat View）
- Runtime Monitor 右栏 + Files / Preview / Diff / Git 只读 tab
- 权限 / 模式 capability 选择器补齐（A 段仅模型）
- **审批 UI（Approval Center 第一版）**：`approval_request` 气泡 +
  Allow/Deny——按所选 CLI headless 协议支持度实现，不支持的 CLI
  维持失败 + 指引兜底
- EN / ZH 全量、键盘可达、浏览器 E2E 冒烟

### 暂不实现（MVP01 Out of Scope）

- IDE 编辑器（Monaco）、文件编辑保存
- Git 写操作（stage / commit / checkout / push 等一律不做；
  分支切换仅限会话启动前的受控 checkout）
- Agent Workflow、多 Agent 协作、自动规划
- RAG、Repo Wiki、Memory、Knowledge Base（Sidebar 仅占位入口）
- MCP、Skill 系统、Marketplace（仅占位入口）
- Provider API 直连（对话一律经 CLI headless，凭据复用 CLI 自身配置）
- SSH 远程项目、Set Up Workspace（git clone）——入口预留，
  能力按 `prd-cli-gui-project-quest.md` 在 MVP01+ 交付
- 语音输入、prompt 润色/压缩（同上，MVP01+）
- 云端同步、多用户协作
- Tauri / Electron 打包（架构就绪即可）

------------------------------------------------------------------------

## 9. 验收与成功指标（按 A / B 分段门禁）

### MVP01-A 门禁（核心闭环成立）

- 启动 → 选中历史会话 ≤ 10s；启动 → 新建会话 ≤ 4 步 / ≤ 20s。
- chat 会话中 assistant 回复 100% 结构化呈现，正文不出现原始
  ANSI 直渲；本地轮次首段输出可见 ≤ 5s（事件到达即渲染）。
- 服务重启后 Workspace / Profile / Session / transcript 零丢失；
  迁移 fixtures 零数据丢失。
- 重连零重复事件；回放顺序与 sequence 一致；resume 后继续对话成功。
- Codex 完成一次真实本地多轮任务验证（headless 轮次 + 取消 +
  重试 + 重启回放）。
- `npm test`、`npm run build` 通过；新增文案 EN / ZH 齐备。

### MVP01-B 门禁（Qoder 体验成立）

- New Quest → 进入 Chat View ≤ 2 次显式确认。
- Rename / Pin / Archive / Complete / Fork 不需进 Settings 即可完成。
- ≥ 4 并发 Session 稳定运行，输入输出零串台。
- Claude 完成一次真实本地验证（交互 + headless 轮次 + Ctrl+C +
  resize + 正常退出）。
- 文件安全测试零越权内容；命令审计零 Git 变更操作。
- 支持审批协议的 CLI 上：`approval_request` 气泡可见且 Allow/Deny
  决定正确传达；不支持的 CLI 兜底指引可见。
- 浏览器 E2E 冒烟（三栏主流程）通过；键盘走查通过。

------------------------------------------------------------------------

## 10. 交付顺序（建议）

**MVP01-A（顺序执行，每步可验证）**

1. Schema 版本化 + 迁移框架 + 事件协议全量 kind 定义
2. Workspace / Profile / Session 基础生命周期 + 持久化
3. Runtime Orchestrator（执行上下文、轮次互斥、取消、超时）
4. Codex Adapter（headless 逐轮 + resume）+ 事件解析
5. Transcript 持久化、回放、实时去重
6. Chat View 消息流 + sanitize Markdown + 流式渲染
7. Composer + 模型选择 + 最简会话列表
8. A 段收口：真实 Codex 多轮验证 + 重启回放验证

**MVP01-B**

9. Claude / Generic Adapter + Terminal 兜底视图
10. 会话组织元数据（Pin / Archive / Complete）+ 上下文菜单 + 分组
11. 手动排序 + Fork
12. 三栏壳收口 + 面板偏好持久化 + Quest Home 创建流
13. Runtime Monitor + 右栏只读 tab
14. 权限 / 模式选择器 + 审批 UI 第一版（视 CLI 协议能力）
15. E2E 冒烟、i18n / 无障碍收尾、并发验收

------------------------------------------------------------------------

## 11. 后续 Roadmap

### MVP02 — AI IDE

- Monaco Editor、文件树编辑、Diff Review、Code Apply
- SSH 远程项目 + Set Up Workspace（承接 project-quest Feature A）
- 语音输入、prompt 润色（承接 project-quest US-B4 / B5）

形成 Cursor / Qoder 完整模式。

### MVP03 — Agent Workflow

- `/plan` `/spec` `/code` `/test` `/review`
- **Agent Profile 逻辑层**：角色化 Profile（Backend Engineer /
  Frontend Expert / QA / Architect = CLI Profile + model +
  system prompt + skills），用户选角色而非 CLI（见 §4.4 演化说明）
- Planner / Coding / QA / Reviewer Agent
- **Context Snapshot / Summary**：长会话摘要快照
  （session → events → snapshots → summary），服务自建 agent loop
  的上下文管理与跨会话摘要展示；MVP01 阶段模型上下文由 CLI 原生
  resume 承担，不在应用侧管理
- Approval Center 完整版（审批策略、批量审批、审批历史）

### MVP04 — Agent Platform

- Skill 系统、MCP、Memory、Knowledge Base（Repo Wiki）
- Evaluation、Agent Marketplace

------------------------------------------------------------------------

## 12. 追溯映射

| 本 PRD 章节 | 来源文档 | 来源章节 |
|---|---|---|
| §4.1.1 生命周期 | prd-cli-gui.md | US-003 ~ US-006, FR-1 ~ FR-18 |
| §4.1.2 组织管理 | prd-cli-gui-workbench.md | US-002, US-007 ~ US-013 |
| §4.1.4 持久化/迁移 | prd-cli-gui-workbench.md | US-001, FR-68 ~ FR-69 |
| §4.2.1 ~ 4.2.2 事件协议/回放 | prd-cli-gui-workbench.md | US-003 ~ US-004, FR-27 ~ FR-37 |
| §4.2.3 Chat 渲染 | prd-cli-gui-project-quest.md + qoder-chat-detail.md | US-C2, §4 |
| §4.2.4 对话形态 | prd-cli-gui-project-quest.md | US-C1, US-C4, FR-40 ~ FR-47 |
| §4.2.5 Composer | prd-cli-gui-workbench.md | US-016 ~ US-017 |
| §4.3 Orchestrator | 架构评审（2026-07-26）+ 现有 application.ts 职责显式化 | — |
| §4.4 Adapter | prd-cli-gui-workbench.md + project-quest | §8.5, §7 |
| §5 UI | qoder-replica-prd.md + qoder-chat-detail.md | §4 ~ §6, 全文 |
| §5 Quest Home | prd-cli-gui-project-quest.md | US-B1 ~ B3, B6 |
| §7 技术架构 | prd-cli-gui-workbench.md | §8 |

------------------------------------------------------------------------

## 总结

MVP01 的核心不是做一个聊天 UI。

核心是：

> 构建统一的 **Session Manager + Event Protocol + Chat 可视化**，
> 让任意 CLI Agent 都可以被 GUI 管理，并以 Qoder 级体验呈现。

演进路径不变：

1. 第一阶段：自己的 Codex App（MVP01，本文档）
2. 第二阶段：自己的 Qoder / Cursor（MVP02 ~ 03）
3. 第三阶段：自己的 Agent OS（MVP04）
