# SPEC: Agent Console MVP01 — Agent Adapter 层（adapter-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.4
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-5、D-9）、[event-protocol-spec.md](./event-protocol-spec.md) §3
> 现状：`server/profile-adapters.ts` 已实现 `capabilities` + `resolveLaunch`
> （版本探测、选项校验、argv 组装）；本 SPEC 在其上扩展 `buildTurn` / `parseEvents`

## 1. Summary

AgentAdapter 是**无状态纯翻译层**（D-9）：声明 capability、组装 argv、
把 CLI 输出解析为规范事件。它不持有进程句柄、不做执行控制、不访问任何
Repository。MVP01 提供 Codex（A 段）、Claude、Generic（B 段）三个适配器；
GLM / Kimi 为 MVP01+ 扩展位，接口保持兼容。

---

## 2. 契约定义

### 2.1 AgentAdapter 接口（MODIFY：`server/ports.ts` 的 `ProfileAdapterRegistry` 演进）

```ts
// server/ports.ts — 现有 ProfileAdapterRegistry 扩展为：
interface ProfileAdapterRegistry {
  availableAdapterIds: string[];
  /** 已存在：版本探测 + capability 缓存 */
  capabilities(profile: CliProfileV3): Promise<CliProfileCapabilities>;
  /** 已存在（即 PRD 的 buildLaunch）：交互式启动 argv（terminal 模式） */
  resolveLaunch(profile: CliProfileV3, config: SessionLaunchConfig): Promise<ResolvedLaunch>;
  /** NEW：组装 headless 单轮 argv（chat 模式），含原生 resume */
  buildTurn(profile: CliProfileV3, config: TurnConfig): Promise<CommandSpec>;
  /** NEW：将单轮子进程 stdout 解析为规范事件流（流式产出） */
  parseEvents(profile: CliProfileV3, stream: Readable, ctx: ParseContext): AsyncIterable<ParsedTurnEvent>;
}

interface TurnConfig {
  workspacePath: string;         // cwd（canonical，来自 Workspace）
  prompt: string;
  permission: string | null;     // launchConfig 值；null = CLI default
  mode: string | null;
  model: string | null;          // chatContext.activeModel 覆盖后的生效值
  resumeToken?: string;          // 上一轮产出的 CLI 会话凭据
}

interface CommandSpec {
  command: string;               // 可执行文件（profile.command）
  args: string[];                // argv 数组——安全基线：禁止 shell 字符串
  env?: Record<string, string>;  // 增量环境变量（默认继承 process.env）
}

interface ParseContext {
  turnId: string;                // 注入每个产出事件的 metadata.turnId
}

/** parseEvents 的产出：TranscriptEvent 的「内容部分」，
    id/sessionId/sequence/occurredAt 由 Session Manager 落盘时补齐 */
interface ParsedTurnEvent {
  kind: TranscriptEventKind;     // 只允许规范 kind（event-protocol-spec §3）
  source: TranscriptEventSource; // 恒为 "profile-adapter"
  raw: string;
  metadata?: Record<string, string | number | boolean>;
}

/** 轮次结束后由 Orchestrator 读取的解析结论（parseEvents 迭代完成后可用） */
interface TurnParseResult {
  resumeToken?: string;          // 本轮解析出的 CLI 会话标识（写回 chatContext）
  usage?: { inputTokens?: number; outputTokens?: number }; // 仅 CLI 提供时透传
}
```

设计说明：

- 不重命名现有 `resolveLaunch`：PRD 的 `buildLaunch` 语义与其一致，
  避免无收益的破坏性改名（PRD 接口是示意，ports 契约以本 SPEC 为准）。
- `parseEvents` 返回 `AsyncIterable`——每解析出一个事件立即 yield，
  Orchestrator 逐事件 append + publish（event-protocol-spec §5.1 流式要求）。
- `TurnParseResult` 通过 iterator 的 return value（或 registry 提供的
  `collectResult(iterator)` helper）传出，不混入事件流。

### 2.2 capability 声明扩展（MODIFY：`shared/capabilities.ts`）

```ts
interface CliProfileCapabilities {
  adapterId: string;
  detectedVersion?: string;
  compatibility: "supported" | "unknown-version" | "unavailable";
  permissions: CliOptionDefinition[];
  modes: CliOptionDefinition[];
  models: CliOptionDefinition[];
  supportsComposer: boolean;
  supportsStructuredRecognition: boolean;   // 已存在
  /** NEW: 是否支持 headless 单轮执行（决定可否创建 chat 会话） */
  supportsHeadlessTurns: boolean;
  /** NEW: 是否支持原生多轮 resume（chat 多轮上下文的前提） */
  supportsResume: boolean;
  /** NEW: 是否支持 headless 审批协议（D-8；false 时权限不足→轮次失败+指引） */
  supportsApproval: boolean;
}
```

| adapterId | headlessTurns | resume | approval | 说明 |
|---|---|---|---|---|
| `codex` | ✅ | ✅ | A 段声明 `false`，B 段真机验证后定 | `codex exec` 系列 |
| `claude-code` | ✅（B 段） | ✅ | 同上 | `claude -p` 系列 |
| `generic` | ❌ | ❌ | ❌ | terminal-only，仅 `CLI default` |

