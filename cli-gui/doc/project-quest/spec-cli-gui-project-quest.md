# SPEC: CLI-GUI 项目入口与 New Quest 创建流技术方案

> Technical specification derived from: `cli-gui/doc/project-quest/prd-cli-gui-project-quest.md`
> Generated: 2026-07-26 | Status: Draft for review
> Companion Issues: `cli-gui/doc/project-quest/issues-cli-gui-project-quest.md`

---

## 1. Summary

### 1.1 What This SPEC Covers

本 SPEC 定义两块能力的技术方案：

- **Feature A**：项目入口三项下拉（Open Folder / Set Up Workspace / Connect SSH）、项目实体三类型化（`local-folder` / `managed-workspace` / `ssh-remote`）、左侧会话按项目分组管理。
- **Feature B**：New Quest 路由到 Quest Home 创建视图，项目 / 环境 / 分支真实下拉，composer 增强（capability 驱动配置、Web Speech API 语音输入、CLI 一次性模式润色/压缩），一次提交完成 create → start → send → ChatView。
- **Feature C**：内置对话运行时——会话默认 `chat` 交互模式，每条用户消息经所选 CLI 的 headless 非交互模式逐轮执行，JSON 事件流解析为结构化 transcript 事件并流式渲染；会话内模型切换；交互式终端保留为兜底。

### 1.2 PRD Reference

- **Primary PRD**: `cli-gui/doc/project-quest/prd-cli-gui-project-quest.md`
- **Related**: `cli-gui/doc/workbench/prd-cli-gui-workbench.md`（三栏工作台，本 SPEC 解除其 remote workspace Non-Goal）
- **Design references**: `cli-gui/DESIGN.md`（视觉契约）、`cli-gui/doc/qoder-ui/spec-cli-gui-qoder-ui.md`（既有 Qoder 壳）

### 1.3 Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 项目实体承载 | 扩展现有 `Workspace`（加 `kind`/`ssh`），不新增独立 Project 实体 | 会话、右栏、picker 全部以 workspaceId 关联，避免双实体同步成本 |
| Schema 版本 | v2 → v3，迁移默认 `kind: "local-folder"` | 沿用现有版本化 envelope + 迁移模式 |
| SSH 客户端 | 系统 `ssh` 可执行文件 + 参数数组（不引入 ssh2 npm 依赖） | 复用用户 `~/.ssh` 配置与 agent；PTY 语义天然正确；不增加原生依赖 |
| SSH host key | 应用自管 known_hosts 文件（`data/ssh_known_hosts`），首连指纹显式确认后写入 | 不污染用户 `~/.ssh/known_hosts`，`StrictHostKeyChecking=yes` 不静默接受 |
| 润色执行 | 服务端经 `ProfileAdapterRegistry` 一次性非交互调用（`codex exec` / `claude -p`） | 遵守「不做 provider API 直连」原则，能力随 profile 走 |
| 语音输入 | 纯前端 Web Speech API，无服务端点 | 已确认决策；不上传音频 |
| 分支切换 | 仅会话启动前受控 `git checkout <branch>`（allowlist 单命令），Git 只读原则的唯一显式豁免 | New Quest 选分支是核心交互；豁免范围最小化并在启动确认中展示 |
| 环境（Local/SSH）与项目关系 | 环境由项目 kind 派生，只读展示 + 联动，不允许交叉组合 | 一个项目只有一个运行位置，避免「本地项目跑远端」的未定义语义 |
| 对话引擎 | CLI headless 逐轮执行（`codex exec --json` / `claude -p --output-format stream-json` + CLI 原生 resume），不做 provider API 直连 | 已确认决策；登录态/凭据复用 CLI 自身配置，不重造 agent loop |
| 会话形态 | `Session.interactionMode: "chat" \| "terminal"`，chat 为 New Quest 默认；terminal 保留（现状行为 + 高级入口） | 已确认决策；交互式 TUI 场景（登录、审批）兜底 |
| chat 消息持久化 | 复用现有 transcript 管线（`user_input` / `markdown` / `tool_activity` / `error` 事件） | TranscriptPanel 已有 markdown/tool 渲染基础，零新存储体系 |

---

## 2. Architecture

### 2.1 System Context

