# Product AI OS Remote Control MVP02 PRD

版本：v0.1
状态：Draft
适用范围：`cli-gui/` MVP02 远程控制能力

> 本文档由 `cli-gui/doc/mvp02/remote.md` 修缮而来。原始草案仅作为输入保留，
> 不修改、不覆盖。
>
> 本 PRD 沿用原草案确定的传输方向：客户端到 Control Server 使用 HTTPS + SSE，
> Control Server 到本地 `agentd` 使用 gRPC 双向流。与当前项目的适配点、边界和
> 迁移约束以本文档为准。

## 1. Overview

当前 `cli-gui` 是一个运行在用户电脑上的本地 Product AI OS：React 工作台通过
HTTP/WebSocket 访问本地 Node.js Session Manager，Session Manager 管理 Workspace、
CLI Profile、Session、PTY、Runtime Orchestrator 和 append-only transcript，最终调用
Codex、Claude Code 或其他 CLI。

MVP02 增加远程控制后，用户可以从手机浏览器、桌面浏览器或未来的原生 App 查看并
控制自己电脑上的本地 Agent Session。远程链路只负责身份、设备连接、消息路由和
事件转发；Workspace、CLI 凭据、CLI 进程、Session 事实状态和 transcript 仍由本地
运行时负责。

目标链路：

```text
Mobile Web / Desktop Web / Future App
                |
          HTTPS API + SSE
                |
          Control Server
     auth / device / routing / audit
                |
         gRPC bidirectional stream
                |
             agentd
   outbound connector + local runtime bridge
                |
       Existing cli-gui Session Manager
                |
 Runtime Orchestrator -> CLI Adapter -> Codex / Claude Code / Generic CLI
                |
             Local Workspace
```

## 2. Problem And Product Positioning

本地 CLI GUI 已经能够完成项目登记、Session 创建、对话、终端交互、审批、事件回放
和 Session 恢复，但用户必须坐在运行 CLI 的电脑前。远程控制需要解决：

- 在不暴露本机 HTTP 端口的情况下连接本地运行时。
- 从远程客户端发现自己的设备、Workspace 和 Session。
- 远程查看结构化 transcript、运行状态、文件变更和只读 Git 检查。
- 远程发送 prompt、取消轮次、处理审批、停止或恢复 Session。
- 断线重连时通过现有 sequence/cursor 机制补齐事件，不重复、不丢失。
- 远程控制失效、设备离线或权限不足时给出明确且可恢复的错误。

产品定位仍然是“管理本地 CLI Agent 的控制层”，不是云端 Agent Runtime、云端 IDE
或新的模型提供商。

## 3. Goals

- 为用户提供一个可撤销、可审计的本地设备远程控制入口。
- 复用现有 Session Manager、Runtime Orchestrator、Agent Adapter、transcript 和
  `ApiError` 语义，避免远程端重新实现 CLI 业务逻辑。
- 使用 SSE 向远程客户端转发状态、transcript 和终端输出。
- 使用 gRPC 双向流承载 Control Server 与 `agentd` 之间的可靠长连接、命令下发、
  事件上报、心跳和确认。
- 默认不把 Workspace 内容、CLI 凭据和完整 transcript 持久化到 Control Server。
- 保持当前本地模式可用，远程功能关闭或服务不可用时不影响本地 Session。
- 支持英文和中文；所有新增 `cli-gui` 用户可见文案遵守现有 i18n 约束。

## 4. Scope

### 4.1 MVP02 In Scope

- 远程账户登录和设备配对。
- 本地设备连接状态、断开、重连、撤销和远程访问开关。
- 远程查看 Workspace、Profile、Session 列表及 Session 状态。
- 远程读取 transcript、实时接收事件和 terminal 输出。
- 远程创建、启动、停止、恢复、取消和删除 Session，沿用本地确认规则。
- 远程 Chat prompt、幂等提交、轮次状态和错误反馈。
- 远程审批 Allow/Deny。
- Terminal 模式下的文本输入和 resize；终端输出通过 SSE 转发。
- 远程查看 Files、Preview、Language、Git Status、Git Diff 等现有只读检查。
- 设备和命令审计、权限校验、连接心跳、断线恢复和事件游标续传。

