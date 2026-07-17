import type http from "node:http";
import path from "node:path";
import { WebSocket } from "ws";
import type { Session } from "../shared/types.js";
import { ApiHttpError, sendJson } from "./api-errors.js";
import { commandPreview, requireArgs, requireText } from "./domain.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";

export async function createApplication(dependencies: ApplicationDependencies): Promise<Application> {
  const state = await dependencies.stateRepository.load();
  const runtimes = new Map<string, { process: PtyProcess; clients: Set<WebSocket> }>();
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

  function touchSession(id: string) {
    if (closing) return;
    const session = getSession(id);
    if (!session) return;
    session.lastActiveAt = dependencies.clock.now();
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

  async function startSession(sessionId: string, confirmed: boolean, cols = 100, rows = 30) {
    if (dependencies.policy.readonly) throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables local process startup.");
    if (!confirmed) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
    if (runtimes.has(sessionId)) return getSession(sessionId);

    const session = getSession(sessionId);
    if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
    const profile = state.profiles.find((item) => item.id === session.profileId);
    if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");

    session.status = "starting";
    session.error = undefined;
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
        touchSession(sessionId);
      });
      process.onExit(({ exitCode }) => {
        if (closing) return;
        session.status = "stopped";
        session.exitCode = exitCode;
        session.lastActiveAt = dependencies.clock.now();
        broadcast(sessionId, { type: "status", status: "stopped", exitCode });
        runtimes.delete(sessionId);
        void dependencies.stateRepository.save(state);
      });
      session.status = "running";
      session.lastActiveAt = dependencies.clock.now();
      await dependencies.stateRepository.save(state);
      broadcast(sessionId, { type: "status", status: "running" });
      return session;
    } catch (error) {
      session.status = "error";
      session.error = "Failed to start the session.";
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
      session.status = "stopped";
      session.lastActiveAt = dependencies.clock.now();
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
    return resolved;
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
      sendJson(response, 200, { ...state, readonly: dependencies.policy.readonly });
      return;
    }

    if (resource === "workspaces") {
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
        const session: Session = {
          id: dependencies.idGenerator.create("session"),
          name: requireText(body.name, "name"),
          workspaceId: requireText(body.workspaceId, "workspaceId"),
          profileId: requireText(body.profileId, "profileId"),
          status: "stopped",
          createdAt: dependencies.clock.now(),
          lastActiveAt: dependencies.clock.now()
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
        sendJson(response, 201, session);
        return;
      }
      if (method === "PATCH" && id) {
        const session = getSession(id);
        if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        if (body.name !== undefined) session.name = requireText(body.name, "name");
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, session);
        return;
      }
      if (method === "DELETE" && id) {
        if (!getSession(id)) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        await stopSession(id);
        state.sessions = state.sessions.filter((session) => session.id !== id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
      if (method === "POST" && id && action === "start") {
        sendJson(response, 200, await startSession(id, body.confirmed === true, body.cols, body.rows));
        return;
      }
      if (method === "POST" && id && action === "stop") {
        const session = await stopSession(id);
        if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
        sendJson(response, 200, session);
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
      const runtime = runtimes.get(sessionId);
      if (runtime) {
        runtime.clients.add(client);
        client.send(JSON.stringify({ type: "status", status: getSession(sessionId)?.status ?? "running" }));
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
          if (session && session.status !== "stopped") {
            session.status = "stopped";
            session.lastActiveAt = dependencies.clock.now();
            changed = true;
          }
        }
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
  if (resource === "workspaces") return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  if (resource === "profiles") return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  if (resource !== "sessions") return false;
  if (method === "POST" && !id) return true;
  if (!id) return false;
  if (method === "PATCH" || method === "DELETE") return !action;
  return method === "POST" && (action === "start" || action === "stop" || action === "resize");
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