```
┌────────────────────────────────────────────────────────────────┐
│ Client (React 19 + Vite)                                       │
│  Sidebar ─ AddProjectMenu(3 items) ─ SetUpWorkspaceDialog      │
│          └ ProjectGroupHeader(±/⋯/状态)   ConnectSshDialog     │
│  QuestHome ─ StartInSelectors(project/env/branch)              │
│            └ PromptComposer(voice=WebSpeech, polish→API)       │
├────────────────────────────────────────────────────────────────┤
│ Server (Node/TS, ports & adapters)                             │
│  application.ts ── workspace create(3 kinds) / ssh-test        │
│                 ── branches / enhance / session start(branch)  │
│                 ── chat turn(逐轮 headless 执行 + 事件解析)      │
│  ports.ts ─ SshRunner(新) ─ ssh 可执行文件(参数数组)            │
│           ─ PtyRuntime    ─ 本地 CLI 或 ssh -t 远端 CLI         │
│           ─ ChatTurnRunner(新) ─ codex exec --json / claude -p  │
│           ─ ProfileAdapterRegistry(+enhance/chat 一次性模式)    │
│  store.ts ─ schema v3 envelope + v2→v3 迁移                    │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Design

#### New Components

| Component | Responsibility | File |
|-----------|---------------|------|
| `AddProjectMenu` | 侧边栏三项入口下拉（复用 `ui/Menu`） | 内联于 `client/components/Sidebar.tsx` |
| `SetUpWorkspaceDialog` | 受管 workspace 创建（纳管/新建/clone 三来源） | `client/components/SetUpWorkspaceDialog.tsx` |
| `ConnectSshDialog` | SSH 项目注册 + Test Connection + 指纹确认 | `client/components/ConnectSshDialog.tsx` |
| `ProjectGroupHeader` | 项目组头（类型图标、+、⋯ 菜单、折叠、连接状态） | `client/components/ProjectGroupHeader.tsx` |
| `StartInSelectors` | Quest Home 项目/环境/分支三下拉 | `client/components/StartInSelectors.tsx` |
| `useSpeechInput` | Web Speech API 听写 hook | `client/components/useSpeechInput.ts` |
| `ChatMessageList` | chat 会话消息流（气泡、流式、工具活动、轮错误+重试），基于 transcript 事件 | `client/components/ChatMessageList.tsx` |
| `ChatTurnRunner`（端口） | chat 轮次的 headless 执行与 JSON 事件流解析 | `server/chat-turns.ts` |

#### Modified Components

| Component | Changes |
|-----------|---------|
| `client/components/Sidebar.tsx` | 头部 folder IconButton → `AddProjectMenu`；project 分组渲染 `ProjectGroupHeader`；折叠过滤 |
| `client/components/QuestHome.tsx` | Start in 三 chip 接 `StartInSelectors`；提交流打通 create→start→send；交互模式开关（默认 chat） |
| `client/components/ChatView.tsx` | 按 `interactionMode` 分支：chat 渲染 `ChatMessageList` + 轮状态（取消按钮）；terminal 保持现状；Terminal tab 在 chat 下为只读回放 |
| `client/components/PromptComposer.tsx` | `toggleMic` 接 `useSpeechInput`；`enhance` 调 `/api/prompt/enhance`；新增 profile 选择 props；chat 模式下模型切换写回会话 |
| `client/app/App.tsx` | New Quest 改路由到 quest-home；新增 create-quest 提交编排；项目管理动作接线 |
| `client/app/preferences.ts` | 新增 `collapsedProjectIds: string[]` |
| `client/app/session-selectors.ts` | project 分组带出 workspace kind / 有效性 / 连接状态 |
| `client/api.ts` | 新增 workspaces create / ssh-test / branches / enhance 客户端方法 |
| `client/i18n.tsx` | 全部新增文案 EN+ZH |
| `server/application.ts` | 新路由与业务逻辑（见 §4/§5）；`POST /api/sessions/:id/messages` 按 interactionMode 分叉（chat → 轮次执行；terminal → 现有 PTY 写入） |
| `server/ports.ts` | 新增 `SshRunner`、`ChatTurnRunner` 端口；`ProfileAdapterRegistry` 扩展 `enhance` 与 chat argv 组装 |
| `server/domain.ts` | workspace 三类校验、branch 名校验、会话启动命令组装（本地/SSH 双路径） |
| `server/store.ts` | v2→v3 迁移 |
| `server/profile-adapters.ts` | codex/claude 一次性模式 enhance 实现；chat 轮次 argv 与 JSON 事件映射；`supportsPromptEnhancement` / `supportsChatMode` |
| `shared/state.ts` / `shared/api.ts` / `shared/capabilities.ts` | 见 §3/§4 |

### 2.3 Module Interactions

```
AddProjectMenu
├── Open Folder ──────→ 现有 POST /api/workspaces/pick（kind=local-folder）
├── Set Up Workspace ─→ SetUpWorkspaceDialog → POST /api/workspaces
└── Connect SSH ──────→ ConnectSshDialog
      ├─ Test Connection → POST /api/workspaces/ssh-test（未注册态预检）
      ├─ 指纹确认 ────────→ 同端点 acceptFingerprint 二次提交
      └─ Save ───────────→ POST /api/workspaces（kind=ssh-remote）

New Quest(⌘N / 组级+) → App.setView("quest-home", { preselectWorkspaceId })
QuestHome 提交（默认 interactionMode=chat）
  → POST /api/sessions（含 workspaceId/profileId/launchConfig{branch}/interactionMode/start）
  → POST /api/sessions/:id/messages（首条 prompt；chat 会话即触发第一轮）
  → App.selectSession(id) → ChatView

chat 会话消息循环
  composer 发送 → POST /api/sessions/:id/messages
  → ChatTurnRunner 逐轮 headless 执行（本地 spawn / SSH 流式）
  → JSON 事件流 → transcript 事件（markdown/tool_activity）→ 现有 WebSocket 广播 → ChatMessageList 流式渲染
  → 轮结束：提取 CLI 原生会话 id 存入 Session.chat.resumeToken（下轮携带）
```

### 2.4 File Structure（增量）

```
cli-gui/
├── client/
│   ├── components/
│   │   ├── SetUpWorkspaceDialog.tsx   [NEW]
│   │   ├── ConnectSshDialog.tsx       [NEW]
│   │   ├── ProjectGroupHeader.tsx     [NEW]
│   │   ├── StartInSelectors.tsx       [NEW]
│   │   ├── ChatMessageList.tsx        [NEW]
│   │   ├── useSpeechInput.ts          [NEW]
│   │   ├── Sidebar.tsx                [MODIFY]
│   │   ├── QuestHome.tsx              [MODIFY]
│   │   ├── ChatView.tsx               [MODIFY]
│   │   └── PromptComposer.tsx         [MODIFY]
│   ├── app/ App.tsx / preferences.ts / session-selectors.ts  [MODIFY]
│   ├── api.ts / i18n.tsx              [MODIFY]
├── server/
│   ├── ssh-runner.ts                  [NEW] SshRunner 生产适配器
│   ├── chat-turns.ts                  [NEW] ChatTurnRunner（逐轮执行 + JSON 事件解析）
│   ├── application.ts / domain.ts / store.ts / ports.ts / profile-adapters.ts  [MODIFY]
├── shared/ state.ts / api.ts / capabilities.ts / types.ts     [MODIFY]
├── scripts/ smoke-ssh.ts              [NEW] 真实 SSH 冒烟（无环境如实 SKIP）
└── e2e/ project-quest.spec.ts         [NEW]
```

---

## 3. Data Model

### 3.1 Schema v3（`shared/state.ts`）

```typescript
export const CURRENT_SCHEMA_VERSION = 3 as const;

