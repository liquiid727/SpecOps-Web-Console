import type http from "node:http";
import path from "node:path";
import { WebSocket } from "ws";
import type { FilePreview, FileTreePage, LanguageSummaryResponse, SessionV2, TranscriptEvent } from "../shared/types.js";
import { ApiHttpError, sendJson } from "./api-errors.js";
import { commandPreview, requireArgs, requireText } from "./domain.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";

export async function createApplication(dependencies: ApplicationDependencies): Promise<Application> {
  const state = await dependencies.stateRepository.load();
  const runtimes = new Map<string, { process: PtyProcess; clients: Set<WebSocket> }>();
  const eventSubscribers = new Map<string, Set<WebSocket>>();
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

  const getSession = (id: string) => state.sessions.find((session) => session.id === id);
  const serializeSession = (session: SessionV2) => ({ ...session, status: session.runtimeStatus });
  const serializeState = () => ({ ...state, sessions: state.sessions.map(serializeSession), readonly: dependencies.policy.readonly });
  const requireSession = (id: string) => {
    const session = getSession(id);
    if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    return session;
  };
  const nextManualOrder = () => Math.max(0, ...state.sessions.map((session) => session.manualOrder ?? 0)) + 1000;

  function touchSession(id: string) {
    if (closing) return;
    const session = getSession(id);
    if (!session) return;
    session.lastActiveAt = dependencies.clock.now();
    session.revision += 1;
    void dependencies.stateRepository.save(state);
  }

  function broadcast(sessionId: string, message: unknown) {
    const runtime = runtimes.get(sessionId);
    if (!runtime) return;
    const encoded = JSON.stringify(message);
    for (const client of runtime.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(encoded);
    }
  }

  function publishTranscript(event: TranscriptEvent) {
    const encoded = JSON.stringify({ type: "transcript-event", event });
    for (const client of eventSubscribers.get(event.sessionId) ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(encoded);
    }
  }

  async function startSession(sessionId: string, confirmed: boolean, cols = 100, rows = 30) {
    if (dependencies.policy.readonly) throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables local process startup.");
    if (!confirmed) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
    if (runtimes.has(sessionId)) return getSession(sessionId);

    const session = getSession(sessionId);
    if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
    const profile = state.profiles.find((item) => item.id === session.profileId);
    if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");

    if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
    session.runtimeStatus = "starting";
    session.error = undefined;
    session.revision += 1;
    await dependencies.stateRepository.save(state);
    try {
      const process = dependencies.ptyRuntime.spawn({
        command: profile.command,
        args: profile.args,
        name: "xterm-256color",
        cols,
        rows,
        cwd: workspace.path,
        env: { ...definedEnvironment(dependencies.policy.processEnvironment), TERM: "xterm-256color" }
      });
      const runtime = { process, clients: new Set<WebSocket>() };
      runtimes.set(sessionId, runtime);
      process.onData((data) => {
        if (closing) return;
        broadcast(sessionId, { type: "output", data });
        void dependencies.transcriptRepository.append({
          sessionId,
          occurredAt: dependencies.clock.now(),
          kind: "pty_output",
          source: "pty",
          raw: data
        }).then(publishTranscript).catch((error) => dependencies.logger.warn("Transcript write failed", { error: String(error), sessionId }));
        touchSession(sessionId);
      });
      process.onExit(({ exitCode }) => {
        if (closing) return;
        session.runtimeStatus = "stopped";
        session.exitCode = exitCode;
        session.lastActiveAt = dependencies.clock.now();
        session.revision += 1;
        broadcast(sessionId, { type: "status", status: "stopped", exitCode });
        runtimes.delete(sessionId);
        void dependencies.stateRepository.save(state);
      });
      session.runtimeStatus = "running";
      session.lastActiveAt = dependencies.clock.now();
      session.revision += 1;
      await dependencies.stateRepository.save(state);
      broadcast(sessionId, { type: "status", status: "running" });
      return session;
    } catch (error) {
      session.runtimeStatus = "error";
      session.error = { code: "SESSION_START_FAILED", message: "Failed to start the session.", occurredAt: dependencies.clock.now() };
      session.revision += 1;
      await dependencies.stateRepository.save(state);
      throw new ApiHttpError(422, "SESSION_START_FAILED", "Failed to start the session.", undefined, { cause: error });
    }
  }

  async function stopSession(sessionId: string) {
    const runtime = runtimes.get(sessionId);
    if (runtime) {
      runtime.process.kill();
      runtimes.delete(sessionId);
    }
    const session = getSession(sessionId);
    if (session) {
      session.runtimeStatus = "stopped";
      session.lastActiveAt = dependencies.clock.now();
      session.revision += 1;
      await dependencies.stateRepository.save(state);
      broadcast(sessionId, { type: "status", status: "stopped" });
    }
    return session;
  }

  async function validateWorkspacePath(input: string) {
    const resolved = path.resolve(input);
    const stat = await dependencies.filesystem.stat(resolved).catch(() => undefined);
    if (!stat?.isDirectory()) throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.");
    await dependencies.filesystem.access(resolved).catch((error) => {
      throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.", undefined, { cause: error });
    });
    return dependencies.filesystem.realpath(resolved);
  }

  async function getWorkspace(id: string) {
    const workspace = state.workspaces.find((item) => item.id === id);
    if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    return workspace;
  }

  async function workspaceTarget(workspaceId: string, relativeInput = "") {
    const workspace = await getWorkspace(workspaceId);
    const root = await dependencies.filesystem.realpath(workspace.path);
    const relative = relativeInput.replace(/^\/+/, "");
    if (relative.split(/[\\/]/).includes(".git")) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    const target = path.resolve(root, relative || ".");
    const realTarget = await dependencies.filesystem.realpath(target).catch((error) => {
      throw new ApiHttpError(404, "FILE_NOT_FOUND", "File not found.", undefined, { cause: error });
    });
    const containment = path.relative(root, realTarget);
    if (containment.startsWith("..") || path.isAbsolute(containment)) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    return { workspace, root, target: realTarget, relative: containment === "" ? "" : containment };
  }

  async function listWorkspaceFiles(workspaceId: string, requestedPath: string): Promise<FileTreePage> {
    const { target, relative } = await workspaceTarget(workspaceId, requestedPath);
    const entries = (await dependencies.filesystem.readdir(target))
      .filter((entry) => entry.name !== ".git")
      .sort((a, b) => Number(b.type === "directory") - Number(a.type === "directory") || a.name.localeCompare(b.name))
      .slice(0, 250)
      .map((entry) => ({ name: entry.name, path: path.posix.join(relative.replaceAll(path.sep, "/"), entry.name), type: entry.type }));
    return { path: relative, entries, omittedCount: 0, visibilitySource: dependencies.gitInspector.available ? "git" : "fallback-exclusions" };
  }

  async function previewWorkspaceFile(workspaceId: string, requestedPath: string): Promise<FilePreview> {
    const { target, relative } = await workspaceTarget(workspaceId, requestedPath);
    const stat = await dependencies.filesystem.stat(target);
    if (stat.isDirectory()) throw new ApiHttpError(400, "VALIDATION_FAILED", "Preview path must be a file.");
    const buffer = await dependencies.filesystem.readFile(target);
    const limit = 65_536;
    const shown = buffer.subarray(0, limit);
    if (shown.includes(0)) return { path: relative, kind: "binary", size: buffer.length, truncated: false, shownBytes: 0 };
    return { path: relative, kind: buffer.length > limit ? "oversized" : "text", size: buffer.length, encoding: "utf-8", content: new TextDecoder("utf-8").decode(shown), truncated: buffer.length > limit, shownBytes: shown.length };
  }

  async function summarizeWorkspaceLanguages(workspaceId: string): Promise<LanguageSummaryResponse> {
    const page = await listWorkspaceFiles(workspaceId, "");
    const totals = new Map<string, { files: number; bytes: number }>();
    for (const entry of page.entries.filter((item) => item.type === "file")) {
      const language = languageForPath(entry.path);
      if (!language) continue;
      const preview = await previewWorkspaceFile(workspaceId, entry.path).catch(() => undefined);
      const current = totals.get(language) ?? { files: 0, bytes: 0 };
      current.files += 1;
      current.bytes += preview?.size ?? 0;
      totals.set(language, current);
    }
    const totalBytes = [...totals.values()].reduce((sum, item) => sum + item.bytes, 0) || 1;
    const entries = [...totals.entries()].map(([language, item]) => ({ language, files: item.files, bytes: item.bytes, share: item.bytes / totalBytes }));
    return { entries, partial: false, visibilitySource: dependencies.gitInspector.available ? "git" : "fallback-exclusions" };
  }

  async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
    const method = request.method ?? "GET";
    const segments = url.pathname.split("/").filter(Boolean).slice(1);
    const resource = segments[0];
    const id = segments[1];
    const action = segments[2];

    if (!isKnownApiRoute(method, resource, id, action)) {
      throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
    }
    if (dependencies.policy.readonly && method !== "GET" && method !== "HEAD") {
      throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables workspace writes.");
    }
    const body = method === "GET" || method === "HEAD" ? {} : await readJson(request);

    if (method === "GET" && resource === "state") {
      sendJson(response, 200, serializeState());
      return;
    }

    if (resource === "workspaces") {
      if (method === "GET" && id && action === "files") {
        const requestedPath = url.searchParams.get("path") ?? "";
        sendJson(response, 200, await listWorkspaceFiles(id, requestedPath));
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
      if (method === "POST" && !id && action === "pick") {
        if (!dependencies.directoryPicker.available) throw new ApiHttpError(503, "PICKER_UNAVAILABLE", "Directory picker is unavailable.");
        const picked = await dependencies.directoryPicker.pick();
        if (picked.cancelled) {
          sendJson(response, 200, { cancelled: true });
          return;
        }
        const workspacePath = await validateWorkspacePath(picked.path);
        const existing = state.workspaces.find((workspace) => workspace.path === workspacePath);
        if (existing) {
          sendJson(response, 200, { cancelled: false, workspace: existing });
          return;
        }
        const workspace = { id: dependencies.idGenerator.create("workspace"), name: path.basename(workspacePath), path: workspacePath, createdAt: dependencies.clock.now() };
        state.workspaces.push(workspace);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, { cancelled: false, workspace });
        return;
      }
      if (method === "POST") {
        const workspace = {
          id: dependencies.idGenerator.create("workspace"),
          name: requireText(body.name, "name"),
          path: await validateWorkspacePath(requireText(body.path, "path")),
          createdAt: dependencies.clock.now()
        };
        state.workspaces.push(workspace);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, workspace);
        return;
      }
      if (method === "PATCH" && id) {
        const workspace = state.workspaces.find((item) => item.id === id);
        if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        if (body.name !== undefined) workspace.name = requireText(body.name, "name");
        if (body.path !== undefined) workspace.path = await validateWorkspacePath(requireText(body.path, "path"));
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, workspace);
        return;
      }
      if (method === "DELETE" && id) {
        const workspace = state.workspaces.find((item) => item.id === id);
        if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        if (state.sessions.some((session) => session.workspaceId === id)) throw new ApiHttpError(409, "WORKSPACE_IN_USE", "Workspace has sessions.");
        state.workspaces = state.workspaces.filter((item) => item.id !== id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
    }

    if (resource === "profiles") {
      if (method === "POST") {
        const profile = {
          id: dependencies.idGenerator.create("profile"),
          name: requireText(body.name, "name"),
          command: requireText(body.command, "command"),
          args: requireArgs(body.args),
          adapterId: "generic" as const,
          createdAt: dependencies.clock.now()
        };
        state.profiles.push(profile);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, profile);
        return;
      }
      if (method === "PATCH" && id) {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        if (body.name !== undefined) profile.name = requireText(body.name, "name");
        if (body.command !== undefined) profile.command = requireText(body.command, "command");
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
      if (method === "POST" && !id) {
        const now = dependencies.clock.now();
        const session: SessionV2 = {
          id: dependencies.idGenerator.create("session"),
          name: requireText(body.name, "name"),
          workspaceId: requireText(body.workspaceId, "workspaceId"),
          profileId: requireText(body.profileId, "profileId"),
          runtimeStatus: "stopped",
          organizationStatus: "active",
          pinned: false,
          manualOrder: nextManualOrder(),
          launchConfig: normalizeLaunchConfig(body.launchConfig),
          revision: 1,
          createdAt: now,
          lastActiveAt: now
        };
        if (!state.workspaces.some((item) => item.id === session.workspaceId)) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        if (!state.profiles.some((item) => item.id === session.profileId)) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        state.sessions.push(session);
        await dependencies.stateRepository.save(state);
        try {
          await startSession(session.id, body.confirmed === true, body.cols, body.rows);
        } catch (error) {
          if (error instanceof ApiHttpError) throw error;
          throw new ApiHttpError(422, "SESSION_START_FAILED", "Failed to start the session.", undefined, { cause: error });
        }
        sendJson(response, 201, serializeSession(session));
        return;
      }
      if (method === "PATCH" && id) {
        const session = getSession(id);
        if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        assertRevision(session, body.expectedRevision);
        if (body.name !== undefined) session.name = requireText(body.name, "name");
        if (body.launchConfig !== undefined) session.launchConfig = { ...session.launchConfig, ...normalizeLaunchConfig(body.launchConfig, true) };
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "DELETE" && id) {
        if (!getSession(id)) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        await stopSession(id);
        state.sessions = state.sessions.filter((session) => session.id !== id);
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
        const session = await stopSession(id);
        if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && action === "pin") {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        session.pinned = body.pinned === true;
        bump(session);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && (action === "archive" || action === "complete" || action === "restore" || action === "reopen")) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        if (session.runtimeStatus === "running" && body.stopRunning !== true) throw new ApiHttpError(409, "SESSION_RUNNING_CONFIRMATION_REQUIRED", "Running session must be stopped first.");
        if (session.runtimeStatus === "running") await stopSession(id);
        if (action === "archive") {
          session.organizationStatus = "archived";
          session.archivedAt = dependencies.clock.now();
        } else if (action === "complete") {
          session.organizationStatus = "completed";
          session.completedAt = dependencies.clock.now();
        } else {
          session.organizationStatus = "active";
          session.archivedAt = undefined;
          session.completedAt = undefined;
        }
        bump(session);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && action === "fork") {
        const parent = requireSession(id);
        assertRevision(parent, body.expectedRevision);
        const latest = await dependencies.transcriptRepository.latest(id);
        const now = dependencies.clock.now();
        const child: SessionV2 = {
          ...parent,
          id: dependencies.idGenerator.create("session"),
          name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : `${parent.name} fork`,
          runtimeStatus: "stopped",
          organizationStatus: "active",
          pinned: false,
          manualOrder: nextManualOrder(),
          parentSessionId: parent.id,
          forkEventId: latest?.id,
          forkSequence: latest?.sequence ?? 0,
          forkedAt: now,
          createdAt: now,
          lastActiveAt: now,
          completedAt: undefined,
          archivedAt: undefined,
          exitCode: undefined,
          error: undefined,
          revision: 1
        };
        state.sessions.push(child);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, { session: serializeSession(child), parentBoundary: { eventId: latest?.id, sequence: latest?.sequence ?? 0 } });
        return;
      }
      if (method === "POST" && id && action === "messages") {
        const session = requireSession(id);
        const clientMessageId = requireText(body.clientMessageId, "clientMessageId");
        const content = requireComposerContent(body.content);
        const existing = (await dependencies.transcriptRepository.list(id, { afterSequence: 0, limit: 1000 })).events.find((event) => event.clientMessageId === clientMessageId);
        if (existing) {
          sendJson(response, 202, { event: existing, runtimeStatus: session.runtimeStatus, duplicate: true });
          return;
        }
        if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before messages can be sent.");
        if (session.runtimeStatus !== "running") {
          if (body.startIfStopped !== true) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
          await startSession(id, body.confirmedStart === true);
        }
        const event = await dependencies.transcriptRepository.append({ sessionId: id, occurredAt: dependencies.clock.now(), kind: "user_input", source: "composer", raw: content, clientMessageId });
        publishTranscript(event);
        runtimes.get(id)?.process.write(`${content}\r`);
        session.lastActiveAt = dependencies.clock.now();
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false });
        return;
      }
      if (method === "GET" && id && action === "transcript") {
        requireSession(id);
        const afterSequence = Number(url.searchParams.get("afterSequence") ?? 0);
        sendJson(response, 200, await dependencies.transcriptRepository.list(id, { afterSequence: Number.isFinite(afterSequence) ? afterSequence : 0 }));
        return;
      }
      if (method === "POST" && !id && action === "reorder") {
        const orderedSessionIds = Array.isArray(body.orderedSessionIds) ? body.orderedSessionIds : [];
        for (const [index, sessionId] of orderedSessionIds.entries()) {
          const session = requireSession(String(sessionId));
          assertRevision(session, body.expectedRevisions?.[session.id]);
          session.manualOrder = (index + 1) * 1000;
          bump(session);
        }
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, state.sessions.map(serializeSession));
        return;
      }
      if (method === "POST" && id && action === "resize") {
        const runtime = runtimes.get(id);
        if (!runtime) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
        const cols = requireTerminalDimension(body.cols, "cols", 20);
        const rows = requireTerminalDimension(body.rows, "rows", 5);
        runtime.process.resize(cols, rows);
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
        if (url.pathname.startsWith("/api/")) {
          await handleApi(request, response, url);
          return;
        }
        await serveStatic(dependencies, response, url.pathname);
      } finally {
        endOperation();
      }
    },
    handleWebSocket(client, _request, url) {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        client.close(1008, "sessionId is required");
        return;
      }
      if (url.searchParams.get("channel") === "events") {
        const session = getSession(sessionId);
        if (!session) {
          client.close(1008, "session not found");
          return;
        }
        const afterSequence = Number(url.searchParams.get("afterSequence") ?? 0);
        const subscribers = eventSubscribers.get(sessionId) ?? new Set<WebSocket>();
        subscribers.add(client);
        eventSubscribers.set(sessionId, subscribers);
        void dependencies.transcriptRepository.list(sessionId, { afterSequence: Number.isFinite(afterSequence) ? afterSequence : 0 }).then((page) => {
          if (client.readyState !== WebSocket.OPEN) return;
          client.send(JSON.stringify({ type: "subscription-ready", afterSequence, latestSequence: page.nextAfterSequence }));
          for (const event of page.events) client.send(JSON.stringify({ type: "transcript-event", event }));
        }).catch(() => client.close(1011, "transcript replay failed"));
        client.on("close", () => eventSubscribers.get(sessionId)?.delete(client));
        return;
      }
      const runtime = runtimes.get(sessionId);
      if (runtime) {
        runtime.clients.add(client);
        client.send(JSON.stringify({ type: "status", status: getSession(sessionId)?.runtimeStatus ?? "running" }));
      }
      client.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as { type: string; data?: string; cols?: number; rows?: number };
          const current = runtimes.get(sessionId);
          if (!current) return;
          if (message.type === "input" && typeof message.data === "string") {
            current.process.write(message.data);
            touchSession(sessionId);
          }
          if (message.type === "resize" && Number.isInteger(message.cols) && Number.isInteger(message.rows)) {
            current.process.resize(Math.max(20, message.cols!), Math.max(5, message.rows!));
          }
        } catch {
          client.send(JSON.stringify({ type: "error", message: "invalid terminal message" }));
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
          for (const client of runtime.clients) client.close(1001, "server shutting down");
          const session = getSession(sessionId);
          if (session && session.runtimeStatus !== "stopped") {
            session.runtimeStatus = "stopped";
            session.lastActiveAt = dependencies.clock.now();
            session.revision += 1;
            changed = true;
          }
        }
        for (const subscribers of eventSubscribers.values()) {
          for (const client of subscribers) client.close(1001, "server shutting down");
        }
        eventSubscribers.clear();
        runtimes.clear();
        const failures: unknown[] = [];
        const shutdown = await Promise.allSettled([
          dependencies.ptyRuntime.shutdown(),
          changed ? dependencies.stateRepository.save(state) : Promise.resolve()
        ]);
        for (const result of shutdown) {
          if (result.status === "rejected") {
            failures.push(result.reason);
            dependencies.logger.error("Application shutdown step failed", { error: String(result.reason) });
          }
        }
        const drains = await Promise.allSettled([dependencies.stateRepository.drain(), dependencies.transcriptRepository.drain()]);
        for (const result of drains) {
          if (result.status === "rejected") {
            failures.push(result.reason);
            dependencies.logger.error("Application drain failed", { error: String(result.reason) });
          }
        }
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
  const type = filePath.endsWith(".html") ? "text/html" : filePath.endsWith(".js") ? "text/javascript" : "text/css";
  response.writeHead(200, { "content-type": type });
  response.end(content);
}

