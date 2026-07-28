# SPEC: CLI GUI Three-Column Workspace

## 1. Summary

### 1.1 What This SPEC Covers

This SPEC defines the architecture, persistence formats, APIs, WebSocket protocol, security boundaries, client component design, state machines, performance limits, tests, and delivery order for:

- Versioned application state and migration from the current unversioned JSON state.
- Persistent per-session transcript events with replay and live delivery.
- Session organization: grouping, sorting, rename, pin, archive, complete, manual ordering, and Fork.
- A message-stream-first center workspace with sanitized Markdown, composer, profile-driven permission/mode/model controls, and raw Terminal view.
- A read-only right inspector for Files, Preview, project languages, Diff, and Git status.
- A macOS-first native folder chooser through the local Web server.
- A Settings navigation shell.
- Transport-neutral client and server capability boundaries for a future desktop shell.
- Security hardening, browser E2E coverage, localization, and accessibility.

### 1.2 PRD Reference

- Source: `cli-gui/doc/workbench/prd-cli-gui-workbench.md`
- User stories: US-001 through US-026
- Functional requirements: FR-1 through FR-70
- Explicit exclusions: Git mutation, file editing, cloud/remote workspaces, desktop packaging, direct provider APIs, multi-agent orchestration, and full deferred Settings implementations.

### 1.3 Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Delivery architecture | Preserve local Web client/server; add transport-neutral interfaces | Meets current runtime needs while enabling a later desktop adapter. |
| Server composition | Injectable `createApplication`/`createServer`; bootstrap-only `index.ts` | Current module singletons prevent safe integration tests and adapter replacement. |
| Persistent metadata | Versioned `AppStateEnvelope` schema v2 in `data/state.json` | Supports deterministic legacy migration without introducing a database prematurely. |
| Transcript storage | Append-only JSONL per session under `data/transcripts/` | Avoids rewriting an ever-growing aggregate state file. |
| Fork history | Reference immutable parent prefix by parent session and sequence | Avoids duplicating long transcripts while preserving branch semantics. |
| Live transcript | Replay over HTTP, gap-free subscription over a typed WebSocket event protocol | Supports pagination, reconnection, and deduplication. |
| Raw terminal | Retain separate xterm terminal transport/view | Preserves ANSI and interactive behavior that structured messages cannot represent. |
| CLI behavior | Versioned Claude Code and Codex adapters; generic fallback | Avoids hardcoded UI conditions and supports explicit degradation for unknown versions. |
| Markdown | `react-markdown` + `remark-gfm`; raw HTML disabled | Meets GFM requirements with a small, safe dependency surface. |
| Reordering | dnd-kit for pointer drag plus explicit keyboard move controls | Pointer interaction is required, but drag alone is not accessible. |
| Folder picker | macOS `osascript` adapter behind `DirectoryPicker`; manual fallback | Browser APIs do not reliably provide an absolute path for PTY `cwd`. |
| Files visibility | Git-status-driven in Git repositories; fixed exclusions in non-Git workspaces | Matches the confirmed product choice while retaining non-Git support. |
| Git integration | Fixed allowlisted `git` argument arrays; internal bounded parsers | Prevents generic command execution and avoids unnecessary Git/diff libraries. |
| UI preferences | Versioned browser localStorage for local presentation; server state for semantic session config | Prevents paths/transcripts from entering browser storage and supports desktop portability. |
| E2E | Playwright with disposable data/workspace/Git fixtures | jsdom cannot validate responsive drawers or full client/server behavior. |

---

## 2. Architecture

### 2.1 System Context

```text
React feature components
        │
        ▼
Client capability contracts
(Session, Transcript, Terminal, Workspace Inspection, Directory Picker)
        │
        ├── Local Web adapter (HTTP + WebSocket) — this release
        └── Desktop invoke/event adapter — future, out of scope
                        │
                        ▼
Local Node application service
        │
        ├── SessionService / ProfileAdapterRegistry
        ├── StateRepository / TranscriptRepository
        ├── PtyRuntime
        ├── DirectoryPicker
        ├── WorkspaceFileReader
        └── GitInspector
                        │
                        ▼
Local OS: filesystem, git executable, node-pty, macOS chooser
```

The local server remains bound to loopback. Loopback binding is not treated as authorization; Host, Origin, request size, path containment, command allowlisting, and runtime policy are enforced explicitly.

### 2.2 Server Component Design

#### `createApplication(dependencies)`

Owns domain services and request handlers, but does not listen at import time.

```ts
interface ApplicationDependencies {
  stateRepository: StateRepository;
  transcriptRepository: TranscriptRepository;
  ptyRuntime: PtyRuntime;
  directoryPicker: DirectoryPicker;
  workspaceFiles: WorkspaceFileReader;
  gitInspector: GitInspector;
  profileAdapters: ProfileAdapterRegistry;
  clock: Clock;
  idGenerator: IdGenerator;
  policy: RuntimePolicy;
  logger: Logger;
}
```

#### `createServer(application, serverConfig)`

Creates HTTP and WebSocket servers, applies transport security, and returns lifecycle controls:

```ts
interface ServerHandle {
  listen(): Promise<{ host: string; port: number }>;
  close(): Promise<void>;
}
```

`server/index.ts` becomes bootstrap only: read environment, build production adapters, call `listen`, install SIGINT/SIGTERM cleanup.

#### `SessionService`

Owns creation, start, stop, metadata changes, organization transitions, ordering, Fork, composer delivery, and deletion. It is the only layer permitted to coordinate state, transcripts, and PTY runtime.

#### `PtyRuntime`

Owns process handles, start locks, lifecycle generation tokens, clients, input, resize, and shutdown. Domain state is not mutated directly by PTY callbacks.

#### `StateRepository`

Loads, validates, migrates, and atomically saves metadata. It never writes after a parse or migration failure.

#### `TranscriptRepository`

Appends, paginates, resolves Fork prefixes, applies retention, and deletes transcript resources. It owns per-session sequence allocation.

#### `WorkspaceFileReader`

Lists visible files, reads bounded text previews, and computes bounded language summaries using canonical workspace roots.

#### `GitInspector`

Returns repository identity, status, tracked/untracked visibility, and bounded staged/unstaged diffs. It exposes no mutation method and no generic command method.

#### `DirectoryPicker`

Returns cancel or a selected absolute path. The macOS implementation invokes fixed application-owned AppleScript through `/usr/bin/osascript` without shell interpolation.

#### `ProfileAdapterRegistry`

Contains `claude-code`, `codex`, and `generic` adapters. Adapters define supported launch controls and optional proven transcript classifications. Unknown or unsupported versions degrade to generic behavior.

### 2.3 Client Component Design

- `App.tsx`: application shell, selection, overlay routing, injected capabilities, coarse state reconciliation.
- `SessionNavigator`: navigator layout and controls, with grouping generated by pure session selectors.
- `SessionContextMenu`: `role="menu"`, roving focus, inverse action labels, confirmation dispatch.
- `SessionWorkspace`: center shell and header only.
- `TranscriptPanel`: history loading, live subscription, deduplication, virtual/segmented rendering.
- `MarkdownMessage`: bounded sanitized GFM renderer with raw-source fallback.
- `PromptComposer`: input, send state, start-and-send, controls, idempotency key.
- `RawTerminalPanel`: wraps the existing xterm integration through `TerminalTransport`.
- `WorkspaceInspector`: right shell with accessible tabs.
- `FilesTab`, `PreviewTab`, `DiffTab`, `GitTab`: lazy data controllers keyed by `workspaceId`.
- `SettingsDrawer`: category navigation; reuses current workspace/profile manager under Environment/Workspaces.
- `Drawer`, `Tabs`, `Menu`: shared accessible primitives; `Overlay` remains for modal dialogs.