export type WorkspaceKind = "local-folder" | "managed-workspace" | "ssh-remote";
export type SshAuthMethod = "identity-file" | "agent";

export interface WorkspaceSshConfig {
  host: string;
  port: number;              // default 22
  user: string;
  auth: SshAuthMethod;
  identityFilePath?: string; // auth === "identity-file" 时必填；仅存路径
  remotePath: string;        // 远端项目目录绝对路径
}

export interface Workspace {
  id: string;
  name: string;
  kind: WorkspaceKind;       // NEW
  path: string;              // local: 本地绝对路径；ssh-remote: 冗余存 remotePath（兼容既有 workspaceId→path 读取方）
  ssh?: WorkspaceSshConfig;  // NEW, kind === "ssh-remote" 时必填
  origin?: { clonedFrom?: string }; // NEW, managed-workspace clone 来源
  createdAt: string;
  lastOpenedAt?: string;
}

export interface SessionLaunchConfig {
  permission: string | null;
  mode: string | null;
  model: string | null;
  branch: string | null;     // NEW
}

export type SessionInteractionMode = "chat" | "terminal"; // NEW

export interface SessionChatState {   // NEW, 仅 chat 会话
  resumeToken?: string;      // CLI 原生会话 id（codex/claude 首轮输出中提取），用于后续轮 resume
  lastModel?: string;        // 会话内当前生效模型（composer 切换写回）
}

// Session 新增字段：
//   interactionMode: SessionInteractionMode;  // v2→v3 迁移默认 "terminal"
//   chat?: SessionChatState;                  // 仅 interactionMode === "chat"
```

不变式：

- `kind === "ssh-remote"` ⟺ `ssh` 存在且完整；此时 `path === ssh.remotePath`。
- `kind !== "ssh-remote"` ⟹ `ssh === undefined`。
- 重复判定：local 类 canonical(realpath) 相同；ssh 类 `user@host:port + remotePath` 相同。
- `interactionMode === "terminal"` ⟹ `chat === undefined`；chat 会话不占用常驻 PTY。

### 3.2 Migration Plan（v2 → v3）

- `store.ts` 迁移链追加 `migrateV2ToV3`：
  - workspace：`kind = "local-folder"`，`ssh`/`origin` 不设。
  - session：`launchConfig.branch = null`，`interactionMode = "terminal"`（既有会话保持终端形态，不自动转 chat）。
- 迁移只增不删；失败走现有可恢复错误路径，不覆盖源文件。
- fixtures：v2 满数据、v2 空数据、非法 kind 值拒绝。

### 3.3 UI Preferences

`client/app/preferences.ts`：

```typescript
collapsedProjectIds: string[];   // NEW，默认 []
```

项目移除时同步清理其 id。SSH 连接状态（`unknown/reachable/unreachable`）为客户端运行时内存态（App 级 `Map<workspaceId, SshReachability>`），不持久化。

---

## 4. API Design

### 4.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workspaces` | 统一创建三类项目（替代/兼容现有创建路径） |
| POST | `/api/workspaces/ssh-test` | 注册前 SSH 预检（表单态，无 workspaceId） |
| POST | `/api/workspaces/:id/ssh-test` | 已注册 SSH 项目重测 |
| GET | `/api/workspaces/:id/branches` | 列分支（本地/SSH 双路径），30s TTL 服务端缓存 |
| POST | `/api/prompt/enhance` | 润色/压缩 |
| PATCH | `/api/workspaces/:id` | 重命名（若现状无则新增） |
| POST | `/api/sessions/:id/turn/cancel` | 取消 chat 会话进行中的轮次 |

现有 `POST /api/workspaces/pick`（loopback picker）保留，成功后落库时补 `kind: "local-folder"`。

现有 `POST /api/sessions/:id/messages` 语义按 `interactionMode` 分叉：terminal 会话保持现状（写入 PTY stdin）；chat 会话触发一轮 headless 执行（见 §5.6），请求体新增可选 `model`（本轮生效并写回 `Session.chat.lastModel`）。

### 4.2 Request/Response Schemas（`shared/api.ts` 追加）

```typescript
export type CreateWorkspaceRequest =
  | { kind: "local-folder"; name: string; path: string }
  | { kind: "managed-workspace"; name: string;
      source:
        | { type: "existing-directory"; path: string }
        | { type: "new-directory"; parentPath: string; directoryName: string }
        | { type: "git-clone"; url: string; parentPath: string; directoryName?: string } }
  | { kind: "ssh-remote"; name: string; ssh: WorkspaceSshConfig };

export interface CreateWorkspaceResponse { workspace: Workspace; duplicate?: boolean }

export interface SshTestRequest {
  ssh: WorkspaceSshConfig;
  acceptFingerprint?: string; // 首连确认后二次提交携带
}
export type SshTestResponse =
  | { ok: true; fingerprintAccepted?: boolean }
  | { ok: false; code: "SSH_HOST_KEY_REJECTED"; fingerprint: string; keyType: string }
  ; // 其余失败走标准 ApiErrorResponse

export interface BranchListResponse {
  repository: boolean;        // false = 非 git 项目（中性态）
  branches: string[];
  current?: string;
  truncated: boolean;         // 上限 200 条
}

export interface EnhancePromptRequest {
  content: string;            // ≤ 32 KiB
  profileId: string;
  action: "polish" | "compress";
  locale: "en" | "zh";
}
export interface EnhancePromptResponse { content: string }
```

