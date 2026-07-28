# SPEC: Agent Console MVP01 — 领域模型（domain-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.1、§6
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-2、D-10）
> 现有契约：`cli-gui/shared/state.ts`（schema v2）——本 SPEC 描述 v3 增量

## 1. Summary

定义 MVP01 的四个持久化实体（Session / Workspace / Profile / TranscriptEvent
引用）与两个运行时概念（RuntimeWorker / ChatTurn），及其状态机与不变式。
TranscriptEvent 的结构详见 [event-protocol-spec.md](./event-protocol-spec.md)，
持久化编码详见 [storage-spec.md](./storage-spec.md)。

---

## 2. 实体定义（schema v3）

### 2.1 Session（MODIFY：v2 基础上新增 2 个字段）

```ts
// shared/state.ts — SessionV3
interface SessionV3 {
  id: string;
  name: string;
  workspaceId: string;
  profileId: string;

  /** NEW: 交互模式，创建时确定，不可变更（Fork 时继承，可改） */
  interactionMode: "chat" | "terminal";

  runtimeStatus: "starting" | "running" | "stopped" | "error";
  organizationStatus: "active" | "completed" | "archived";
  pinned: boolean;
  manualOrder: number;

  launchConfig: {
    permission: string | null;   // null = CLI default
    mode: string | null;
    model: string | null;
    branch?: string | null;      // NEW（B 段）：启动前受控 checkout 的分支
  };

  /** NEW: chat 模式的多轮上下文（terminal 模式恒为 undefined） */
  chatContext?: {
    /** CLI 原生 resume 凭据：codex thread id / claude session id */
    resumeToken?: string;
    /** 当前生效模型；composer 内切换后下一轮生效并持久化 */
    activeModel?: string;
    /** 最近一次成功轮次完成时间 */
    lastTurnCompletedAt?: string;
  };

  // Fork 血缘（已存在，语义不变）
  parentSessionId?: string;
  forkEventId?: string;
  forkSequence?: number;
  forkedAt?: string;

  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  archivedAt?: string;
  exitCode?: number;
  error?: { code: string; message: string; occurredAt: string };
  revision: number;              // 乐观锁（已存在）
}
```

字段约束：

- `interactionMode` 在创建时由「用户选择 ∩ Profile capability」决定：
  Profile 不支持 headless 多轮时，创建流明确降级为 `terminal` 并解释
  （PRD §4.2.4），**不允许**创建后切换（Fork 出的子会话可选择新模式）。
- `chatContext.resumeToken` 只由 Orchestrator 在轮次成功完成后写入
  （来源：Adapter 解析出的 CLI 会话标识）；用户不可编辑。
- `launchConfig.model` 是「下次启动/Fork 生效」的启动配置；
  `chatContext.activeModel` 是 chat 会话内「下一轮生效」的运行值，两者独立。

### 2.2 Workspace（MODIFY：新增 kind 预留位）

```ts
interface WorkspaceV3 {
  id: string;
  name: string;
  path: string;                  // canonical（realpath），已存在
  /** NEW: MVP01 恒为 "local-folder"；managed-workspace / ssh-remote 为预留值 */
  kind: "local-folder" | "managed-workspace" | "ssh-remote";
  createdAt: string;
  lastOpenedAt?: string;
}
```

不变式（均已由现有 `store.ts`/`application.ts` 实现，保持）：

- `path` 必须存在且为目录；canonical 路径全局唯一（去重）。
- 被任何 Session 引用时删除受保护（`WORKSPACE_IN_USE`）。

### 2.3 CliProfile（已存在，语义澄清）

```ts
interface CliProfileV3 {
  id: string;
  name: string;
  command: string;               // 可执行文件
  args: string[];                // 参数数组，禁止 shell 字符串（安全基线）
  adapterId: "codex" | "claude-code" | "generic";
  adapterVersionRange?: string;
  createdAt: string;
}
```

- 默认内置 Codex CLI、Claude CLI 两个 Profile（现有 `defaultProfiles()` 保持）。
- MVP03 演化预留：Profile 是**物理层**；未来 Agent Profile 逻辑层将以
  `cliProfileId` 引用本实体，因此 v3 迁移不得移除/重命名现有字段。

### 2.4 AppState 根

```ts
interface AppStateV3 {
  workspaces: WorkspaceV3[];
  profiles: CliProfileV3[];
  sessions: SessionV3[];
}
// envelope: { schemaVersion: 3, state: AppStateV3 }
```

---

## 3. 状态机

### 3.1 runtimeStatus（已存在，chat 模式复用）

```
              start(confirmed)
   stopped ────────────────────→ starting ──spawn ok──→ running
      ↑                             │                      │
      │                             └──spawn fail──→ error │
      │                                                ↑   │
      └──── stop / 进程退出 / 服务重启恢复 ─────────────┴───┘
```

