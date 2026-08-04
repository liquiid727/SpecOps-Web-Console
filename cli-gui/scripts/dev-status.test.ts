// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import net from "node:net";
import { buildDevUrls, createChildEnvironment, isLoopbackPortAvailable, probeEndpoint, renderBanner, renderFailureSummary, resolvePreferredPorts, selectDevPorts, waitForEndpoint, type WaitResult } from "./dev-status.js";

const readyFrontend: WaitResult = { name: "frontend", status: "ready", elapsedMs: 12 };
const readyBackend: WaitResult = { name: "backend", status: "ready", elapsedMs: 18, payload: { status: "ok", readonly: false } };

describe("dev status probes", () => {
  it("marks successful HTTP and health responses as ready", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "ok", service: "session-manager", readonly: false }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(probeEndpoint("http://127.0.0.1:3001/health", { fetchImpl, expectJsonStatus: true })).resolves.toMatchObject({ ok: true, status: "ready" });
  });

  it("reports failed probes without throwing", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));

    await expect(probeEndpoint("http://127.0.0.1:3000", { fetchImpl })).resolves.toMatchObject({ ok: false, status: "unavailable", detail: "HTTP 503" });
  });

  it("times out when an endpoint never becomes ready", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));
    const result = await waitForEndpoint({ name: "frontend", url: "http://127.0.0.1:3000", fetchImpl, timeoutMs: 3, intervalMs: 1 });

    expect(result.status).toBe("timeout");
    expect(result.detail).toBe("HTTP 503");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(3);
  });
});

describe("development port selection", () => {
  it("rejects a port occupied by an IPv6 wildcard listener", async () => {
    const occupied = net.createServer();
    await new Promise<void>((resolve, reject) => {
      occupied.once("error", reject);
      occupied.listen(0, "::", () => resolve());
    });
    const address = occupied.address();
    if (!address || typeof address === "string") throw new Error("test server did not expose a port");

    try {
      await expect(isLoopbackPortAvailable(address.port)).resolves.toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => occupied.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("moves past a port occupied on loopback", async () => {
    const occupied = net.createServer();
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", () => resolve()));
    const address = occupied.address();
    if (!address || typeof address === "string") throw new Error("test server did not expose a port");

    try {
      const ports = await selectDevPorts({ guiPort: address.port, apiPort: address.port + 1 });
      expect(ports.guiPort).toBeGreaterThan(address.port);
      expect(ports.apiPort).not.toBe(ports.guiPort);
    } finally {
      await new Promise<void>((resolve, reject) => occupied.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("keeps GUI and API ports distinct when preferred values collide", async () => {
    const isPortAvailable = vi.fn(async (port: number) => port !== 4100);

    await expect(selectDevPorts({ guiPort: 4100, apiPort: 4100, isPortAvailableImpl: isPortAvailable })).resolves.toEqual({ guiPort: 4101, apiPort: 4102 });
  });

  it("builds dynamic URLs and one environment for both children", () => {
    const ports = { guiPort: 4310, apiPort: 4311 };
    const urls = buildDevUrls(ports);
    const env = createChildEnvironment({ PATH: "/test", PORT: "9999" }, ports);

    expect(urls).toEqual({
      guiUrl: "http://127.0.0.1:4310",
      apiUrl: "http://127.0.0.1:4311",
      healthUrl: "http://127.0.0.1:4311/health",
      websocketUrl: "ws://127.0.0.1:4311/ws"
    });
    expect(env).toMatchObject({ PATH: "/test", SPECOS_GUI_PORT: "4310", SPECOS_API_PORT: "4311", PORT: "4311" });
  });

  it("uses explicit API preference before the legacy PORT preference", () => {
    expect(resolvePreferredPorts({ SPECOS_GUI_PORT: "4320", SPECOS_API_PORT: "4321", PORT: "4322" })).toEqual({ guiPort: 4320, apiPort: 4321 });
    expect(resolvePreferredPorts({ PORT: "4322" })).toEqual({ guiPort: 3000, apiPort: 4322 });
  });
});

describe("dev status banner", () => {
  it("includes service URLs, health states, runtime mode, and stop hint", () => {
    const banner = renderBanner({ frontend: readyFrontend, backend: readyBackend });

    expect(banner).toContain("🚀 SpecOS CLI GUI Dev");
    expect(banner).toContain("http://127.0.0.1:3000");
    expect(banner).toContain("http://127.0.0.1:3001");
    expect(banner).toContain("ws://127.0.0.1:3001/ws");
    expect(banner).toContain("Status:   ✅ ready");
    expect(banner).toContain("Status:   ✅ healthy");
    expect(banner).toContain("Mode:     writable");
    expect(banner).toContain("🛑 Stop with Ctrl+C");
  });

  it("renders explicit unavailable and timeout summaries", () => {
    const frontend: WaitResult = { name: "frontend", status: "unavailable", elapsedMs: 10, detail: "ECONNREFUSED" };
    const backend: WaitResult = { name: "backend", status: "timeout", elapsedMs: 10_100, detail: "HTTP 503" };

    expect(renderBanner({ frontend, backend })).toContain("Status:   ❌ unavailable");
    expect(renderBanner({ frontend, backend })).toContain("Status:   ⏳ timed out after 11s");
    expect(renderFailureSummary(frontend, backend)).toContain("❌ Frontend: unavailable");
    expect(renderFailureSummary(frontend, backend)).toContain("❌ Backend: timed out after 11s");
  });

  it("prints the selected GUI, API, health, and WebSocket addresses", () => {
    const banner = renderBanner({
      frontend: readyFrontend,
      backend: readyBackend,
      guiUrl: "http://127.0.0.1:4310",
      apiUrl: "http://127.0.0.1:4311",
      healthUrl: "http://127.0.0.1:4311/health",
      websocketUrl: "ws://127.0.0.1:4311/ws"
    });

    expect(banner).toContain("http://127.0.0.1:4310");
    expect(banner).toContain("http://127.0.0.1:4311/health");
    expect(banner).toContain("ws://127.0.0.1:4311/ws");
  });
});