`CreateSessionRequest.launchConfig` 随 `SessionLaunchConfig` 自然获得 `branch`。

### 4.3 Error Codes（`shared/api.ts` `ApiErrorCode` 追加）

```
SSH_UNREACHABLE | SSH_AUTH_FAILED | SSH_REMOTE_PATH_INVALID | SSH_HOST_KEY_REJECTED
WORKSPACE_CLONE_FAILED | WORKSPACE_CREATE_FAILED
BRANCH_LIST_FAILED | BRANCH_CHECKOUT_FAILED
ENHANCE_UNAVAILABLE | ENHANCE_FAILED | ENHANCE_TIMEOUT
CHAT_UNSUPPORTED | CHAT_TURN_IN_PROGRESS | CHAT_TURN_FAILED | CHAT_TURN_TIMEOUT
```

映射：ssh exit 255 + 连接类 stderr → `SSH_UNREACHABLE`；`Permission denied (publickey…)` → `SSH_AUTH_FAILED`；远端 `test -d` 失败 → `SSH_REMOTE_PATH_INVALID`；known_hosts 未收录 → `SSH_HOST_KEY_REJECTED`（携带指纹供确认）。

### 4.4 Breaking Changes

- `Workspace.kind` 为新增必填 → 由迁移保证存量数据补齐；`StateResponse` 消费方（client）同步更新。
- `SessionLaunchConfig.branch` 新增必填（迁移补 `null`）；`Session.interactionMode` 新增必填（迁移补 `"terminal"`）。
- New Quest 提交默认创建 chat 会话属行为变更（旧默认为交互式 PTY）；terminal 形态经模式开关 / `NewSessionDialog` 仍可达。
- 其余均为端点/错误码增量，非破坏。

---

## 5. Business Logic

### 5.1 SshRunner 端口（`server/ports.ts`）

```typescript
export interface SshRunner {
  readonly available: boolean; // ssh 可执行文件是否存在
  /** 一次性远端命令（test/branches 用）。参数数组，超时必填。 */
  exec(config: WorkspaceSshConfig, remoteArgv: string[], options: { timeoutMs: number }):
    Promise<{ exitCode: number; stdout: string; stderr: string }>;
  /** 组装交互式 PTY 的 ssh argv（不执行，由 PtyRuntime.spawn 消费）。 */
  buildPtyCommand(config: WorkspaceSshConfig, remoteArgv: string[]):
    { command: "ssh"; args: string[] };
}
```

生产适配器 `server/ssh-runner.ts` 统一 ssh 基础参数：

```
ssh -p <port> -o BatchMode=yes -o ConnectTimeout=10
    -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<data/ssh_known_hosts>
    [-i <identityFilePath>]           # auth=identity-file 时
    <user>@<host> -- <remoteArgv...>  # PTY 场景为 -t 且无 BatchMode
```

- 远端命令一律 argv 数组传入并逐段做保守 shell 转义（single-quote escaping），禁止调用方拼接字符串。
- 指纹获取：`SSH_HOST_KEY_REJECTED` 时用 `ssh-keyscan -p <port> <host>` + `ssh-keygen -lf -` 得指纹展示；用户确认后将 keyscan 结果追加入自管 known_hosts。
- 日志脱敏：identityFilePath、指纹只记 hash 前 8 位。

### 5.2 项目创建（`application.ts` + `domain.ts`）

```
POST /api/workspaces
├─ readonly? → READONLY_MODE
├─ kind=local-folder: 目录存在校验 + canonical 去重（沿用现有 domain 校验）
├─ kind=managed-workspace:
│   ├─ existing-directory: 同上
│   ├─ new-directory: parent 存在可写 && target 不存在 → mkdir → 注册
│   └─ git-clone: URL 形态校验(https://…|ssh://…|git@host:path)
│        → 参数数组 spawn `git clone -- <url> <target>`（timeout 120s）
│        → 失败: WORKSPACE_CLONE_FAILED(stderr 摘要) 且删除半成品目录、不落库
└─ kind=ssh-remote: 要求先通过 ssh-test（服务端在创建时重跑一次预检）→ 注册
```

### 5.3 SSH 连接测试

```
POST /api/workspaces/ssh-test
→ SshRunner.exec(config, ["test", "-d", remotePath], { timeoutMs: 15000 })
   ├─ exit 0 → { ok: true }
   ├─ host key 未知 → 407 语义响应 { ok:false, code:SSH_HOST_KEY_REJECTED, fingerprint }
   │    └ 客户端弹指纹确认 → 带 acceptFingerprint 重试 → 服务端校验指纹一致后写 known_hosts
   ├─ auth 失败 → SSH_AUTH_FAILED
   ├─ 连接失败/超时 → SSH_UNREACHABLE
   └─ exit 非 0（目录不存在）→ SSH_REMOTE_PATH_INVALID
```

### 5.4 分支列举与启动前 checkout