### 2.4 Module Interactions

#### Session selection and transcript subscription

```text
User selects session
  → App sets selectedSessionId
  → Transcript controller GETs first/next replay pages
  → controller records highest contiguous sequence
  → controller opens event WS with afterSequence
  → server registers subscriber before querying missed events
  → server sends subscription-ready + missed events + future events
  → client deduplicates by event ID and sequence
```

#### Composer send

```text
PromptComposer creates clientMessageId UUID
  → POST /sessions/:id/messages
  → SessionService validates org/runtime/profile policy
  → if stopped and start=true, start under session lock
  → append user_input event with idempotency key
  → write text + "\r" to PTY exactly once
  → return accepted event and runtime status
  → live event stream appends same event; client deduplicates
```

#### PTY output

```text
PTY emits bytes
  → PtyRuntime publishes raw output callback
  → SessionService enqueues transcript append
  → output is broadcast to raw terminal clients immediately
  → persisted transcript event is published to transcript subscribers
  → append failure logs/publishes recording warning but never terminates PTY
```

Raw terminal delivery is not delayed on disk I/O. Transcript ordering is maintained through a per-session append queue. If raw terminal broadcast precedes transcript persistence, this is acceptable because the two views have different fidelity contracts.

#### Fork replay

```text
GET child transcript
  → child has parentSessionId + forkSequence
  → repository recursively resolves immutable parent prefix through forkSequence
  → repository appends child's own events
  → response presents one monotonic child-visible sequence space
```

Fork depth is capped at 32. Forking a chain at or above the cap materializes the visible prefix into the new child transcript to avoid unbounded lookup depth.

### 2.5 File Structure

Representative structure; existing component files may remain in place during incremental migration.

```text
cli-gui/
├── shared/
│   ├── types.ts                         [MODIFY: compatibility exports]
│   ├── state.ts                         [NEW: persisted entities/envelope]
│   ├── transcript.ts                    [NEW: event contracts]
│   ├── api.ts                           [NEW: HTTP DTOs/errors]
│   ├── events.ts                        [NEW: WS protocol]
│   └── capabilities.ts                  [NEW: profile/inspection DTOs]
├── server/
│   ├── index.ts                         [MODIFY: bootstrap only]
│   ├── application.ts                   [NEW: composition]
│   ├── http-server.ts                   [NEW: HTTP/WS transport]
│   ├── api/
│   │   ├── router.ts
│   │   ├── sessions.ts
│   │   ├── transcripts.ts
│   │   ├── workspaces.ts
│   │   ├── inspection.ts
│   │   └── directory-picker.ts
│   ├── services/
│   │   ├── session-service.ts
│   │   ├── workspace-service.ts
│   │   └── inspection-service.ts
│   ├── persistence/
│   │   ├── state-repository.ts
│   │   ├── state-migrations.ts
│   │   ├── transcript-repository.ts
│   │   └── atomic-file.ts
│   ├── runtime/
│   │   ├── pty-runtime.ts
│   │   └── session-events.ts
│   ├── adapters/
│   │   ├── claude-code-adapter.ts
│   │   ├── codex-adapter.ts
│   │   ├── generic-cli-adapter.ts
│   │   ├── macos-directory-picker.ts
│   │   ├── local-filesystem.ts
│   │   └── local-git.ts
│   ├── security/
│   │   ├── origin-policy.ts
│   │   └── workspace-path.ts
│   ├── domain.ts                        [MODIFY/retain small validators]
│   └── store.ts                         [MODIFY or compatibility wrapper]
├── client/
│   ├── app/
│   │   ├── App.tsx                      [MODIFY]
│   │   ├── capabilities.tsx             [NEW: provider]
│   │   └── preferences.ts               [NEW]
│   ├── capabilities/
│   │   ├── contracts.ts
│   │   ├── local-web.ts
│   │   └── terminal-transport.ts
│   ├── features/
│   │   ├── sessions/
│   │   ├── transcript/
│   │   ├── inspector/
│   │   └── settings/
│   ├── components/ui/
│   │   ├── Overlay.tsx                  [REUSE]
│   │   ├── Drawer.tsx                   [NEW]
│   │   ├── Menu.tsx                     [NEW]
│   │   ├── Tabs.tsx                     [NEW]
│   │   └── Icon.tsx                     [MODIFY]
│   ├── api.ts                            [MODIFY: compatibility facade]
│   ├── terminal.tsx                      [MODIFY: injected transport]
│   ├── i18n.tsx                          [MODIFY]
│   └── styles.css                        [MODIFY]
├── tests/
│   ├── fixtures/
│   │   ├── state/
│   │   ├── transcripts/
│   │   └── workspaces/
│   ├── support/
│   │   ├── test-application.ts
│   │   ├── fake-pty.ts
│   │   └── fixture-repo.ts
│   └── browser/
│       └── workbench.spec.ts
└── playwright.config.ts                  [NEW]
```

---

## 3. Data Model

### 3.1 State Envelope

```ts
export const CURRENT_SCHEMA_VERSION = 2 as const;

export interface AppStateEnvelopeV2 {
  schemaVersion: 2;
  state: AppStateV2;
}

export interface AppStateV2 {
  workspaces: Workspace[];
  profiles: CliProfile[];
  sessions: Session[];
}
```

Pure UI preferences are not stored in this file. The server keeps semantic launch settings because they affect CLI execution and Fork behavior.

### 3.2 Entities

```ts
export interface Workspace {
  id: string;
  name: string;
  path: string;          // canonical absolute realpath
  createdAt: string;
  lastOpenedAt?: string;
}

export type CliAdapterId = "claude-code" | "codex" | "generic";

export interface CliProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  adapterId: CliAdapterId;
  adapterVersionRange?: string;
  createdAt: string;
}

export type SessionRuntimeStatus = "starting" | "running" | "stopped" | "error";
export type SessionOrganizationStatus = "active" | "completed" | "archived";

export interface SessionLaunchConfig {
  permission: string | null; // null = CLI default
  mode: string | null;
  model: string | null;
}

export interface Session {
  id: string;
  workspaceId: string;
  profileId: string;
  name: string;
  runtimeStatus: SessionRuntimeStatus;
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  manualOrder: number;
  launchConfig: SessionLaunchConfig;
  parentSessionId?: string;
  forkEventId?: string;
  forkSequence?: number;
  forkedAt?: string;
  createdAt: string;
  lastActiveAt: string;
  completedAt?: string;
  archivedAt?: string;
  exitCode?: number;
  error?: SessionRuntimeError;
  revision: number;
}

export interface SessionRuntimeError {
  code: string;
  message: string;
  occurredAt: string;
}
```

For one compatibility release, `StateResponse` may expose derived `status: runtimeStatus` if current components still consume `session.status`. New code uses `runtimeStatus` explicitly.