### 4.2 MVP02 Boundary

- 首版远程客户端以响应式 Web 为主，覆盖手机和桌面浏览器；原生 iOS/Android
  App 可以复用同一 HTTPS/SSE API，但不作为本 PRD 的独立交付物。
- 首版为单用户自有设备控制，不提供团队协作、项目共享或多租户权限管理。
- `agentd` 的代码边界必须独立，但首版可以与现有 `cli-gui` Node.js runtime
  同进程部署；不得复制一套 Session Manager 或 CLI 启动逻辑。
- Control Server 可先实现为独立 Node.js 服务；其持久化模型只保存控制面数据和
  必要的状态投影，不取代本地 `state.json` 和 transcript repository。

## 5. User Stories

### US-001: Pair A Local Device

**Description:** As a user, I want to pair my local computer with my remote account so
that I can access it without opening a public local port.

**Acceptance Criteria:**

- [ ] Local Settings can generate a one-time pairing code or QR payload.
- [ ] Pairing code expires after the configured TTL and can be consumed only once.
- [ ] Successful pairing creates one device record with a user-facing name and platform.
- [ ] `agentd` establishes an outbound gRPC connection after pairing.
- [ ] The local UI shows `offline`, `pairing`, `online`, `reconnecting`, and `revoked` states.
- [ ] Verify in browser using dev-browser skill.

### US-002: Manage Devices

**Description:** As a user, I want to see and revoke my connected devices so that I can
control where remote access is allowed.

**Acceptance Criteria:**

- [ ] Remote client lists device name, platform, connector version, last seen time, and status.
- [ ] Revoking a device invalidates future commands and terminates its gRPC connection.
- [ ] A revoked device cannot reconnect without a new pairing flow.
- [ ] The local client can disable remote access without deleting local Sessions.
- [ ] Verify in browser using dev-browser skill.

### US-003: Browse Remote Workspaces And Sessions

**Description:** As a user, I want to browse my local Workspaces and Sessions remotely so
that I can choose the task to continue.

**Acceptance Criteria:**

- [ ] Remote client shows only data returned by the paired device.
- [ ] Session rows include name, Workspace, Profile, interaction mode, runtime status,
  organization status, and last active time.
- [ ] An offline device shows a non-interactive stale state instead of fabricated data.
- [ ] Empty, loading, success, and failure states are present for device, Workspace, and
  Session lists.
- [ ] Verify in browser using dev-browser skill.

### US-004: Read And Follow A Transcript Remotely

**Description:** As a user, I want to read a Session transcript remotely so that I can
monitor work without opening the local GUI.

**Acceptance Criteria:**

- [ ] Remote client requests transcript pages using the existing `afterSequence` cursor.
- [ ] Live updates are delivered through SSE after the replay boundary is registered.
- [ ] Reconnecting with `Last-Event-ID` or an equivalent session cursor resumes from the
  last acknowledged sequence.
- [ ] Events are deduplicated by event ID and displayed in sequence order.
- [ ] Existing event kinds remain unchanged; remote transport metadata does not become a
  new business transcript kind.
- [ ] Transcript corruption and cursor gaps show an actionable failure state.
- [ ] Verify in browser using dev-browser skill.

### US-005: Send A Remote Chat Turn

**Description:** As a user, I want to send a prompt to a local Chat Session so that the
local CLI can continue working while I am away from the computer.

**Acceptance Criteria:**

- [ ] Remote client requires an authenticated device and a control-capable session scope.
- [ ] Each submission contains a stable `commandId` and existing `clientMessageId`.
- [ ] Repeating the same idempotency key does not create a second user message or turn.
- [ ] The remote client receives `turnId`, accepted status, and subsequent transcript events.
- [ ] `TURN_IN_PROGRESS`, `SESSION_NOT_ACTIVE`, `READONLY_MODE`, and CLI errors retain their
  existing meaning and are rendered as remote errors.
- [ ] A stopped Session uses the existing explicit start-and-send confirmation flow.
- [ ] Verify in browser using dev-browser skill.

### US-006: Control Session Lifecycle Remotely