```
GET /api/workspaces/:id/branches
├─ local: git -C <path> branch --list --format=%(refname:short) + rev-parse --abbrev-ref HEAD
├─ ssh:   SshRunner.exec(config, ["git","-C",remotePath,"branch","--list","--format=%(refname:short)"])
├─ 非 git → { repository:false, branches:[] }（不报错）
└─ 失败 → BRANCH_LIST_FAILED；服务端 30s TTL 缓存 per workspaceId

会话启动（含 start-and-send 与 New Quest 提交）:
├─ launchConfig.branch 为 null 或 == 当前分支 → 跳过
├─ 否则 checkout（唯一 Git 写豁免，allowlist 单命令）:
│   local: git -C <path> checkout -- <branch> ；ssh: 远端同命令
├─ checkout 失败 → BRANCH_CHECKOUT_FAILED，会话不启动，保持 stopped/error
└─ 启动确认预览必须展示将执行的 checkout 与目标分支
```

分支名校验：拒绝以 `-` 开头、含 `..`、控制字符与空白的输入（防参数注入，`git check-ref-format` 语义子集）。

### 5.5 会话启动命令组装（本地/SSH 统一）

```typescript
// domain.ts
function buildSessionSpawn(workspace, profile, resolved): PtySpawnOptions {
  if (workspace.kind !== "ssh-remote") {
    return { command: resolved.command, args: resolved.args, cwd: workspace.path, ... };
  }
  const remoteArgv = ["cd", workspace.ssh.remotePath, "&&", resolved.command, ...resolved.args];
  // 实际实现: sshRunner.buildPtyCommand 内部对 remoteArgv 做安全转义并整体作为远端命令
  const { command, args } = sshRunner.buildPtyCommand(workspace.ssh, remoteArgv); // ssh -t ...
  return { command, args, cwd: os.homedir(), ... };
}
```

- SSH PTY 复用现有 `PtyRuntime.spawn`、WebSocket、resize、transcript 管线，零改动。
- resize/Ctrl+C 经 ssh -t 原生透传。
- ssh 进程退出（网络断开）→ 走现有 onExit → 会话 stopped/error；恢复 = 重新 spawn。
- New Quest 提交的 SSH 预检：启动前先跑一次 §5.3 test（15s 超时），失败则不创建 PTY。

### 5.6 内置对话轮次执行（`server/chat-turns.ts`）

```
POST /api/sessions/:id/messages (interactionMode=chat)
├─ readonly → READONLY_MODE；会话非 active → SESSION_NOT_ACTIVE
├─ profile capability.supportsChatMode === false → CHAT_UNSUPPORTED
├─ 已有进行中轮 → 409 CHAT_TURN_IN_PROGRESS（不排队，前端轮内禁发）
├─ append `user_input` transcript 事件（source=composer, clientMessageId）
├─ adapter.buildChatTurnArgv(profile, { prompt, model, resumeToken }):
│   codex:  codex exec --json [--model <m>] [resume <token>] <prompt>
│   claude: claude -p --output-format stream-json --verbose [--model <m>] [--resume <token>] <prompt>
│   generic: 不支持（创建时即降级 terminal，此处兜底 CHAT_UNSUPPORTED）
├─ 执行：local → spawn(argv, cwd=workspace.path)；ssh-remote → SshRunner 流式 exec（远端 cwd=remotePath，同一转义规则）
├─ stdout 按行解析 JSON 事件（NDJSON）→ 映射 transcript：
│   assistant 文本增量 → `markdown` 事件（流式 append，轮内聚合为一条消息）
│   工具调用/结果 → `tool_activity` 事件（metadata: tool/status）
│   未识别事件 → 降级为可读文本追加（不丢弃）；非 JSON 行 → `pty_output`（Terminal tab 只读回放）
├─ 轮结束（exit 0）：从事件流提取 CLI 原生 session id → `Session.chat.resumeToken`；写 `lifecycle`(turn-completed)
├─ exit 非 0 → `error` 事件 + CHAT_TURN_FAILED（stderr 摘要 ≤ 500B），支持重发同一消息
├─ 超时（无输出 10min 判停滞；硬上限 30min）→ kill → CHAT_TURN_TIMEOUT
└─ 取消（POST :id/turn/cancel）→ kill 进程 → `lifecycle`(turn-cancelled)，会话保持可用
```

- 每会话同时至多一个轮次进程（内存 `Map<sessionId, turnProcess>`）；服务重启时进行中轮落为 `error` 事件，可重发。
- `resumeToken` 失效（CLI 端会话被清理）→ 自动以无 token 重试一次并写入提示事件（上下文从当前轮重新开始）。
- runtimeStatus 映射：轮执行中 = `running`，空闲 = `stopped`；ChatView 按 interactionMode 决定按钮语义（chat 不显示 Resume/Stop，显示「取消本轮」）。
- 模型参数优先级：请求体 `model` > `Session.chat.lastModel` > `launchConfig.model` > CLI default。
- prompt 经 stdin 或单个 argv 元素传入（参数数组，绝不拼 shell 字符串）；超长 prompt（> 100KiB）拒绝并提示。

### 5.7 润色 / 压缩

```
POST /api/prompt/enhance
├─ readonly? → READONLY_MODE；content 空/超 32KiB → VALIDATION_FAILED
├─ profile capability.supportsPromptEnhancement === false → ENHANCE_UNAVAILABLE
├─ adapter 组装一次性 argv:
│   codex:  codex exec --skip-git-repo-check <instruction+content>
│   claude: claude -p <instruction+content>
│   generic: 不支持 → ENHANCE_UNAVAILABLE
├─ instruction 模板（内置，locale 分 en/zh）:
│   polish:   "Rewrite the following task prompt to be clear, specific and well-structured.
│              Reply with the rewritten prompt only." + 原文
│   compress: "Compress the following prompt, keep all constraints. Reply with result only." + 原文
├─ spawn timeout 30s → ENHANCE_TIMEOUT；非 0 退出/空输出 → ENHANCE_FAILED
└─ stdout trim 后返回（≤ 64KiB 截断保护）
```

