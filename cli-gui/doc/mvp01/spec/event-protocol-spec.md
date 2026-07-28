# SPEC: Agent Console MVP01 — 事件协议（event-protocol-spec）

> 派生自：`Agent_Console_MVP01_PRD.md` v0.3 §4.2.1、§4.2.2
> 上游：[architecture-spec.md](./architecture-spec.md)（决策 D-3、D-8、D-10）
> 现有契约：`cli-gui/shared/transcript.ts`（8 个 kind）——本 SPEC 定义规范 kind 全集与 legacy 映射
> ⚠️ 本协议是 MVP01-A 地基：**A 段一次到位，B 段只加数据、不改协议**（PRD §8）

## 1. Summary

Agent 对话 = Event 流 + 结构化渲染。每个事件带稳定 ID、单调 sequence，
按会话 append-only 存储，支持游标回放与实时零重复推送。本 SPEC 定义
事件结构、kind 全集（含 approval 预留）、分类纪律与回放/去重协议。

---

## 2. 事件结构

```ts
// shared/transcript.ts
interface TranscriptEvent {
  id: string;              // 稳定 ID（服务端生成，回放/重连去重键）
  sessionId: string;
  sequence: number;        // 会话内单调递增，Fork 子会话从 forkSequence 续接
  occurredAt: string;      // ISO 8601
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;             // 原始 payload（UTF-8 安全截断至 64KB）
  rawBytes: number;
  truncated: boolean;      // raw 是否被截断
  metadata?: Record<string, string | number | boolean>;
  clientMessageId?: string; // composer 幂等键（仅 user_message）
}
```

以上结构已存在，保持不变。`payloadRef`（PRD §6 提到的引用形态）在 MVP01
不实现：64KB 截断 + `truncated` 标记已覆盖回放需求，大 payload 引用为
schema 预留演进位（metadata 可承载 `payloadRef` 键，无需破坏性变更）。

### 2.1 metadata 保留键约定（NEW）

| 键 | 类型 | 适用 kind | 说明 |
|---|---|---|---|
| `turnId` | string | chat 模式所有事件 | 轮次归属（D-10：轮次历史由事件流推导） |
| `status` | string | `lifecycle` | 状态转移目标（starting/running/stopped/error） |
| `exitCode` | number | `lifecycle` | 进程退出码（如可获得） |
| `code` | string | `error` | 错误码 |
| `approvalId` | string | `approval_request`/`approval_response` | 审批配对键 |
| `decision` | string | `approval_response` | `allow` \| `deny` \| `timeout` |
| `path` | string | `file_change` | 变更文件相对路径 |
| `tool` | string | `tool_activity` | 工具/命令标识 |
| `retention` | string | `retention_marker` | 保留策略原因（已存在） |

---

## 3. kind 全集（A 段一次到位）

```ts
type TranscriptEventKind =
  | "user_message"        // composer 提交的用户消息
  | "assistant_message"   // assistant 结构化回复（Markdown 正文）
  | "tool_activity"       // 工具调用 / 命令执行
  | "file_change"         // 文件变更
  | "pty_output"          // 原始 CLI 输出（中性兜底）
  | "lifecycle"           // 启动/停止/错误等状态转移
  | "error"               // 应用/轮次错误
  | "approval_request"    // CLI 请求执行许可（协议预留，UI 见 B 段）
  | "approval_response"   // 用户审批决定（协议预留）
  | "retention_marker";   // 保留策略截断标记（现有实现引入，保留）
```

| kind | 状态 | source 典型值 | 示例 raw |
|---|---|---|---|
| `user_message` | RENAME（现 `user_input`） | `composer` | `实现支付退款接口` |
| `assistant_message` | RENAME（现 `markdown`） | `profile-adapter` | Markdown 正文 |
| `tool_activity` | 已存在 | `profile-adapter` | `bash: go test ./...` |
| `file_change` | NEW | `profile-adapter` | `payment.go` |
| `pty_output` | 已存在 | `pty` / `profile-adapter` | ANSI 字节流 |
| `lifecycle` | 已存在 | `session-manager` | `Session running.` |
| `error` | 已存在 | `session-manager` / `profile-adapter` | 启动失败原因 |
| `approval_request` | NEW（预留） | `profile-adapter` | `command: npm install` |
| `approval_response` | NEW（预留） | `session-manager` | `allow` |
| `retention_marker` | 已存在（协议内保留） | `session-manager` | 截断说明 |