- chat 模式语义：`running` = 存在进行中轮次或 Worker 保持活跃；
  轮次之间会话保持 `running`（Worker 不销毁），显式 stop 或超时回收才回
  `stopped`。首轮通过 start-and-send 触发 `stopped → running`。
- 服务重启后无法确认存活的进程统一标记 `stopped`（现有 `migrateAndValidate`
  已强制 `runtimeStatus: "stopped"`，保持）。
- 恢复（Resume）：复用原 Workspace/Profile/名称创建新执行上下文，
  绝不复用失效句柄；chat 模式额外携带 `chatContext.resumeToken`。

### 3.2 organizationStatus（已存在，与 runtimeStatus 正交）

```
   active ──complete──→ completed ──reopen──→ active
     │
     └────archive────→ archived ──restore──→ active
```

- Archive/Complete 运行中会话：先二次确认 → 停止 Worker → 变更组织状态
  （现有 `stopRunning` + `SESSION_RUNNING_CONFIRMATION_REQUIRED` 语义保持）。
- 只有 `active` 会话可启动/接收消息（`SESSION_NOT_ACTIVE`）。

### 3.3 ChatTurn（NEW，运行时对象，不入 state.json — 决策 D-10）

```
   pending ──spawn──→ running ──事件流结束(exit 0)──→ completed
                        │ │ │
        cancel ─────────┘ │ └── approval_request ──→ waiting_approval
                          │                            │ approve/deny/timeout
      timeout / exit≠0 ───┴──→ failed                  └──→ running / failed
```

详细编排语义见 [runtime-orchestrator-spec.md](./runtime-orchestrator-spec.md)。
轮次边界通过 transcript 事件的 `metadata.turnId` 持久化，重启后轮次历史
可完整从事件流推导。

---

## 4. 领域不变式（实现与测试的断言清单）

| # | 不变式 | 执行层 |
|---|---|---|
| I-1 | Session 的 workspaceId/profileId 必须引用存在实体 | store 迁移 + API 校验（已存在） |
| I-2 | 同一 chat 会话同时至多一个进行中轮次 | Orchestrator 轮次互斥 |
| I-3 | `interactionMode === "terminal"` ⇒ `chatContext === undefined` | store 迁移 + API 校验 |
| I-4 | Fork 子会话以 `stopped` 创建，不克隆父执行上下文 | 已存在，保持 |
| I-5 | `forkSequence` 是父会话已持久化的最新 sequence（分叉边界） | 已存在，保持 |
| I-6 | Fork 血缘无环：`parentSessionId ≠ self`，且引用存在 | 已存在（store 校验），保持 |
| I-7 | 删除 Session：级联删除 own transcript；绝不触碰工作区磁盘文件 | 已存在，保持 |
| I-8 | 有子 Fork 的会话，父 transcript 在 fork 边界前的事件受保留保护 | 已存在（retentionFloor），保持 |
| I-9 | `revision` 单调递增；所有元数据变更走乐观锁 | 已存在，保持 |
| I-10 | 组织状态与运行状态独立变更，互不隐式联动（除确认后的 stop） | 已存在，保持 |

---

## 5. Fork 语义（承接 PRD §4.1.2，现状核对）

现有实现已满足，v3 无行为变更，仅补 chat 字段的继承规则：

- 继承：Workspace / Profile / launchConfig / `interactionMode`。
- **不继承**：`chatContext.resumeToken`（CLI 侧上下文无法安全分叉；
  子会话首轮为全新 CLI 会话，其 transcript 前缀通过 `forkSequence`
  只读回放呈现）。此限制需在 Fork 确认对话框中向用户说明（frontend-spec）。
- Fork 是会话分支，不是 Git 分支（UI 文案必须区分）。

---

## 6. Edge Cases

| 场景 | 处理 |
|---|---|
| 创建 chat 会话但 Profile 为 generic | 降级 `terminal` + 创建流内解释（不报错） |
| resumeToken 存在但 CLI 侧会话已失效 | 轮次 failed + `error` 事件；`chatContext.resumeToken` 保留供排障，用户重试时 Adapter 决定是否重建 |
| terminal 会话收到 composer 消息 | 走现有 PTY 写入路径（`user_message` 事件 + write），行为不变 |
| v2 数据迁移时 session 无 interactionMode | 默认 `terminal`（历史会话全部是 PTY 会话，见 storage-spec §3） |
| 删除有子 Fork 的会话 | 现有 `SESSION_HAS_FORKS` 拒绝语义保持 |

## 7. PRD 映射

| PRD | 本 SPEC |
|---|---|
| §4.1.1 生命周期 | §3.1 |
| §4.1.2 组织管理 / Fork | §3.2、§5 |
| §4.1.3 Workspace/Profile | §2.2、§2.3 |
| §4.2.4 interactionMode | §2.1、§3.1 |
| §6 数据模型 | §2 全部 |