`shared/capabilities.ts`：

```typescript
export interface CliProfileCapabilities {
  // ...existing
  supportsPromptEnhancement: boolean; // NEW: codex/claude true, generic false
  supportsChatMode: boolean;          // NEW: headless 多轮对话（codex/claude true、generic false）
}
```

### 5.8 语音输入（`client/components/useSpeechInput.ts`）

```
useSpeechInput({ locale, onInterim, onFinal }):
├─ supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window
├─ start(): recognition.lang = locale==="zh" ? "zh-CN" : "en-US";
│           interimResults = true; continuous = true
├─ onresult: interim 段回调 onInterim（composer 以「已确认文本 + interim 灰显」渲染）
│           final 段回调 onFinal 追加进 content
├─ onerror("not-allowed") → 状态 permission-denied（composer 显示恢复指引 toast）
├─ stop()/组件卸载 → recognition.abort()
└─ 不支持 → { supported:false }（按钮保留现有降级 toast 行为）
```

### 5.9 New Quest 提交编排（`App.tsx`）

```
submitQuest({ workspaceId, profileId, launchConfig, interactionMode, prompt }):
1. guard: 提交中置 busy，防重复
2. name = prompt 首行 trim 截 60 字符（空则 "New Quest"）
3. profile 不支持 chat 且 interactionMode=chat → 降级 terminal + 提示（创建前判定）
4. POST /api/sessions { name, workspaceId, profileId, launchConfig, interactionMode, start:true, confirmed:true }
   └ 失败: composer 保留 prompt，展示错误（含 BRANCH_CHECKOUT_FAILED / SSH_* 细分文案）
5. startupError 存在 → 会话为 error 态，仍选中并进 ChatView，prompt 回填 composer
6. 成功 → POST messages(首条 prompt, clientMessageId) → selectSession → view="chat"
   （chat 会话：start 不创建 PTY，首条 messages 即第一轮；terminal 会话：现状行为）
```

预选规则：`preselectWorkspaceId`（组级 + 传入）> 活跃会话的 workspaceId > `lastOpenedAt` 最新项目 > 空态。

### 5.10 项目分组与管理（Sidebar）

- `session-selectors.ts` project 分组返回 `{ workspace, kind, pathValid, sessions }`；空项目也渲染组头（对齐截图「No Quest yet」）。
- 折叠：组头箭头 toggle → `collapsedProjectIds` 持久化；折叠时隐藏组内列表。
- 组级菜单：Rename（复用现有重命名 dialog 模式）、Remove（`WORKSPACE_IN_USE` 时确认级联语义：先提示会话数，确认后逐会话删除再删项目；不动磁盘）、New Quest here。
- SSH 状态点：进入 app / 手动重测时调 `:id/ssh-test`，结果入内存 Map；`unreachable` 时组头 warning 图标 + title。
- 本地路径失效：`GET /api/state` 响应中服务端附 `pathValid`（stat 探测，失败不阻塞 state 返回）。

### 5.11 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| clone 目标目录已存在 | 创建前拒绝（`WORKSPACE_CREATE_FAILED`），不覆盖 |
| clone 中途取消/服务重启 | 半成品目录带 `.git` 不完整 → 创建流失败清理；重启后无残留注册 |
| SSH known_hosts 指纹变化（可能中间人） | `StrictHostKeyChecking=yes` 直接失败 → 显示「host key 已变化」危险提示，不提供一键覆盖 |
| identity file 路径不存在 | 表单即时校验 + 服务端 `SSH_AUTH_FAILED` 兜底 |
| 分支下拉打开时项目被移除 | 请求 404 → 下拉关闭 + toast |
| 语音听写中用户手动编辑输入框 | interim 缓冲丢弃，final 追加到光标位置 |
| 润色期间用户切换会话/视图 | 请求结果按 composer 实例 id 丢弃，不误写 |
| 润色返回超长 | 64KiB 截断 + 提示 |
| chat 轮进行中用户再发消息 | 前端禁发 + 服务端 409 `CHAT_TURN_IN_PROGRESS` 兜底 |
| chat 轮进行中服务重启 | 该轮落 `error` 事件，会话可用，支持重发 |
| resumeToken 失效/CLI 升级清理会话 | 无 token 重试一次 + 提示事件（上下文重开） |
| CLI 输出非 JSON 行（warning/登录提示） | 归入 `pty_output`（Terminal tab 可查），不污染消息流 |
| chat 轮需要交互（登录/审批） | headless 模式下 CLI 自行失败/跳过 → `error` 事件附指引文案（先在终端型会话/本机完成后重试） |
| SSH 会话运行中网络闪断 | ssh 退出 → stopped/error；恢复按钮重建（现有 resume 流） |
| readonly 模式 | 三项入口、组级管理、提交、润色全部禁用（现有 readonly gating 模式） |

---

## 6. Error Handling

### 6.1 Error Taxonomy（新增，含 i18n 文案键）

