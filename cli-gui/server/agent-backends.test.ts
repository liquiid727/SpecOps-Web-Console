import { describe, expect, it, vi } from "vitest";
import type { CliProfileV3 } from "../shared/types";
import type { ProfileAdapterRegistry, PersistentChatRuntime } from "./ports";
import { PersistentRuntimeUnavailableError } from "./ports";
import { classifyAgentTurnFailure, createAgentBackendRegistry, createProfileAdapterTurnExecutor, normalizeVendorEvent } from "./agent-backends";

const profile: CliProfileV3 = {
  id: "profile-codex",
  name: "Codex",
  command: "codex",
  args: [],
  adapterId: "codex",
  createdAt: "2026-07-29T00:00:00.000Z"
};

const capabilities = {
  adapterId: "codex" as const,
  compatibility: "supported" as const,
  permissions: [],
  modes: [],
  models: [],
  supportsComposer: true,
  supportsStructuredRecognition: true,
  supportsHeadlessTurns: true,
  supportsResume: true,
  supportsApproval: false,
  supportsPromptEnhancement: true
};

describe("Agent Backend migration seam", () => {
  it("redacts vendor text, metadata, structured components, and unknown previews at normalization", () => {
    const known = normalizeVendorEvent({
      type: "tool_use", text: "keep path=/tmp/project", metadata: { token: "known-canary", note: "token=inline-canary" },
      component: { type: "tool", title: "title", text: "prompt=component-canary", data: { secret: "data-canary", path: "/tmp/project/file.ts" } }
    }, "codex");
    expect(known.text).toContain("/tmp/project");
    expect(JSON.stringify(known)).not.toMatch(/known-canary|inline-canary|component-canary|data-canary/);
    expect(JSON.stringify(known)).toContain("/tmp/project/file.ts");

    const unknown = normalizeVendorEvent({ type: "vendor.experimental", payload: { auth: "unknown-canary", path: "/tmp/project" }, component: { type: "diagnostic", data: { apiKey: "component-canary" } } }, "codex");
    expect(JSON.stringify(unknown)).not.toMatch(/unknown-canary|component-canary/);
    expect(JSON.stringify(unknown)).toContain("/tmp/project");
  });

  it("maps only controlled machine codes and ignores an upstream class override", () => {
    const cases = [
      ["MODEL_NOT_FOUND", "configuration", false],
      ["MODEL_OVERLOADED", "model-temporarily-unavailable", true],
      ["CONNECTION_FAILED", "connection", true],
      ["PROVIDER_UNAVAILABLE", "provider-unavailable", true],
      ["HTTP_401", "authentication", false],
      ["PARSER_FAILED", "unknown", false]
    ] as const;
    for (const [code, expected, fallbackEligible] of cases) {
      expect(classifyAgentTurnFailure({ code, message: "secret=canary prompt=hidden", failureClass: "startup" })).toMatchObject({ class: expected, fallbackEligible, message: expect.not.stringContaining("canary") });
    }
  });

  it("selects a structured transport and delegates turns through a stateful handle", async () => {
    const adapters: ProfileAdapterRegistry = {
      availableAdapterIds: ["codex"],
      capabilities: vi.fn(async () => capabilities)
    };
    const turnHandle = {
      events: (async function* (): AsyncIterable<unknown> {})(),
      result: Promise.resolve({ status: "completed" }),
      cancel: vi.fn(async () => undefined)
    };
    const run = vi.fn(async () => turnHandle);
    const registry = createAgentBackendRegistry(adapters, { run });
    const backend = registry.forProfile(profile);
    const session = await backend.openSession({
      sessionId: "session-1",
      workspacePath: process.cwd(),
      config: { profile }
    });

    expect(registry.ids).toContain("codex");
    expect(session.selectedTransport).toBe("json-stream");
    expect(session.ref).toMatchObject({ backendId: "codex", transport: "json-stream" });
    const normalizedHandle = await session.runTurn({ prompt: "Review this project" });
    expect(normalizedHandle.result).toBe(turnHandle.result);
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ backendId: "codex" }));
    await session.close();
    await expect(session.runTurn({ prompt: "again" })).rejects.toThrow("closed");
  });

  it("resolves a classified error after both app-server and CLI fallback fail", async () => {
    const adapters: ProfileAdapterRegistry = {
      availableAdapterIds: ["codex"],
      buildTurn: vi.fn(async () => ({
        command: process.execPath,
        args: ["-e", "process.stderr.write('Operation not permitted\\n'); process.exit(1);"]
      })),
      parseEvents: async function* () {
        return {};
      }
    };
    const persistentRun = vi.fn(() => {
      return {
        result: Promise.reject(new PersistentRuntimeUnavailableError("failed to initialize in-process app-server client: Operation not permitted")),
        kill() {}
      };
    });
    const persistentChatRuntime: PersistentChatRuntime = {
      runTurn: persistentRun,
      release() {},
      async shutdown() {}
    };
    const buildTurn = adapters.buildTurn;
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const executor = createProfileAdapterTurnExecutor({ processEnvironment: { PATH: process.env.PATH ?? "" }, persistentChatRuntime, logger });
    const handle = await executor.run({
      backendId: "codex",
      session: { sessionId: "session-1", workspacePath: process.cwd(), config: { profile } },
      turn: { prompt: "hello" },
      adapters
    });

    const resultPromise = handle.result;
    expect(handle.result).toBe(resultPromise);
    await expect(resultPromise).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "CLI_PERMISSION_DENIED",
        phase: "spawn",
        fallbackAttempted: true,
        fallbackCode: "CLI_PERMISSION_DENIED"
      }
    });
    const result = await resultPromise;
    expect(result.error?.message).toContain("app-server");
    expect(result.error?.message).not.toContain("canary");
    expect(logger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ reason: expect.not.stringContaining("canary") }));
    expect(persistentRun).toHaveBeenCalledTimes(1);
    expect(buildTurn).toHaveBeenCalledTimes(1);
  });

  it("redacts parser diagnostics before they enter the backend event queue", async () => {
    const adapters: ProfileAdapterRegistry = {
      availableAdapterIds: ["codex"],
      buildTurn: vi.fn(async () => ({ command: process.execPath, args: ["-e", "process.exit(0)"] })),
      parseEvents: async function* () {
        throw new Error("parser secret=parser-canary prompt=hidden");
      }
    };
    const executor = createProfileAdapterTurnExecutor({ processEnvironment: { PATH: process.env.PATH ?? "" } });
    const handle = await executor.run({
      backendId: "codex",
      session: { sessionId: "session-parser", workspacePath: process.cwd(), config: { profile } },
      turn: { prompt: "hello" },
      adapters
    });
    const events = [];
    for await (const event of handle.events) events.push(event);
    expect(events).toContainEqual(expect.objectContaining({ kind: "diagnostic", text: expect.not.stringContaining("parser-canary") }));
    await expect(handle.result).resolves.toMatchObject({ status: "failed", error: { message: expect.not.stringContaining("parser-canary") } });
  });

  it("redacts parsed adapter raw and component canaries before queueing", async () => {
    const adapters: ProfileAdapterRegistry = {
      availableAdapterIds: ["codex"],
      buildTurn: vi.fn(async () => ({ command: process.execPath, args: ["-e", "process.exit(0)"] })),
      parseEvents: async function* () {
        yield { kind: "assistant_message", raw: "prompt=parsed-prompt-canary path=/tmp/project", metadata: { token: "parsed-token-canary" }, component: { type: "message", text: "secret=parsed-secret-canary", data: { path: "/tmp/project/file.ts" } } };
        return {};
      }
    };
    const executor = createProfileAdapterTurnExecutor({ processEnvironment: { PATH: process.env.PATH ?? "" } });
    const handle = await executor.run({ backendId: "codex", session: { sessionId: "session-parsed", workspacePath: process.cwd(), config: { profile } }, turn: { prompt: "hello" }, adapters });
    const events = [];
    for await (const event of handle.events) events.push(event);
    expect(JSON.stringify(events)).not.toMatch(/parsed-prompt-canary|parsed-token-canary|parsed-secret-canary/);
    expect(JSON.stringify(events)).toContain("/tmp/project/file.ts");
  });

  it("registers backend boundaries without advertising unimplemented native SDK or ACP transports", () => {
    const adapters: ProfileAdapterRegistry = { availableAdapterIds: [] };
    const registry = createAgentBackendRegistry(adapters);

    expect(registry.get("codex")?.supportedTransports).toEqual(["json-stream", "pty"]);
    expect(registry.get("claude")?.supportedTransports).toEqual(["json-stream", "pty"]);
    expect(registry.get("generic-json-stream")?.supportedTransports).toEqual(["json-stream", "pty"]);
    expect(registry.get("generic-pty")?.supportedTransports).toEqual(["pty"]);
    expect(registry.get("kimi")?.supportedTransports).toEqual(["pty"]);
  });

  it("normalizes required vendor categories and degrades unknown events to diagnostics", async () => {
    const adapters: ProfileAdapterRegistry = {
      availableAdapterIds: ["codex"],
      capabilities: vi.fn(async () => capabilities)
    };
    const rawEvents = [
      { type: "response.output_text.delta", delta: { text: "hello" } },
      { type: "reasoning_progress", text: "thinking" },
      { type: "tool_use", name: "read_file" },
      { type: "command_execution", command: "npm test" },
      { type: "file_change", path: "client/app.tsx" },
      { type: "approval_request", approval_id: "approval-1" },
      { type: "approval_result", approval_id: "approval-1", decision: "allow" },
      { type: "usage", input_tokens: 10, output_tokens: 4 },
      { type: "turn.completed" },
      { type: "turn.cancelled" },
      { type: "vendor_error", code: "VENDOR_FAILED", message: "boom" },
      { type: "vendor.experimental", payload: { value: 1 } }
    ];
    const registry = createAgentBackendRegistry(adapters, {
      run: async () => ({
        events: (async function* () { for (const event of rawEvents) yield event; })(),
        result: Promise.resolve({ status: "completed" }),
        cancel: vi.fn(async () => undefined)
      })
    });
    const session = await registry.forProfile(profile).openSession({ sessionId: "session-1", workspacePath: process.cwd(), config: { profile } });
    const handle = await session.runTurn({ prompt: "Review this project" });
    const events = [];
    for await (const event of handle.events) events.push(event);

    expect(events.map((event) => event.kind)).toEqual([
      "text_delta", "progress", "tool", "command", "file_change", "approval_request",
      "approval_result", "usage", "completed", "cancelled", "error", "diagnostic"
    ]);
    expect(events[5].metadata).toMatchObject({ backendId: "codex", approvalId: "approval-1" });
    expect(events[7].metadata).toMatchObject({ inputTokens: 10, outputTokens: 4 });
    expect(events.at(-1)).toMatchObject({ kind: "diagnostic", metadata: { code: "UNKNOWN_VENDOR_EVENT", vendorType: "vendor.experimental" } });
  });
});