`manualOrder` is a stable integer. Reorder operations reassign section-local values in increments of 1000. If gaps are exhausted, the server normalizes the affected section in one transaction.

`revision` increments on semantic metadata mutation and is required for reorder/update conflict detection.

### 3.3 Profile Capabilities

```ts
export interface CliOptionDefinition {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  requiresRestart: boolean;
}

export interface CliProfileCapabilities {
  adapterId: CliAdapterId;
  detectedVersion?: string;
  compatibility: "supported" | "unknown-version" | "unavailable";
  permissions: CliOptionDefinition[];
  modes: CliOptionDefinition[];
  models: CliOptionDefinition[];
  supportsComposer: boolean;
  supportsStructuredRecognition: boolean;
}
```

The server detects executable version with a bounded, adapter-owned argument list and 2-second timeout. Detection failure does not prevent raw terminal use. Unknown versions expose `CLI default`, composer if raw stdin is usable, and neutral PTY output only.

### 3.4 Transcript Events

```ts
export type TranscriptEventKind =
  | "user_input"
  | "pty_output"
  | "markdown"
  | "lifecycle"
  | "error"
  | "tool_activity"
  | "permission_request"
  | "retention_marker";

export type TranscriptEventSource =
  | "composer"
  | "terminal"
  | "pty"
  | "session-manager"
  | "profile-adapter";

export interface TranscriptEvent {
  id: string;
  sessionId: string;
  sequence: number;
  occurredAt: string;
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;
  rawBytes: number;
  truncated: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  clientMessageId?: string;
}
```

Rules:

- `raw` is UTF-8 text bounded to 64 KiB per event; `rawBytes` records original size.
- Larger PTY chunks are split into consecutive events where possible rather than discarded. A single unsplittable input is truncated with `truncated=true`.
- Adapter classification may add a derived `markdown` or other event only when the adapter has a proven parser contract. Otherwise content remains `pty_output`.
- Raw content is never replaced by rendered HTML.
- `clientMessageId` has a unique per-session index in repository logic for idempotent composer delivery.

### 3.5 Transcript Files and Fork Prefixes

```text
data/
├── state.json
└── transcripts/
    ├── session-abc.jsonl
    └── session-def.jsonl
```

Each JSONL line is a complete validated `TranscriptEvent`. A sidecar index is optional after measurement; the initial implementation may scan bounded local files to locate a sequence. Retention default is 10 MiB of own events per session. When old own events are rotated, insert a `retention_marker` as the first retained event.

A fork stores lineage in `Session`; it does not copy the parent file. Visible history is the resolved parent prefix through `forkSequence`, followed by the child file. The parent transcript prefix becomes immutable for child semantics: later retention must not remove events still referenced by descendants. Repository retention therefore computes the minimum referenced parent sequence and retains through that boundary. Deleting a parent with descendants is rejected with `SESSION_HAS_FORKS` until descendants are deleted or materialized.

### 3.6 Browser UI Preferences

Key: `product-ai-os-cli-gui-ui-preferences-v1`

```ts
interface UiPreferencesV1 {
  version: 1;
  navigatorOpen: boolean;
  inspectorOpen: boolean;
  sessionGrouping: "project" | "time" | "recent" | "manual";
  sessionFilter: "active" | "completed" | "archived";
  inspectorTab: "preview" | "files" | "diff" | "git";
  centerViewBySession: Record<string, "transcript" | "terminal">;
}
```

Invalid or unknown-version browser preferences are ignored and replaced with defaults. Workspace paths, transcripts, and semantic launch configuration never enter localStorage.

### 3.7 Migration Plan

1. Read `state.json` without writing.
2. If absent:
   - writable mode: construct and atomically persist empty v2 state;
   - readonly mode: use in-memory empty v2 state without creating directories/files.
3. Parse JSON. Parse failure returns a typed startup recovery error and preserves the source unchanged.
4. If `schemaVersion === 2`, validate every entity.
5. If the root is a legacy bare `{workspaces,profiles,sessions}`, treat as v1.
6. Migrate workspaces:
   - preserve IDs, names, timestamps;
   - canonicalize paths with `realpath` when available;
   - fail migration with an actionable workspace error if canonicalization cannot be completed rather than silently changing or dropping the workspace.
7. Migrate profiles:
   - `profile-claude` → `adapterId: "claude-code"`;
   - `profile-codex` → `adapterId: "codex"`;
   - all others → `adapterId: "generic"`.
8. Migrate sessions in existing array order:
   - `runtimeStatus: "stopped"` regardless of previous runtime status;
   - preserve exit code and timestamps;
   - clear stale runtime error into an optional migration lifecycle record, not active error;
   - `organizationStatus: "active"`, `pinned:false`, `manualOrder:index*1000`, null launch config, `revision:1`.
9. Validate complete v2 result.
10. In writable mode, write `state.json.v1.bak` once, then atomically save v2. In readonly mode, hold migrated v2 in memory and report `migrationPending:true` without writing.
11. Rollback is restoring the backup and running the previous application version. New v2-only transcript files are ignored by the old version.

Migration is idempotent. No source file is overwritten until parse, migration, and v2 validation all succeed.

---

## 4. API Design

### 4.1 Common Transport Rules

- Base: `/api`.
- JSON request body limit: 1 MiB.
- `Content-Type: application/json` is required for JSON mutation requests.
- Success response bodies are typed JSON except documented 204 responses.
- Error envelope:

```ts
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
```

- Responses use `application/json; charset=utf-8` and `Cache-Control: no-store` for API data.
- The client parses 204 without attempting JSON and maps error codes to localized messages.
- `GET /api/state` remains for compatibility during migration but does not include transcripts, file trees, previews, or diffs.

### 4.2 Endpoint Table

| Method | Path | Description | Mutation |
|---|---|---|---|
| GET | `/api/state` | Aggregate metadata and runtime policy | No |
| POST | `/api/workspaces/pick` | Open macOS picker and register selected workspace | Yes |
| POST | `/api/workspaces` | Register manual canonical path | Yes |
| PATCH | `/api/workspaces/:id` | Rename or update path | Yes |
| DELETE | `/api/workspaces/:id` | Delete unreferenced workspace | Yes |
| GET | `/api/workspaces/:id/files` | List visible directory entries | No |
| GET | `/api/workspaces/:id/preview` | Read bounded text preview | No |
| GET | `/api/workspaces/:id/languages` | Compute bounded language summary | No |
| GET | `/api/workspaces/:id/git/status` | Read branch and working tree status | No |
| GET | `/api/workspaces/:id/git/diff` | Read staged/unstaged bounded diff | No |
| POST | `/api/profiles` | Create profile | Yes |
| PATCH | `/api/profiles/:id` | Update profile | Yes |
| DELETE | `/api/profiles/:id` | Delete unreferenced profile | Yes |
| GET | `/api/profiles/:id/capabilities` | Detect adapter/version/options | No |
| POST | `/api/sessions` | Create stopped or confirmed-started session | Yes |
| PATCH | `/api/sessions/:id` | Rename or update launch config with revision | Yes |
| DELETE | `/api/sessions/:id` | Stop and delete session/transcript | Yes |
| POST | `/api/sessions/:id/start` | Confirmed start | Yes |
| POST | `/api/sessions/:id/stop` | Stop runtime | Yes |
| POST | `/api/sessions/:id/archive` | Stop if confirmed; archive | Yes |
| POST | `/api/sessions/:id/restore` | Restore archived session | Yes |
| POST | `/api/sessions/:id/complete` | Stop if confirmed; complete | Yes |
| POST | `/api/sessions/:id/reopen` | Reopen completed session | Yes |
| POST | `/api/sessions/:id/pin` | Set pinned state | Yes |
| POST | `/api/sessions/:id/fork` | Create stopped child at current boundary | Yes |
| POST | `/api/sessions/reorder` | Persist ordered section with optimistic revisions | Yes |
| GET | `/api/sessions/:id/transcript` | Replay visible history | No |
| POST | `/api/sessions/:id/messages` | Idempotent composer delivery | Yes |

