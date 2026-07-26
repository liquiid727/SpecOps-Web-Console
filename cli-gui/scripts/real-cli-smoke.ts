import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { WebSocket } from "ws";
import { createApplication } from "../server/application.js";
import { createServer } from "../server/http-server.js";
import { createProductionDependencies } from "../server/production.js";

const commands = ["codex", "claude"] as const;
const execFileAsync = promisify(execFile);
const availableCommands = commands.filter((command) => {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore", timeout: 5_000, shell: false });
    return true;
  } catch {
    console.log(`SKIP: ${command} is unavailable or failed its version probe.`);
    return false;
  }
});
if (!availableCommands.length) process.exit(0);

const root = await fs.mkdtemp(path.join(os.tmpdir(), "specos-real-cli-smoke-"));
const dataDirectory = path.join(root, "data");
const workspacePath = path.join(root, "workspace");
const homePath = path.join(root, "home");
const xdgConfigPath = path.join(root, "xdg-config");
const xdgDataPath = path.join(root, "xdg-data");
const xdgCachePath = path.join(root, "xdg-cache");
await fs.mkdir(workspacePath, { recursive: true });
await Promise.all([fs.mkdir(homePath, { recursive: true }), fs.mkdir(xdgConfigPath, { recursive: true }), fs.mkdir(xdgDataPath, { recursive: true }), fs.mkdir(xdgCachePath, { recursive: true })]);
await execFileAsync("git", ["init", "-q"], { cwd: workspacePath, shell: false });
let server: Awaited<ReturnType<typeof createServer>> | undefined;

try {
  const providerResults = [];
  if (availableCommands.includes("codex")) providerResults.push(await runProviderPrompt("codex", ["exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check", "--color", "never", "-C", workspacePath, "Reply with exactly CODEX_SMOKE_OK and do not use tools."], "CODEX_SMOKE_OK", workspacePath));
  if (availableCommands.includes("claude")) providerResults.push(await runProviderPrompt("claude", ["-p", "Reply with exactly CLAUDE_SMOKE_OK and do not use tools.", "--no-session-persistence", "--tools", "", "--output-format", "text", "--permission-mode", "plan"], "CLAUDE_SMOKE_OK", workspacePath));
  const blockedProviders = providerResults.filter((result) => result.status !== "pass").map((result) => result.command);
  if (blockedProviders.length) console.log(`BLOCKED: authenticated provider prompt validation unavailable for ${blockedProviders.join(", ")}; PTY lifecycle validation will continue.`);
  else console.log(`PASS: authenticated prompt validation for ${availableCommands.join(" and ")}.`);

  const processEnvironment = {
    PATH: process.env.PATH,
    HOME: homePath,
    XDG_CONFIG_HOME: xdgConfigPath,
    XDG_DATA_HOME: xdgDataPath,
    XDG_CACHE_HOME: xdgCachePath,
    CLAUDE_CONFIG_DIR: path.join(homePath, ".claude"),
    LANG: "C",
    LC_ALL: "C",
    TERM: "xterm-256color"
  };
  const dependencies = createProductionDependencies({ dataDirectory, readonly: false, processEnvironment });
  const initial = await dependencies.stateRepository.load();
  initial.workspaces.push({ id: "workspace-smoke", name: "Smoke workspace", path: workspacePath, kind: "local-folder", createdAt: new Date().toISOString() });
  initial.profiles.push({ id: "profile-smoke-exit", name: "Exit smoke", command: process.execPath, args: ["-e", "process.exit(17)"], adapterId: "generic", createdAt: new Date().toISOString() });
  const realSessions = availableCommands.flatMap((command, commandIndex) => Array.from({ length: 2 }, (_, index) => ({
    id: `session-smoke-${commandIndex}-${index}`,
    workspaceId: "workspace-smoke",
    profileId: command === "codex" ? "profile-codex" : "profile-claude",
    name: `${command} smoke ${index + 1}`,
    interactionMode: "terminal" as const,
    runtimeStatus: "stopped" as const,
    organizationStatus: "active" as const,
    pinned: false,
    manualOrder: (commandIndex * 2 + index + 1) * 1000,
    launchConfig: { permission: null, mode: null, model: null },
    revision: 1,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  })));
  const abnormalSession = {
    id: "session-smoke-abnormal",
    workspaceId: "workspace-smoke",
    profileId: "profile-smoke-exit",
    name: "abnormal exit smoke",
    interactionMode: "terminal" as const,
    runtimeStatus: "stopped" as const,
    organizationStatus: "active" as const,
    pinned: false,
    manualOrder: 10_000,
    launchConfig: { permission: null, mode: null, model: null },
    revision: 1,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };
  initial.sessions.push(...realSessions, abnormalSession);
  await dependencies.stateRepository.save(initial);

  const application = await createApplication(dependencies);
  server = createServer(application, {
    host: "127.0.0.1",
    port: 0,
    allowedHosts: ["127.0.0.1"],
    allowedOrigins: ["http://127.0.0.1:3000"],
    csrfCapability: dependencies.policy.csrfCapability,
    logger: dependencies.logger,
    requestIdFactory: () => dependencies.idGenerator.create("smoke-request")
  });
  const address = await server.listen();
  const responses = await Promise.all(realSessions.map((session) => post(address.port, `/api/sessions/${session.id}/start`, dependencies.policy.csrfCapability!)));
  if (responses.some((status) => status !== 200)) throw new Error(`real CLI start smoke returned status ${responses.join(",")}`);
  await Promise.all(realSessions.map((session) => exerciseTerminal(address.port, session.id, dependencies.policy.csrfCapability!)));

  const recoveredStart = await post(address.port, `/api/sessions/${realSessions[0].id}/start`, dependencies.policy.csrfCapability!);
  if (recoveredStart !== 200) throw new Error(`real CLI recovery start smoke returned status ${recoveredStart}`);
  const recoveredStop = await post(address.port, `/api/sessions/${realSessions[0].id}/stop`, dependencies.policy.csrfCapability!);
  if (recoveredStop !== 200) throw new Error(`real CLI recovery stop smoke returned status ${recoveredStop}`);

  const abnormalStart = await post(address.port, `/api/sessions/${abnormalSession.id}/start`, dependencies.policy.csrfCapability!);
  if (abnormalStart !== 200) throw new Error(`abnormal exit start smoke returned status ${abnormalStart}`);
  await waitForSession(address.port, abnormalSession.id, (session) => session.runtimeStatus === "stopped" && session.exitCode === 17);
  console.log(`PASS: started ${realSessions.length} real CLI terminal sessions concurrently and exercised resize/Ctrl+C/stop/recovery/abnormal-exit. Check runtime warnings above to determine whether node-pty or the pipe fallback was used.`);
} finally {
  await server?.close().catch(() => undefined);
  await fs.rm(root, { recursive: true, force: true });
}

