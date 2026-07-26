// @vitest-environment node
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import type { CliProfileV2 } from "../shared/types.js";
import type { ParsedTurnEvent, TurnParseResult } from "./ports.js";
import { createProfileAdapterRegistry, HeadlessTurnUnsupportedError, UnsupportedCliOptionError } from "./profile-adapters.js";

const base = (adapterId: CliProfileV2["adapterId"], command: string): CliProfileV2 => ({ id: `${adapterId}-1`, name: adapterId, command, args: [], adapterId, createdAt: "2026-01-01T00:00:00Z" });
// process.execPath 报告的 node 版本落在宽范围内 → headless 开启（不依赖真实 codex）
const headlessCodex = (): CliProfileV2 => ({ ...base("codex", process.execPath), adapterVersionRange: ">=1.0.0 <100.0.0" });

async function collect(iterator: AsyncGenerator<ParsedTurnEvent, TurnParseResult, void>) {
  const events: ParsedTurnEvent[] = [];
  let next = await iterator.next();
  while (!next.done) {
    events.push(next.value);
    next = await iterator.next();
  }
  return { events, result: next.value };
}

describe("profile adapters", () => {
  it("exposes a neutral generic capability contract", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("generic", "anything"));
    expect(capabilities).toMatchObject({ adapterId: "generic", compatibility: "supported", supportsComposer: true });
    expect(capabilities.permissions).toEqual([]);
  });

  it("degrades unavailable commands and translates only allowlisted options", async () => {
    const registry = createProfileAdapterRegistry();
    const unavailable = await registry.capabilities!(base("codex", "/path/that/does/not/exist"));
    expect(unavailable.compatibility).toBe("unavailable");
    const launch = await registry.resolveLaunch!(base("codex", process.execPath), { permission: "never", mode: "workspace-write", model: "gpt-5" });
    expect(launch.args).toEqual(["--ask-for-approval", "never", "--sandbox", "workspace-write", "--model", "gpt-5"]);
    await expect(registry.resolveLaunch!(base("codex", process.execPath), { permission: "not-supported", mode: null, model: null })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
  });

  it("maps Claude settings to flags exposed by the Claude adapter", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("claude-code", process.execPath));
    expect(capabilities.modes).toEqual([]);
    const launch = await registry.resolveLaunch!(base("claude-code", process.execPath), { permission: "acceptEdits", mode: null, model: "sonnet" });
    expect(launch.args).toEqual(["--permission-mode", "acceptEdits", "--model", "sonnet"]);
    await expect(registry.resolveLaunch!(base("claude-code", process.execPath), { permission: null, mode: "plan", model: null })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
  });
});

describe("headless capability fields (adapter-spec §2.2)", () => {
  it("declares all headless fields false for generic", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("generic", "anything"));
    expect(capabilities).toMatchObject({ supportsHeadlessTurns: false, supportsResume: false, supportsApproval: false });
  });

  it("declares all headless fields false when compatibility is not supported", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("codex", "/path/that/does/not/exist"));
    expect(capabilities.compatibility).toBe("unavailable");
    expect(capabilities).toMatchObject({ supportsHeadlessTurns: false, supportsResume: false, supportsApproval: false });
  });

  it("enables codex headless turns and resume within the verified version range, approval stays false", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(headlessCodex());
    expect(capabilities.compatibility).toBe("supported");
    expect(capabilities).toMatchObject({ supportsHeadlessTurns: true, supportsResume: true, supportsApproval: false });
  });

  it("closes headless capability outside the default verified range without touching compatibility", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("codex", process.execPath));
    expect(capabilities.compatibility).toBe("supported");
    expect(capabilities).toMatchObject({ supportsHeadlessTurns: false, supportsResume: false, supportsApproval: false });
  });
});