**Description:** As a user, I want to start, stop, resume, archive, complete, restore, or
delete a Session remotely so that the remote client has the same lifecycle controls as the
local GUI.

**Acceptance Criteria:**

- [ ] Remote lifecycle actions are mapped to existing local application operations.
- [ ] Start actions show the resolved Workspace, Profile, mode, model, and command preview
  before confirmation where the local flow requires it.
- [ ] Optimistic revision conflicts return the existing session conflict error.
- [ ] Destructive actions require explicit confirmation and never delete Workspace files.
- [ ] Remote action results are observable through an HTTP response and/or SSE lifecycle event.
- [ ] Verify in browser using dev-browser skill.

### US-007: Use A Remote Terminal Session

**Description:** As a user, I want to send terminal input and see terminal output remotely
so that I can use the existing terminal fallback when Chat mode is unavailable.

**Acceptance Criteria:**

- [ ] Terminal output is streamed through SSE with session and terminal cursor metadata.
- [ ] Terminal input is sent through an authenticated command endpoint with bounded payloads.
- [ ] Resize is sent as a separate typed command with validated `cols` and `rows`.
- [ ] Terminal operations are rejected for Chat Sessions with `INTERACTION_MODE_MISMATCH`.
- [ ] The remote terminal clearly shows offline, reconnecting, and permission-denied states.
- [ ] Verify in browser using dev-browser skill.

### US-008: Respond To A Remote Approval

**Description:** As a user, I want to approve or deny a pending CLI operation remotely so
that an unattended local Session can continue under explicit permission.

**Acceptance Criteria:**

- [ ] A pending `approval_request` is delivered through SSE with a stable `approvalId`.
- [ ] Allow and Deny are sent as typed commands through the gRPC stream to the local runtime.
- [ ] Duplicate responses do not cause duplicate CLI input.
- [ ] Expired or already answered approvals return `APPROVAL_NOT_PENDING`.
- [ ] The approval decision is recorded as `approval_response` in the local transcript.
- [ ] Verify in browser using dev-browser skill.

### US-009: Recover From Device Or Network Loss

**Description:** As a user, I want remote control to recover from temporary network loss so
that I do not need to restart local CLI processes.

**Acceptance Criteria:**

- [ ] `agentd` reconnects with bounded backoff and does not start duplicate local runtimes.
- [ ] The Control Server marks a device stale after heartbeat expiry.
- [ ] Remote read requests fail with a typed offline error while the device is unavailable.
- [ ] After reconnect, state is refreshed and transcript replay starts from the last cursor.
- [ ] In-flight mutating commands are not silently replayed unless their idempotency contract
  explicitly permits it.
- [ ] Verify in browser using dev-browser skill.

### US-010: Keep Local Mode Backward Compatible

**Description:** As a local user, I want the existing local GUI to keep working when remote
control is disabled or the Control Server is unavailable.

**Acceptance Criteria:**

- [ ] Existing local `/api/*` and `/ws` flows remain available in local mode.
- [ ] Local Session, PTY, transcript, readonly, and Workspace security behavior is unchanged.
- [ ] Remote connection failure does not stop or alter a running local Session.
- [ ] The application can run without Control Server credentials or network access.
- [ ] Existing `cli-gui` unit, build, and E2E suites remain green.

## 6. Functional Requirements

### Identity, Pairing, And Devices

- FR-1: The system must require an authenticated remote account before listing devices.
- FR-2: The local client must issue a single-use pairing credential with a finite expiration.
- FR-3: The Control Server must bind a pairing credential to exactly one user and one device.
- FR-4: The system must store device credentials separately from `state.json` and transcript data.
- FR-5: The system must support explicit device revocation and local remote-access disablement.
- FR-6: The system must expose device heartbeat and last-seen status to the remote client.

### HTTPS And SSE Client Contract

- FR-7: The Control Server must expose authenticated HTTPS endpoints for device, Workspace,
  Session, command, and remote access policy operations.
- FR-8: The Control Server must expose an SSE stream for device status, Session updates,
  transcript events, terminal output, command receipts, and typed errors.
- FR-9: Every SSE event must include a stable event ID, device ID, Session ID when applicable,
  and a reconnect cursor when the source supports one.
