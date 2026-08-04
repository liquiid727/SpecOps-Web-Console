import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventServerFrame, TerminalServerFrame } from "../../shared/websocket";
import { LocalHttpRuntime, type ClientRuntime } from "./client-runtime";
import {
  createMockClientRuntimeFixture,
  MOCK_RUNTIME_SCENARIOS,
  type MockRuntimeScenario
} from "./mock-client-runtime";

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
  delete window.__SPECOS_DESKTOP_RUNTIME__;
  vi.restoreAllMocks();
});

function localTransportFixture() {
  const fixture = createMockClientRuntimeFixture();
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://fixture.local");
    let payload: unknown;
    if (url.pathname === "/api/state") payload = await fixture.ports.sessions.state();
    else if (url.pathname === "/api/engines/readiness") payload = await fixture.ports.engines.engineReadiness();
    else if (url.pathname === "/api/workspaces/mock-workspace/files") payload = await fixture.ports.workspace.workspaceFiles("mock-workspace", url.searchParams.get("path") ?? "");
    else if (url.pathname === "/api/sessions/mock-streaming-text/transcript") payload = await fixture.ports.events.transcript("mock-streaming-text", Number(url.searchParams.get("afterSequence") ?? 0));
    else return new Response(JSON.stringify({ error: { code: "ROUTE_NOT_FOUND", message: "Fixture route not found.", requestId: "fixture-request" } }), { status: 404, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  class FixtureWebSocket {
    static readonly OPEN = 1;
    readonly readyState = FixtureWebSocket.OPEN;
    private readonly listeners = new Map<string, Array<(event: Event | MessageEvent) => void>>();

    constructor(url: string | URL) {
      const parsed = new URL(String(url));
      queueMicrotask(() => {
        this.emit("open", new Event("open"));
        if (parsed.searchParams.get("channel") === "terminal") {
          this.message({ type: "terminal-output", data: "mock terminal ready\n" } satisfies TerminalServerFrame);
          this.message({ type: "runtime-status", status: "running" } satisfies TerminalServerFrame);
          return;
        }
        const scenario = MOCK_RUNTIME_SCENARIOS["streaming-text"];
        const afterSequence = Number(parsed.searchParams.get("afterSequence") ?? 0);
        this.message({ type: "subscription-ready", afterSequence, latestSequence: 1 } satisfies EventServerFrame);
        if (afterSequence === 0) {
          this.message({ type: "turn-delta", turnId: "turn-streaming", delta: "Hel" } satisfies EventServerFrame);
          this.message({ type: "turn-delta", turnId: "turn-streaming", delta: "lo!" } satisfies EventServerFrame);
          this.message({ type: "transcript-event", event: scenario.persistedEvents[0]! } satisfies EventServerFrame);
          this.message({ type: "turn-status", turnId: "turn-streaming", status: "completed" } satisfies EventServerFrame);
        }
      });
    }

    addEventListener(type: string, listener: EventListener) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(listener as (event: Event | MessageEvent) => void);
      this.listeners.set(type, listeners);
    }

    send() {}

    close() {
      this.emit("close", new Event("close"));
    }

    private message(frame: EventServerFrame | TerminalServerFrame) {
      this.emit("message", new MessageEvent("message", { data: JSON.stringify(frame) }));
    }

    private emit(type: string, event: Event | MessageEvent) {
      this.listeners.get(type)?.forEach((listener) => listener(event));
    }
  }

  globalThis.WebSocket = FixtureWebSocket as unknown as typeof WebSocket;
  return { runtime: new LocalHttpRuntime(), fixture };
}

async function flushTransport() {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

interface RuntimeHarness {
  runtime: ClientRuntime;
}

function defineRuntimeContract(name: string, createHarness: () => RuntimeHarness) {
  describe(`${name} runtime port contract`, () => {
    it("serves deterministic domain values through every port without native dependencies", async () => {
      const { runtime } = createHarness();
      const [runtimeCapabilities, state, readiness, files, transcript, platformInfo] = await Promise.all([
        runtime.capabilities(),
        runtime.sessions.state(),
        runtime.engines.engineReadiness(),
        runtime.workspace.workspaceFiles("mock-workspace"),
        runtime.events.transcript("mock-streaming-text"),
        runtime.platform.platformInfo()
      ]);

      expect(runtimeCapabilities).toMatchObject({ sessionStreaming: true, terminal: true, remoteControl: false, gitDiff: "read-only" });
      expect(state.sessions.some((session) => session.id === "mock-streaming-text")).toBe(true);
      expect(readiness.engines[0]).toMatchObject({ engineId: "codex", installation: "available" });
      expect(files.entries[0]).toMatchObject({ path: "README.md", type: "file" });
      expect(transcript.events).toEqual([expect.objectContaining({ kind: "assistant_message", raw: "Hello!" })]);
      expect(platformInfo).toBe("web");

      const terminalOutput: string[] = [];
      const terminal = runtime.terminal.subscribe("mock-streaming-text", { onOutput: (output) => terminalOutput.push(output) });
      await flushTransport();
      expect(terminalOutput).toEqual(["mock terminal ready\n"]);
      terminal.close();
    });

    it("keeps deltas transient until the persisted event arrives", async () => {
      const { runtime } = createHarness();
      const transient = new Map<string, string>();
      const persisted: string[] = [];
      runtime.events.subscribe("mock-streaming-text", 0, {
        onTurnDelta(turnId, delta) {
          transient.set(turnId, `${transient.get(turnId) ?? ""}${delta}`);
        },
        onEvent(event) {
          persisted.push(event.raw);
          const turnId = event.metadata?.turnId;
          if (typeof turnId === "string") transient.delete(turnId);
        }
      });
      await flushTransport();

      expect(persisted).toEqual(["Hello!"]);
      expect(transient.size).toBe(0);
      await expect(runtime.events.transcript("mock-streaming-text")).resolves.toMatchObject({
        events: [{ kind: "assistant_message", raw: "Hello!" }]
      });
    });
  });
}

defineRuntimeContract("MockClientRuntime", () => ({ runtime: createMockClientRuntimeFixture().runtime }));
defineRuntimeContract("LocalHttpRuntime", () => localTransportFixture());

describe("MockClientRuntime scenarios", () => {
  it("publishes the complete deterministic scenario catalog", () => {
    expect(Object.keys(MOCK_RUNTIME_SCENARIOS)).toEqual([
      "streaming-text",
      "tools",
      "files",
      "approvals",
      "failures",
      "offline",
      "reconnect",
      "native-session-expired"
    ]);
  });

  it.each([
    ["tools", "tool_activity", { tool: "read_file" }],
    ["files", "file_change", { path: "client/runtime.ts" }],
    ["approvals", "approval_request", { approvalId: "approval-1" }],
    ["failures", "error", { code: "ENGINE_TRANSPORT_UNAVAILABLE" }],
    ["native-session-expired", "error", { code: "ENGINE_NATIVE_SESSION_EXPIRED" }]
  ] as const)("replays the %s fixture as persisted domain events", async (name, kind, metadata) => {
    const fixture = createMockClientRuntimeFixture();
    const scenario = fixture.scenarios[name] as MockRuntimeScenario;
    const transcript = await fixture.runtime.events.transcript(scenario.sessionId);

    expect(transcript.events).toContainEqual(expect.objectContaining({ kind, metadata: expect.objectContaining(metadata) }));
  });

  it("preserves cached transcript and reports the offline connection state", async () => {
    const fixture = createMockClientRuntimeFixture();
    const scenario = fixture.scenarios.offline;
    const errors: string[] = [];
    let closed = false;

    fixture.runtime.events.subscribe(scenario.sessionId, 0, {
      onError: (message) => errors.push(message),
      onClose: () => { closed = true; }
    });

    await expect(fixture.runtime.events.transcript(scenario.sessionId)).resolves.toMatchObject({ events: [{ raw: "Cached response." }] });
    expect(errors).toEqual(["Client runtime is offline."]);
    expect(closed).toBe(true);
  });

  it("replays only the missing persisted event after reconnect", () => {
    const fixture = createMockClientRuntimeFixture();
    const scenario = fixture.scenarios.reconnect;
    const firstPass: number[] = [];
    const recovered: number[] = [];
    let closed = false;

    fixture.runtime.events.subscribe(scenario.sessionId, 0, {
      onEvent: (event) => firstPass.push(event.sequence),
      onClose: () => { closed = true; }
    });
    fixture.runtime.events.subscribe(scenario.sessionId, 1, {
      onEvent: (event) => recovered.push(event.sequence)
    });

    expect(firstPass).toEqual([1]);
    expect(closed).toBe(true);
    expect(recovered).toEqual([2]);
  });

  it("keeps routing and execution facts inside the deterministic fixture ports", async () => {
    const fixture = createMockClientRuntimeFixture();
    const [providers, deployments, routes, resolved, executions] = await Promise.all([
      fixture.runtime.routing.providers(),
      fixture.runtime.routing.modelDeployments(),
      fixture.runtime.routing.modelRoutes(),
      fixture.runtime.routing.resolveSessionModelRoute("mock-streaming-text", "mock-deployment"),
      fixture.runtime.execution.executionTasks("mock-streaming-text")
    ]);

    expect(providers.providers[0]).toMatchObject({ id: "mock-provider", configured: true });
    expect(deployments.deployments[0]).toMatchObject({ id: "mock-deployment", eligibility: "eligible" });
    expect(routes.routes[0]).toMatchObject({ id: "mock-route", candidateDeploymentIds: ["mock-deployment"] });
    expect(resolved.resolvedRoute).toMatchObject({ selectedDeploymentId: "mock-deployment", fixedDeploymentId: "mock-deployment" });
    expect(executions.tasks).toEqual([]);
  });
});