Terminal resize remains a WebSocket command and the old HTTP resize endpoint is deprecated, then removed after client migration.

### 4.3 Key Request/Response Contracts

#### Create session

```ts
interface CreateSessionRequest {
  name: string;               // trimmed, 1..120 chars
  workspaceId: string;
  profileId: string;
  launchConfig?: Partial<SessionLaunchConfig>;
  start: boolean;
  confirmed: boolean;         // required only when start=true
  terminal?: { cols: number; rows: number };
}

interface CreateSessionResponse {
  session: Session;
  capabilities: CliProfileCapabilities;
}
```

Validation occurs before persistence. If `start=true` and startup fails, the session is retained only if creation itself succeeded, with `runtimeStatus:"error"`; response is 201 with the created session and a typed `startupError`, not a misleading 400. If confirmation is absent, no session is persisted and 400 is returned. This removes the current accidental unconfirmed-session persistence.

#### Session patch

```ts
interface PatchSessionRequest {
  expectedRevision: number;
  name?: string;
  launchConfig?: Partial<SessionLaunchConfig>;
}
```

Unknown or unsupported launch option returns `CLI_OPTION_UNSUPPORTED`. Running-session changes that require restart are stored as pending effective-on-next-start configuration and returned with `appliesOn:"next-start"`.

#### Organization actions

```ts
interface RuntimeAffectingActionRequest {
  expectedRevision: number;
  stopRunning?: boolean;
}
```

- Archive/Complete on running requires `stopRunning:true`; otherwise 409.
- Restore applies only to archived.
- Reopen applies only to completed.
- Pin body: `{ expectedRevision, pinned:boolean }`.

#### Reorder

```ts
interface ReorderSessionsRequest {
  organizationStatus: SessionOrganizationStatus;
  pinned: boolean;
  orderedSessionIds: string[];
  expectedRevisions: Record<string, number>;
}
```

The server verifies the list is exactly the current section membership, all revisions match, then assigns normalized orders. Conflict returns current section metadata with 409.

#### Fork

```ts
interface ForkSessionRequest {
  name?: string;
  expectedRevision: number;
}

interface ForkSessionResponse {
  session: Session;
  parentBoundary: { eventId?: string; sequence: number };
}
```

Fork uses the latest fully persisted visible event as boundary. It does not start a PTY. A parent with no events uses sequence 0.

#### Transcript replay

`GET /api/sessions/:id/transcript?afterSequence=0&limit=200`

```ts
interface TranscriptPage {
  events: TranscriptEvent[];
  hasMore: boolean;
  nextAfterSequence: number;
  visibleStartSequence: number;
  retentionTruncated: boolean;
}
```

`limit` range is 1..200. Serialized response is capped at 1 MiB; the server may return fewer than `limit` with `hasMore:true`.

#### Composer

```ts
interface SendMessageRequest {
  clientMessageId: string; // UUID
  content: string;         // 1..64 KiB UTF-8
  startIfStopped: boolean;
  confirmedStart: boolean;
}

interface SendMessageResponse {
  event: TranscriptEvent;
  runtimeStatus: SessionRuntimeStatus;
  duplicate: boolean;
}
```

The same `clientMessageId` returns the original result and never writes to PTY twice.

#### Directory picker

```ts
interface PickWorkspaceRequest {
  intentToken: string;
}

type PickWorkspaceResponse =
  | { cancelled: true }
  | { cancelled: false; workspace: Workspace };
```

Only one picker may be active. Timeout: 60 seconds. The server issues the short-lived single-use `intentToken` in `/api/state` or a dedicated capability endpoint to the same approved frontend origin. Cancel/timeout creates no workspace.

#### File listing

`GET /api/workspaces/:id/files?path=<relative>&cursor=<opaque>&limit=500`

```ts
interface FileTreePage {
  path: string;
  entries: Array<{
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    gitStatus?: GitFileStatus;
  }>;
  nextCursor?: string;
  omittedCount: number;
  visibilitySource: "git" | "fallback-exclusions";
}
```

In Git workspaces, visible files are Git tracked plus untracked-not-ignored. `.git` is never visible. In non-Git workspaces, fixed exclusions apply. Symlinks are not followed or listed in v1.

#### Preview

`GET /api/workspaces/:id/preview?path=<relative>`

```ts
interface FilePreview {
  path: string;
  kind: "text" | "binary" | "oversized";
  size: number;
  encoding?: "utf-8";
  content?: string;
  truncated: boolean;
  shownBytes: number;
}
```

Text preview reads at most 1 MiB. UTF-8 decoding errors or NUL bytes classify as binary. No write endpoint exists.

#### Languages

```ts
interface LanguageSummaryResponse {
  entries: Array<{ language: string; files: number; bytes: number; share: number }>;
  partial: boolean;
  partialReason?: "file-limit" | "byte-limit" | "time-limit";
  visibilitySource: "git" | "fallback-exclusions";
}
```

#### Git status

```ts
interface GitStatusResponse {
  repository: boolean;
  branch?: string;
  detachedHead?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  clean: boolean;
  entries: Array<{
    path: string;
    previousPath?: string;
    staged: GitFileStatus;
    unstaged: GitFileStatus;
    conflicted: boolean;
  }>;
  truncated: boolean;
}
```

#### Git diff

`GET /api/workspaces/:id/git/diff?scope=unstaged|staged&path=<optional-relative>`

```ts
interface GitDiffResponse {
  scope: "unstaged" | "staged";
  files: DiffFile[];
  truncated: boolean;
  originalBytes: number;
  shownLines: number;
}

interface DiffFile {
  oldPath?: string;
  newPath?: string;
  status: "added" | "deleted" | "modified" | "renamed" | "binary" | "conflicted";
  hunks: Array<{
    header: string;
    lines: Array<{ kind: "context" | "addition" | "deletion" | "meta"; text: string; oldLine?: number; newLine?: number }>;
  }>;
}
```

The internal parser accepts only the bounded output of application-owned Git commands. Parse failure returns a typed error and may include no raw command output in the client response.

### 4.4 WebSocket Protocol

Use one `/ws` endpoint with explicit `channel` query value:

- `/ws?channel=terminal&sessionId=...`
- `/ws?channel=events&sessionId=...&afterSequence=...`

Every frame is JSON except terminal output may remain JSON string payload for compatibility. Maximum inbound frame: 64 KiB.

#### Terminal client → server

```ts
type TerminalClientFrame =
  | { type: "terminal-input"; data: string }
  | { type: "terminal-resize"; cols: number; rows: number };
```

#### Terminal server → client

