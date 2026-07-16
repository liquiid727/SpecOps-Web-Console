import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import pty from "node-pty";
import { WebSocket, WebSocketServer } from "ws";
import type { AppState, Session, SessionStatus } from "../shared/types.js";
import { commandPreview, createId, now, requireArgs, requireText, validateWorkspacePath } from "./domain.js";
import { loadState, saveState } from "./store.js";

const port = Number(process.env.PORT ?? 3001);
const readonly = process.env.SPECOS_RUNTIME_MODE === "readonly";
const state = await loadState();
const runtimes = new Map<string, { process: pty.IPty; clients: Set<WebSocket> }>();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "internal server error" });
  }
});

const webSockets = new WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  webSockets.handleUpgrade(request, socket, head, (client) => {
    webSockets.emit("connection", client, request, url);
  });
});

webSockets.on("connection", (client: WebSocket, _request: http.IncomingMessage, url: URL) => {
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
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Product AI OS listening on http://127.0.0.1:${port}`);
});

function getSession(id: string) {
  return state.sessions.find((session) => session.id === id);
}

function touchSession(id: string) {
  const session = getSession(id);
  if (!session) return;
  session.lastActiveAt = now();
  void saveState(state);
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
  if (readonly) throw new Error("readonly mode disables local process startup");
  if (!confirmed) throw new Error("session start requires explicit confirmation");
  if (runtimes.has(sessionId)) return getSession(sessionId);

  const session = getSession(sessionId);
  if (!session) throw new Error("session not found");
  const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
  const profile = state.profiles.find((item) => item.id === session.profileId);
  if (!workspace || !profile) throw new Error("session references a missing workspace or profile");

  session.status = "starting";
  session.error = undefined;
  await saveState(state);
  try {
    const process = pty.spawn(profile.command, profile.args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd: workspace.path,
      env: { ...processEnv(), TERM: "xterm-256color" }
    });
    const runtime = { process, clients: new Set<WebSocket>() };
    runtimes.set(sessionId, runtime);
    process.onData((data) => {
      broadcast(sessionId, { type: "output", data });
      touchSession(sessionId);
    });
    process.onExit(({ exitCode }) => {
      session.status = "stopped";
      session.exitCode = exitCode;
      session.lastActiveAt = now();
      broadcast(sessionId, { type: "status", status: "stopped", exitCode });
      runtimes.delete(sessionId);
      void saveState(state);
    });
    session.status = "running";
    session.lastActiveAt = now();
    await saveState(state);
    broadcast(sessionId, { type: "status", status: "running" });
    return session;
  } catch (error) {
    session.status = "error";
    session.error = error instanceof Error ? error.message : "failed to start process";
    await saveState(state);
    throw error;
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
    session.lastActiveAt = now();
    await saveState(state);
    broadcast(sessionId, { type: "status", status: "stopped" });
  }
  return session;
}