- FR-10: The system must use `Last-Event-ID` or an equivalent explicit cursor to resume a
  Session stream without replaying acknowledged events.
- FR-11: The Control Server must not report a command as completed before receiving a typed
  result or durable rejection from `agentd`.
- FR-12: The system must bound request body size, SSE event size, terminal input size, and
  concurrent streams.

### gRPC Agent Connection

- FR-13: `agentd` must establish an outbound TLS-protected gRPC bidirectional stream to the
  Control Server.
- FR-14: The gRPC stream must support heartbeat, connection identification, command delivery,
  command acknowledgement, command result, event forwarding, and graceful shutdown.
- FR-15: Each remote command must contain `commandId`, device ID, authenticated scope,
  command type, payload, deadline, and idempotency information.
- FR-16: `agentd` must reject commands addressed to another device or outside its declared
  capability set.
- FR-17: `agentd` must route accepted commands to existing local application ports or services;
  it must not duplicate Session lifecycle, Orchestrator, Adapter, or transcript logic.
- FR-18: A broken gRPC connection must not terminate local CLI processes or delete local state.

### Remote Session Control

- FR-19: The system must expose Workspace and Session projections from the paired local device.
- FR-20: The system must forward transcript replay from the local repository using the existing
  sequence and retention semantics.
- FR-21: The system must forward live transcript events without changing canonical event kinds.
- FR-22: The system must allow remote Chat message submission with the existing
  `clientMessageId` idempotency behavior.
- FR-23: The system must allow remote cancellation and approval responses only for active,
  authorized Sessions.
- FR-24: The system must allow remote terminal input and resize only for terminal Sessions.
- FR-25: The system must apply local `readonly` policy, Session lifecycle validation, workspace
  boundary checks, profile capability checks, and optimistic revision checks to remote actions.
- FR-26: The system must preserve existing `ApiError` codes and include a remote request ID
  when an error crosses the Control Server boundary.
- FR-27: The system must require explicit confirmation for remote Session start and destructive
  lifecycle operations.

### Security And Audit

- FR-28: The system must not require an inbound public listener on the user's computer.
- FR-29: CLI credentials, process environment secrets, Workspace absolute paths, and raw command
  execution APIs must not be exposed to the remote browser by default.
- FR-30: The Control Server must authorize every command against the user, device, Session,
  operation, and current connection state.
- FR-31: The system must record pairing, login, revoke, command acceptance, command rejection,
  approval, and disconnect audit events.
- FR-32: The system must rate-limit authentication, pairing, command, and SSE connection attempts.
- FR-33: Revocation must prevent new commands and close active remote streams within the defined
  revocation propagation target.

## 7. Transport Contracts

### 7.1 Remote Client To Control Server

The browser or future App uses HTTPS for request/response operations and SSE for server-to-client
events. Logical endpoint groups are:

| Endpoint group | Purpose |
|---|---|
| `/v1/auth/*` | Login, refresh, logout, and pairing exchange |
| `/v1/devices` | List, name, status, revoke, and remote policy |
| `/v1/devices/:deviceId/state` | Fetch Workspace/Profile/Session snapshot |
| `/v1/devices/:deviceId/commands` | Submit typed remote commands |
| `/v1/devices/:deviceId/events` | SSE stream for device and Session events |
| `/v1/devices/:deviceId/sessions/:sessionId/transcript` | Cursor-based transcript replay |

The exact HTTP schema belongs to the follow-up API SPEC. The PRD freezes these behavioral
properties:

- Commands are typed; there is no generic `exec` or shell command endpoint.
- Every mutating request has an idempotency key and an expiration/deadline.
- SSE connections are scoped to the authenticated user, device, and requested Session.
- The remote client can request a replay cursor before subscribing to live events.
- Local `sessionId`, `event.id`, `sequence`, `turnId`, and `approvalId` remain stable across
  the relay.

### 7.2 Control Server To `agentd`

The initial gRPC contract is a bidirectional stream conceptually equivalent to:

```proto
service AgentGateway {
  rpc Connect(stream ConnectorFrame) returns (stream ControlFrame);
}
```