| Error Code | Condition | User Message (en/zh key) |
|------------|-----------|--------------------------|
| `SSH_UNREACHABLE` | 连接失败/超时 | sshUnreachable |
| `SSH_AUTH_FAILED` | 认证失败 | sshAuthFailed |
| `SSH_REMOTE_PATH_INVALID` | 远端目录不存在/非目录 | sshRemotePathInvalid |
| `SSH_HOST_KEY_REJECTED` | host key 未确认/已变化 | sshHostKeyRejected |
| `WORKSPACE_CLONE_FAILED` | git clone 失败 | workspaceCloneFailed（附 stderr 摘要 ≤ 500B） |
| `WORKSPACE_CREATE_FAILED` | mkdir/纳管失败 | workspaceCreateFailed |
| `BRANCH_LIST_FAILED` | 分支列举失败 | branchListFailed |
| `BRANCH_CHECKOUT_FAILED` | 启动前 checkout 失败 | branchCheckoutFailed（附 git stderr 摘要） |
| `ENHANCE_UNAVAILABLE` | profile 不支持 | enhanceUnavailable |
| `ENHANCE_FAILED` | CLI 非 0/空输出 | enhanceFailed |
| `ENHANCE_TIMEOUT` | 超 30s | enhanceTimeout |
| `CHAT_UNSUPPORTED` | profile 不支持 headless 多轮 | chatUnsupported |
| `CHAT_TURN_IN_PROGRESS` | 同会话已有进行中轮次 | chatTurnInProgress |
| `CHAT_TURN_FAILED` | 轮次 CLI 非 0 退出/解析失败 | chatTurnFailed（附 stderr 摘要 ≤ 500B） |
| `CHAT_TURN_TIMEOUT` | 停滞 10min / 硬上限 30min | chatTurnTimeout |

### 6.2 Retry Strategy

- ssh-test / branches：用户手动重试（按钮），无自动重试。
- enhance：手动重试，原文始终保留。
- chat 轮次：失败轮在消息流中提供「重试」（重发同一消息，新 clientMessageId 关联原消息）；仅 resumeToken 失效场景自动重试一次。
- clone：失败清理后可整表单重提。
- 会话启动失败：沿用现有 error 态 + resume。

### 6.3 Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| 本机无 ssh 可执行文件 | SSH 功能不可用 | `SshRunner.available=false` → Connect SSH 入口禁用并解释 |
| 远端无所选 CLI | SSH 会话启动即退 | 现有 startupError 路径 + stderr 展示 |
| CLI 未登录/凭据过期 | chat 轮次失败 | `error` 事件附登录指引（在终端型会话或本机 shell 完成 CLI 登录后重试） |
| CLI headless JSON 格式随版本变化 | 事件解析失效 | adapter 按 `adapterVersionRange` 判定；未知事件降级可读文本，解析异常归 `CHAT_TURN_FAILED` 不崩流程 |
| known_hosts 文件损坏 | SSH 全部失败 | 视为空文件重建（首连重新确认指纹） |
| Web Speech 服务端（浏览器厂商）不可达 | 听写 onerror("network") | 停止并 toast，提示改用键入 |

---

## 7. Security

- **SSH 凭据**：不采集/不存储密码；identity file 仅存路径；state.json 中 `ssh` 字段不含任何 secret 材料。
- **Host key**：`StrictHostKeyChecking=yes` + 应用自管 known_hosts；首连指纹显式确认；指纹变化不提供一键信任。
- **命令注入**：所有 git / ssh / CLI 调用均参数数组 spawn；远端 argv 统一 single-quote 转义；分支名、目录名、URL 服务端校验（§5.4 规则 + URL scheme allowlist）。
- **路径安全**：new-directory / clone 目标 canonical 化，禁止越过 parentPath；沿用现有 workspace 越界防护。
- **Enhance**：content 上限 32KiB、输出 64KiB、超时 30s；不落日志明文（只记长度与耗时）。
- **Chat 轮次**：prompt/回复不落服务日志明文（只记轮次耗时、事件计数、退出码）；headless argv 同参数数组原则；resumeToken 视为不敏感但不对外暴露于 state API 以外。
- **Loopback/origin**：新写端点全部沿用现有 origin 校验与 csrfCapability 机制；readonly 模式 403。
- **日志脱敏**：host、user 可记录；identityFilePath、指纹哈希化。

---

## 8. Performance

- 分支列举：服务端 30s TTL 缓存；SSH 路径 15s 超时；下拉打开才触发（懒加载）。
- SSH 状态探测：仅进入 app 时对 ssh 项目并发探测（上限并发 3）+ 手动重测，不轮询。
- clone：120s 超时，进行中允许用户关闭对话框（后台完成后 toast）。
- 语音 interim 回填走本地 state，不打 API。
- chat 事件流：服务端按行缓冲解析 NDJSON；transcript 批量 flush 沿用现有节流机制；流式渲染复用现有 WebSocket transcript 订阅，不新增长连接。
- 项目分组渲染沿用现有 memo 模式，折叠组跳过子列表渲染。

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Target | Test | Mock |
|--------|------|------|
| `store.ts` 迁移 | v2→v3 fixtures 零丢失、默认值、非法值拒绝 | 内存文件 |
| `domain.ts` | 三类创建校验、分支名校验、SSH argv 组装与转义 | — |
| `ssh-runner.ts` | 参数拼装、stderr → 错误码映射、指纹解析 | 假 ssh 脚本 |
| `application.ts` | workspaces/ssh-test/branches/enhance 端点（含 readonly、校验、错误码） | 注入 SshRunner/GitInspector mock |
| `profile-adapters.ts` | codex/claude enhance argv、超时、空输出 | 假 CLI 脚本 |
| `useSpeechInput` | supported 探测、interim/final 回调、权限拒绝 | SpeechRecognition stub |
| `SetUpWorkspaceDialog`/`ConnectSshDialog` | 表单校验、状态机（loading/失败/指纹确认） | api mock |
| `Sidebar`/`ProjectGroupHeader` | 三项菜单、组级动作、折叠持久化 | callback props |
| `StartInSelectors` | 联动、非 git 中性态、失败重试 | api mock |
| `chat-turns.ts` | 轮次编排（并发 409、超时、取消）、NDJSON → transcript 事件映射、resumeToken 提取、非 JSON 行降级、错误码映射 | 假 NDJSON CLI 脚本 |
| `ChatMessageList` | 用户/助手气泡、流式增量渲染、tool_activity 折叠、失败轮重试入口 | transcript 事件 fixture |

