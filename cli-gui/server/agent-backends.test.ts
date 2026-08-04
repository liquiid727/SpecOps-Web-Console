import { describe, expect, it, vi } from "vitest";
import type { CliProfileV3 } from "../shared/types";
import type { ProfileAdapterRegistry, PersistentChatRuntime } from "./ports";
import { PersistentRuntimeUnavailableError } from "./ports";
import { createAgentBackendRegistry, createProfileAdapterTurnExecutor } from "./agent-backends";

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
    const persistentChatRuntime: PersistentChatRuntime = {
      runTurn() {
        return {
          result: Promise.reject(new PersistentRuntimeUnavailableError("failed to initialize in-process app-server client: Operation not permitted")),
          kill() {}
        };
      },
      release() {},
      async shutdown() {}
    };
    const executor = createProfileAdapterTurnExecutor({ processEnvironment: { PATH: process.env.PATH ?? "" }, persistentChatRuntime });
    const handle = await executor.run({
      backendId: "codex",
      session: { sessionId: "session-1", workspacePath: process.cwd(), config: { profile } },
      turn: { prompt: "hello" },
      adapters
    });

    await expect(handle.result).resolves.toMatchObject({
      status: "failed",
      error: {
        code: "CLI_PERMISSION_DENIED",
        phase: "spawn",
        fallbackAttempted: true,
        fallbackCode: "CLI_PERMISSION_DENIED"
      }
    });
    const result = await handle.result;
    expect(result.error?.message).toContain("app-server");
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