function requireTerminalDimension(value: unknown, field: string, minimum: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) {
    throw new ApiHttpError(400, "VALIDATION_FAILED", `${field} must be an integer.`, { field });
  }
  return Math.max(minimum, value);
}

function isKnownApiRoute(method: string, resource: string | undefined, id: string | undefined, action: string | undefined) {
  if (method === "GET" && resource === "state" && !id) return true;
  if (resource === "workspaces") {
    if (method === "POST" && !id && action === "pick") return true;
    if (method === "GET" && id && ["files", "preview", "languages", "git"].includes(action ?? "")) return true;
    return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  }
  if (resource === "profiles") return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  if (resource !== "sessions") return false;
  if (method === "POST" && !id) return true;
  if (method === "POST" && !id && action === "reorder") return true;
  if (!id) return false;
  if (method === "GET" && action === "transcript") return true;
  if (method === "PATCH" || method === "DELETE") return !action;
  return method === "POST" && ["start", "stop", "resize", "pin", "archive", "complete", "restore", "reopen", "fork", "messages"].includes(action ?? "");
}

async function readJson(request: http.IncomingMessage) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new ApiHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1_048_576) {
    request.resume();
    throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB.");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.from(chunk);
      total += buffer.length;
      if (total > 1_048_576) {
        cleanup();
        request.resume();
        reject(new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB."));
        return;
      }
      chunks.push(buffer);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
    };
    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
  });
  if (!chunks.length) return {} as Record<string, unknown>;
  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must contain valid UTF-8 JSON.", undefined, { cause: error });
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new ApiHttpError(400, "VALIDATION_FAILED", "JSON request body must be an object.");
  }
  return parsed as Record<string, any>;
}

function definedEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

export { commandPreview };

function bump(session: SessionV2) {
  session.revision += 1;
}

function assertRevision(session: SessionV2, expectedRevision: unknown) {
  if (expectedRevision !== session.revision) throw new ApiHttpError(409, "SESSION_REVISION_CONFLICT", "Session revision conflict.", { expectedRevision, currentRevision: session.revision });
}

function normalizeLaunchConfig(value: unknown, partial = false) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalized: Record<string, string | null> = {};
  for (const key of ["permission", "mode", "model"] as const) {
    if (source[key] === undefined) {
      if (!partial) normalized[key] = null;
    } else if (source[key] === null || typeof source[key] === "string") {
      normalized[key] = source[key] as string | null;
    } else {
      throw new ApiHttpError(400, "VALIDATION_FAILED", `${key} must be a string or null.`, { field: key });
    }
  }
  return normalized as { permission: string | null; mode: string | null; model: string | null };
}

function requireComposerContent(value: unknown) {
  const content = requireText(value, "content");
  if (!content.trim()) throw new ApiHttpError(400, "VALIDATION_FAILED", "content must not be empty.", { field: "content" });
  if (Buffer.byteLength(content, "utf8") > 65_536) throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "Composer content exceeds 64 KiB.");
  return content;
}

function languageForPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".md": "Markdown",
    ".json": "JSON",
    ".css": "CSS",
    ".html": "HTML",
    ".go": "Go",
    ".py": "Python",
    ".rs": "Rust"
  };
  return map[extension];
}
