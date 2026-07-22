import { spawn, type ChildProcessByStdio } from "node:child_process";
import path from "node:path";
import type { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const GUI_URL = "http://127.0.0.1:3000";
const API_URL = "http://127.0.0.1:3001";
const HEALTH_URL = `${API_URL}/health`;
const WEBSOCKET_URL = "ws://127.0.0.1:3001/ws";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_INTERVAL_MS = 500;
const CHILD_SETTLE_MS = 1_000;
const CHILD_OUTPUT_LIMIT = 24_000;

export type ProbeStatus = "ready" | "unavailable" | "timeout";

export interface ProbeResult {
  ok: boolean;
  status: "ready" | "unavailable";
  detail?: string;
  payload?: unknown;
}

export interface WaitResult {
  name: "frontend" | "backend";
  status: ProbeStatus;
  elapsedMs: number;
  detail?: string;
  payload?: unknown;
}

export interface BannerOptions {
  frontend: WaitResult;
  backend: WaitResult;
  guiUrl?: string;
  apiUrl?: string;
  healthUrl?: string;
  websocketUrl?: string;
  dataDirectory?: string;
  readonly?: boolean;
}

export interface DevStatusOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  intervalMs?: number;
  spawnImpl?: typeof spawn;
}

interface ManagedChild {
  name: "Backend" | "Frontend";
  process: ChildProcessByStdio<null, Readable, Readable>;
  output: string[];
}

class ChildExitError extends Error {
  constructor(readonly child: ManagedChild, readonly code: number | null, readonly signal: NodeJS.Signals | null) {
    super(`${child.name} exited before the dev environment was ready.`);
    this.name = "ChildExitError";
  }
}