describe("codex buildTurn argv snapshots (adapter-spec §3.1)", () => {
  it("assembles exec --json with options, resume and prompt as a single argv element", async () => {
    const registry = createProfileAdapterRegistry();
    const prompt = 'refactor "payments" module\nand run tests with  spaces';
    const spec = await registry.buildTurn!(headlessCodex(), { workspacePath: "/tmp/ws", prompt, permission: "never", mode: "workspace-write", model: "gpt-5", resumeToken: "thread-42" });
    expect(spec.command).toBe(process.execPath);
    expect(spec.args).toEqual(["exec", "--json", "--model", "gpt-5", "--sandbox", "workspace-write", "--ask-for-approval", "never", "resume", "thread-42", prompt]);
  });

  it("omits default options and resume on the first turn", async () => {
    const registry = createProfileAdapterRegistry();
    const spec = await registry.buildTurn!(headlessCodex(), { workspacePath: "/tmp/ws", prompt: "hello", permission: "default", mode: null, model: null });
    expect(spec.args).toEqual(["exec", "--json", "hello"]);
  });

  it("rejects non-allowlisted options and non-headless adapters", async () => {
    const registry = createProfileAdapterRegistry();
    await expect(registry.buildTurn!(headlessCodex(), { workspacePath: "/tmp/ws", prompt: "x", permission: null, mode: null, model: "not-a-model" })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
    await expect(registry.buildTurn!(base("generic", "anything"), { workspacePath: "/tmp/ws", prompt: "x", permission: null, mode: null, model: null })).rejects.toBeInstanceOf(HeadlessTurnUnsupportedError);
    await expect(registry.buildTurn!(base("codex", process.execPath), { workspacePath: "/tmp/ws", prompt: "x", permission: null, mode: null, model: null })).rejects.toBeInstanceOf(HeadlessTurnUnsupportedError);
  });
});

describe("codex parseEvents (adapter-spec §3.1/§4)", () => {
  const fixture = [
    "OpenAI Codex banner line",
    '{"type":"thread.started","thread_id":"t-1"}',
    '{"type":"turn.started"}',
    '{"type":"item.started","item":{"type":"agent_message","text":"partial"}}',
    '{"type":"item.completed","item":{"type":"agent_message","text":"Hello **world**"}}',
    '{"type":"item.completed","item":{"type":"command_execution","command":"go test ./...","exit_code":0}}',
    '{"type":"item.completed","item":{"type":"file_change","changes":[{"path":"payment.go","kind":"update"},{"path":"refund.go","kind":"add"}]}}',
    '{"type":"item.completed","item":{"type":"agent_message"}}',
    '{"type":"mystery.future.event","payload":1}',
    '{"type":"thread.started","thread_id":"t-2"}',
    '{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}'
  ].join("\n") + "\n";

  it("maps recorded JSONL to canonical kinds, extracts the last resumeToken and usage", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end(fixture);
    const { events, result } = await collect(registry.parseEvents!(headlessCodex(), stream, { turnId: "turn-1" }));
    expect(events.map((event) => event.kind)).toEqual(["pty_output", "assistant_message", "tool_activity", "file_change", "file_change", "pty_output", "pty_output"]);
    expect(events[0].raw).toBe("OpenAI Codex banner line");
    expect(events[1].raw).toBe("Hello **world**");
    expect(events[2]).toMatchObject({ raw: "go test ./...", metadata: { turnId: "turn-1", tool: "command_execution", exitCode: 0 } });
    expect(events[3].metadata).toMatchObject({ path: "payment.go" });
    expect(events[4].metadata).toMatchObject({ path: "refund.go" });
    expect(events[5].raw).toBe('{"type":"item.completed","item":{"type":"agent_message"}}');
    expect(events[6].raw).toBe('{"type":"mystery.future.event","payload":1}');
    for (const event of events) {
      expect(event.source).toBe("profile-adapter");
      expect(event.metadata?.turnId).toBe("turn-1");
      expect(["lifecycle", "error", "user_message", "approval_response"]).not.toContain(event.kind);
    }
    expect(result.resumeToken).toBe("t-2");
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("yields events streamingly before the process stream ends", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    const iterator = registry.parseEvents!(headlessCodex(), stream, { turnId: "turn-2" });
    stream.write('{"type":"item.completed","item":{"type":"agent_message","text":"first"}}\n');
    const first = await iterator.next();
    expect(first.done).toBe(false);
    expect((first.value as ParsedTurnEvent).raw).toBe("first");
    stream.end('{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2}}\n');
    const done = await iterator.next();
    expect(done.done).toBe(true);
    expect((done.value as TurnParseResult).usage).toEqual({ inputTokens: 1, outputTokens: 2 });
  });

  it("treats a trailing line without newline as parse input and rejects non-codex adapters", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end('{"type":"item.completed","item":{"type":"agent_message","text":"tail"}}');
    const { events } = await collect(registry.parseEvents!(headlessCodex(), stream, { turnId: "turn-3" }));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "assistant_message", raw: "tail" });
    expect(() => registry.parseEvents!(base("generic", "anything"), new PassThrough(), { turnId: "turn-4" })).toThrow(HeadlessTurnUnsupportedError);
  });
});