### 9.2 Integration / E2E（Playwright，`e2e/project-quest.spec.ts`）

1. 三项下拉 → Set Up Workspace（new-directory，临时 fixture 目录）→ 项目组出现。
2. Open Folder 手动路径回退 → local-folder 项目组出现。
3. Connect SSH（mock SshRunner 的测试服务配置）→ 指纹确认 → 注册 → 状态点 reachable。
4. New Quest → 预选项目 → 分支下拉（fixture git repo 双分支）→ 选非当前分支 → 提交 → ChatView 出现 + 左侧新会话入组。
5. 润色（假 CLI echo adapter）→ 输入被替换 + 撤销恢复。
6. readonly 模式全入口禁用。
7. 内置对话：New Quest 提交（chat 会话，假 NDJSON adapter）→ 助手气泡流式渲染 + tool_activity 折叠 → 模型切换后下一轮生效 → 取消本轮 → 失败轮重试。

### 9.3 真实环境冒烟

- `scripts/smoke-ssh.ts`：读取 `SMOKE_SSH_HOST/USER/...` 环境变量；缺失则 `process.exit(0)` 如实 SKIP（沿用 `smoke:real-cli` 惯例）；存在则跑 test → branches → 启动远端 `echo` 会话 → transcript 断言。

### 9.4 Acceptance Criteria Mapping

| PRD FR | Test | Type |
|--------|------|------|
| FR-1..10 | 单测（domain/application）+ E2E 1-3 | Unit+E2E |
| FR-11..17 | Sidebar/ProjectGroupHeader 单测 + E2E 1-3 | Unit+E2E |
| FR-18..26 | StartInSelectors/App 单测 + E2E 4 | Unit+E2E |
| FR-27..32 | useSpeechInput/adapters 单测 + E2E 5 | Unit+E2E |
| FR-33..35 | ssh-runner 单测 + 冒烟脚本 | Unit+Smoke |
| FR-36..39 | readonly/迁移/i18n 单测 + E2E 6 | Unit+E2E |
| FR-40..47 | chat-turns/ChatMessageList 单测 + E2E 7 | Unit+E2E |

---

## 10. Implementation Plan

| Phase | Deliverables | Issues |
|-------|--------------|--------|
| Phase 1: 数据与迁移 | schema v3、迁移、fixtures | #1 |
| Phase 2: 项目 API | POST /api/workspaces 三类、clone、重命名 | #2 |
| Phase 3: SSH 基础 | SshRunner、ssh-test、known_hosts、指纹流 | #3 |
| Phase 4: SSH 运行时 | PTY over ssh、预检、恢复、冒烟脚本 | #4 |
| Phase 5: 侧边栏 | 三项下拉、两个 Dialog、项目组头管理、折叠 | #5 |
| Phase 6: Quest Home | StartInSelectors、branches API、预选、提交编排 | #6 |
| Phase 7: 内置对话运行时 | interactionMode/chat 状态、ChatTurnRunner、turn/cancel、ChatMessageList、模型切换 | #7 |
| Phase 8: Composer | 语音 hook、enhance API + adapter、撤销 | #8 |
| Phase 9: 验证收尾 | E2E、i18n/a11y 审查、文档同步 | #9 |

依赖：#1 → #2 → {#3 → #4, #5} → #6 → {#7, #8} → #9（#5 可与 #3 并行；#7 与 #8 可并行）。

---

## 11. Open Questions & Risks

### 11.1 Unresolved Questions（承接 PRD §10）

1. host key 是否需要「仅本次接受」级别 —— 本 SPEC 先只做永久信任（写自管 known_hosts）。
2. 润色模板是否开放 Settings 编辑 —— 本期内置固定模板，键留 `enhanceTemplate.*` 便于后续开放。
3. per-project 默认 profile —— 本期不做，`Workspace` 预留位不加字段。

### 11.2 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ssh -t 下远端 CLI 的 TUI 兼容性（TERM/locale） | 花屏/乱码 | spawn env 透传 `TERM=xterm-256color`、`LANG`；冒烟验证 codex |
| 远端 shell 差异（fish/nushell）导致 cd && 语义差异 | 启动失败 | 远端命令统一包 `sh -lc '<escaped>'` 执行 |
| Web Speech API 在非 Chrome 浏览器缺失 | 功能不可用 | supported 探测 + 降级文案；README 标注 Chrome 优先 |
| `codex exec`/`claude -p` 标志随版本变化 | enhance 失败 | adapter 按 `adapterVersionRange` 判定；失败归 `ENHANCE_FAILED` 不崩流程 |
| checkout 豁免被误扩大 | 违背 Git 只读原则 | allowlist 仅 `checkout <branch>` 单形态；审计测试断言无其他写命令 |
| CLI resume 机制差异（codex `resume` vs claude `--resume`，token 格式随版本漂移） | 多轮上下文断裂 | resumeToken 提取逻辑归 adapter 各自实现并单测；提取失败仅告警降级为无上下文新轮，不阻塞对话 |
| headless 输出 JSON schema 随 CLI 版本变化 | 气泡渲染缺失/错乱 | 未知事件类型走可读文本兜底渲染；非 JSON 行降级 `pty_output`；adapter 按 `adapterVersionRange` 判定 |

### 11.3 Assumptions

- 沿用 PRD §9 全部假设。
- 现有 `POST /api/sessions` 的 start/confirm 语义不变，仅扩展 launchConfig。
- `NewSessionDialog` 保留且不在本 SPEC 改造范围（仅入口降级为高级路径）。
