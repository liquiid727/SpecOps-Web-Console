import type http from "node:http";
import path from "node:path";
import { WebSocket } from "ws";
import type {
  AppStateV3,
  CliProfileCapabilities,
  FilePreview,
  FileTreeEntry,
  FileTreePage,
  LanguageSummaryResponse,
  SessionV3,
  TranscriptEvent,
  TranscriptPage,
  WorkspaceV3
} from "../shared/types.js";
import { ApiHttpError, sendJson } from "./api-errors.js";
import { commandPreview, requireArgs, requireText } from "./domain.js";
import { createRuntimeOrchestrator } from "./orchestrator.js";
import { UnsupportedCliOptionError } from "./profile-adapters.js";
import type { Application, ApplicationDependencies } from "./ports.js";

const MAX_FILE_DEPTH = 32;
const MAX_FILE_PAGE = 500;
const MAX_LANGUAGE_FILES = 10_000;
const MAX_LANGUAGE_BYTES = 250 * 1024 * 1024;
const MAX_LANGUAGE_MS = 2_000;
const MAX_PREVIEW_BYTES = 1 * 1024 * 1024;
const MAX_TRANSCRIPT_RESPONSE_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_PENDING = 512;
const MAX_EVENT_PENDING_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_BUFFERED_BYTES = 1 * 1024 * 1024;
const DEFAULT_MAX_RUNNING_SESSIONS = 8;
const MIN_MAX_RUNNING_SESSIONS = 4;

type EventSubscriber = { client: WebSocket; ready: boolean; pending: TranscriptEvent[]; pendingBytes: number };