`ConnectorFrame` includes `hello`, `heartbeat`, `command_ack`, `command_result`, `state`,
`transcript_event`, `terminal_output`, and `error`. `ControlFrame` includes `hello_ack`,
`heartbeat_ack`, `command`, `replay_request`, `stream_reset`, and `revoke`.

The gRPC contract must provide:

- Per-device connection identity and protocol version negotiation.
- Server-side deadlines and connector-side acknowledgement.
- Ordered delivery per Session stream.
- Bounded buffering with explicit backpressure or rejection.
- Reconnect-safe command IDs and event cursors.
- Graceful shutdown and revoke notifications.

The gRPC service is a transport boundary. It must not define a second set of Session or
transcript semantics.

### 7.3 Event Mapping

The local event protocol remains authoritative:

```text
local transcript repository
        -> agentd transcript/event bridge
        -> gRPC ConnectorFrame
        -> Control Server relay
        -> SSE event
        -> remote client
```

Transport events such as `device.status`, `command.result`, or `terminal.output` are envelope
types and do not replace `user_message`, `assistant_message`, `tool_activity`, `file_change`,
`pty_output`, `lifecycle`, `error`, `approval_request`, `approval_response`, or
`retention_marker`.

## 8. Data And Persistence

### 8.1 Local Source Of Truth

The following remain local and authoritative:

- Workspace paths and path validation.
- CLI Profile executable, args, adapter, and capabilities.
- Session metadata and revision.
- PTY and headless runtime handles.
- Runtime Orchestrator state.
- Append-only transcript and replay cursor.
- CLI authentication and provider credentials.

The remote feature must not move these responsibilities into the Control Server.

### 8.2 Control Plane Data

The Control Server may persist:

- `users` or external identity references.
- `devices` and connector protocol metadata.
- `device_pairings` and revocation state.
- `access_policies` for the single owner's devices and operation scopes.
- `connections` and heartbeat leases.
- `command_receipts` for idempotency and auditability.
- `audit_events` for security and operational actions.
- Short-lived Workspace/Session projections needed for offline list rendering.

By default, the Control Server must not persist raw Workspace files, CLI environment values,
full prompt/response contents, or full transcript events. Transcript history is fetched from
the local repository when the remote client requests it. Any future cloud retention mode requires
a separate consent and privacy specification.

### 8.3 Local Remote Configuration

Device identity, pairing state, connector refresh credentials, remote enablement, and local
remote policy must be stored outside Session records and transcript files. The implementation
must use a versioned remote configuration store or OS credential storage and document migration
and recovery behavior before implementation.

Existing `state.json` schema v3 and existing transcript files must remain readable without a
remote Control Server. If a later implementation extends `state.json`, it must introduce an
explicit schema migration and preserve the existing backup/readonly rules.

## 9. Security Requirements

- Pairing credentials are short-lived, single-use, and never reused as session access tokens.
- `agentd` uses outbound TLS gRPC; the local machine does not need an inbound firewall rule.
- Remote browser tokens are never forwarded to the local CLI or stored in CLI environment data.
- Device credentials are rotated on reconnect or revoke according to the authentication design.
- Remote operations are allowlisted by typed command, not interpreted as shell strings.
- Local Workspace path checks and Git read-only allowlists remain mandatory for remote inspection.
- Remote clients never receive unrestricted filesystem access or a raw `child_process` interface.
- Approval decisions, destructive actions, and terminal input are auditable with actor, device,
  Session, command ID, result, and timestamp.
- SSE and gRPC payloads use bounded sizes; oversized or malformed frames are rejected.
- The Control Server must isolate users so a device ID, Session ID, event ID, or cursor from a
  different account cannot be used for data access.
- Remote access is disabled by default until the user completes pairing and enables it.

## 10. UI And State Requirements

Remote and local UI flows must cover the following states:

| Flow | Required states |
|---|---|
| Pairing | idle, code generated, expired, success, failure |
| Device list | loading, empty, online, offline, stale, revoked, failure |
| Session list | loading, empty, available, device offline, failure |
| Transcript | loading, replaying, live, reconnecting, cursor gap, failure |
| Command | ready, submitting, accepted, completed, rejected, expired |
| Terminal | connecting, connected, input disabled, reconnecting, closed, failure |
| Approval | pending, submitting, accepted, already answered, expired, failure |