function processEnv() {
  return Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
  const method = request.method ?? "GET";
  const segments = url.pathname.split("/").filter(Boolean).slice(1);
  const resource = segments[0];
  const id = segments[1];
  const action = segments[2];
  const body = method === "GET" ? {} : await readJson(request);

  if (method === "GET" && resource === "state") {
    sendJson(response, 200, { ...state, readonly });
    return;
  }
  if (readonly && method !== "GET") {
    sendJson(response, 403, { error: "readonly mode disables workspace writes" });
    return;
  }

  if (resource === "workspaces") {
    if (method === "POST") {
      const workspace = {
        id: createId("workspace"),
        name: requireText(body.name, "name"),
        path: await validateWorkspacePath(requireText(body.path, "path")),
        createdAt: now()
      };
      state.workspaces.push(workspace);
      await saveState(state);
      sendJson(response, 201, workspace);
      return;
    }
    if (method === "PATCH" && id) {
      const workspace = state.workspaces.find((item) => item.id === id);
      if (!workspace) return sendJson(response, 404, { error: "workspace not found" });
      if (body.name !== undefined) workspace.name = requireText(body.name, "name");
      if (body.path !== undefined) workspace.path = await validateWorkspacePath(requireText(body.path, "path"));
      await saveState(state);
      sendJson(response, 200, workspace);
      return;
    }
    if (method === "DELETE" && id) {
      if (state.sessions.some((session) => session.workspaceId === id)) {
        return sendJson(response, 409, { error: "workspace has sessions" });
      }
      state.workspaces = state.workspaces.filter((item) => item.id !== id);
      await saveState(state);
      sendJson(response, 204, null);
      return;
    }
  }

  if (resource === "profiles") {
    if (method === "POST") {
      const profile = {
        id: createId("profile"),
        name: requireText(body.name, "name"),
        command: requireText(body.command, "command"),
        args: requireArgs(body.args),
        createdAt: now()
      };
      state.profiles.push(profile);
      await saveState(state);
      sendJson(response, 201, profile);
      return;
    }
    if (method === "PATCH" && id) {
      const profile = state.profiles.find((item) => item.id === id);
      if (!profile) return sendJson(response, 404, { error: "profile not found" });
      if (body.name !== undefined) profile.name = requireText(body.name, "name");
      if (body.command !== undefined) profile.command = requireText(body.command, "command");
      if (body.args !== undefined) profile.args = requireArgs(body.args);
      await saveState(state);
      sendJson(response, 200, profile);
      return;
    }
    if (method === "DELETE" && id) {
      if (state.sessions.some((session) => session.profileId === id)) {
        return sendJson(response, 409, { error: "profile has sessions" });
      }
      state.profiles = state.profiles.filter((item) => item.id !== id);
      await saveState(state);
      sendJson(response, 204, null);
      return;
    }
  }

  if (resource === "sessions") {
    if (method === "POST" && !id) {
      const session: Session = {
        id: createId("session"),
        name: requireText(body.name, "name"),
        workspaceId: requireText(body.workspaceId, "workspaceId"),
        profileId: requireText(body.profileId, "profileId"),
        status: "stopped",
        createdAt: now(),
        lastActiveAt: now()
      };
      if (!state.workspaces.some((item) => item.id === session.workspaceId)) throw new Error("workspace not found");
      if (!state.profiles.some((item) => item.id === session.profileId)) throw new Error("profile not found");
      state.sessions.push(session);
      await saveState(state);
      try {
        await startSession(session.id, body.confirmed === true, body.cols, body.rows);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "failed to start session", session });
        return;
      }
      sendJson(response, 201, session);
      return;
    }
    if (method === "PATCH" && id) {
      const session = getSession(id);
      if (!session) return sendJson(response, 404, { error: "session not found" });
      if (body.name !== undefined) session.name = requireText(body.name, "name");
      await saveState(state);
      sendJson(response, 200, session);
      return;
    }
    if (method === "DELETE" && id) {
      await stopSession(id);
      state.sessions = state.sessions.filter((session) => session.id !== id);
      await saveState(state);
      sendJson(response, 204, null);
      return;
    }
    if (method === "POST" && id && action === "start") {
      const session = await startSession(id, body.confirmed === true, body.cols, body.rows);
      sendJson(response, 200, session);
      return;
    }
    if (method === "POST" && id && action === "stop") {
      sendJson(response, 200, await stopSession(id));
      return;
    }
    if (method === "POST" && id && action === "resize") {
      const runtime = runtimes.get(id);
      if (!runtime) return sendJson(response, 409, { error: "session is not running" });
      runtime.process.resize(Math.max(20, Number(body.cols)), Math.max(5, Number(body.rows)));
      sendJson(response, 204, null);
      return;
    }
  }

  sendJson(response, 404, { error: "route not found" });
}

async function serveStatic(response: http.ServerResponse, pathname: string) {
  const root = path.resolve(process.cwd(), "dist");
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const target = path.resolve(root, requested);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    sendJson(response, 403, { error: "unsafe path" });
    return;
  }
  const filePath = await fs.stat(target).then(() => target).catch(() => path.join(root, "index.html"));
  const content = await fs.readFile(filePath);
  const type = filePath.endsWith(".html") ? "text/html" : filePath.endsWith(".js") ? "text/javascript" : "text/css";
  response.writeHead(200, { "content-type": type });
  response.end(content);
}

async function readJson(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {} as Record<string, unknown>;
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, any>;
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  if (status === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload));
}