export async function createApplication(dependencies: ApplicationDependencies): Promise<Application> {
  const state = await dependencies.stateRepository.load();
  // 全局并发上限（决策 D-6，runtime-orchestrator-spec §3.3）：默认 8、配置下限 4，非法值回落默认并告警
  const maxRunningSessions = resolveMaxRunningSessions(dependencies.policy.processEnvironment.SPECOS_MAX_RUNNING_SESSIONS, dependencies.logger);
  // 执行控制层：PTY Worker 生命周期由 orchestrator 承担；transcript 写入与 state 持久化经回调留在本层（runtime-orchestrator-spec §2.2）
  const orchestrator = createRuntimeOrchestrator({
    ptyRuntime: dependencies.ptyRuntime,
    clock: dependencies.clock,
    logger: dependencies.logger,
    turnTimeoutMs: parsePositiveInteger(dependencies.policy.processEnvironment.SPECOS_TURN_TIMEOUT_MS),
    callbacks: {
      async appendEvent(sessionId, input) {
        const session = getSession(sessionId);
        if (!session) return undefined;
        return appendEvent(session, input);
      },
      async onRuntimeStatus(sessionId, status, extra) {
        const session = getSession(sessionId);
        if (!session) return;
        if (status === "starting") {
          session.runtimeStatus = "starting";
          session.error = undefined;
          session.revision += 1;
          await dependencies.stateRepository.save(state);
        } else if (status === "running") {
          // 轮次成功后 Orchestrator 上报 resumeToken，写入 chatContext（domain-spec §2.1；保持 I-3：terminal 不写）
          if (extra?.resumeToken && session.interactionMode === "chat") {
            session.chatContext = { ...session.chatContext, resumeToken: extra.resumeToken };
          }
          session.runtimeStatus = "running";
          session.lastActiveAt = dependencies.clock.now();
          session.revision += 1;
          await dependencies.stateRepository.save(state);
          publishSessionUpdate(session);
        } else if (status === "stopped") {
          session.runtimeStatus = "stopped";
          session.exitCode = extra?.exitCode;
          session.lastActiveAt = dependencies.clock.now();
          session.revision += 1;
          await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session stopped.", metadata: { status: "stopped", exitCode: extra?.exitCode ?? -1 } });
          await dependencies.stateRepository.save(state);
          publishSessionUpdate(session);
        } else if (status === "error") {
          session.runtimeStatus = "error";
          session.error = { code: "SESSION_START_FAILED", message: "Failed to start the session.", occurredAt: dependencies.clock.now() };
          session.revision += 1;
          await dependencies.stateRepository.save(state);
          await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Failed to start the session.", metadata: { code: "SESSION_START_FAILED" } });
          publishSessionUpdate(session);
        }
      },
      onActivity(sessionId) {
        touchSession(sessionId);
      },
      hasSession(sessionId) {
        return Boolean(getSession(sessionId));
      },
      onTurnStatus(sessionId, turnId, status) {
        // 实时提示帧：不承载内容、断线不补发（api-spec §4.2）
        publishToSubscriber(sessionId, { type: "turn-status", turnId, status });
      }
    }
  });
  const sessionMutationLocks = new Map<string, Promise<void>>();
  const eventSubscribers = new Map<string, Set<EventSubscriber>>();
  const pendingTouches = new Set<string>();
  const pickerIntentTtlMs = dependencies.policy.pickerIntentTtlMs ?? 60_000;
  let pickerIntent = dependencies.idGenerator.create("picker-intent");
  let pickerIntentExpiresAt = Date.now() + pickerIntentTtlMs;
  let pickerInFlight = false;
  let closing = false;
  let closePromise: Promise<void> | undefined;
  let activeOperations = 0;
  const idleWaiters = new Set<() => void>();

  const beginOperation = () => {
    if (closing) throw new Error("application is shutting down");
    activeOperations += 1;
  };
  const endOperation = () => {
    activeOperations -= 1;
    if (activeOperations === 0) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters.clear();
    }
  };
  const waitForIdle = () => activeOperations === 0 ? Promise.resolve() : new Promise<void>((resolve) => idleWaiters.add(resolve));

  function renewPickerIntent() {
    pickerIntent = dependencies.idGenerator.create("picker-intent");
    pickerIntentExpiresAt = Date.now() + pickerIntentTtlMs;
  }

  const getSession = (id: string) => state.sessions.find((session) => session.id === id);
  const serializeSession = (session: SessionV3) => ({ ...session, status: session.runtimeStatus });
  const serializeState = () => {
    if (Date.now() >= pickerIntentExpiresAt) renewPickerIntent();
    return {
      ...state,
      sessions: state.sessions.map(serializeSession),
      readonly: dependencies.policy.readonly,
      csrfCapability: dependencies.policy.csrfCapability,
      pickerIntentToken: pickerIntent
    };
  };
  const requireSession = (id: string) => {
    const session = getSession(id);
    if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    return session;
  };
  const nextManualOrder = () => Math.max(0, ...state.sessions.map((session) => session.manualOrder ?? 0)) + 1000;

  function publishToSubscriber(sessionId: string, frame: unknown) {
    const encoded = JSON.stringify(frame);
    const subscribers = eventSubscribers.get(sessionId);
    for (const subscriber of subscribers ?? []) {
      if (subscriber.client.readyState !== WebSocket.OPEN) continue;
      if (subscriber.client.bufferedAmount > MAX_EVENT_BUFFERED_BYTES) {
        subscribers?.delete(subscriber);
        subscriber.client.close(1013, "event subscriber is behind");
        continue;
      }
      subscriber.client.send(encoded);
    }
  }

  function publishTranscript(event: TranscriptEvent) {
    const subscribers = eventSubscribers.get(event.sessionId);
    const encoded = JSON.stringify({ type: "transcript-event", event });
    const encodedBytes = Buffer.byteLength(encoded, "utf8");
    for (const subscriber of subscribers ?? []) {
      if (!subscriber.ready) {
        if (subscriber.pending.length >= MAX_EVENT_PENDING || subscriber.pendingBytes + encodedBytes > MAX_EVENT_PENDING_BYTES) {
          subscribers?.delete(subscriber);
          subscriber.client.close(1013, "transcript replay is behind");
          continue;
        }
        subscriber.pending.push(event);
        subscriber.pendingBytes += encodedBytes;
      } else if (subscriber.client.readyState === WebSocket.OPEN) {
        if (subscriber.client.bufferedAmount > MAX_EVENT_BUFFERED_BYTES) {
          subscribers?.delete(subscriber);
          subscriber.client.close(1013, "transcript subscriber is behind");
          continue;
        }
        subscriber.client.send(encoded);
      }
    }
  }

  function publishSessionUpdate(session: SessionV3) {
    publishToSubscriber(session.id, { type: "session-updated", session: serializeSession(session) });
  }

  function retentionFloor(sessionId: string) {
    const boundaries = state.sessions.filter((candidate) => candidate.parentSessionId === sessionId && candidate.forkSequence !== undefined).map((candidate) => candidate.forkSequence!);
    return boundaries.length ? Math.min(...boundaries) : undefined;
  }

  async function appendEvent(session: SessionV3, input: Omit<Parameters<ApplicationDependencies["transcriptRepository"]["append"]>[0], "sessionId" | "sequenceOffset">) {
    try {
      const event = await dependencies.transcriptRepository.append({
        ...input,
        sessionId: session.id,
        sequenceOffset: session.parentSessionId ? session.forkSequence ?? 0 : undefined,
        retentionFloorSequence: retentionFloor(session.id)
      });
      publishTranscript(event);
      return event;
    } catch (error) {
      dependencies.logger.warn("Transcript append failed", { sessionId: session.id, error: String(error) });
      publishToSubscriber(session.id, { type: "recording-warning", code: "TRANSCRIPT_WRITE_FAILED" });
      return undefined;
    }
  }

  function touchSession(id: string) {
    if (closing || pendingTouches.has(id)) return;
    const session = getSession(id);
    if (!session) return;
    session.lastActiveAt = dependencies.clock.now();
    pendingTouches.add(id);
    setTimeout(() => {
      pendingTouches.delete(id);
      if (!closing) void dependencies.stateRepository.save(state).catch((error) => dependencies.logger.warn("Activity persistence failed", { error: String(error) }));
    }, 200);
  }

  async function withSessionMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = sessionMutationLocks.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const chain = previous.catch(() => undefined).then(() => gate);
    sessionMutationLocks.set(sessionId, chain);
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (sessionMutationLocks.get(sessionId) === chain) sessionMutationLocks.delete(sessionId);
    }
  }

  async function resolveCapabilities(profile: SessionV3["profileId"] extends string ? AppStateV3["profiles"][number] : never): Promise<CliProfileCapabilities> {
    const adapter = profile.adapterId;
    if (dependencies.profileAdapters.capabilities) return dependencies.profileAdapters.capabilities(profile);
    return { adapterId: adapter, compatibility: adapter === "generic" ? "supported" : "unknown-version", permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: false, supportsHeadlessTurns: false, supportsResume: false, supportsApproval: false };
  }

  async function resolveLaunch(profile: AppStateV3["profiles"][number], config: SessionV3["launchConfig"]) {
    try {
      if (dependencies.profileAdapters.resolveLaunch) return await dependencies.profileAdapters.resolveLaunch(profile, config);
      const capabilities = await resolveCapabilities(profile);
      if (config.permission || config.mode || config.model) throw new UnsupportedCliOptionError(config.permission ?? config.mode ?? config.model ?? "option");
      return { command: profile.command, args: [...profile.args], capabilities };
    } catch (error) {
      if (error instanceof UnsupportedCliOptionError || (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "CLI_OPTION_UNSUPPORTED")) {
        throw new ApiHttpError(400, "CLI_OPTION_UNSUPPORTED", "The selected CLI option is not supported.", { option: error instanceof UnsupportedCliOptionError ? error.option : undefined });
      }
      throw error;
    }
  }

  async function startSession(sessionId: string, confirmed: boolean, cols = 100, rows = 30): Promise<SessionV3 | undefined> {
    if (dependencies.policy.readonly) throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables local process startup.");
    if (!confirmed) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
    const chatSession = getSession(sessionId);
    // D-6 并发检查：计数口径 runtimeStatus ∈ {starting, running}（terminal 与 chat 合并）；已运行会话的幂等 start 不受限，不排队
    if (chatSession && chatSession.runtimeStatus !== "starting" && chatSession.runtimeStatus !== "running") {
      const running = state.sessions.filter((item) => item.runtimeStatus === "starting" || item.runtimeStatus === "running").length;
      if (running >= maxRunningSessions) throw new ApiHttpError(429, "SESSION_CONCURRENCY_LIMIT", "Running session limit reached.", { running, limit: maxRunningSessions });
    }
    if (chatSession?.interactionMode === "chat") {
      // chat 会话 start 不 spawn PTY（api-spec §2.6）：校验后标记 running，Worker 由首轮 submitTurn 隐式创建
      const workspace = state.workspaces.find((item) => item.id === chatSession.workspaceId);
      const profile = state.profiles.find((item) => item.id === chatSession.profileId);
      if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
      if (chatSession.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
      await resolveLaunch(profile, chatSession.launchConfig);
      if (chatSession.runtimeStatus !== "running") {
        chatSession.runtimeStatus = "running";
        chatSession.error = undefined;
        chatSession.lastActiveAt = dependencies.clock.now();
        chatSession.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(chatSession);
      }
      return getSession(sessionId);
    }
    // prepare 在 orchestrator 启动锁内执行且最多一次；这里保留全部会话/配置校验语义
    await orchestrator.start(sessionId, async () => {
      const session = requireSession(sessionId);
      const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
      const profile = state.profiles.find((item) => item.id === session.profileId);
      if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
      if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
      const launch = await resolveLaunch(profile, session.launchConfig);
      return { command: launch.command, args: launch.args, cwd: workspace.path, env: definedEnvironment(dependencies.policy.processEnvironment) };
    }, { cols, rows });
    return getSession(sessionId);
  }

  async function stopSession(sessionId: string) {
    const hadRuntime = await orchestrator.stop(sessionId);
    const session = getSession(sessionId);
    if (!hadRuntime && (!session || session.runtimeStatus === "stopped")) return session;
    if (session) {
      session.runtimeStatus = "stopped";
      session.lastActiveAt = dependencies.clock.now();
      session.revision += 1;
      await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session stopped by user.", metadata: { status: "stopped" } });
      await dependencies.stateRepository.save(state);
      publishSessionUpdate(session);
    }
    return session;
  }

  async function validateWorkspacePath(input: string, excludeId?: string, allowExisting = false) {
    if (input.includes("\0")) throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path is invalid.");
    const resolved = path.resolve(input);
    const stat = await dependencies.filesystem.stat(resolved).catch(() => undefined);
    if (!stat?.isDirectory()) throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.");
    await dependencies.filesystem.access(resolved).catch((error) => {
      throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.", undefined, { cause: error });
    });
    const canonical = await dependencies.filesystem.realpath(resolved).catch((error) => {
      throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path could not be canonicalized.", undefined, { cause: error });
    });
    if (!allowExisting && state.workspaces.some((workspace) => workspace.id !== excludeId && workspace.path === canonical)) throw new ApiHttpError(409, "WORKSPACE_DUPLICATE", "Workspace is already registered.");
    return canonical;
  }

  async function getWorkspace(id: string) {
    const workspace = state.workspaces.find((item) => item.id === id);
    if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    return workspace;
  }

  async function workspaceTarget(workspaceId: string, relativeInput = "") {
    const workspace = await getWorkspace(workspaceId);
    if (relativeInput.includes("\0") || path.isAbsolute(relativeInput) || /^[A-Za-z]:[\\/]/.test(relativeInput) || relativeInput.startsWith("\\")) {
      throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    }
    const root = await dependencies.filesystem.realpath(workspace.path);
    const normalizedInput = relativeInput.replaceAll("\\", "/");
    const normalized = path.posix.normalize(normalizedInput || ".");
    const segments = normalized.split("/");
    if (segments.includes("..") || segments.includes(".git")) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    const target = path.resolve(root, normalized === "." ? "." : normalized);
    const realTarget = await dependencies.filesystem.realpath(target).catch((error) => {
      throw new ApiHttpError(404, "FILE_NOT_FOUND", "File not found.", undefined, { cause: error });
    });
    const containment = path.relative(root, realTarget);
    if (containment.startsWith("..") || path.isAbsolute(containment)) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    return { workspace, root, target: realTarget, relative: containment === "" ? "" : containment.replaceAll(path.sep, "/") };
  }

  async function listWorkspaceFiles(workspaceId: string, requestedPath: string, cursor: string | undefined, requestedLimit: number | undefined): Promise<FileTreePage> {
    const { target, relative, root } = await workspaceTarget(workspaceId, requestedPath);
    if (!(await dependencies.filesystem.stat(target)).isDirectory()) throw new ApiHttpError(400, "VALIDATION_FAILED", "File listing path must be a directory.");
    if (requestedLimit !== undefined && (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page limit is invalid.");
    if (cursor !== undefined && !/^\d+$/.test(cursor)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page cursor is invalid.");
    const limit = Math.max(1, Math.min(requestedLimit ?? MAX_FILE_PAGE, MAX_FILE_PAGE));
    const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
    if (!Number.isSafeInteger(offset)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page cursor is invalid.");
    const gitFiles = dependencies.gitInspector.listVisibleFiles ? await dependencies.gitInspector.listVisibleFiles(root).catch(() => undefined) : undefined;
    if (gitFiles) {
      const prefix = relative ? `${relative.replace(/\/$/, "")}/` : "";
      const children = new Map<string, FileTreeEntry>();
      for (const filePath of gitFiles) {
        if (!isSafeRelativePath(filePath) || !filePath.startsWith(prefix) || filePath.split("/").length > MAX_FILE_DEPTH) continue;
        const rest = filePath.slice(prefix.length);
        if (!rest) continue;
        const [name, ...tail] = rest.split("/");
        const childPath = path.posix.join(relative, name);
        children.set(childPath, { name, path: childPath, type: tail.length ? "directory" : "file" });
      }
      const entries = [...children.values()].sort(compareFileEntries);
      return { path: relative, entries: entries.slice(offset, offset + limit), nextCursor: offset + limit < entries.length ? String(offset + limit) : undefined, omittedCount: Math.max(0, entries.length - offset - limit), visibilitySource: "git" };
    }

    const entries: FileTreeEntry[] = [];
    for (const entry of await dependencies.filesystem.readdir(target)) {
      if (entry.name === ".git" || isExcluded(entry.name) || entry.isSymlink) continue;
      const entryPath = path.posix.join(relative, entry.name);
      const stat = await dependencies.filesystem.stat(path.join(target, entry.name)).catch(() => undefined);
      entries.push({ name: entry.name, path: entryPath, type: entry.type, size: stat?.size });
    }
    entries.sort(compareFileEntries);
    return { path: relative, entries: entries.slice(offset, offset + limit), nextCursor: offset + limit < entries.length ? String(offset + limit) : undefined, omittedCount: Math.max(0, entries.length - offset - limit), visibilitySource: "fallback-exclusions" };
  }

  async function previewWorkspaceFile(workspaceId: string, requestedPath: string): Promise<FilePreview> {
    const { target, relative } = await workspaceTarget(workspaceId, requestedPath);
    const stat = await dependencies.filesystem.stat(target);
    if (stat.isDirectory()) throw new ApiHttpError(400, "VALIDATION_FAILED", "Preview path must be a file.");
    const bounded = dependencies.filesystem.readFileBounded ? await dependencies.filesystem.readFileBounded(target, MAX_PREVIEW_BYTES) : { buffer: await dependencies.filesystem.readFile(target), size: stat.size ?? 0 };
    const buffer = bounded.buffer.subarray(0, MAX_PREVIEW_BYTES);
    const size = bounded.size || buffer.length;
    if (buffer.includes(0)) return { path: relative, kind: "binary", size, truncated: false, shownBytes: 0 };
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      return { path: relative, kind: "binary", size, truncated: false, shownBytes: 0 };
    }
    return { path: relative, kind: size > MAX_PREVIEW_BYTES ? "oversized" : "text", size, encoding: "utf-8", content, truncated: size > MAX_PREVIEW_BYTES, shownBytes: buffer.length };
  }

  async function visibleFilePaths(workspaceId: string) {
    const { root } = await workspaceTarget(workspaceId);
    const gitFiles = dependencies.gitInspector.listVisibleFiles ? await dependencies.gitInspector.listVisibleFiles(root).catch(() => undefined) : undefined;
    if (gitFiles) {
      const safePaths = gitFiles.filter((filePath) => isSafeRelativePath(filePath) && filePath.split("/").length <= MAX_FILE_DEPTH);
      return { root, paths: safePaths.slice(0, MAX_LANGUAGE_FILES), truncated: safePaths.length > MAX_LANGUAGE_FILES, visibilitySource: "git" as const };
    }
    const paths: string[] = [];
    let visitedFiles = 0;
    let truncated = false;
    async function visit(directory: string, relative: string, depth: number) {
      if (depth > MAX_FILE_DEPTH || paths.length >= MAX_LANGUAGE_FILES) {
        if (paths.length >= MAX_LANGUAGE_FILES) truncated = true;
        return;
      }
      for (const entry of await dependencies.filesystem.readdir(directory)) {
        if (entry.name === ".git" || isExcluded(entry.name) || entry.isSymlink) continue;
        const nextRelative = path.posix.join(relative, entry.name);
        const nextTarget = path.join(directory, entry.name);
        if (entry.type === "directory") await visit(nextTarget, nextRelative, depth + 1);
        else {
          visitedFiles += 1;
          if (visitedFiles <= MAX_LANGUAGE_FILES) paths.push(nextRelative);
          else truncated = true;
        }
        if (paths.length >= MAX_LANGUAGE_FILES) {
          truncated = true;
          return;
        }
      }
    }
    await visit(root, "", 0);
    return { root, paths, truncated, visibilitySource: "fallback-exclusions" as const };
  }

  async function summarizeWorkspaceLanguages(workspaceId: string): Promise<LanguageSummaryResponse> {
    const startedAt = Date.now();
    const { root, paths, truncated, visibilitySource } = await visibleFilePaths(workspaceId);
    const totals = new Map<string, { files: number; bytes: number }>();
    let totalBytes = 0;
    let partialReason: LanguageSummaryResponse["partialReason"];
    for (const filePath of paths) {
      if (Date.now() - startedAt > MAX_LANGUAGE_MS) { partialReason = "time-limit"; break; }
      const language = languageForPath(filePath);
      if (!language) continue;
      const stat = await dependencies.filesystem.stat(path.join(root, filePath)).catch(() => undefined);
      const bytes = stat?.size ?? 0;
      if (totalBytes + bytes > MAX_LANGUAGE_BYTES) { partialReason = "byte-limit"; break; }
      const current = totals.get(language) ?? { files: 0, bytes: 0 };
      current.files += 1;
      current.bytes += bytes;
      totals.set(language, current);
      totalBytes += bytes;
    }
    const entries = [...totals.entries()].map(([language, item]) => ({ language, files: item.files, bytes: item.bytes, share: totalBytes ? item.bytes / totalBytes : 0 }));
    return { entries, partial: Boolean(partialReason) || truncated, partialReason: partialReason ?? (truncated ? "file-limit" : undefined), visibilitySource };
  }

  async function readOwnTranscript(sessionId: string) {
    const events: TranscriptEvent[] = [];
    let afterSequence = 0;
    for (let pageCount = 0; pageCount < 100; pageCount += 1) {
      const page = await dependencies.transcriptRepository.list(sessionId, { afterSequence, limit: 200 });
      events.push(...page.events);
      if (!page.hasMore || page.nextAfterSequence <= afterSequence) break;
      afterSequence = page.nextAfterSequence;
    }
    return events;
  }

  async function visibleTranscript(sessionId: string): Promise<{ events: TranscriptEvent[]; retentionTruncated: boolean }> {
    const session = requireSession(sessionId);
    let prefix: TranscriptEvent[] = [];
    let retentionTruncated = false;
    if (session.parentSessionId && session.forkSequence !== undefined) {
      const parent = await visibleTranscript(session.parentSessionId);
      prefix = parent.events.filter((event) => event.sequence <= session.forkSequence!);
      retentionTruncated = parent.retentionTruncated;
    }
    const own = await readOwnTranscript(sessionId);
    return { events: [...prefix, ...own].sort((a, b) => a.sequence - b.sequence), retentionTruncated: retentionTruncated || own.some((event) => event.kind === "retention_marker") };
  }

  async function visibleTranscriptPage(sessionId: string, afterSequence: number, limit: number) {
    const visible = await visibleTranscript(sessionId);
    const matching = visible.events.filter((event) => event.sequence > afterSequence);
    const events: TranscriptEvent[] = [];
    const boundedLimit = Math.max(1, Math.min(limit, 200));
    let serializedBytes = 2;
    for (const event of matching.slice(0, boundedLimit)) {
      const eventBytes = Buffer.byteLength(JSON.stringify(event), "utf8") + (events.length ? 1 : 0);
      if (events.length > 0 && serializedBytes + eventBytes > MAX_TRANSCRIPT_RESPONSE_BYTES) break;
      events.push(event);
      serializedBytes += eventBytes;
    }
    return {
      events,
      hasMore: matching.length > events.length,
      nextAfterSequence: events.at(-1)?.sequence ?? afterSequence,
      visibleStartSequence: visible.events[0]?.sequence ?? 1,
      retentionTruncated: visible.retentionTruncated
    } satisfies TranscriptPage;
  }

  async function latestVisibleTranscript(sessionId: string) {
    return (await visibleTranscript(sessionId)).events.at(-1);
  }

  async function forkDepth(session: SessionV3) {
    let depth = 0;
    const visited = new Set<string>();
    let current: SessionV3 | undefined = session;
    while (current?.parentSessionId) {
      if (visited.has(current.id)) throw new ApiHttpError(500, "INTERNAL_ERROR", "Session fork lineage is cyclic.");
      visited.add(current.id);
      depth += 1;
      current = getSession(current.parentSessionId);
      if (!current) throw new ApiHttpError(409, "VALIDATION_FAILED", "Session fork parent is unavailable.");
    }
    return depth;
  }

  async function materializeTranscript(sessionId: string, events: TranscriptEvent[]) {
    let sequence = 0;
    for (const event of events) {
      const copied = await dependencies.transcriptRepository.append({
        sessionId,
        occurredAt: event.occurredAt,
        kind: event.kind,
        source: event.source,
        raw: event.raw,
        metadata: event.metadata,
        clientMessageId: event.clientMessageId,
        sequenceOffset: sequence
      });
      sequence = copied.sequence;
    }
  }

  async function findMessage(sessionId: string, clientMessageId: string) {
    if (dependencies.transcriptRepository.findByClientMessageId) return dependencies.transcriptRepository.findByClientMessageId(sessionId, clientMessageId);
    return (await readOwnTranscript(sessionId)).find((event) => event.clientMessageId === clientMessageId);
  }

  async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
    const method = request.method ?? "GET";
    const segments = url.pathname.split("/").filter(Boolean).slice(1);
    const resource = segments[0];
    const id = segments[1];
    const action = segments[2];
    if (resource === "sessions" && id && method !== "GET" && action !== "messages") {
      return withSessionMutation(id, () => handleApiUnlocked(request, response, url));
    }
    return handleApiUnlocked(request, response, url);
  }

  async function handleApiUnlocked(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
    const method = request.method ?? "GET";
    const segments = url.pathname.split("/").filter(Boolean).slice(1);
    const resource = segments[0];
    const id = segments[1];
    const action = segments[2];
    if (!isKnownApiRoute(method, resource, id, action, segments)) throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
    if (dependencies.policy.readonly && method !== "GET" && method !== "HEAD") throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables workspace writes.");
    const body = method === "GET" || method === "HEAD" ? {} : await readJson(request);

    if (method === "GET" && resource === "state") {
      sendJson(response, 200, serializeState());
      return;
    }

    if (resource === "workspaces") {
      if (method === "GET" && id && action === "files") {
        sendJson(response, 200, await listWorkspaceFiles(id, url.searchParams.get("path") ?? "", url.searchParams.get("cursor") ?? undefined, Number(url.searchParams.get("limit") ?? MAX_FILE_PAGE)));
        return;
      }
      if (method === "GET" && id && action === "preview") {
        sendJson(response, 200, await previewWorkspaceFile(id, url.searchParams.get("path") ?? ""));
        return;
      }
      if (method === "GET" && id && action === "languages") {
        sendJson(response, 200, await summarizeWorkspaceLanguages(id));
        return;
      }
      if (method === "GET" && id && action === "git" && segments[3] === "status") {
        const { root } = await workspaceTarget(id);
        sendJson(response, 200, await dependencies.gitInspector.status(root));
        return;
      }
      if (method === "GET" && id && action === "git" && segments[3] === "diff") {
        const scope = url.searchParams.get("scope") === "staged" ? "staged" : "unstaged";
        const { root } = await workspaceTarget(id);
        sendJson(response, 200, await dependencies.gitInspector.diff(root, scope));
        return;
      }
      if (method === "POST" && (id === "pick" && !action || !id && action === "pick")) {
        if (!dependencies.directoryPicker.available) throw new ApiHttpError(503, "PICKER_UNAVAILABLE", "Directory picker is unavailable.");
        const intent = requireText(body.intentToken, "intentToken");
        if (pickerInFlight) throw new ApiHttpError(409, "PICKER_BUSY", "A folder picker is already active.");
        if (intent !== pickerIntent || Date.now() >= pickerIntentExpiresAt) throw new ApiHttpError(403, "PICKER_INTENT_INVALID", "Folder picker intent is invalid or expired.");
        pickerInFlight = true;
        renewPickerIntent();
        try {
          const picked = await withTimeout(dependencies.directoryPicker.pick(), 60_000);
          if (picked.cancelled) {
            sendJson(response, 200, { cancelled: true, pickerIntentToken: pickerIntent });
            return;
          }
          const workspacePath = await validateWorkspacePath(picked.path, undefined, true);
          const existing = state.workspaces.find((workspace) => workspace.path === workspacePath);
          if (existing) {
            sendJson(response, 200, { cancelled: false, workspace: existing, duplicate: true, pickerIntentToken: pickerIntent });
            return;
          }
          const workspace: WorkspaceV3 = { id: dependencies.idGenerator.create("workspace"), name: path.basename(workspacePath), path: workspacePath, kind: "local-folder", createdAt: dependencies.clock.now() };
          state.workspaces.push(workspace);
          await dependencies.stateRepository.save(state);
          sendJson(response, 201, { cancelled: false, workspace, pickerIntentToken: pickerIntent });
          return;
        } finally {
          pickerInFlight = false;
        }
      }
      if (method === "POST" && !id && !action) {
        const workspace: WorkspaceV3 = { id: dependencies.idGenerator.create("workspace"), name: requireResourceName(body.name, "name"), path: await validateWorkspacePath(requireText(body.path, "path")), kind: "local-folder", createdAt: dependencies.clock.now() };
        state.workspaces.push(workspace);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, workspace);
        return;
      }
      if (method === "PATCH" && id) {
        const workspace = await getWorkspace(id);
        if (body.name !== undefined) workspace.name = requireResourceName(body.name, "name");
        if (body.path !== undefined) workspace.path = await validateWorkspacePath(requireText(body.path, "path"), id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, workspace);
        return;
      }
      if (method === "DELETE" && id) {
        const workspace = await getWorkspace(id);
        if (state.sessions.some((session) => session.workspaceId === id)) throw new ApiHttpError(409, "WORKSPACE_IN_USE", "Workspace has sessions.");
        state.workspaces = state.workspaces.filter((item) => item.id !== workspace.id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
    }

    if (resource === "profiles") {
      if (method === "GET" && id && action === "capabilities") {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        sendJson(response, 200, await resolveCapabilities(profile));
        return;
      }
      if (method === "POST" && !id) {
        const command = requireText(body.command, "command");
        const adapterId = body.adapterId === "claude-code" || body.adapterId === "codex" || body.adapterId === "generic" ? body.adapterId : inferProfileAdapter(command);
        const profile = { id: dependencies.idGenerator.create("profile"), name: requireResourceName(body.name, "name"), command, args: requireArgs(body.args), adapterId, createdAt: dependencies.clock.now() };
        state.profiles.push(profile);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, profile);
        return;
      }
      if (method === "PATCH" && id) {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        if (body.name !== undefined) profile.name = requireResourceName(body.name, "name");
        if (body.command !== undefined) profile.command = requireText(body.command, "command");
        if (body.adapterId === "claude-code" || body.adapterId === "codex" || body.adapterId === "generic") profile.adapterId = body.adapterId;
        else if (body.command !== undefined) profile.adapterId = inferProfileAdapter(profile.command);
        if (body.args !== undefined) profile.args = requireArgs(body.args);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, profile);
        return;
      }
      if (method === "DELETE" && id) {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        if (state.sessions.some((session) => session.profileId === id)) throw new ApiHttpError(409, "PROFILE_IN_USE", "Profile has sessions.");
        state.profiles = state.profiles.filter((item) => item.id !== id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
    }

    if (resource === "sessions") {
      if (method === "POST" && id === "reorder" && !action) {
        const organizationStatus = body.organizationStatus;
        const pinned = body.pinned;
        if (!["active", "completed", "archived"].includes(organizationStatus) || typeof pinned !== "boolean" || !Array.isArray(body.orderedSessionIds) || !body.expectedRevisions || typeof body.expectedRevisions !== "object") throw new ApiHttpError(400, "VALIDATION_FAILED", "A complete session order is required.");
        const section = state.sessions.filter((session) => session.organizationStatus === organizationStatus && session.pinned === pinned);
        const ordered = body.orderedSessionIds.map((value: unknown) => String(value));
        if (new Set(ordered).size !== ordered.length || ordered.length !== section.length || ordered.some((sessionId: string) => !section.some((session) => session.id === sessionId))) throw new ApiHttpError(400, "VALIDATION_FAILED", "Order must contain each section member exactly once.");
        const revisions = body.expectedRevisions as Record<string, unknown>;
        for (const session of section) assertRevision(session, revisions[session.id]);
        const updates = new Map(ordered.map((sessionId: string, index: number) => [sessionId, (index + 1) * 1000]));
        const previousOrder = new Map(section.map((session) => [session.id, { manualOrder: session.manualOrder, revision: session.revision }]));
        for (const session of section) {
          session.manualOrder = updates.get(session.id)!;
          session.revision += 1;
        }
        try {
          await dependencies.stateRepository.save(state);
        } catch (error) {
          for (const session of section) {
            const previous = previousOrder.get(session.id)!;
            session.manualOrder = previous.manualOrder;
            session.revision = previous.revision;
          }
          throw error;
        }
        sendJson(response, 200, state.sessions.map(serializeSession));
        return;
      }
      if (method === "POST" && !id && !action) {
        const start = body.start === true || body.start === undefined && body.confirmed === true;
        if (start && body.confirmed !== true) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
        const now = dependencies.clock.now();
        const workspaceId = requireText(body.workspaceId, "workspaceId");
        const profileId = requireText(body.profileId, "profileId");
        if (!state.workspaces.some((item) => item.id === workspaceId)) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        const profile = state.profiles.find((item) => item.id === profileId);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        const launchConfig = normalizeLaunchConfig(body.launchConfig);
        const requestedMode = body.interactionMode === undefined ? "chat" : body.interactionMode;
        if (requestedMode !== "chat" && requestedMode !== "terminal") throw new ApiHttpError(400, "VALIDATION_FAILED", "interactionMode must be \"chat\" or \"terminal\".", { field: "interactionMode" });
        const launch = await resolveLaunch(profile, launchConfig);
        // 缺省 chat；Profile 不支持 headless 时服务端降级 terminal，不报错（api-spec §2.6）
        const interactionModeDowngraded = requestedMode === "chat" && !launch.capabilities.supportsHeadlessTurns;
        const interactionMode = interactionModeDowngraded ? "terminal" as const : requestedMode;
        const session: SessionV3 = {
          id: dependencies.idGenerator.create("session"), name: requireResourceName(body.name, "name"), workspaceId, profileId, interactionMode,
          runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: nextManualOrder(), launchConfig,
          revision: 1, createdAt: now, lastActiveAt: now
        };
        state.sessions.push(session);
        try {
          if (start) await startSession(session.id, true, body.terminal?.cols, body.terminal?.rows);
          else await dependencies.stateRepository.save(state);
        } catch (error) {
          if (start && error instanceof ApiHttpError && error.code === "SESSION_START_FAILED") {
            const capabilities = launch.capabilities;
            const serialized = serializeSession(session);
            sendJson(response, 201, { ...serialized, session: serialized, capabilities, ...(interactionModeDowngraded ? { interactionModeDowngraded: true } : {}), startupError: { code: error.code, message: error.publicMessage, requestId: "create-session" } });
            return;
          }
          state.sessions = state.sessions.filter((item) => item.id !== session.id);
          await dependencies.transcriptRepository.delete(session.id).catch(() => undefined);
          await dependencies.stateRepository.save(state).catch(() => undefined);
          throw error;
        }
        const capabilities = start ? launch.capabilities : await resolveCapabilities(profile);
        const serialized = serializeSession(session);
        sendJson(response, 201, { ...serialized, session: serialized, capabilities, ...(interactionModeDowngraded ? { interactionModeDowngraded: true } : {}) });
        return;
      }
      if (method === "PATCH" && id) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        // 创建后模式不可变（api-spec §2.6）
        if (body.interactionMode !== undefined) throw new ApiHttpError(400, "VALIDATION_FAILED", "interactionMode cannot be changed after creation.", { field: "interactionMode" });
        if (body.name !== undefined) session.name = requireResourceName(body.name, "name");
        if (body.launchConfig !== undefined) {
          const nextConfig = { ...session.launchConfig, ...normalizeLaunchConfig(body.launchConfig, true) };
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
          await resolveLaunch(profile, nextConfig);
          session.launchConfig = nextConfig;
        }
        if (body.activeModel !== undefined) {
          // 仅 chat 会话；轮次进行中允许，下一轮生效（api-spec §2.6）
          if (session.interactionMode !== "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "activeModel is only available for chat sessions.");
          const activeModel = requireText(body.activeModel, "activeModel");
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
          const capabilities = await resolveCapabilities(profile);
          if (!capabilities.models.some((item) => item.id === activeModel)) throw new ApiHttpError(400, "CLI_OPTION_UNSUPPORTED", "The selected CLI option is not supported.", { option: activeModel });
          session.chatContext = { ...session.chatContext, activeModel };
        }
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "DELETE" && id) {
        const session = requireSession(id);
        if (state.sessions.some((candidate) => candidate.parentSessionId === id)) throw new ApiHttpError(409, "SESSION_HAS_FORKS", "Delete dependent Fork sessions first.");
        await stopSession(id);
        state.sessions = state.sessions.filter((candidate) => candidate.id !== id);
        await dependencies.transcriptRepository.delete(id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
      if (method === "POST" && id && action === "start") {
        sendJson(response, 200, serializeSession((await startSession(id, body.confirmed === true, body.cols, body.rows))!));
        return;
      }
      if (method === "POST" && id && action === "stop") {
        sendJson(response, 200, serializeSession((await stopSession(id))!));
        return;
      }
      if (method === "POST" && id && action === "pin") {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        session.pinned = body.pinned === true;
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && ["archive", "complete", "restore", "reopen"].includes(action ?? "")) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        if (session.runtimeStatus === "running" && body.stopRunning !== true) throw new ApiHttpError(409, "SESSION_RUNNING_CONFIRMATION_REQUIRED", "Running session must be stopped first.");
        if (action === "restore" && !["archived", "completed"].includes(session.organizationStatus)) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only archived or completed sessions can be restored.");
        if (action === "reopen" && session.organizationStatus !== "completed") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only completed sessions can be reopened.");
        if ((action === "archive" || action === "complete") && session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only active sessions can change lifecycle state.");
        if (session.runtimeStatus === "running") await stopSession(id);
        if (action === "archive") { session.organizationStatus = "archived"; session.archivedAt = dependencies.clock.now(); }
        else if (action === "complete") { session.organizationStatus = "completed"; session.completedAt = dependencies.clock.now(); }
        else { session.organizationStatus = "active"; session.archivedAt = undefined; session.completedAt = undefined; }
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && action === "fork") {
        const parent = requireSession(id);
        assertRevision(parent, body.expectedRevision);
        const visibleParent = await visibleTranscript(id);
        const latest = visibleParent.events.at(-1);
        const materialize = await forkDepth(parent) >= 32;
        const now = dependencies.clock.now();
        const child: SessionV3 = {
          ...parent, id: dependencies.idGenerator.create("session"), name: typeof body.name === "string" && body.name.trim() ? requireResourceName(body.name, "name") : `${parent.name} fork`,
          runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: nextManualOrder(), parentSessionId: materialize ? undefined : parent.id,
          forkEventId: materialize ? undefined : latest?.id, forkSequence: materialize ? undefined : latest?.sequence ?? 0, forkedAt: now, createdAt: now, lastActiveAt: now,
          chatContext: undefined, completedAt: undefined, archivedAt: undefined, exitCode: undefined, error: undefined, revision: 1
        };
        state.sessions.push(child);
        try {
          if (materialize) await materializeTranscript(child.id, visibleParent.events);
          await dependencies.stateRepository.save(state);
        } catch (error) {
          state.sessions = state.sessions.filter((candidate) => candidate.id !== child.id);
          await dependencies.transcriptRepository.delete(child.id).catch(() => undefined);
          throw error;
        }
        sendJson(response, 201, { session: serializeSession(child), parentBoundary: { eventId: latest?.id, sequence: latest?.sequence ?? 0 } });
        return;
      }
      if (method === "POST" && id && action === "messages") {
        await withSessionMutation(id, async () => {
          const session = requireSession(id);
          const clientMessageId = requireText(body.clientMessageId, "clientMessageId");
          const content = requireComposerContent(body.content);
          const existing = await findMessage(id, clientMessageId);
          if (existing) {
            const duplicateTurn = typeof existing.metadata?.turnId === "string" ? { turnId: existing.metadata.turnId } : {};
            sendJson(response, 202, { event: existing, runtimeStatus: session.runtimeStatus, duplicate: true, ...duplicateTurn });
            return;
          }
          if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before messages can be sent.");
          if (session.runtimeStatus !== "running") {
            if (body.startIfStopped !== true) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
            await startSession(id, body.confirmedStart === true);
          }
          // interactionMode 分流（api-spec §2.2）：chat → submitTurn；terminal → 现状 PTY write 不变
          if (session.interactionMode === "chat") {
            const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
            const profile = state.profiles.find((item) => item.id === session.profileId);
            if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
            const registry = dependencies.profileAdapters;
            if (!registry.buildTurn || !registry.parseEvents) throw new ApiHttpError(422, "SESSION_START_FAILED", "Chat turns are not supported by this server build.");
            const turnId = dependencies.idGenerator.create("turn");
            const { event } = await orchestrator.submitTurn(id, {
              turnId,
              prompt: content,
              clientMessageId,
              // CLI 语义封闭在 Adapter；Orchestrator 只拿回调（决策 D-9）
              buildCommand: async () => {
                const spec = await registry.buildTurn!(profile, {
                  workspacePath: workspace.path,
                  prompt: content,
                  permission: session.launchConfig.permission,
                  mode: session.launchConfig.mode,
                  model: session.chatContext?.activeModel ?? session.launchConfig.model,
                  resumeToken: session.chatContext?.resumeToken
                });
                return { command: spec.command, args: spec.args, cwd: workspace.path, env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...spec.env } };
              },
              parseOutput: (stdout) => registry.parseEvents!(profile, stdout, { turnId })
            });
            session.lastActiveAt = dependencies.clock.now();
            await dependencies.stateRepository.save(state);
            sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false, turnId });
            return;
          }
          const event = await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "user_message", source: "composer", raw: content, clientMessageId });
          if (!event) throw new ApiHttpError(500, "TRANSCRIPT_WRITE_FAILED", "Message could not be recorded.");
          if (!orchestrator.isRunning(id) || session.runtimeStatus !== "running") {
            await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Message was recorded but could not be delivered.", metadata: { code: "MESSAGE_DELIVERY_FAILED", clientMessageId } });
            throw new ApiHttpError(502, "MESSAGE_DELIVERY_FAILED", "Message was recorded but could not be delivered.");
          }
          try {
            orchestrator.writeTerminal(id, `${content}\r`);
          } catch (error) {
            await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Message was recorded but could not be delivered.", metadata: { code: "MESSAGE_DELIVERY_FAILED", clientMessageId } });
            throw new ApiHttpError(502, "MESSAGE_DELIVERY_FAILED", "Message was recorded but could not be delivered.", undefined, { cause: error });
          }
          session.lastActiveAt = dependencies.clock.now();
          await dependencies.stateRepository.save(state);
          sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false });
        });
        return;
      }
      if (method === "POST" && id && action === "turns" && segments[3] === "cancel") {
        // 取消受理 202 { turnId }；终态经 error 事件（code TURN_CANCELLED）到达（api-spec §2.4）
        const session = requireSession(id);
        if (session.interactionMode !== "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Turn cancellation is only available for chat sessions.");
        const turnId = requireText(body.turnId, "turnId");
        await orchestrator.cancelTurn(id, turnId);
        sendJson(response, 202, { turnId });
        return;
      }
      if (method === "GET" && id && action === "transcript") {
        const afterSequence = Number(url.searchParams.get("afterSequence") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? 200);
        if (!Number.isInteger(afterSequence) || afterSequence < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new ApiHttpError(400, "VALIDATION_FAILED", "Transcript cursor and limit are invalid.");
        requireSession(id);
        sendJson(response, 200, await visibleTranscriptPage(id, afterSequence, limit));
        return;
      }
      if (method === "POST" && id && action === "resize") {
        // chat 会话无 PTY 可 resize（api-spec §5）
        if (getSession(id)?.interactionMode === "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Terminal resize is not available for chat sessions.");
        if (!orchestrator.isRunning(id)) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
        orchestrator.resizeTerminal(id, body.cols, body.rows);
        sendJson(response, 204, null);
        return;
      }
    }
    throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
  }

  return {
    async handleHttp(request, response, url) {
      beginOperation();
      try {
        if (url.pathname === "/health") {
          if (!["GET", "HEAD"].includes(request.method ?? "GET")) throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
          sendJson(response, 200, { status: "ok", service: "session-manager", readonly: dependencies.policy.readonly, timestamp: dependencies.clock.now() });
        } else if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
        else await serveStatic(dependencies, response, url.pathname);
      } finally {
        endOperation();
      }
    },
    handleWebSocket(client, _request, url) {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !getSession(sessionId)) {
        client.close(1008, "session not found");
        return;
      }
      if (url.searchParams.get("channel") === "events") {
        const rawAfterSequence = url.searchParams.get("afterSequence") ?? "0";
        if (!/^\d+$/.test(rawAfterSequence)) { client.close(1008, "invalid transcript cursor"); return; }
        const afterSequence = Number(rawAfterSequence);
        if (!Number.isSafeInteger(afterSequence)) { client.close(1008, "invalid transcript cursor"); return; }
        const subscriber: EventSubscriber = { client, ready: false, pending: [], pendingBytes: 0 };
        const subscribers = eventSubscribers.get(sessionId) ?? new Set<EventSubscriber>();
        subscribers.add(subscriber);
        eventSubscribers.set(sessionId, subscribers);
        void Promise.all([visibleTranscriptPage(sessionId, afterSequence, 200), visibleTranscript(sessionId)]).then(([page, visible]) => {
          if (client.readyState !== WebSocket.OPEN) return;
          for (const event of page.events) client.send(JSON.stringify({ type: "transcript-event", event }));
          const pending = subscriber.pending.splice(0);
          subscriber.pendingBytes = 0;
          for (const event of pending) if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "transcript-event", event }));
          subscriber.ready = true;
          client.send(JSON.stringify({ type: "subscription-ready", afterSequence, latestSequence: visible.events.at(-1)?.sequence ?? afterSequence }));
        }).catch(() => { subscribers.delete(subscriber); client.close(1011, "transcript replay failed"); });
        client.on("close", () => subscribers.delete(subscriber));
        client.on("error", () => subscribers.delete(subscriber));
        return;
      }
      orchestrator.attachTerminalClient(sessionId, client);
      client.send(JSON.stringify({ type: "runtime-status", status: getSession(sessionId)?.runtimeStatus ?? "stopped" }));
      client.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as { type: string; data?: string; cols?: number; rows?: number };
          if (!orchestrator.isRunning(sessionId)) return;
          if ((message.type === "terminal-input" || message.type === "input") && typeof message.data === "string") {
            orchestrator.writeTerminal(sessionId, message.data);
            touchSession(sessionId);
          } else if ((message.type === "terminal-resize" || message.type === "resize") && Number.isInteger(message.cols) && Number.isInteger(message.rows)) {
            orchestrator.resizeTerminal(sessionId, message.cols, message.rows);
          } else {
            client.send(JSON.stringify({ type: "protocol-error", error: { code: "VALIDATION_FAILED", message: "Invalid terminal frame.", requestId: "websocket" } }));
          }
        } catch {
          client.send(JSON.stringify({ type: "protocol-error", error: { code: "INVALID_JSON", message: "Invalid terminal frame.", requestId: "websocket" } }));
        }
      });
      client.on("close", () => orchestrator.detachTerminalClient(sessionId, client));
    },
    close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        closing = true;
        orchestrator.beginShutdown();
        await waitForIdle();
        const stoppedSessionIds = await orchestrator.shutdown();
        let changed = false;
        for (const sessionId of stoppedSessionIds) {
          const session = getSession(sessionId);
          if (session && session.runtimeStatus !== "stopped") {
            session.runtimeStatus = "stopped";
            session.lastActiveAt = dependencies.clock.now();
            session.revision += 1;
            changed = true;
          }
        }
        for (const subscribers of eventSubscribers.values()) for (const subscriber of subscribers) subscriber.client.close(1001, "server shutting down");
        eventSubscribers.clear();
        const failures: unknown[] = [];
        const shutdown = await Promise.allSettled([dependencies.ptyRuntime.shutdown(), changed && !dependencies.policy.readonly ? dependencies.stateRepository.save(state) : Promise.resolve()]);
        for (const result of shutdown) if (result.status === "rejected") failures.push(result.reason);
        const drains = await Promise.allSettled([dependencies.stateRepository.drain(), dependencies.transcriptRepository.drain()]);
        for (const result of drains) if (result.status === "rejected") failures.push(result.reason);
        if (failures.length) throw new AggregateError(failures, "Application shutdown failed");
      })();
      return closePromise;
    }
  };
}