The `cli-gui` UI must continue to use `client/i18n.tsx` for English and Chinese strings.
Remote UI must not hardcode one language or rely on color alone for connection and permission
state. Destructive actions remain explicit and confirmable.

## 11. Non-Goals

- No cloud-hosted Codex, Claude, or other Agent Runtime in MVP02.
- No provider API direct connection or cloud storage of CLI credentials.
- No generic remote shell, unrestricted file API, or remote arbitrary process execution.
- No direct remote file editing, Git stage/commit/push/checkout, or Workspace upload.
- No multi-user collaboration, team sharing, role administration, or organization billing.
- No application-owned Agent Workflow, Planner, RAG, Memory, Knowledge Base, or model router.
- No mandatory cloud transcript retention or cross-device transcript synchronization.
- No requirement to replace the existing local HTTP/WebSocket UI transport.
- No native mobile application implementation in the first delivery; responsive Web is the
  reference client.

## 12. Technical Considerations And Migration Impact

### 12.1 Existing Code Boundaries

The implementation should add a remote adapter around current boundaries rather than route
remote traffic through duplicated business logic:

| Existing area | Remote integration |
|---|---|
| `server/application.ts` | Expose typed internal operations or a remote control port |
| `server/orchestrator.ts` | Keep lifecycle, turn, cancel, approval, timeout, and concurrency semantics |
| `server/transcript-store.ts` | Serve replay and live event bridge using existing sequence rules |
| `shared/api.ts` | Reuse `ApiErrorCode` and add only remote transport errors where needed |
| `shared/websocket.ts` | Keep local terminal/events contract unchanged |
| `server/index.ts` / `production.ts` | Compose the local runtime with the `agentd` connector |
| `client/i18n.tsx` | Add all local remote-settings copy in both languages |

`agentd` may initially be a separately testable module in `cli-gui/server/remote/` and run
inside the current Node process. Extraction to a standalone executable is a deployment step,
not permission to duplicate runtime behavior.

### 12.2 Failure And Error Semantics

The remote boundary must distinguish:

- `REMOTE_AUTH_REQUIRED`: remote identity is missing or expired.
- `REMOTE_DEVICE_OFFLINE`: no usable gRPC connection exists.
- `REMOTE_DEVICE_REVOKED`: the device was explicitly revoked.
- `REMOTE_COMMAND_EXPIRED`: the command deadline passed before local acceptance.
- `REMOTE_COMMAND_DUPLICATE`: the command ID was already completed or rejected.
- `REMOTE_CURSOR_GAP`: the requested event cursor is below the local retention floor.
- `REMOTE_SCOPE_DENIED`: the user may see the device but cannot perform the operation.
- `REMOTE_PROTOCOL_UNSUPPORTED`: client, Control Server, and `agentd` versions cannot agree.

Existing local errors such as `SESSION_NOT_FOUND`, `TURN_IN_PROGRESS`,
`APPROVAL_NOT_PENDING`, `INTERACTION_MODE_MISMATCH`, `READONLY_MODE`, and
`SESSION_REVISION_CONFLICT` must be preserved as nested or mapped stable error details,
not collapsed into a generic remote failure.

### 12.3 Testing

- Unit tests: pairing expiry, token/scope validation, command envelope validation, cursor
  conversion, SSE serialization, gRPC frame serialization, and idempotency.
- Server integration tests: fake Control Server plus fake `agentd`, reconnect, duplicate
  commands, deadline expiry, revoke, heartbeat timeout, backpressure, and user isolation.
- Local integration tests: remote commands map to the existing Application/Orchestrator
  operations and preserve local API error semantics.
- Transcript tests: replay boundary, `Last-Event-ID` continuation, retention floor, event
  ordering, and duplicate suppression.
- Security tests: no inbound listener, invalid pairing, cross-user IDs, malformed frames,
  oversized payloads, readonly mode, Workspace path escape, and audit coverage.
- Browser E2E: pair device, list Session, follow transcript, send Chat prompt, approve,
  reconnect, revoke, and mobile viewport states.