`compatibility !== "supported"` 时三个 NEW 字段一律 `false`
（版本未知不承诺 headless 协议）。

---

## 3. 各适配器行为

### 3.1 Codex Adapter（A 段）

- `buildTurn` 组装（示意，flag 以锁定的 CLI 版本实测为准）：

```
codex exec --json [--model <model>] [--sandbox <mode>] [--ask-for-approval <permission>]
           [resume <resumeToken>] <prompt>
```

  - 首轮无 `resumeToken`；后续轮携带（codex thread/session id）。
  - `permission/mode/model` 复用现有 `appendOption` 校验：值不在
    capability 列表 → `CLI_OPTION_UNSUPPORTED`（现有错误语义保持）。
  - prompt 作为单个 argv 元素传入，不做 shell 转义拼接。
- `parseEvents` 解析 `--json` 的 JSONL 事件流，映射到规范 kind：

| CLI 事件（示意类别） | 规范 kind | metadata |
|---|---|---|
| session/thread 建立 | （不产出事件；提取 `resumeToken`） | — |
| agent 文本输出 | `assistant_message` | `turnId` |
| 命令/工具执行 | `tool_activity` | `turnId`、`tool` |
| 文件写入/patch | `file_change` | `turnId`、`path` |
| 审批请求 | `approval_request` | `turnId`、`approvalId` |
| 无法识别的行 | `pty_output` | `turnId` |

### 3.2 Claude Adapter（B 段）

- `buildTurn`：`claude -p --output-format stream-json [--permission-mode …]
  [--model …] [--resume <resumeToken>] <prompt>`。
- `parseEvents` 解析 stream-json，kind 映射同 §3.1 表；
  `resumeToken` = claude session id。

### 3.3 Generic Adapter（B 段）

- `supportsHeadlessTurns: false` → 创建 chat 会话时降级 `terminal`
  （domain-spec §6）；`buildTurn` 被调用视为缺陷，抛
  `INTERACTION_MODE_MISMATCH` 级别的内部错误。
- `resolveLaunch` 保持现状：不注入任何选项 flag，仅 `CLI default`。

## 4. 解析纪律（对 event-protocol-spec §3.1 的实现约束）

- **未识别输出降级 `pty_output`**：JSON 解析失败的行、未知事件类型、
  非 JSON 前导输出（banner 等）一律 `pty_output`，raw 原样保留。
  绝不猜测语义、绝不丢弃。
- **不发明事件**：Adapter 只产出表中列出的 kind；`lifecycle`/`error`/
  `user_message`/`approval_response` 由上层产出，Adapter 产出即缺陷。
- **单行超长**：单事件 raw 超 64KB 交由 transcript 层截断
  （`truncated: true`），Adapter 不自行截断。
- **stderr 不进 parseEvents**：由 Orchestrator 收集，仅失败时入
  `error` 事件（runtime-orchestrator-spec §3.2）。

## 5. 版本漂移防护（architecture-spec §5.1 未决问题的兜底）

- 现有 `--version` 探测与 capability 缓存保持；首个实现 issue 必须
  锁定「已验证 CLI 版本范围」写入 `adapterVersionRange` 默认值。
- 版本不在已验证范围 → `compatibility: "unknown-version"` →
  headless 能力关闭，会话降级 terminal（功能可用性优先于结构化体验）。
- 解析器以「容错映射表」实现：新增未知事件类型不报错，走 `pty_output`
  降级；升级适配 = 扩表，不改协议。

## 6. Edge Cases

| 场景 | 处理 |
|---|---|
| CLI 输出合法 JSON 但缺关键字段 | 按未识别处理 → `pty_output` |
| resumeToken 传入但 CLI 报会话不存在 | 正常解析 CLI 的错误输出（`pty_output`/`error` 视 CLI 事件而定）；轮次以非零 exit 收尾 → failed（domain-spec §6） |
| 同一轮解析出多个 resumeToken | 取最后一个；记 debug 日志 |
| CLI 进程输出二进制/ANSI 噪声 | UTF-8 安全处理后 `pty_output`（现有 transcript 编码逻辑复用） |
| capability 探测超时（2s） | 现状保持：`unknown-version` → headless 关闭 |

## 7. Testing（详见 test-spec §3.3）

- 纯函数层可测：`buildTurn` 的 argv 快照测试（各选项组合 × resume 有无）；
  `parseEvents` 用录制的 CLI JSONL fixture 驱动，断言 kind 映射、
  resumeToken 提取、未识别降级、流式逐事件产出。
- 不依赖真实 CLI 的单测为主；真实 CLI 冒烟归 E2E（B 段）。

## 8. PRD 映射

| PRD §4.4 条目 | 本 SPEC |
|---|---|
| AgentAdapter 接口四方法 | §2.1 |
| 无状态纯翻译层 | §1、§4（D-9） |
| Codex / Claude / Generic | §3 |
| GLM/Kimi 扩展位 | §1（接口兼容即扩展点） |
| MVP03 Agent Profile 兼容 | domain-spec §2.3（profiles schema 不破坏） |
