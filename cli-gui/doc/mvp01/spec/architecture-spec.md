# SPEC: Agent Console MVP01 — 架构总纲（architecture-spec）

> 派生自：`cli-gui/doc/mvp01/Agent_Console_MVP01_PRD.md` v0.3（§2、§4、§7、§8）
> 生成日期：2026-07-26 ｜ 目标代码库：`cli-gui/`（现有 Node.js + React 实现栈，Go/Gin/SQLite 方案已废弃）
> 本文件是 9 份 SPEC 的总纲与索引；实现前先读本文件，再按依赖顺序读分册。

## 1. Summary

### 1.1 本 SPEC 体系覆盖范围

MVP01 = Session Manager + Event Protocol + Chat 可视化 三位一体的最小闭环，
分 MVP01-A（核心闭环）与 MVP01-B（Qoder 体验）两段交付。现有 `cli-gui/`
代码已交付约 60% 的地基（Session/Workspace/Profile 生命周期、PTY、
append-only transcript、schema v2 持久化、安全基线），本 SPEC 体系描述
**在现有实现上的增量演进**，不是重写。

### 1.2 SPEC 分册索引

| 分册 | 职责 | 主要对应 PRD 章节 |
|---|---|---|
| [architecture-spec.md](./architecture-spec.md)（本文件） | 分层纪律、模块边界、文件结构、设计决策 | §2、§7 |
| [domain-spec.md](./domain-spec.md) | 实体、状态机、不变式、Fork 血缘 | §4.1、§6 |
| [event-protocol-spec.md](./event-protocol-spec.md) | 事件协议全量 kind、sequence 语义、回放去重 | §4.2.1、§4.2.2 |
| [runtime-orchestrator-spec.md](./runtime-orchestrator-spec.md) | Runtime Worker、轮次互斥、取消/超时/重试、并发上限、审批等待 | §4.3 |
| [adapter-spec.md](./adapter-spec.md) | AgentAdapter 接口、Codex/Claude/Generic 适配器 | §4.4 |
| [storage-spec.md](./storage-spec.md) | schema v3 版本化迁移、state/transcript 存储 | §4.1.4、§6 |
| [api-spec.md](./api-spec.md) | HTTP 端点、WebSocket 帧、错误码 | §4.2.2、§4.2.5 |
| [frontend-spec.md](./frontend-spec.md) | 三栏壳、Chat View、Composer、Quest Home | §5、§4.2.3 |
| [test-spec.md](./test-spec.md) | 分层测试策略、A/B 门禁映射 | §9 |

阅读/实现依赖顺序（与 PRD §10 交付顺序一致）：

```
domain-spec ─┬→ event-protocol-spec ─┬→ storage-spec ─→ api-spec ─→ frontend-spec
             │                       │
             └→ adapter-spec ────────┴→ runtime-orchestrator-spec
                                                    ↑
test-spec 横切全部分册                    architecture-spec 约束全部分册
```

### 1.3 设计决策汇总（Design Decisions）

各分册引用的决策以 D-x 编号，理由集中记录于此：

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| D-1 | 实现栈 | 沿用 `cli-gui/` 现有 Node.js HTTP+WS + React 栈 | PRD §7 明示；避免重写已交付能力 |
| D-2 | schema 演进 | state schema v2 → v3（新增 `interactionMode`、`chatContext`），迁移框架在 A 段一次到位 | PRD §8「地基必须在 A 段一次到位」；现有 `store.ts` 已有 envelope+migrate 骨架 |
| D-3 | 事件 kind 对齐 | 写入侧使用 PRD 规范 kind（`user_message`/`assistant_message` 等）；历史 transcript 文件**不重写**，读侧对 legacy kind（`user_input`/`markdown`/`permission_request`）做规范化别名映射 | transcript 是 append-only 审计资产，重写破坏不可变性；映射成本低且可测试 |
| D-4 | Orchestrator 落位 | 从 `application.ts` 抽出独立 `server/orchestrator.ts`，以 `RuntimeOrchestrator` port 显式化 | PRD §4.3「显式化为独立契约」；application.ts 已超 1000 行，职责过载 |
| D-5 | chat 轮次执行 | 每轮 spawn 一个 headless 子进程（`child_process`，非 PTY），argv 由 Adapter `buildTurn` 组装，stdout 流经 Adapter `parseEvents` 解析 | 对齐 `codex exec --json` / `claude -p --output-format stream-json` 官方非交互协议；多轮上下文经 CLI 原生 resume |
| D-6 | 并发上限策略 | 全局运行中 Session 上限默认 8（env `SPECOS_MAX_RUNNING_SESSIONS`，下限 4），超限**明确拒绝**并返回 `SESSION_CONCURRENCY_LIMIT`，不做隐式排队 | PRD §4.3 允许「排队或明确拒绝」；拒绝语义更简单、可解释，排队作为 MVP01+ 演进位 |
| D-7 | 轮次超时 | 轮次级超时默认 10 分钟（env `SPECOS_TURN_TIMEOUT_MS`），超时→轮次 failed + `error` 事件；失败轮次仅用户显式重试 | PRD §4.3「不自动重放」 |
| D-8 | 审批协议 | `approval_request`/`approval_response` 两个 kind 在 A 段进事件协议与 Orchestrator 挂起语义；审批 HTTP 端点与 UI 在 B 段 | PRD §4.2.1「协议预留零成本，事后补协议代价高」 |
| D-9 | Adapter 无状态性 | AgentAdapter 为纯翻译层：不持进程句柄、不做执行控制、不写存储 | PRD §4.4 分层纪律；执行控制归 Orchestrator |
| D-10 | Turn 不入 state.json | ChatTurn 是运行时对象，仅存在于 Orchestrator 内存；轮次边界通过 transcript 事件 `metadata.turnId` 持久化 | 轮次状态可由事件流推导，避免双写不一致 |