> PRD 表中 `assistant_message / markdown` 为同义；规范名取
> `assistant_message`，`markdown` 归入 legacy 别名（§4）。

### 3.1 分类纪律（不可协商）

- **不发明 CLI 语义**：Adapter 无法可靠识别的输出保持 `pty_output`，
  绝不伪装成 `assistant_message` 或 `tool_activity`。
- 原始 payload 始终保留（`raw`），供回放与排障；结构化解读放 `metadata`。
- 只有 Adapter 的 `parseEvents` 允许产出 assistant/tool/file_change/approval
  语义事件；Session Manager 与 Orchestrator 只产出 lifecycle/error/
  approval_response/user_message。

## 4. legacy kind 规范化（决策 D-3）

历史 transcript 文件不重写。读侧（TranscriptRepository.list/latest 返回前）
应用别名映射：

```ts
// shared/transcript.ts
const LEGACY_KIND_ALIASES: Record<string, TranscriptEventKind> = {
  user_input: "user_message",
  markdown: "assistant_message",
  permission_request: "approval_request"
};
```

- 写入侧（新代码）一律使用规范 kind；写入 legacy kind 视为缺陷。
- 映射在存储层出口做一次（storage-spec §4），API/WS/前端只见规范 kind。
- 未知 kind（未来版本产生的数据被旧版本读到）原样透传，前端按中性条目渲染。

---

## 5. sequence 与回放协议（现状核对 + 保持）

以下语义现有实现已满足，作为协议冻结项列出：

1. **append-only**：事件只追加；retention 截断以 `retention_marker` 显式标记。
2. **单调 sequence**：会话内严格递增；Fork 子会话 sequence 从父
   `forkSequence` 之后续接，读侧呈现「父前缀（只读）+ 子自有事件」的
   单一单调序列。
3. **游标回放**：`GET /api/sessions/:id/transcript?afterSequence=N` 按
   sequence 升序返回，响应含 `hasMore` 与 `nextAfterSequence`
   （api-spec §2.3）。
4. **实时接续**：WS 订阅携带 `afterSequence`；服务端先注册订阅者、
   再补发错过事件（`subscription-ready` 帧标记补发完成），保证无缝隙。
5. **零重复**：客户端按事件 `id` 去重；重连后重复推送不产生重复渲染。
6. **写失败不杀进程**：transcript 写失败发布 `recording-warning`，
   PTY/轮次进程继续运行（PRD §4.2.2）。
7. **重启可回放**：stopped / completed / archived 会话历史完整可读。

### 5.1 chat 轮次的事件时序（NEW）

一个成功轮次产生的最小事件序列（全部带同一 `metadata.turnId`）：

```
user_message (source: composer, clientMessageId)
  → [assistant_message | tool_activity | file_change | pty_output]*   ← 流式，逐事件推送
  → lifecycle (metadata: { turnId, status: "turn-completed" })
```

失败轮次以 `error` 事件收尾（`metadata: { turnId, code }`）；
审批挂起插入 `approval_request` → （用户决定后）`approval_response`。
流式要求：Adapter 每解析出一个事件即 append + publish，**不等轮次结束**
（PRD §4.2.3 流式渲染验收：本地首段输出可见 ≤ 5s）。

---

## 6. Acceptance Criteria 映射（PRD §9 A 段门禁）

| 门禁 | 协议保证 |
|---|---|
| 重连零重复事件 | §5.4 + §5.5 |
| 回放顺序与 sequence 一致 | §5.2 + §5.3 |
| assistant 回复 100% 结构化、无 ANSI 直渲 | §3.1 分类纪律 + frontend-spec 渲染规则 |
| 首段输出 ≤ 5s | §5.1 流式 append+publish |
| 重启后历史完整回放 | §5.7 |

测试用例清单见 [test-spec.md](./test-spec.md) §3.2。