```ts
type TerminalServerFrame =
  | { type: "terminal-output"; data: string }
  | { type: "runtime-status"; status: SessionRuntimeStatus; exitCode?: number }
  | { type: "protocol-error"; error: ApiErrorResponse["error"] };
```

#### Event server → client

```ts
type EventServerFrame =
  | { type: "subscription-ready"; afterSequence: number; latestSequence: number }
  | { type: "transcript-event"; event: TranscriptEvent }
  | { type: "session-updated"; session: Session }
  | { type: "recording-warning"; code: string }
  | { type: "protocol-error"; error: ApiErrorResponse["error"] };
```

Gap-free subscribe algorithm:

1. Validate session and cursor.
2. Register subscriber in a paused per-session event hub.
3. Query persisted events after cursor.
4. Send persisted missed events.
5. Flush hub events with sequence above last sent.
6. Send `subscription-ready` and switch subscriber live.

The client maintains an event-ID set for the loaded window and a highest contiguous sequence. On reconnect it opens with the contiguous sequence, not merely the maximum seen.

Unknown/non-running terminal sessions receive an explicit runtime status frame and close with policy code 1008 when input is unavailable. WebSocket Origin and Host are validated before upgrade.

### 4.5 Breaking Changes and Compatibility

- `Session.status` becomes `runtimeStatus`; expose a temporary derived alias for existing components during one migration phase.
- Error response changes from `{error:string}` to structured errors. `client/api.ts` is updated atomically with server transport; no external consumers are supported.
- Terminal WS frame names become explicit. The client and server change together.
- Legacy `/api/sessions/:id/resize` remains temporarily but new client code uses WS.
- `GET /api/state` remains until focused client services fully replace polling.

---

## 5. Business Logic

### 5.1 Session Runtime State Machine

```text
stopped --start(confirm, valid org/config)--> starting
starting --spawn success---------------> running
starting --spawn failure---------------> error
running --process exit-----------------> stopped
running --stop-------------------------> stopped
error --start--------------------------> starting
```

Guards:

- Archived sessions cannot start or receive composer input.
- Completed sessions must be reopened before start.
- Only one start operation may execute per session; concurrent start joins or returns 409.
- A runtime generation token is incremented on each start. PTY callbacks may mutate state only when their token matches the current generation. This prevents stale `onExit` after stop/delete from changing a newer runtime.
- Stop sends/broadcasts stopped status before removing subscribers and waits for or invalidates the exit callback.
- Application shutdown stops all PTYs and waits for repository queues to drain within 5 seconds.

### 5.2 Organizational State Machine

```text
active --complete(stop if running + confirmed)--> completed
completed --reopen------------------------------> active
active --archive(stop if running + confirmed)---> archived
completed --archive------------------------------> archived
archived --restore-------------------------------> active
```

Archive preserves whether a session was previously completed in `metadata.previousOrganizationStatus` only if product later needs restore-to-completed. In this release, Restore always returns to Active, matching the PRD.

Pin is independent. Archived sessions retain pinned metadata but are not shown in the active pinned section.

### 5.3 Create and Start

- Validate name, workspace/profile references, canonical workspace availability, launch options, confirmation, and readonly policy before persistence.
- `start:false` creates a stopped session without requiring confirmation.
- `start:true` requires confirmation; creation persists only after all preflight checks pass.
- Spawn failure produces a persisted error session and a lifecycle/error transcript event because the user intentionally created it.
- The command preview remains argument-array based; never execute a shell string.

### 5.4 Composer Delivery

- Validate organization state and content size.
- Resolve `clientMessageId`; return existing event if already processed.
- If stopped and `startIfStopped=false`, return 409.
- If stopped and confirmed start requested, start under the same session mutation lock.
- Append `user_input` event before PTY write so the user's intent is not lost.
- Persist idempotency mapping with the event.
- Write `${content}\r` exactly once.
- If PTY write fails after event persistence, append an error event and return `MESSAGE_DELIVERY_FAILED`; retry with the same ID must not write automatically. The UI offers an explicit resend with a new ID.

### 5.5 Transcript Classification and Markdown

- Composer input is a user event.
- PTY bytes are neutral output.
- Claude/Codex adapters may recognize Markdown blocks only from version-tested stable output delimiters. Recognition never claims hidden reasoning and never converts uncertain output into assistant/tool semantics.
- Unknown versions disable structured recognition.
- `react-markdown` receives at most 256 KiB per displayed message. Larger content renders a bounded prefix or raw-only fallback with an explicit truncation state.
- Raw HTML plugins are not installed. Links allow `https`, `http`, `mailto`, relative paths, and fragments only.

### 5.6 Grouping and Ordering

Pure client selectors produce:

- Project: workspace order, then pinned/manual or recency order.
- Time: Today, Yesterday, Previous 7 Days, Older using the user locale and local timezone.
- Recent: descending `lastActiveAt`, stable ID tie-breaker.
- Manual: `pinned` section then unpinned section ordered by `manualOrder`, stable ID tie-breaker.

Server-side organization/filter state is authoritative; grouping selection is browser-local.

### 5.7 Git-Status-Driven File Visibility

For a Git repository:

1. Get tracked files with `git ls-files -z`.
2. Get untracked, non-ignored files with `git ls-files -z --others --exclude-standard`.
3. Merge into a directory index and add necessary ancestor directories.
4. Never expose `.git` internals.
5. Display ignored files only if a future explicit toggle is added; that toggle is not implemented in this release.

For non-Git workspaces, recursively list without following symlinks and exclude:

`.git`, `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `.DS_Store`.

Language summary uses the same visible file set. It does not inspect ignored files.

### 5.8 Filesystem Containment

For every workspace operation:

1. Resolve workspace by server-owned ID.
2. Use stored canonical realpath root.
3. Reject absolute child paths, NUL bytes, and any normalized `..` segment.
4. Join under root.
5. `lstat` target; reject symlinks in v1.
6. `realpath` existing target.
7. Verify `path.relative(root,target)` is nonempty-or-child, not absolute, and does not start with `..`.
8. Apply operation-specific size/depth/time limits.

### 5.9 Git Commands

Use `execFile`/`spawn`, `shell:false`, canonical workspace `cwd`, fixed arguments, and environment including `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, and locale suitable for parsing.

Allowlisted command families:

```text
git -c core.quotepath=false rev-parse ...
git -c core.quotepath=false symbolic-ref ...
git -c core.quotepath=false status --porcelain=v2 -z --branch
git -c core.quotepath=false ls-files -z [...]
git -c core.quotepath=false diff --no-ext-diff --no-color --no-textconv --find-renames [...]
```

No interface accepts arbitrary subcommands or argument arrays from the client.

### 5.10 Edge Cases

- Corrupt state: server enters recoverable startup error; source remains untouched.
- Missing migrated workspace path: surface migration failure; do not silently remove it.
- Transcript final partial JSONL line after crash: ignore/quarantine only the partial last line; malformed complete earlier lines mark that transcript corrupt.
- Parent deletion with forks: reject until descendants are removed/materialized.
- Deep Fork chain: materialize at depth 32.
- Session deleted during output callback: generation/session existence guard drops stale callback.
- Reorder conflict: return current section; client refreshes and asks user to retry.
- Non-Git workspace: Files/Preview work through fallback exclusions; Git/Diff show neutral state.
- Git executable absent: Git tabs show unavailable state; Files fallback to filesystem listing.
- File changed between list and preview: preview returns current content and metadata; UI may show refreshed timestamp.
- Binary or invalid UTF-8: metadata-only preview.
- Picker canceled/timeout: no workspace mutation.
- Unknown CLI version: terminal and generic composer remain available; selectors disabled except CLI default.
- Transcript append failure: terminal continues; visible recording warning; no false claim of complete history.

