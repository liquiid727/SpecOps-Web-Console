// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "./application.js";
import { createServer, type ServerHandle } from "./http-server.js";
import type { ApplicationDependencies } from "./ports.js";

const servers: ServerHandle[] = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

async function start(overrides: Partial<ApplicationDependencies> = {}) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const dependencies: ApplicationDependencies = {
    stateRepository: { load: async () => ({ workspaces: [], profiles: [], sessions: [] }), save: async () => undefined, drain: async () => undefined },
    transcriptRepository: { drain: async () => undefined },
    ptyRuntime: { spawn: vi.fn() as never, shutdown: async () => undefined },
    filesystem: { stat: async () => ({ isDirectory: () => true }), access: async () => undefined, readFile: async () => Buffer.from("") },
    gitInspector: { available: false },
    directoryPicker: { available: false },
    profileAdapters: { availableAdapterIds: [] },
    clock: { now: () => "2026-01-01T00:00:00Z" },
    idGenerator: { create: (prefix) => `${prefix}-fixed` },
    policy: { readonly: false, processEnvironment: {} },
    logger,
    ...overrides
  };
  const application = await createApplication(dependencies);
  const server = createServer(application, { host: "127.0.0.1", port: 0, logger, requestIdFactory: () => "request-fixed" });
  servers.push(server);
  return { address: await server.listen(), logger };
}

function send(port: number, path: string, options: { method?: string; headers?: Record<string, string | number>; body?: Buffer | string } = {}) {
  return new Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const request = http.request({ host: "127.0.0.1", port, path, method: options.method ?? "GET", headers: options.headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8"), headers: response.headers }));
    });
    request.on("error", reject);
    request.end(options.body);
  });
}

describe("API request boundaries", () => {
  it("rejects malformed JSON with a structured request-correlated error", async () => {
    const { address } = await start();
    const response = await send(address.port, "/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    const payload = JSON.parse(response.body);

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: "INVALID_JSON", requestId: "request-fixed" });
    expect(response.headers["x-request-id"]).toBe("request-fixed");
    expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("requires JSON content type and enforces the one MiB limit", async () => {
    const { address } = await start();
    const missingType = await send(address.port, "/api/workspaces", { method: "POST", body: "{}" });
    expect(JSON.parse(missingType.body).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(missingType.status).toBe(415);

    const oversized = await send(address.port, "/api/workspaces", { method: "POST", headers: { "content-type": "application/json", "content-length": 1_048_577 }, body: "{}" });
    expect(oversized.status).toBe(413);
    expect(JSON.parse(oversized.body).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("maps readonly and route failures to documented codes", async () => {
    const { address } = await start({ policy: { readonly: true, processEnvironment: {} } });
    const readonly = await send(address.port, "/api/profiles", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(readonly.status).toBe(403);
    expect(JSON.parse(readonly.body).error.code).toBe("READONLY_MODE");

    const missing = await send(address.port, "/api/unknown");
    expect(missing.status).toBe(404);
    expect(JSON.parse(missing.body).error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("does not expose internal persistence details", async () => {
    const { address, logger } = await start({ stateRepository: { load: async () => ({ workspaces: [], profiles: [], sessions: [] }), save: async () => { throw new Error("/Users/private/secret/state.json"); }, drain: async () => undefined } });
    const response = await send(address.port, "/api/profiles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "CLI", command: "cli", args: [] }) });

    expect(response.status).toBe(500);
    expect(response.body).not.toContain("/Users/private");
    expect(JSON.parse(response.body).error).toMatchObject({ code: "INTERNAL_ERROR", message: "Operation failed; see local logs.", requestId: "request-fixed" });
    expect(logger.error).toHaveBeenCalled();
  });
});
