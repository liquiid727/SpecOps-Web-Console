// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { probeEndpoint, renderBanner, renderFailureSummary, waitForEndpoint, type WaitResult } from "./dev-status.js";

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
});