async function serveStatic(dependencies: ApplicationDependencies, response: http.ServerResponse, pathname: string) {
  const root = path.resolve(process.cwd(), "dist");
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const target = path.resolve(root, requested);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return sendJson(response, 403, { error: "unsafe path" });
  const filePath = await dependencies.filesystem.stat(target).then(() => target).catch(() => path.join(root, "index.html"));
  const content = await dependencies.filesystem.readFile(filePath);
  const type = filePath.endsWith(".html") ? "text/html" : filePath.endsWith(".js") ? "text/javascript" : filePath.endsWith(".css") ? "text/css" : "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  response.end(content);
}

function isKnownApiRoute(method: string, resource: string | undefined, id: string | undefined, action: string | undefined, segments: string[]) {
  if (method === "GET" && resource === "state" && !id) return true;
  if (resource === "workspaces") {
    if (method === "POST" && ((id === "pick" && !action) || (!id && action === "pick"))) return true;
    if (method === "GET" && id && ["files", "preview", "languages"].includes(action ?? "")) return true;
    if (method === "GET" && id && action === "git" && ["status", "diff"].includes(segments[3] ?? "")) return true;
    return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  }
  if (resource === "profiles") {
    if (method === "GET" && id && action === "capabilities") return true;
    return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  }
  if (resource !== "sessions") return false;
  if (method === "POST" && id === "reorder" && !action) return true;
  if (method === "POST" && !id && !action) return true;
  if (!id) return false;
  if (method === "GET" && action === "transcript") return true;
  if (method === "POST" && action === "turns" && segments[3] === "cancel") return true;
  if (method === "PATCH" || method === "DELETE") return !action;
  return method === "POST" && ["start", "stop", "resize", "pin", "archive", "complete", "restore", "reopen", "fork", "messages"].includes(action ?? "");
}