---

## 6. Error Handling

### 6.1 Error Taxonomy

| Code | HTTP | Condition | Public message intent |
|---|---:|---|---|
| `INVALID_JSON` | 400 | Malformed JSON | Request body is invalid. |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeds 1 MiB | Request is too large. |
| `VALIDATION_FAILED` | 400 | Invalid field/range | Check the highlighted values. |
| `ORIGIN_NOT_ALLOWED` | 403 | Host/Origin/token failure | Request origin is not allowed. |
| `READONLY_MODE` | 403 | Mutation in readonly runtime | This action is unavailable in read-only mode. |
| `WORKSPACE_NOT_FOUND` | 404 | Unknown workspace ID | Workspace no longer exists. |
| `WORKSPACE_PATH_INVALID` | 400 | Missing/inaccessible/non-directory path | Select an accessible folder. |
| `WORKSPACE_DUPLICATE` | 409 | Canonical path already registered | Workspace is already open. |
| `WORKSPACE_IN_USE` | 409 | Sessions reference workspace | Remove or move sessions first. |
| `WORKSPACE_PATH_ESCAPE` | 403 | Traversal/symlink escape | Requested path is outside the workspace. |
| `PROFILE_NOT_FOUND` | 404 | Unknown profile | CLI profile no longer exists. |
| `PROFILE_IN_USE` | 409 | Sessions reference profile | Remove or move sessions first. |
| `CLI_OPTION_UNSUPPORTED` | 400 | Adapter rejects setting | Selected CLI does not support this option. |
| `SESSION_NOT_FOUND` | 404 | Unknown session | Session no longer exists. |
| `SESSION_REVISION_CONFLICT` | 409 | Optimistic mutation mismatch | Session changed; refresh and retry. |
| `SESSION_NOT_ACTIVE` | 409 | Start/send on completed/archived | Reopen or restore the session first. |
| `SESSION_RUNNING_CONFIRMATION_REQUIRED` | 409 | Complete/archive while running | Confirm that the running process may stop. |
| `SESSION_ALREADY_RUNNING` | 409 | Conflicting start | Session is already running. |
| `SESSION_START_FAILED` | 422 | PTY spawn failed after creation | CLI could not be started. |
| `SESSION_HAS_FORKS` | 409 | Parent deletion would break child history | Remove dependent forks first. |
| `MESSAGE_DUPLICATE` | 200 | Same idempotency ID | Original accepted result is returned. |
| `MESSAGE_DELIVERY_FAILED` | 502 | Persisted input could not reach PTY | Message was saved but not delivered. |
| `TRANSCRIPT_CORRUPT` | 500 | Invalid historical record | Transcript cannot be loaded safely. |
| `TRANSCRIPT_WRITE_FAILED` | 500/live warning | Append failed | Terminal remains active; recording is incomplete. |
| `PICKER_UNAVAILABLE` | 501 | Non-macOS/no adapter | Enter a path manually. |
| `PICKER_BUSY` | 409 | Picker already open | Finish the open folder dialog first. |
| `PICKER_TIMEOUT` | 408 | 60-second timeout | Folder selection timed out. |
| `FILE_NOT_FOUND` | 404 | Missing child path | File no longer exists. |
| `FILE_BINARY` | 200 typed state | Non-text preview | Binary preview is unavailable. |
| `GIT_UNAVAILABLE` | 503 | Git executable unavailable | Git inspection is unavailable. |
| `NOT_A_GIT_REPOSITORY` | 200 typed state | Workspace is non-Git | This workspace is not a Git repository. |
| `GIT_TIMEOUT` | 504 | Bounded command timeout | Git inspection timed out. |
| `INTERNAL_ERROR` | 500 | Unexpected failure | Operation failed; see local logs. |

Detailed filesystem paths, command stderr, stack traces, and raw internal errors are logged locally with request ID and are not returned to the browser.

### 6.2 Retry Strategy

- Metadata GET, transcript replay, Files, Preview, Languages, Git status/diff: retry manually or once automatically after 500–1000 ms for transient network failures.
- Composer: network retry uses the same `clientMessageId`; server idempotency prevents duplicate PTY writes.
- Session lifecycle mutations: no blind automatic retry; revision conflicts require refresh.
- Git timeout and picker timeout: no automatic retry.
- WebSocket reconnect: exponential delay 250 ms, 500 ms, 1 s, 2 s, 5 s maximum, reset after stable connection. Reconnect cursor is highest contiguous sequence.

### 6.3 Graceful Degradation

- Transcript storage failure does not stop terminal interaction.
- Git failure does not disable Files/Preview.
- Git-based visibility failure falls back to fixed exclusions and marks `visibilitySource:"fallback-exclusions"`.
- Profile version detection failure falls back to generic capabilities.
- Folder picker failure keeps manual path entry available.
- Browser preference corruption resets only presentation defaults.

---

## 7. Security

### 7.1 Local Request Authorization

- Bind production server to `127.0.0.1` only.
- Validate `Host` as loopback with configured port.
- Approved Origins:
  - dev: configured `http://127.0.0.1:3000`;
  - production: the server's own loopback origin.
- All mutation requests require approved Origin plus a per-process anti-CSRF token delivered to the approved application document/state bootstrap.
- Picker requires approved Origin, CSRF token, and single-use intent token.
- WebSocket upgrade requires approved Host, Origin, and CSRF token in a negotiated query/header contract.
- Missing or unapproved Origin is rejected for mutations and WS. CORS headers alone are not authorization.

### 7.2 Input Validation

- JSON: 1 MiB maximum, UTF-8, expected content type.
- Names: trimmed, 1–120 Unicode characters; control characters rejected.
- IDs: application-generated UUID-prefixed IDs; maximum 160 characters on input.
- Composer: 1–64 KiB UTF-8.
- Terminal frame: 64 KiB; rate-limit 200 frames/second/client with burst 400, then close abusive client.
- Resize: integer cols 20–500, rows 5–200.
- Query limits use strict integer parsing and server caps.
- Relative paths reject absolute forms, NUL, `..`, and symlinks.

### 7.3 Process Safety

- PTY launches executable plus argument array directly; no shell.
- Command preview quotes display values but is never executable input.
- Git and `osascript` use fixed executable paths/arguments and `shell:false`.
- Picker AppleScript is fixed source; no user content is interpolated.
- Git processes have timeouts, output caps, noninteractive environment, and are killed on timeout.

### 7.4 Data Protection

- All state/transcripts remain local.
- No secrets or environment values are intentionally persisted in transcript metadata beyond raw CLI output the user sees. The product must warn that CLI output may contain sensitive content.
- State and transcript files use user-default filesystem permissions; creation requests mode `0o600` for files and `0o700` for data directories where supported.
- Readonly mode performs zero filesystem writes, migrations, picker operations, session mutations, or PTY input. Files/Git inspection remains available through GET endpoints.
- Delete removes metadata and own transcript file but does not promise secure physical erasure from SSD/filesystem snapshots.

