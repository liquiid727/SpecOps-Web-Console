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
import { UnsupportedCliOptionError } from "./profile-adapters.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";

const MAX_FILE_DEPTH = 32;
const MAX_FILE_PAGE = 500;
const MAX_LANGUAGE_FILES = 10_000;
const MAX_LANGUAGE_BYTES = 250 * 1024 * 1024;
const MAX_LANGUAGE_MS = 2_000;
const MAX_PREVIEW_BYTES = 1 * 1024 * 1024;
const MAX_TRANSCRIPT_RESPONSE_BYTES = 1 * 1024 * 1024;
const MAX_TERMINAL_COLS = 500;
const MAX_TERMINAL_ROWS = 200;
const PTY_TRANSCRIPT_FLUSH_MS = 75;
const MAX_PTY_TRANSCRIPT_BYTES = 64 * 1024;
const MAX_EVENT_PENDING = 512;
const MAX_EVENT_PENDING_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_BUFFERED_BYTES = 1 * 1024 * 1024;

type Runtime = {
  process: PtyProcess;
  clients: Set<WebSocket>;
  generation: number;
  pendingTranscript: string;
  transcriptTimer?: ReturnType<typeof setTimeout>;
  transcriptFlush: Promise<void>;
};
type EventSubscriber = { client: WebSocket; ready: boolean; pending: TranscriptEvent[]; pendingBytes: number };