async function readJson(request: http.IncomingMessage) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) throw new ApiHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1_048_576) { request.resume(); throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB."); }
  const chunks: Buffer[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.from(chunk);
      total += buffer.length;
      if (total > 1_048_576) { cleanup(); request.resume(); reject(new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB.")); return; }
      chunks.push(buffer);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { request.off("data", onData); request.off("end", onEnd); request.off("error", onError); };
    request.on("data", onData); request.once("end", onEnd); request.once("error", onError);
  });
  if (!chunks.length) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("body must be an object");
    return parsed as Record<string, any>;
  } catch (error) {
    if (error instanceof ApiHttpError) throw error;
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must contain valid UTF-8 JSON.", undefined, { cause: error });
  }
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

/** SPECOS_MAX_RUNNING_SESSIONS：非法值回落默认 8；低于配置下限的合法整数抬升到 4（D-6） */
function resolveMaxRunningSessions(value: string | undefined, logger: ApplicationDependencies["logger"]): number {
  if (value === undefined || value === "") return DEFAULT_MAX_RUNNING_SESSIONS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    logger.warn("Invalid SPECOS_MAX_RUNNING_SESSIONS value; falling back to the default limit.", { value, limit: DEFAULT_MAX_RUNNING_SESSIONS });
    return DEFAULT_MAX_RUNNING_SESSIONS;
  }
  if (parsed < MIN_MAX_RUNNING_SESSIONS) {
    logger.warn("SPECOS_MAX_RUNNING_SESSIONS is below the configuration floor; clamping.", { value, limit: MIN_MAX_RUNNING_SESSIONS });
    return MIN_MAX_RUNNING_SESSIONS;
  }
  return parsed;
}

function definedEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return Object.fromEntries(Object.entries(environment).filter(([key, value]) => key !== "SPECOS_CSRF_CAPABILITY" && Boolean(value)).map(([key, value]) => [key, value!]));
}

export { commandPreview };

function bump(session: SessionV3) { session.revision += 1; }

function assertRevision(session: SessionV3, expectedRevision: unknown) {
  if (expectedRevision !== session.revision) throw new ApiHttpError(409, "SESSION_REVISION_CONFLICT", "Session revision conflict.", { expectedRevision, currentRevision: session.revision, session: { ...session, status: session.runtimeStatus } });
}

function normalizeLaunchConfig(value: unknown, partial = false) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalized: Record<string, string | null> = {};
  for (const key of ["permission", "mode", "model"] as const) {
    if (source[key] === undefined) { if (!partial) normalized[key] = null; }
    else if (source[key] === null || typeof source[key] === "string") normalized[key] = source[key] as string | null;
    else throw new ApiHttpError(400, "VALIDATION_FAILED", `${key} must be a string or null.`, { field: key });
  }
  return normalized as { permission: string | null; mode: string | null; model: string | null };
}

function requireResourceName(value: unknown, field: string) {
  const name = requireText(value, field);
  if (name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) throw new ApiHttpError(400, "VALIDATION_FAILED", `${field} is invalid or too long.`, { field });
  return name;
}