---

## 2. Architecture

### 2.1 System Context（分层与纪律）

```
Browser (React 三栏工作台)
   │  HTTP /api/* + WS /ws (events / terminal)
   ▼
Session Manager          ── 会话是什么：元数据、组织状态、持久化
   │                        (application.ts 收敛为路由 + 会话服务)
   ▼
Runtime Orchestrator     ── 怎么跑：Runtime Worker、轮次互斥、取消、
   │                        超时、重试、审批等待、全局并发上限
   ▼                        (NEW: server/orchestrator.ts)
CLI Adapter              ── 无状态翻译：capability、argv、事件解析
   │                        (server/profile-adapters.ts 演进为 AgentAdapter)
   ▼
Codex / Claude / Generic CLI（GLM/Kimi 为 MVP01+ 扩展位）
```

分层禁令（违反即架构缺陷，review 必查）：

- Session Manager 不直接 spawn 进程；一切执行经 Orchestrator。
- Orchestrator 不理解任何 CLI 语义（不出现 `codex`/`claude` 字符串字面量）。
- Adapter 不持有进程句柄、不访问 StateRepository/TranscriptRepository。
- 不重新实现 CLI 的 agent loop；模型上下文由 CLI 原生 resume 承担（MVP03 才引入应用侧 Context Snapshot）。

### 2.2 Component Design

| 组件 | 位置 | 状态 | 职责 |
|---|---|---|---|
| HTTP/WS Server | `server/http-server.ts` | 已存在 | host/origin/CSRF 校验、升级处理 |
| Application | `server/application.ts` | MODIFY | 路由 + 会话服务；执行控制迁出到 Orchestrator |
| RuntimeOrchestrator | `server/orchestrator.ts` | NEW | Runtime Worker 生命周期、轮次编排（见 runtime-orchestrator-spec） |
| ChatTurnRunner | `server/turn-runner.ts` | NEW | headless 子进程执行单轮（Orchestrator 内部实现细节） |
| AgentAdapter Registry | `server/profile-adapters.ts` | MODIFY | 现有 capabilities/resolveLaunch 扩展 `buildTurn`/`parseEvents`（见 adapter-spec） |
| StateRepository | `server/store.ts` | MODIFY | v2→v3 迁移（见 storage-spec） |
| TranscriptRepository | `server/transcript-store.ts` | MODIFY | 读侧 legacy kind 规范化；其余保持 |
| Ports | `server/ports.ts` | MODIFY | 新增 `RuntimeOrchestrator`、`ChatTurnProcessRunner` port |
| Client App | `client/app/App.tsx` 等 | MODIFY | Chat View、Quest Home、审批气泡（见 frontend-spec） |

### 2.3 File Structure（NEW / MODIFY 总览）

```
cli-gui/
├── shared/
│   ├── state.ts            [MODIFY: SessionV3 + interactionMode/chatContext, CURRENT_SCHEMA_VERSION=3]
│   ├── transcript.ts       [MODIFY: 全量 kind 定义 + legacy 别名映射表 + turnId metadata 约定]
│   ├── api.ts              [MODIFY: 新错误码、turn/approval 请求响应类型]
│   ├── websocket.ts        [MODIFY: turn-status 帧]
│   └── capabilities.ts     [MODIFY: headless capability 声明]
├── server/
│   ├── ports.ts            [MODIFY: RuntimeOrchestrator / ChatTurnProcessRunner port]
│   ├── orchestrator.ts     [NEW: Runtime Worker、互斥、取消、超时、并发、审批等待]
│   ├── turn-runner.ts      [NEW: headless 单轮子进程执行 + 流解析接线]
│   ├── application.ts      [MODIFY: 执行控制迁出；messages 按 interactionMode 分流]
│   ├── profile-adapters.ts [MODIFY: buildTurn/parseEvents；codex/claude 事件解析]
│   ├── store.ts            [MODIFY: v3 迁移]
│   └── transcript-store.ts [MODIFY: 读侧 kind 规范化]
└── client/
    ├── components/ChatView.tsx   [MODIFY: 消息流、气泡、Markdown、tool 折叠、审批气泡]
    ├── components/QuestHome.tsx [MODIFY: Start in 下拉 + 一次提交创建流（B 段）]
    ├── components/PromptComposer.tsx [MODIFY: 模型选择器、start-and-send]
    └── app/App.tsx              [MODIFY: chat/terminal 视图路由]
```