async function runProviderPrompt(command: string, args: string[], marker: string, cwd: string): Promise<{ command: string; status: "pass" | "blocked" }> {
  const stdoutPath = path.join(cwd, `${command}.stdout`);
  const stderrPath = path.join(cwd, `${command}.stderr`);
  const stdout = await fs.open(stdoutPath, "w");
  const stderr = await fs.open(stderrPath, "w");
  try {
    const child = spawn(command, args, { cwd, env: process.env, shell: false, stdio: ["ignore", stdout.fd, stderr.fd] });
    let timedOut = false;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, 60_000);
      child.once("error", reject);
      child.once("close", () => { clearTimeout(timer); resolve(); });
    });
    if (timedOut) return { command, status: "blocked" };
    const output = `${await fs.readFile(stdoutPath, "utf8")}\n${await fs.readFile(stderrPath, "utf8")}`;
    return { command, status: output.includes(marker) ? "pass" : "blocked" };
  } catch {
    return { command, status: "blocked" };
  } finally {
    await Promise.all([stdout.close(), stderr.close()]);
  }
}

function post(port: number, pathname: string, capability: string) {
  return new Promise<number>((resolve, reject) => {
    const body = pathname.endsWith("/stop") ? "{}" : '{"confirmed":true}';
    const request = http.request({ host: "127.0.0.1", port, path: pathname, method: "POST", headers: { host: `127.0.0.1:${port}`, origin: "http://127.0.0.1:3000", "content-type": "application/json", "content-length": Buffer.byteLength(body), "x-specos-csrf-capability": capability } }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode ?? 0));
    });
    request.once("error", reject);
    request.end(body);
  });
}

async function exerciseTerminal(port: number, sessionId: string, capability: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${encodeURIComponent(sessionId)}&capability=${encodeURIComponent(capability)}`, { origin: "http://127.0.0.1:3000" });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(new Error(`terminal smoke timed out for ${sessionId}`)); }, 5_000);
    socket.once("open", () => {
      socket.send(JSON.stringify({ type: "terminal-resize", cols: 120, rows: 36 }));
      socket.send(JSON.stringify({ type: "terminal-input", data: "\u0003" }));
      setTimeout(() => { clearTimeout(timer); socket.close(1000, "smoke complete"); resolve(); }, 250);
    });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
  const status = await post(port, `/api/sessions/${sessionId}/stop`, capability);
  if (status !== 200) throw new Error(`real CLI stop smoke returned status ${status} for ${sessionId}`);
}

async function waitForSession(port: number, sessionId: string, predicate: (session: { runtimeStatus: string; exitCode?: number }) => boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const state = await getState(port);
    const session = state.sessions.find((candidate) => candidate.id === sessionId);
    if (session && predicate(session)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`session lifecycle smoke timed out for ${sessionId}`);
}

function getState(port: number): Promise<{ sessions: Array<{ id: string; runtimeStatus: string; exitCode?: number }> }> {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: "127.0.0.1", port, path: "/api/state", headers: { host: `127.0.0.1:${port}` } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.once("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as { sessions: Array<{ id: string; runtimeStatus: string; exitCode?: number }> });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once("error", reject);
  });
}