function requireComposerContent(value: unknown) {
  const content = requireText(value, "content");
  if (!content.trim()) throw new ApiHttpError(400, "VALIDATION_FAILED", "content must not be empty.", { field: "content" });
  if (Buffer.byteLength(content, "utf8") > 65_536) throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "Composer content exceeds 64 KiB.");
  return content;
}

function languageForPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".md": "Markdown", ".json": "JSON", ".css": "CSS", ".html": "HTML", ".go": "Go", ".py": "Python", ".rs": "Rust", ".java": "Java", ".rb": "Ruby", ".sh": "Shell" };
  return map[extension];
}

function isExcluded(name: string) {
  return new Set(["node_modules", ".next", "dist", "build", "coverage", ".cache", ".DS_Store"]).has(name);
}

function inferProfileAdapter(command: string) {
  const normalized = command.toLowerCase();
  if (normalized.includes("codex")) return "codex" as const;
  if (normalized.includes("claude")) return "claude-code" as const;
  return "generic" as const;
}

function isSafeRelativePath(value: string) {
  if (!value || value.includes("\\") || path.posix.isAbsolute(value)) return false;
  const segments = value.split("/");
  return !segments.includes("..") && !segments.includes(".git") && segments.every((segment) => Boolean(segment) && segment !== ".");
}

function compareFileEntries(a: FileTreeEntry, b: FileTreeEntry) {
  return Number(b.type === "directory") - Number(a.type === "directory") || a.name.localeCompare(b.name) || a.path.localeCompare(b.path);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiHttpError(504, "PICKER_TIMEOUT", "Folder picker timed out.")), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