### 2.4 环境配置（新增）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `SPECOS_MAX_RUNNING_SESSIONS` | `8` | 全局运行中 Session 上限（≥4，D-6） |
| `SPECOS_TURN_TIMEOUT_MS` | `600000` | chat 轮次超时（D-7） |
| `SPECOS_APPROVAL_TIMEOUT_MS` | `300000` | 审批等待超时（D-8） |

沿用现有：`PORT`、`SPECOS_DATA_DIRECTORY`、`SPECOS_RUNTIME_MODE`（readonly）、`SPECOS_CSRF_CAPABILITY`。

---

## 3. 安全基线（承接 PRD §7，现状核对）

| 要求 | 现状 | MVP01 动作 |
|---|---|---|
| 进程启动一律参数数组，禁 shell 拼接 | 已满足（`PtySpawnOptions.args`、profile `args[]`） | ChatTurnRunner 同样只接受 argv 数组，新增测试断言 |
| 启动前展示最终命令 + cwd 并确认 | 已满足（`commandPreview` + `confirmed` 标志） | chat 首轮启动沿用同一确认语义 |
| 文件/Git 限定 Workspace 根内、拒绝逃逸 | 已满足（`workspaceTarget` 校验链） | 不变；测试保留 |
| Git 仅 allowlist 只读子命令 | 已满足（GitInspector status/diff/ls-files） | 不变 |
| Markdown sanitize | 客户端已有 react-markdown+remark-gfm | 按 frontend-spec §4 补 sanitize 策略与测试 |
| WS/loopback origin 防护 + CSRF capability | 已满足（http-server.ts） | 不变 |
| readonly 模式禁全部写操作 | 已满足 | 新增 turn/approval 端点纳入 readonly 拦截 |

---

## 4. MVP01-A / B 范围切分（SPEC 视角）

| 分册 | A 段范围 | B 段范围 |
|---|---|---|
| domain / storage | schema v3 + 迁移全量落地 | 只加数据不改协议 |
| event-protocol | 全量 kind（含 approval 预留）一次到位 | 无协议变更 |
| orchestrator | Worker、互斥、取消、超时 | 全局并发上限验收、审批等待挂起 |
| adapter | Codex（headless + resume） | Claude、Generic（terminal-only） |
| api | messages 分流、turn cancel/retry | approval respond 端点 |
| frontend | 最简会话列表 + Chat View + Composer（模型选择） | 三栏完整壳、Quest Home、组织管理、审批 UI、Terminal tab |
| test | A 门禁全部自动化项 | B 门禁 + E2E 冒烟 + 并发验收 |

---

## 5. Open Questions & Risks

### 5.1 未决问题

- Codex / Claude headless JSON 事件协议的具体字段随 CLI 版本漂移；adapter-spec 以「版本探测 + 未识别事件降级 `pty_output`」兜底，首个实现 issue 需锁定验证过的 CLI 版本范围。
- Approval 挂起在 CLI 侧的表现（codex headless 是否真的阻塞等待 stdin 应答）需在 B 段实现前用真实 CLI 验证；兜底路径已定义为轮次失败 + 指引。

### 5.2 技术风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| CLI headless 输出协议变更 | 事件解析失败 | 分类纪律：未识别输出降级 `pty_output`，原始 payload 全留 |
| application.ts 抽取 Orchestrator 引入回归 | 现有 PTY 会话破坏 | 先立契约测试（现 `application.test.ts` 全绿）再搬移；分 PR |
| resume token 失效（CLI 会话过期/被清理） | chat 多轮断链 | 轮次失败呈现 error 事件 + 显式重试；不静默重建上下文 |

### 5.3 假设

- 本地已安装 codex / claude CLI 且用户已完成各自登录；凭据复用 CLI 自身配置（PRD Out of Scope：Provider 直连）。
- Tauri 桌面壳不阻塞 MVP01，ports/adapters 边界保持平台中立即可。