- Regression gate: `npm --prefix cli-gui run test`, `npm --prefix cli-gui run build`, and
  existing E2E checks remain green before remote-specific gates are considered.

## 13. Success Metrics

- Pairing completes in two minutes or less on a normal network.
- Online device status appears within five seconds after `agentd` connects.
- Remote transcript first event reaches the client within two seconds at p95 after local event
  publication, excluding unavailable networks.
- A reconnect resumes from the last acknowledged cursor with zero duplicate event IDs and no
  unexplained sequence gap.
- Remote command acceptance is observable within two seconds at p95 when the device is online.
- Revoking a device prevents new mutating commands within 60 seconds at p95.
- 100% of remote mutating commands have an authenticated actor, device, Session when applicable,
  command ID, result, and timestamp in audit evidence.
- Local mode remains usable with Control Server unavailable and with remote access disabled.

## 14. Delivery Sequence

1. Freeze remote command envelope, SSE event envelope, gRPC frame envelope, versioning, and
   error mapping.
2. Implement pairing, device identity, remote enablement, revoke, and heartbeat.
3. Add `agentd` gRPC connection and a typed bridge to the existing local Application ports.
4. Add remote state snapshot, Workspace/Session projection, transcript replay, and SSE live
   stream with cursor continuation.
5. Add Chat message, lifecycle, cancel, model/capability display, and approval commands.
6. Add terminal input, resize, output streaming, and terminal-specific backpressure limits.
7. Add audit, rate limits, security hardening, failure states, i18n, and browser E2E coverage.
8. Run local regression, fake Control Server/`agentd` integration tests, and real network
   acceptance in isolated test accounts and temporary Workspaces.

## 15. Open Questions And Assumptions

- [Assumption] MVP02 is single-owner device control; sharing and team roles are deferred.
- [Assumption] Account authentication is provided by a Control Server identity layer; the
  current local GUI does not become the identity provider.
- [Assumption] Control Server raw transcript retention is off by default and requires a later
  explicit product/privacy decision.
- [Assumption] Initial gRPC deployment uses TLS plus short-lived connector credentials; exact
  mTLS versus signed bearer bootstrap belongs to the security SPEC.
- [Open Question] Is the first Control Server hosted by the product team, self-hosted, or both?
- [Open Question] What is the maximum number of paired devices and concurrent SSE streams per
  account?
- [Open Question] Should terminal input use one HTTPS request per input batch, or should a later
  browser transport be added for lower-latency interactive typing?
- [Open Question] What is the required audit retention period and export format?
- [Open Question] Should remote Workspace and Session projections be kept in a database or
  rebuilt from the local device after reconnect?

## 16. Traceability

### Direct Sources

- Product intent: [`README.md`](../../../README.md)
- CLI GUI scope and i18n/security rules: [`cli-gui/AGENTS.md`](../../AGENTS.md)、
  [`cli-gui/doc/AGENTS.md`](../AGENTS.md)
- Current local product baseline: [`Agent_Console_MVP01_PRD.md`](../mvp01/Agent_Console_MVP01_PRD.md)
- Local architecture and runtime boundaries: [`architecture-spec.md`](../mvp01/spec/architecture-spec.md)
- Local API and error contract: [`api-spec.md`](../mvp01/spec/api-spec.md)
- Local storage and migration contract: [`storage-spec.md`](../mvp01/spec/storage-spec.md)
- Local event and replay contract: [`event-protocol-spec.md`](../mvp01/spec/event-protocol-spec.md)
- Local verification strategy: [`test-spec.md`](../mvp01/spec/test-spec.md)
- Original remote concept draft: [`remote.md`](./remote.md)

### Delivery Chain Position

This file is an MVP02 product draft only. It does not replace the canonical design document,
Feature Specs, Issues, implementation notes, review evidence, or test assets. After product
confirmation, the next artifacts should be:

1. A remote-control architecture/API/security SPEC covering HTTPS/SSE and gRPC contracts.
2. Feature Specs for pairing, connector, state/transcript relay, command control, terminal,
   approval, and security/audit.
3. Issues and tests linked to those Feature Specs.

No existing `remote.md`, local state file, transcript, implementation file, or review artifact
is modified by this PRD.