---

## 8. Performance

### 8.1 Expected Load

Single local user, normally 1–20 registered workspaces, 1–200 sessions, at least 4 concurrent PTYs, and transcripts up to tens of MiB over time. The architecture favors bounded local operations rather than high QPS.

### 8.2 Enforced Limits

| Surface | Limit | Behavior |
|---|---:|---|
| JSON request | 1 MiB | 413 |
| Picker | one active, 60 s | cancel/timeout, no mutation |
| Composer | 64 KiB | reject before persistence |
| Transcript event raw payload | 64 KiB | split/truncate with metadata |
| Transcript replay | 200 events and 1 MiB response | cursor + `hasMore` |
| Own transcript retention | 10 MiB/session default | retention marker; protect referenced fork prefixes |
| Markdown input | 256 KiB/message | bounded/raw fallback |
| File list | 500 entries/page | cursor paging |
| Tree depth | 32 | blocked/partial state |
| Preview | 1 MiB | bounded text or typed oversized state |
| Language scan | 10,000 files, 250 MiB, or 2 s | partial result/reason |
| Git status | 5 s, 1 MiB stdout, 10,000 entries | truncated/timeout state |
| Git diff | 10 s, 2 MiB, 10,000 changed lines | truncate at file/hunk boundary |
| Fork chain | depth 32 | materialize next fork prefix |
| WS inbound frame | 64 KiB | protocol error/close |

### 8.3 Optimization Strategy

- Keep `state.json` metadata-only.
- Serialize state mutations and per-session transcript appends independently.
- Batch `lastActiveAt` metadata persistence to at most once per second/session rather than every PTY chunk.
- Coarse `/api/state` polling slows from 2 seconds to 10 seconds after live session updates are available, and pauses when document is hidden.
- File trees load per directory/page.
- Inspector data loads only for the active tab and cancels stale requests on workspace/tab change.
- Git status may cache for 1 second per workspace; explicit refresh invalidates it.
- Transcript UI renders incrementally; if profiling shows long-list degradation, add windowing in a follow-up without changing event contracts.

---

## 9. Testing Strategy

### 9.1 Unit Tests

- State schema validation and every v1→v2 migration default.
- Migration corruption/no-overwrite and readonly no-write behavior.
- Session runtime and organization state transitions.
- Manual order normalization and revision conflict handling.
- Fork prefix resolution, retention protection, depth materialization.
- Transcript append, sequence allocation, paging, event size handling, idempotency.
- Workspace canonicalization and containment, including traversal and symlink attempts.
- Git porcelain/diff parser fixtures and command allowlist construction.
- Claude/Codex/generic capability adapter version degradation.
- Session grouping/time buckets/manual selectors.
- Markdown URL transform and raw HTML behavior.
- UI preference validation/defaulting.

### 9.2 Integration Tests

Create the app with temporary data root and fake adapters.

- HTTP content type/body limit/error envelope/origin/CSRF behavior.
- State GET compatibility and focused mutation endpoints.
- Create preflight versus spawn failure persistence semantics.
- Start race lock and stale PTY generation callbacks.
- Stop broadcasts before runtime cleanup.
- Transcript replay + live subscribe gap test.
- Composer retry with same ID writes PTY exactly once.
- Archive/Complete running confirmation and state transitions.
- Reorder optimistic conflict.
- Fork and parent deletion guard.
- Picker cancel/timeout/duplicate registration.
- Files visibility in Git and non-Git fixtures.
- Preview binary/oversized/path escape.
- Git clean/non-Git/rename/conflict/binary/truncation/timeout.
- Readonly startup and requests perform zero writes.

### 9.3 Component Tests

Continue current Vitest/jsdom style:

- `App`: preference restoration, panel toggles, state reconciliation, active selection.
- `SessionNavigator`: grouping/filter modes, pinned area, context menu, pointer callback, keyboard move controls.
- `Menu`, `Tabs`, `Drawer`: semantics, focus, Escape, arrow keys, restoration.
- `TranscriptPanel`: replay/live dedupe, states, neutral output labels.
- `MarkdownMessage`: GFM fixtures, unsafe links, raw HTML, malformed/large input, copy.
- `PromptComposer`: Enter/Shift+Enter, idempotency, stopped start-and-send, disabled org states.
- `WorkspaceInspector`: lazy tabs, cancellation, non-Git and error states.
- `SettingsDrawer`: category shell, placeholders, existing management.
- English/Chinese key completeness.

### 9.4 Browser E2E

Add `@playwright/test` and `playwright.config.ts`. The test application uses temporary data and disposable fixture repositories, not the source repository.

Smoke flows:

1. Launch empty app, open macOS picker through a test picker adapter, register fixture workspace.
2. Create/select a session with fake deterministic PTY.
3. Verify three-column layout at desktop width.
4. Toggle left/right panels with buttons and shortcuts.
5. Verify drawers/backdrops/focus at `<900px` and right drawer at `<1280px`.
6. Send composer message; verify transcript and terminal switch without a second process.
7. Render a Plan/Skill Markdown fixture.
8. Rename, pin, reorder, complete/reopen, archive/restore, Fork.
9. Browse Files, Preview, Languages, staged/unstaged Diff, and Git status fixture.
10. Open Settings in English and Chinese.
11. Reload and verify metadata, transcript, and UI preferences persist.

### 9.5 Acceptance Mapping

| PRD coverage | Primary verification |
|---|---|
| US-001–004 / FR-27–32, 68–69 | Migration, repository, replay/live integration tests |
| US-005 / FR-1–6 | App/component tests + responsive Playwright |
| US-006 / FR-7–12 | Picker/workspace integration + E2E |
| US-007–013 / FR-13–26 | Session domain tests, navigator tests, E2E lifecycle flows |
| US-014–015 / FR-33–37 | Transcript/Markdown unit and browser fixtures |
| US-016–018 / FR-38–49 | Composer idempotency, adapter tests, terminal E2E |
| US-019–023 / FR-50–62 | Filesystem/Git security integration + inspector E2E |
| US-024–025 / FR-63–67 | Settings/i18n/accessibility component and browser tests |
| US-026 / FR-70 | Playwright harness and capability-injection tests |

Every story's detailed acceptance criteria must be referenced by the implementation issue generated from this SPEC; this table groups the test suites without replacing story-level checklists.

---

## 10. Implementation Plan

### 10.1 Phases

#### Phase 1: Foundation and hardening

- Add shared v2 contracts and structured errors.
- Extract injectable application/server composition.
- Add body, Host, Origin, CSRF, WS, and readonly policies.
- Add temp-root integration harness.

#### Phase 2: Persistence and session domain

- Implement state repository/migration/backup.
- Separate runtime and organization status.
- Correct create/start/stop/generation lifecycle bugs.
- Add metadata actions, revision checks, ordering, and Fork lineage.

#### Phase 3: Transcript and live events

- Add JSONL repository, retention, prefix resolution, and paging.
- Capture composer/lifecycle/PTY events.
- Add typed event WS, gap-free subscribe, deduplication, recording warnings.
- Refactor terminal transport without changing xterm behavior.

#### Phase 4: Client shell and navigation