export async function probeEndpoint(url: string, options: { fetchImpl?: typeof fetch; expectJsonStatus?: boolean; requestTimeoutMs?: number } = {}): Promise<ProbeResult> {
  const fetcher = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.requestTimeoutMs ?? 1_000);
  try {
    const response = await fetcher(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return { ok: false, status: "unavailable", detail: `HTTP ${response.status}` };
    if (!options.expectJsonStatus) return { ok: true, status: "ready" };
    const payload = await response.json() as unknown;
    if (isHealthyPayload(payload)) return { ok: true, status: "ready", payload };
    return { ok: false, status: "unavailable", detail: "invalid health payload", payload };
  } catch (error) {
    return { ok: false, status: "unavailable", detail: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForEndpoint(options: {
  name: "frontend" | "backend";
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  intervalMs?: number;
  expectJsonStatus?: boolean;
}): Promise<WaitResult> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  let latest: ProbeResult | undefined;

  while (Date.now() - started <= timeoutMs) {
    latest = await probeEndpoint(options.url, { fetchImpl: options.fetchImpl, expectJsonStatus: options.expectJsonStatus });
    if (latest.ok) return { name: options.name, status: "ready", elapsedMs: Date.now() - started, detail: latest.detail, payload: latest.payload };
    await delay(intervalMs);
  }

  return {
    name: options.name,
    status: "timeout",
    elapsedMs: Date.now() - started,
    detail: latest?.detail,
    payload: latest?.payload
  };
}

export function renderBanner(options: BannerOptions) {
  const frontend = formatStatus(options.frontend, "ready", "unavailable");
  const backend = formatStatus(options.backend, "healthy", "unhealthy");
  const mode = options.readonly ? "readonly" : "writable";

  return [
    "🚀 SpecOS CLI GUI Dev",
    "",
    "🖥️  GUI",
    `    URL:      ${options.guiUrl ?? GUI_URL}`,
    `    Status:   ${frontend}`,
    "",
    "🧠 Session Manager",
    `    URL:      ${options.apiUrl ?? API_URL}`,
    `    Health:   ${options.healthUrl ?? HEALTH_URL}`,
    `    Status:   ${backend}`,
    "",
    "🔌 WebSocket",
    `    URL:      ${options.websocketUrl ?? WEBSOCKET_URL}`,
    "",
    "📁 Runtime",
    `    Mode:     ${mode}`,
    `    Data:     ${options.dataDirectory ?? "cli-gui/data"}`,
    "",
    "🛑 Stop with Ctrl+C"
  ].join("\n");
}

export function renderFailureSummary(frontend: WaitResult, backend: WaitResult) {
  return [
    frontend.status === "ready" ? "✅ Frontend: ready" : `❌ Frontend: ${frontend.status === "timeout" ? formatTimeout(frontend.elapsedMs) : "unavailable"}`,
    backend.status === "ready" ? "✅ Backend: healthy" : `❌ Backend: ${backend.status === "timeout" ? formatTimeout(backend.elapsedMs) : "unhealthy"}`
  ].join("\n");
}

export async function runDevStatus(options: DevStatusOptions = {}) {
  const cliGuiRoot = options.cwd ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const output = options.stdout ?? process.stdout;
  const errorOutput = options.stderr ?? process.stderr;
  const env = { ...process.env, ...options.env };
  const children = [
    startChild("Backend", "dev:server", cliGuiRoot, env, options.spawnImpl),
    startChild("Frontend", "dev:client", cliGuiRoot, env, options.spawnImpl)
  ];
  let stopping = false;

  const stopChildren = (signal: NodeJS.Signals = "SIGTERM") => {
    stopping = true;
    for (const child of children) stopChild(child.process, signal);
  };

  const childExit = Promise.race(children.map((child) => new Promise<never>((_, reject) => {
    child.process.once("exit", (code, signal) => {
      if (!stopping) reject(new ChildExitError(child, code, signal));
    });
  })));

  const shutdown = async () => {
    stopChildren("SIGTERM");
    await Promise.allSettled(children.map((child) => onceExit(child.process)));
  };
  process.once("SIGINT", () => { void shutdown().then(() => process.exit(0)); });
  process.once("SIGTERM", () => { void shutdown().then(() => process.exit(0)); });

  try {
    const [frontend, backend] = await Promise.race([
      Promise.all([
        waitForEndpoint({ name: "frontend", url: GUI_URL, fetchImpl: options.fetchImpl, timeoutMs: options.timeoutMs, intervalMs: options.intervalMs }),
        waitForEndpoint({ name: "backend", url: HEALTH_URL, fetchImpl: options.fetchImpl, timeoutMs: options.timeoutMs, intervalMs: options.intervalMs, expectJsonStatus: true })
      ]),
      childExit
    ]);

    await Promise.race([delay(CHILD_SETTLE_MS), childExit]);

    const readonly = isReadonlyHealth(backend.payload);
    output.write(`${renderBanner({ frontend, backend, readonly })}\n`);
    if (frontend.status !== "ready" || backend.status !== "ready") {
      errorOutput.write(`\n${renderFailureSummary(frontend, backend)}\n`);
      errorOutput.write(renderChildOutputs(children));
      stopChildren("SIGTERM");
      process.exitCode = 1;
      return;
    }

    await childExit;
  } catch (error) {
    stopChildren("SIGTERM");
    if (error instanceof ChildExitError) {
      errorOutput.write(`❌ ${error.child.name} exited`);
      if (error.code !== null) errorOutput.write(` with code ${error.code}`);
      if (error.signal) errorOutput.write(` from ${error.signal}`);
      errorOutput.write(".\n");
      const outputText = error.child.output.join("");
      if (/EADDRINUSE|address already in use|Port \d+ is already in use/i.test(outputText)) errorOutput.write("❌ Port is already in use.\n");
    } else {
      errorOutput.write(`❌ Dev environment failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    errorOutput.write(renderChildOutputs(children));
    process.exitCode = 1;
  } finally {
    await Promise.allSettled(children.map((child) => onceExit(child.process)));
  }
}

function startChild(name: "Backend" | "Frontend", script: string, cwd: string, env: NodeJS.ProcessEnv, spawnImpl: typeof spawn = spawn): ManagedChild {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawnImpl(npm, ["run", script], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  const managed = { name, process: child, output: [] };
  child.stdout.on("data", (chunk) => appendOutput(managed, chunk));
  child.stderr.on("data", (chunk) => appendOutput(managed, chunk));
  return managed;
}

function appendOutput(child: ManagedChild, chunk: Buffer | string) {
  child.output.push(chunk.toString());
  while (child.output.join("").length > CHILD_OUTPUT_LIMIT) child.output.shift();
}

function renderChildOutputs(children: ManagedChild[]) {
  return children.map((child) => {
    const text = child.output.join("").trimEnd();
    return text ? `\n--- ${child.name} output ---\n${text}\n` : "";
  }).join("");
}

function stopChild(child: ChildProcessByStdio<null, Readable, Readable>, signal: NodeJS.Signals) {
  if (!child.pid || child.killed) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch { /* already stopped */ }
  }
}

function onceExit(child: ChildProcessByStdio<null, Readable, Readable>) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

function formatStatus(result: WaitResult, readyWord: string, unavailableWord: string) {
  if (result.status === "ready") return `✅ ${readyWord}`;
  if (result.status === "timeout") return `⏳ ${formatTimeout(result.elapsedMs)}`;
  return `❌ ${unavailableWord}`;
}

function formatTimeout(elapsedMs: number) {
  return `timed out after ${Math.ceil(elapsedMs / 1000)}s`;
}

function isHealthyPayload(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { status?: unknown }).status === "ok");
}

function isReadonlyHealth(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && (payload as { readonly?: unknown }).readonly === true);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDirectExecution(moduleUrl: string, argvEntry: string | undefined) {
  if (!argvEntry) return false;
  return moduleUrl === pathToFileURL(path.resolve(argvEntry)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void runDevStatus();
}