export async function createApplication(dependencies: ApplicationDependencies): Promise<Application> {
  const state = await dependencies.stateRepository.load();
  const runtimes = new Map<string, Runtime>();
  const runtimeGenerations = new Map<string, number>();
  const startLocks = new Map<string, Promise<SessionV3 | undefined>>();
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

  function queuePtyTranscript(session: SessionV3, runtime: Runtime, data: string) {
    runtime.pendingTranscript += data;
    if (Buffer.byteLength(runtime.pendingTranscript, "utf8") >= MAX_PTY_TRANSCRIPT_BYTES) {
      if (runtime.transcriptTimer !== undefined) clearTimeout(runtime.transcriptTimer);
      runtime.transcriptTimer = undefined;
      enqueuePtyTranscriptFlush(session, runtime);
      return;
    }
    if (runtime.transcriptTimer === undefined) {
      runtime.transcriptTimer = setTimeout(() => {
        runtime.transcriptTimer = undefined;
        enqueuePtyTranscriptFlush(session, runtime);
      }, PTY_TRANSCRIPT_FLUSH_MS);
    }
  }

  function enqueuePtyTranscriptFlush(session: SessionV3, runtime: Runtime) {
    runtime.transcriptFlush = runtime.transcriptFlush.catch(() => undefined).then(async () => {
      const raw = runtime.pendingTranscript;
      runtime.pendingTranscript = "";
      if (raw) await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "pty_output", source: "pty", raw });
    });
    void runtime.transcriptFlush.catch((error) => dependencies.logger.warn("PTY transcript flush failed", { sessionId: session.id, error: String(error) }));
  }

  async function flushPtyTranscript(session: SessionV3, runtime: Runtime) {
    if (runtime.transcriptTimer !== undefined) clearTimeout(runtime.transcriptTimer);
    runtime.transcriptTimer = undefined;
    if (runtime.pendingTranscript) enqueuePtyTranscriptFlush(session, runtime);
    await runtime.transcriptFlush;
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
    return { adapterId: adapter, compatibility: adapter === "generic" ? "supported" : "unknown-version", permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: false };
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
    if (runtimes.has(sessionId)) return getSession(sessionId);
    const pending = startLocks.get(sessionId);
    if (pending) return pending;
    const operation = (async () => {
      if (runtimes.has(sessionId)) return getSession(sessionId);
      const session = requireSession(sessionId);
      const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
      const profile = state.profiles.find((item) => item.id === session.profileId);
      if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
      if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
      const launch = await resolveLaunch(profile, session.launchConfig);
      const terminal = { cols: clampDimension(cols, 20, MAX_TERMINAL_COLS), rows: clampDimension(rows, 5, MAX_TERMINAL_ROWS) };
      session.runtimeStatus = "starting";
      session.error = undefined;
      session.revision += 1;
      await dependencies.stateRepository.save(state);
      await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session starting.", metadata: { status: "starting" } });
      try {
        const process = dependencies.ptyRuntime.spawn({
          command: launch.command,
          args: launch.args,
          name: "xterm-256color",
          cols: terminal.cols,
          rows: terminal.rows,
          cwd: workspace.path,
          env: { ...definedEnvironment(dependencies.policy.processEnvironment), TERM: "xterm-256color" }
        });
        const generation = (runtimeGenerations.get(sessionId) ?? 0) + 1;
        runtimeGenerations.set(sessionId, generation);
        const runtime: Runtime = { process, clients: new Set<WebSocket>(), generation, pendingTranscript: "", transcriptFlush: Promise.resolve() };
        runtimes.set(sessionId, runtime);
        process.onData((data) => {
          if (closing || runtimes.get(sessionId)?.generation !== generation) return;
          broadcastTerminal(sessionId, { type: "terminal-output", data });
          queuePtyTranscript(session, runtime, data);
          touchSession(sessionId);
        });
        process.onExit(({ exitCode }) => {
          if (closing || runtimes.get(sessionId)?.generation !== generation) return;
          void finishExit(sessionId, generation, exitCode);
        });
        session.runtimeStatus = "running";
        session.lastActiveAt = dependencies.clock.now();
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        broadcastTerminal(sessionId, { type: "runtime-status", status: "running" });
        publishSessionUpdate(session);
        await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session running.", metadata: { status: "running" } });
        return session;
      } catch (error) {
        const runtime = runtimes.get(sessionId);
        if (runtime) {
          await flushPtyTranscript(session, runtime);
          runtimes.delete(sessionId);
          try { runtime.process.kill(); } catch { /* process already exited */ }
        }
        session.runtimeStatus = "error";
        session.error = { code: "SESSION_START_FAILED", message: "Failed to start the session.", occurredAt: dependencies.clock.now() };
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Failed to start the session.", metadata: { code: "SESSION_START_FAILED" } });
        publishSessionUpdate(session);
        throw error instanceof ApiHttpError ? error : new ApiHttpError(422, "SESSION_START_FAILED", "Failed to start the session.", undefined, { cause: error });
      }
    })();
    startLocks.set(sessionId, operation);
    try {
      return await operation;
    } finally {
      if (startLocks.get(sessionId) === operation) startLocks.delete(sessionId);
    }
  }

  async function finishExit(sessionId: string, generation: number, exitCode: number) {
    const runtime = runtimes.get(sessionId);
    if (!runtime || runtime.generation !== generation) return;
    const session = getSession(sessionId);
    if (!session) {
      runtimes.delete(sessionId);
      return;
    }
    await flushPtyTranscript(session, runtime);
    broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped", exitCode });
    runtimes.delete(sessionId);
    session.runtimeStatus = "stopped";
    session.exitCode = exitCode;
    session.lastActiveAt = dependencies.clock.now();
    session.revision += 1;
    await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session stopped.", metadata: { status: "stopped", exitCode } });
    await dependencies.stateRepository.save(state);
    publishSessionUpdate(session);
  }

  async function stopSession(sessionId: string) {
    const pending = startLocks.get(sessionId);
    if (pending) await pending.catch(() => undefined);
    const runtime = runtimes.get(sessionId);
    const session = getSession(sessionId);
    if (!runtime && (!session || session.runtimeStatus === "stopped")) return session;
    if (runtime) {
      if (session) await flushPtyTranscript(session, runtime);
      runtimes.delete(sessionId);
      broadcastTerminal(sessionId, { type: "runtime-status", status: "stopped" });
      try { runtime.process.kill(); } catch (error) { dependencies.logger.warn("PTY stop failed", { sessionId, error: String(error) }); }
    }
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
        const launch = await resolveLaunch(profile, launchConfig);
        const session: SessionV3 = {
          id: dependencies.idGenerator.create("session"), name: requireResourceName(body.name, "name"), workspaceId, profileId, interactionMode: "terminal",
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
            sendJson(response, 201, { ...serialized, session: serialized, capabilities, startupError: { code: error.code, message: error.publicMessage, requestId: "create-session" } });
            return;
          }
          state.sessions = state.sessions.filter((item) => item.id !== session.id);
          await dependencies.transcriptRepository.delete(session.id).catch(() => undefined);
          await dependencies.stateRepository.save(state).catch(() => undefined);
          throw error;
        }
        const capabilities = start ? launch.capabilities : await resolveCapabilities(profile);
        const serialized = serializeSession(session);
        sendJson(response, 201, { ...serialized, session: serialized, capabilities });
        return;
      }
      if (method === "PATCH" && id) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        if (body.name !== undefined) session.name = requireResourceName(body.name, "name");
        if (body.launchConfig !== undefined) {
          const nextConfig = { ...session.launchConfig, ...normalizeLaunchConfig(body.launchConfig, true) };
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
          await resolveLaunch(profile, nextConfig);
          session.launchConfig = nextConfig;
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
            sendJson(response, 202, { event: existing, runtimeStatus: session.runtimeStatus, duplicate: true });
            return;
          }
          if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before messages can be sent.");
          if (session.runtimeStatus !== "running") {
            if (body.startIfStopped !== true) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
            await startSession(id, body.confirmedStart === true);
          }
          const event = await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "user_message", source: "composer", raw: content, clientMessageId });
          if (!event) throw new ApiHttpError(500, "TRANSCRIPT_WRITE_FAILED", "Message could not be recorded.");
          const runtime = runtimes.get(id);
          if (!runtime || session.runtimeStatus !== "running") {
            await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Message was recorded but could not be delivered.", metadata: { code: "MESSAGE_DELIVERY_FAILED", clientMessageId } });
            throw new ApiHttpError(502, "MESSAGE_DELIVERY_FAILED", "Message was recorded but could not be delivered.");
          }
          try {
            runtime.process.write(`${content}\r`);
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
      if (method === "GET" && id && action === "transcript") {
        const afterSequence = Number(url.searchParams.get("afterSequence") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? 200);
        if (!Number.isInteger(afterSequence) || afterSequence < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new ApiHttpError(400, "VALIDATION_FAILED", "Transcript cursor and limit are invalid.");
        requireSession(id);
        sendJson(response, 200, await visibleTranscriptPage(id, afterSequence, limit));
        return;
      }
      if (method === "POST" && id && action === "resize") {
        const runtime = runtimes.get(id);
        if (!runtime) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
        runtime.process.resize(clampDimension(body.cols, 20, MAX_TERMINAL_COLS), clampDimension(body.rows, 5, MAX_TERMINAL_ROWS));
        sendJson(response, 204, null);
        return;
      }
    }
    throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
  }

  function broadcastTerminal(sessionId: string, message: unknown) {
    const runtime = runtimes.get(sessionId);
    if (!runtime) return;
    const encoded = JSON.stringify(message);
    for (const client of runtime.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client.bufferedAmount > MAX_EVENT_BUFFERED_BYTES) {
        client.close(1013, "terminal client is behind");
        runtime.clients.delete(client);
        continue;
      }
      client.send(encoded);
    }
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
      const runtime = runtimes.get(sessionId);
      if (runtime) {
        runtime.clients.add(client);
        client.send(JSON.stringify({ type: "runtime-status", status: getSession(sessionId)?.runtimeStatus ?? "stopped" }));
      } else {
        client.send(JSON.stringify({ type: "runtime-status", status: getSession(sessionId)?.runtimeStatus ?? "stopped" }));
      }
      client.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as { type: string; data?: string; cols?: number; rows?: number };
          const current = runtimes.get(sessionId);
          if (!current) return;
          if ((message.type === "terminal-input" || message.type === "input") && typeof message.data === "string") {
            current.process.write(message.data);
            touchSession(sessionId);
          } else if ((message.type === "terminal-resize" || message.type === "resize") && Number.isInteger(message.cols) && Number.isInteger(message.rows)) {
            current.process.resize(clampDimension(message.cols, 20, MAX_TERMINAL_COLS), clampDimension(message.rows, 5, MAX_TERMINAL_ROWS));
          } else {
            client.send(JSON.stringify({ type: "protocol-error", error: { code: "VALIDATION_FAILED", message: "Invalid terminal frame.", requestId: "websocket" } }));
          }
        } catch {
          client.send(JSON.stringify({ type: "protocol-error", error: { code: "INVALID_JSON", message: "Invalid terminal frame.", requestId: "websocket" } }));
        }
      });
      client.on("close", () => runtimes.get(sessionId)?.clients.delete(client));
    },
    close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        closing = true;
        await waitForIdle();
        let changed = false;
        for (const [sessionId, runtime] of runtimes) {
          const session = getSession(sessionId);
          if (session) await flushPtyTranscript(session, runtime);
          for (const client of runtime.clients) client.close(1001, "server shutting down");
          try { runtime.process.kill(); } catch { /* process already exited */ }
          if (session && session.runtimeStatus !== "stopped") {
            session.runtimeStatus = "stopped";
            session.lastActiveAt = dependencies.clock.now();
            session.revision += 1;
            changed = true;
          }
        }
        for (const subscribers of eventSubscribers.values()) for (const subscriber of subscribers) subscriber.client.close(1001, "server shutting down");
        eventSubscribers.clear();
        runtimes.clear();
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

function clampDimension(value: unknown, minimum: number, maximum: number) {
  if (value === undefined) return minimum === 20 ? 100 : 30;
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Terminal dimensions must be integers.");
  return Math.min(maximum, Math.max(minimum, value));
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