- Add client capability provider/local Web adapter.
- Add versioned UI preferences.
- Complete accessible drawers, tabs, panel persistence.
- Add grouping, filters, context menu, dnd-kit, keyboard move controls.

#### Phase 5: Message-first center

- Add transcript list, states, event cards.
- Add `react-markdown` and `remark-gfm` renderer.
- Add composer/start-and-send/idempotency.
- Add Claude Code/Codex/generic adapters and launch selectors.
- Retain raw terminal alternate view.

#### Phase 6: Workspace inspection

- Add canonical path security utilities.
- Add Git-status-driven file visibility and fallback exclusions.
- Add file tree, preview, and language summary.
- Add read-only Git status and unified-diff parser/UI.

#### Phase 7: Picker and Settings

- Add protected macOS `osascript` picker and manual fallback.
- Add Settings categories and placeholders.
- Move/reuse workspace/profile management under Settings.

#### Phase 8: Browser verification and hardening

- Add Playwright and disposable fixture harness.
- Complete responsive, keyboard, i18n, limits, failure, and regression verification.
- Run real local Claude Code and Codex smoke validation for supported adapter versions without embedding provider APIs.

### 10.2 Issue Mapping

| Issue group | SPEC sections | Priority | Depends on |
|---|---|---:|---|
| Server composition/security | 2.2, 4.1, 6, 7 | P0 | — |
| State v2 migration | 3.1–3.2, 3.7 | P0 | composition |
| Session lifecycle/domain | 3.2, 4.2–4.3, 5.1–5.3 | P0 | state v2 |
| Transcript repository | 3.4–3.5, 4.3, 8 | P0 | state v2 |
| Live event protocol | 2.4, 4.4, 5.4 | P0 | transcript, lifecycle |
| Client capability layer | 2.3, 2.5 | P0 | API contracts |
| Three-column shell | 2.3, 3.6 | P1 | client capability layer |
| Session navigation/actions | 5.2, 5.6 | P1 | session domain, shell |
| Transcript/Markdown UI | 5.5 | P1 | live events |
| Composer/profile adapters | 3.3, 5.4 | P1 | lifecycle, transcript |
| Terminal integration | 4.4 | P1 | client capability layer |
| Files/Preview/Languages | 5.7–5.8 | P1 | security foundation |
| Git/Diff | 5.7, 5.9 | P1 | filesystem security |
| macOS picker | 4.3, 7 | P1 | origin/CSRF, workspace service |
| Settings shell | 2.3 | P2 | shell |
| Playwright E2E | 9.4 | P0 release gate | all vertical slices |

### 10.3 Incremental Delivery

Use internal capability flags returned by `/api/state`, not build-time UI forks:

```ts
interface RuntimeCapabilities {
  readonly: boolean;
  directoryPicker: "macos" | "unavailable";
  transcripts: boolean;
  workspaceInspection: boolean;
  gitInspection: boolean;
  profileAdapters: CliAdapterId[];
}
```

During implementation, incomplete tabs/actions remain hidden or explicitly marked unavailable. Do not ship controls that imply successful behavior before their server capability is present. Each phase must keep `npm test` and `npm run build` passing.

---

## 11. Open Questions, Risks, and Assumptions

### 11.1 Resolved Product Decisions

- Native folder chooser is macOS-first; other systems use manual path fallback and the same future adapter contract.
- Fork references an immutable parent transcript prefix rather than copying history.
- Claude Code and Codex receive explicit versioned adapters; unknown versions degrade safely.
- File visibility is Git-status-driven in Git repositories, with fixed exclusion fallback for non-Git repositories.

### 11.2 Remaining Questions

These do not block the core architecture but should be finalized while implementing the relevant issue:

- Exact Claude Code and Codex version ranges validated by adapter contract tests.
- Whether a later release should support Fork from a user-selected event; this SPEC implements latest persisted event only.
- Whether ignored-file visibility should gain an explicit user toggle; it is excluded from this release.
- Whether transcript retention should be configurable through Settings; this SPEC uses a 10 MiB default constant with no UI.

### 11.3 Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| PTY output cannot be reliably semantic | Incorrect message roles | Neutral raw events by default; adapter recognition only for tested versions. |
| Transcript disk failure | Incomplete history | Do not stop PTY; visible warning, local logs, retry future events. |
| Fork references complicate retention/deletion | Broken child history | Protect referenced prefixes, reject parent deletion, depth cap/materialization. |
| Localhost cross-origin attacks | Native picker/process/filesystem abuse | Host/Origin/CSRF/intent-token validation and strict loopback binding. |
| Git/file scans block server | UI stalls | Time/output/file limits, lazy loading, cancellation, explicit partial states. |
| Existing server refactor causes regression | PTY/session breakage | Injected integration harness and preserve raw terminal contract during migration. |
| CLI versions change flags/output | Controls misapply | Adapter version detection, tested ranges, generic degradation. |
| DnD accessibility regressions | Keyboard users blocked | Explicit move controls/live announcements regardless of dnd-kit keyboard sensor. |
| Large client feature surface | Long-lived unstable branch | Deliver vertical slices behind runtime capabilities and keep release gates per phase. |

### 11.4 Assumptions

- The application is single-user and local-first.
- Current target branch and uncommitted componentized working tree are the implementation baseline.
- macOS is the first native-picker platform.
- Git and supported CLI executables are installed by the user; absence degrades gracefully.
- No external API authentication exists because the server is local, but request-origin authorization is still mandatory.
- JSON metadata + JSONL transcripts remain sufficient for the expected local scale; SQLite is not introduced in this release.
- Secure physical erasure is not guaranteed.
- Syntax highlighting is deferred; fenced code remains readable and copyable.

---

## 12. Dependency Changes

Run dependency changes only within `cli-gui/` and commit its lockfile with implementation.

Required runtime dependencies:

```text
react-markdown ^10.1.0
remark-gfm ^4.0.1
@dnd-kit/core ^6.3.1
@dnd-kit/sortable ^10.0.0
@dnd-kit/utilities ^3.2.2
```

Required development dependency:

```text
@playwright/test ^1.54.0
```

Do not add:

- `rehype-raw` or `dangerouslySetInnerHTML`.
- DOMPurify unless raw HTML becomes a future explicit requirement.
- `simple-git`, `diff2html`, or `parse-diff`.
- A native folder-picker npm module.
- A second drag-and-drop framework.

---

## 13. Verification Commands and Release Gates

From `cli-gui/`:

```text
npm test
npm run build
npm run test:e2e
```

Focused verification during implementation:

```text
npx vitest run server/persistence
npx vitest run server/services
npx vitest run client/features
npx playwright test tests/browser/workbench.spec.ts
```

Final release gate:

1. All unit/integration/component/E2E tests pass.
2. Build passes.
3. Run the local app and verify desktop and narrow layouts.
4. Verify migration against a copy of legacy state, never the user's live source first.
5. Verify Claude Code and Codex raw terminal behavior: input, ANSI, Ctrl+C, resize, stop, exit, restart.
6. Verify supported adapter options against the declared CLI versions.
7. Verify readonly startup and flows produce zero writes.
8. Verify path traversal, symlink escape, invalid Origin, oversized body/frame, generic Git command attempts, and picker abuse are rejected.
9. Verify Git/File tests use disposable repositories and cannot mutate the source checkout.

---
