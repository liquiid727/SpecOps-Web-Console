// @vitest-environment node
import http from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { AppState } from "../shared/types.js";
import { createApplication } from "./application.js";
import { createServer } from "./http-server.js";
import type { Application, ApplicationDependencies, PtyProcess } from "./ports.js";

const emptyState: AppState = { workspaces: [], profiles: [], sessions: [] };

function createDependencies(overrides: Partial<ApplicationDependencies> = {}) {
  const calls: string[] = [];
  const state = structuredClone(emptyState);
  const process: PtyProcess = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn()
  };
  const dependencies: ApplicationDependencies = {
    stateRepository: {
      load: vi.fn(async () => state),
      save: vi.fn(async () => { calls.push("save"); }),
      drain: vi.fn(async () => { calls.push("state-drain"); })
    },
    transcriptRepository: { drain: vi.fn(async () => { calls.push("transcript-drain"); }) },
    ptyRuntime: { spawn: vi.fn(() => process), shutdown: vi.fn(async () => { calls.push("pty-shutdown"); }) },
    filesystem: {
      stat: vi.fn(async () => ({ isDirectory: () => true })),
      access: vi.fn(async () => undefined),
      readFile: vi.fn(async () => Buffer.from(""))
    },
    gitInspector: { available: false },
    directoryPicker: { available: false },
    profileAdapters: { availableAdapterIds: ["generic"] },
    clock: { now: vi.fn(() => "2026-01-01T00:00:00Z") },
    idGenerator: { create: vi.fn((prefix) => `${prefix}-fixed`) },
    policy: { readonly: false, processEnvironment: {} },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  };
  return { calls, dependencies, process, state };
}

function request(port: number, pathname: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: pathname }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    }).on("error", reject);
  });
}

describe("application composition", () => {
  it("constructs from injected dependencies and does not listen", async () => {
    const { dependencies } = createDependencies();
    const application = await createApplication(dependencies);

    expect(dependencies.stateRepository.load).toHaveBeenCalledOnce();
    expect(dependencies.ptyRuntime.spawn).not.toHaveBeenCalled();
    expect(dependencies.filesystem.readFile).not.toHaveBeenCalled();
    await application.close();
  });

  it("stops active PTYs and drains persistence during idempotent shutdown", async () => {
    const { calls, dependencies, state } = createDependencies();
    state.workspaces.push({ id: "workspace-1", name: "Workspace", path: "/tmp/workspace", createdAt: "2026-01-01T00:00:00Z" });
    state.profiles.push({ id: "profile-1", name: "CLI", command: "cli", args: [], createdAt: "2026-01-01T00:00:00Z" });
    state.sessions.push({ id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Session", status: "stopped", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
    const application = await createApplication(dependencies);
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: dependencies.logger, requestIdFactory: () => "request-test" });
    const address = await server.listen();

    await new Promise<void>((resolve, reject) => {
      const payload = Buffer.from(JSON.stringify({ confirmed: true }));
      const req = http.request({ host: address.host, port: address.port, path: "/api/sessions/session-1/start", method: "POST", headers: { "content-type": "application/json", "content-length": payload.length } }, (response) => {
        response.resume();
        response.on("end", () => response.statusCode === 200 ? resolve() : reject(new Error(`unexpected start status ${response.statusCode}`)));
      });
      req.on("error", reject);
      req.end(payload);
    });
    expect(dependencies.ptyRuntime.spawn).toHaveBeenCalledOnce();
    expect(state.sessions[0].status).toBe("running");
    await Promise.all([server.close(), server.close()]);

    expect(dependencies.ptyRuntime.shutdown).toHaveBeenCalledOnce();
    expect(dependencies.stateRepository.drain).toHaveBeenCalledOnce();
    expect(dependencies.transcriptRepository.drain).toHaveBeenCalledOnce();
    expect(state.sessions[0].status).toBe("stopped");
    expect(calls).toContain("save");
    expect(calls.indexOf("save")).toBeLessThan(calls.indexOf("state-drain"));
  });
});

describe("HTTP server lifecycle", () => {
  it("binds only on listen, delegates requests, and closes the application", async () => {
    const application: Application = {
      handleHttp: vi.fn(async (_request, response) => {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("ok");
      }),
      handleWebSocket: vi.fn(),
      close: vi.fn(async () => undefined)
    };
    const server = createServer(application, { host: "127.0.0.1", port: 0, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, requestIdFactory: () => "request-test" });
    const address = await server.listen();
    const response = await request(address.port, "/health");

    expect(address.host).toBe("127.0.0.1");
    expect(address.port).toBeGreaterThan(0);
    expect(response).toEqual({ status: 200, body: "ok" });
    expect(application.handleHttp).toHaveBeenCalledOnce();
    await server.close();
    expect(application.close).toHaveBeenCalledOnce();
  });
});
