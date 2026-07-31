// @vitest-environment node
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import type { CliProfileV2 } from "../shared/types.js";
import type { ParsedTurnEvent, TurnParseResult } from "./ports.js";
import { createProfileAdapterRegistry, EnhanceUnsupportedError, HeadlessTurnUnsupportedError, sanitizeCliEnvironment, UnsupportedCliOptionError } from "./profile-adapters.js";

const base = (adapterId: CliProfileV2["adapterId"], command: string): CliProfileV2 => ({ id: `${adapterId}-1`, name: adapterId, command, args: [], adapterId, createdAt: "2026-01-01T00:00:00Z" });
// process.execPath 报告的 node 版本落在宽范围内 → headless 开启（不依赖真实 codex）
const headlessCodex = (): CliProfileV2 => ({ ...base("codex", process.execPath), adapterVersionRange: ">=1.0.0 <100.0.0" });
const headlessClaude = (): CliProfileV2 => ({ ...base("claude-code", process.execPath), adapterVersionRange: ">=1.0.0 <100.0.0" });

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
  // npm run 会把各级祖先目录的 node_modules/.bin 前置到 PATH，陈旧本地包会遮蔽全局 CLI
  it("strips npm-injected node_modules/.bin entries from PATH", () => {
    const sanitized = sanitizeCliEnvironment({ PATH: ["/Users/dev/node_modules/.bin", "/repo/node_modules/.bin", "/usr/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin", "/opt/homebrew/bin", "/usr/bin"].join(":"), HOME: "/Users/dev" });
    expect(sanitized.PATH).toBe("/opt/homebrew/bin:/usr/bin");
    expect(sanitized.HOME).toBe("/Users/dev");
    expect(sanitizeCliEnvironment({ HOME: "/Users/dev" })).toEqual({ HOME: "/Users/dev" });
  });

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

  it("enables claude headless turns and resume within the verified version range, approval stays false (issue-010)", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(headlessClaude());
    expect(capabilities.compatibility).toBe("supported");
    expect(capabilities).toMatchObject({ supportsHeadlessTurns: true, supportsResume: true, supportsApproval: false });
  });

  it("closes claude headless capability outside the default verified range", async () => {
    const registry = createProfileAdapterRegistry();
    const capabilities = await registry.capabilities!(base("claude-code", process.execPath));
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
    expect(events.map((event) => event.kind)).toEqual(["pty_output", "assistant_message", "tool_activity", "file_change", "file_change", "pty_output", "pty_output", "lifecycle"]);
    expect(events[0].raw).toBe("OpenAI Codex banner line");
    expect(events[1].raw).toBe("Hello **world**");
    expect(events[2]).toMatchObject({ raw: "go test ./...", metadata: { turnId: "turn-1", tool: "command_execution", exitCode: 0 } });
    expect(events[3].metadata).toMatchObject({ path: "payment.go" });
    expect(events[4].metadata).toMatchObject({ path: "refund.go" });
    expect(events[5].raw).toBe('{"type":"item.completed","item":{"type":"agent_message"}}');
    expect(events[6].raw).toBe('{"type":"mystery.future.event","payload":1}');
    expect(events[7]).toMatchObject({ kind: "lifecycle", raw: "Turn completed.", metadata: { turnId: "turn-1", status: "turn-completed" } });
    for (const event of events) {
      expect(event.source).toBe("profile-adapter");
      expect(event.metadata?.turnId).toBe("turn-1");
      expect(["error", "user_message", "approval_response"]).not.toContain(event.kind);
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
    const lifecycle = await iterator.next();
    expect(lifecycle.done).toBe(false);
    expect((lifecycle.value as ParsedTurnEvent).kind).toBe("lifecycle");
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

describe("claude buildTurn argv snapshots (adapter-spec §3.2)", () => {
  it("assembles -p stream-json with options, resume and prompt as a single argv element", async () => {
    const registry = createProfileAdapterRegistry();
    const prompt = 'fix the "auth" bug\nthen run tests';
    const spec = await registry.buildTurn!(headlessClaude(), { workspacePath: "/tmp/ws", prompt, permission: "acceptEdits", mode: null, model: "sonnet", resumeToken: "sess-42" });
    expect(spec.command).toBe(process.execPath);
    expect(spec.args).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-mode", "acceptEdits", "--model", "sonnet", "--resume", "sess-42", prompt]);
  });

  it("omits default options and resume on the first turn", async () => {
    const registry = createProfileAdapterRegistry();
    const spec = await registry.buildTurn!(headlessClaude(), { workspacePath: "/tmp/ws", prompt: "hello", permission: "default", mode: null, model: null });
    expect(spec.args).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "hello"]);
  });

  it("rejects unsupported modes and non-headless claude profiles", async () => {
    const registry = createProfileAdapterRegistry();
    await expect(registry.buildTurn!(headlessClaude(), { workspacePath: "/tmp/ws", prompt: "x", permission: null, mode: "workspace-write", model: null })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
    await expect(registry.buildTurn!(base("claude-code", process.execPath), { workspacePath: "/tmp/ws", prompt: "x", permission: null, mode: null, model: null })).rejects.toBeInstanceOf(HeadlessTurnUnsupportedError);
  });
});

describe("claude parseEvents (adapter-spec §3.2/§4)", () => {
  const fixture = [
    "Claude Code banner line",
    '{"type":"system","subtype":"init","session_id":"sess-1","model":"sonnet"}',
    '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello **claude**"},{"type":"tool_use","name":"Bash","input":{"command":"ls"}}]},"session_id":"sess-1"}',
    '{"type":"user","message":{"content":[{"type":"tool_result","content":"ok"}]},"session_id":"sess-1"}',
    '{"type":"assistant","message":{"content":[{"type":"unknown_block"}]},"session_id":"sess-1"}',
    '{"type":"mystery.future.event","payload":1}',
    '{"type":"result","subtype":"success","result":"done","session_id":"sess-2","usage":{"input_tokens":7,"output_tokens":3}}'
  ].join("\n") + "\n";

  it("maps stream-json to canonical kinds, extracts the last resumeToken and usage", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end(fixture);
    const { events, result } = await collect(registry.parseEvents!(headlessClaude(), stream, { turnId: "turn-c1" }));
    expect(events.map((event) => event.kind)).toEqual(["pty_output", "assistant_message", "tool_activity", "pty_output", "pty_output", "lifecycle"]);
    expect(events[0].raw).toBe("Claude Code banner line");
    expect(events[1].raw).toBe("Hello **claude**");
    expect(events[2]).toMatchObject({ raw: "Bash", metadata: { turnId: "turn-c1", tool: "Bash" } });
    expect(events[3].raw).toBe('{"type":"assistant","message":{"content":[{"type":"unknown_block"}]},"session_id":"sess-1"}');
    expect(events[4].raw).toBe('{"type":"mystery.future.event","payload":1}');
    expect(events[5]).toMatchObject({ kind: "lifecycle", raw: "Turn completed.", metadata: { turnId: "turn-c1", status: "turn-completed" } });
    for (const event of events) {
      expect(event.source).toBe("profile-adapter");
      expect(event.metadata?.turnId).toBe("turn-c1");
      expect(["error", "user_message", "approval_response"]).not.toContain(event.kind);
    }
    expect(result.resumeToken).toBe("sess-2");
    expect(result.usage).toEqual({ inputTokens: 7, outputTokens: 3 });
  });

  it("yields events streamingly before the process stream ends", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    const iterator = registry.parseEvents!(headlessClaude(), stream, { turnId: "turn-c2" });
    stream.write('{"type":"assistant","message":{"content":[{"type":"text","text":"first"}]},"session_id":"sess-9"}\n');
    const first = await iterator.next();
    expect(first.done).toBe(false);
    expect((first.value as ParsedTurnEvent).raw).toBe("first");
    stream.end('{"type":"result","session_id":"sess-9","usage":{"input_tokens":1,"output_tokens":2}}\n');
    const lifecycle = await iterator.next();
    expect(lifecycle.done).toBe(false);
    expect((lifecycle.value as ParsedTurnEvent).kind).toBe("lifecycle");
    const done = await iterator.next();
    expect(done.done).toBe(true);
    expect((done.value as TurnParseResult)).toMatchObject({ resumeToken: "sess-9", usage: { inputTokens: 1, outputTokens: 2 } });
  });

  // streaming-spec FR-8：--include-partial-messages 的 stream_event 帧 → text_delta 进 hooks，其余子型静默忽略不降级
  it("routes text_delta stream_events to hooks.onDelta and ignores other stream_event subtypes silently", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end([
      '{"type":"stream_event","event":{"type":"message_start","message":{"id":"m1"}},"session_id":"sess-d"}',
      '{"type":"stream_event","event":{"type":"content_block_start","index":0},"session_id":"sess-d"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}},"session_id":"sess-d"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"lo!"}},"session_id":"sess-d"}',
      '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"co"}},"session_id":"sess-d"}',
      '{"type":"stream_event","event":{"type":"content_block_stop","index":0},"session_id":"sess-d"}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello!"}]},"session_id":"sess-d"}',
      '{"type":"result","session_id":"sess-d","usage":{"input_tokens":4,"output_tokens":2}}'
    ].join("\n") + "\n");
    const deltas: string[] = [];
    const { events, result } = await collect(registry.parseEvents!(headlessClaude(), stream, { turnId: "turn-c3" }, { onDelta: (delta) => deltas.push(delta) }));
    expect(deltas).toEqual(["Hel", "lo!"]);
    // stream_event 帧不产出 transcript 事件；终帧 assistant_message 照常落盘
    expect(events.map((event) => event.kind)).toEqual(["assistant_message", "lifecycle"]);
    expect(events[0].raw).toBe("Hello!");
    expect(result.resumeToken).toBe("sess-d");
  });

  it("parses stream_event frames without hooks and without emitting events", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}},"session_id":"sess-e"}\n');
    const { events, result } = await collect(registry.parseEvents!(headlessClaude(), stream, { turnId: "turn-c4" }));
    expect(events).toEqual([]);
    expect(result.resumeToken).toBe("sess-e");
  });
});

// kimi/glm 为 Claude Code 兼容 fork：复用 stream-json / --resume 链路，无默认版本区间（探测到版本即开启 headless）
describe("claude-compatible adapters (kimi/glm)", () => {
  it("enables headless turns and resume without a default version range", async () => {
    const registry = createProfileAdapterRegistry();
    for (const adapterId of ["kimi", "glm"] as const) {
      const capabilities = await registry.capabilities!(base(adapterId, process.execPath));
      expect(capabilities.compatibility).toBe("supported");
      expect(capabilities).toMatchObject({ adapterId, supportsHeadlessTurns: true, supportsResume: true, supportsApproval: false });
      // 不硬塞 claude 型号：模型仅 default，权限旗同 claude
      expect(capabilities.models.map((model) => model.id)).toEqual(["default"]);
      expect(capabilities.permissions.some((item) => item.id === "acceptEdits")).toBe(true);
    }
  });

  it("assembles kimi headless turns through the claude stream-json protocol with resume", async () => {
    const registry = createProfileAdapterRegistry();
    const spec = await registry.buildTurn!(base("kimi", process.execPath), { workspacePath: "/tmp/ws", prompt: "hello", permission: "acceptEdits", mode: null, model: null, resumeToken: "sess-7" });
    expect(spec.args).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--permission-mode", "acceptEdits", "--resume", "sess-7", "hello"]);
  });

  it("parses glm stream-json output through the claude event parser", async () => {
    const registry = createProfileAdapterRegistry();
    const stream = new PassThrough();
    stream.end('{"type":"assistant","message":{"content":[{"type":"text","text":"pong"}]},"session_id":"sess-g"}\n{"type":"result","session_id":"sess-g","usage":{"input_tokens":1,"output_tokens":1}}\n');
    const { events, result } = await collect(registry.parseEvents!(base("glm", process.execPath), stream, { turnId: "turn-g1" }));
    expect(events.map((event) => event.kind)).toEqual(["assistant_message", "lifecycle"]);
    expect(result.resumeToken).toBe("sess-g");
  });
});

// terminal 模式原生 resume：resolveLaunch 翻译 resumeToken（codex 子命令前置 / claude 家族旗追加 / generic 忽略）
describe("resolveLaunch native resume translation", () => {
  it("prefixes codex resume subcommand before option flags", async () => {
    const registry = createProfileAdapterRegistry();
    const launch = await registry.resolveLaunch!(headlessCodex(), { permission: "never", mode: "workspace-write", model: null, resumeToken: "thread-9" });
    expect(launch.args).toEqual(["resume", "thread-9", "--ask-for-approval", "never", "--sandbox", "workspace-write"]);
  });

  it("appends --resume for the claude family and keeps first launches untouched", async () => {
    const registry = createProfileAdapterRegistry();
    const resumed = await registry.resolveLaunch!(headlessClaude(), { permission: "acceptEdits", mode: null, model: null, resumeToken: "sess-9" });
    expect(resumed.args).toEqual(["--permission-mode", "acceptEdits", "--resume", "sess-9"]);
    const fresh = await registry.resolveLaunch!(headlessClaude(), { permission: null, mode: null, model: null });
    expect(fresh.args).toEqual([]);
  });

  it("ignores resume tokens when the adapter does not support resume", async () => {
    const registry = createProfileAdapterRegistry();
    const generic = await registry.resolveLaunch!(base("generic", "anything"), { permission: null, mode: null, model: null, resumeToken: "tok" });
    expect(generic.args).toEqual([]);
    // 版本区间外：supportsResume=false，token 不翻译
    const outOfRange = await registry.resolveLaunch!(base("codex", process.execPath), { permission: null, mode: null, model: null, resumeToken: "tok" });
    expect(outOfRange.args).toEqual([]);
  });
});

// 模型目录三层合并（console-gaps SPEC §2）：builtin ∩ synced ∩ custom 进入 capabilities.models，并参与 launch 校验
describe("model catalog merge in capabilities", () => {
  it("merges synced and custom models into capabilities and invalidates the cache on change", async () => {
    const registry = createProfileAdapterRegistry();
    const plain = await registry.capabilities!(headlessCodex());
    const plainIds = plain.models.map((model) => model.id);
    expect(plainIds).toContain("gpt-5");
    expect(plainIds).not.toContain("my-model");

    // 同 profile id，仅 customModels/syncedModels 变化 → 缓存键变化，合并结果立即反映
    const enriched = await registry.capabilities!({ ...headlessCodex(), syncedModels: ["o4-mini"], customModels: ["my-model"] });
    const enrichedIds = enriched.models.map((model) => model.id);
    expect(enrichedIds).toContain("o4-mini");
    expect(enrichedIds).toContain("my-model");
    expect(enrichedIds[0]).toBe("default");
  });

  it("accepts imported custom models in launch option validation", async () => {
    const registry = createProfileAdapterRegistry();
    const profile = { ...headlessCodex(), customModels: ["my-model"] };
    const launch = await registry.resolveLaunch!(profile, { permission: null, mode: null, model: "my-model" });
    expect(launch.args).toEqual(["--model", "my-model"]);
    await expect(registry.resolveLaunch!(headlessCodex(), { permission: null, mode: null, model: "my-model" })).rejects.toBeInstanceOf(UnsupportedCliOptionError);
  });
});

// 润色/压缩 argv 组装与 capability 门槛（project-quest SPEC §5.7）
describe("prompt enhancement (project-quest SPEC §5.7)", () => {
  it("gates supportsPromptEnhancement on the headless threshold", async () => {
    const registry = createProfileAdapterRegistry();
    expect((await registry.capabilities!(headlessCodex())).supportsPromptEnhancement).toBe(true);
    expect((await registry.capabilities!(headlessClaude())).supportsPromptEnhancement).toBe(true);
    expect((await registry.capabilities!(base("generic", "anything"))).supportsPromptEnhancement).toBe(false);
    expect((await registry.capabilities!(base("codex", "/path/that/does/not/exist"))).supportsPromptEnhancement).toBe(false);
  });

  it("builds codex enhance argv with exec --skip-git-repo-check", async () => {
    const registry = createProfileAdapterRegistry();
    const spec = await registry.buildEnhance!(headlessCodex(), { prompt: "Rewrite this." });
    expect(spec.command).toBe(process.execPath);
    expect(spec.args).toEqual(["exec", "--skip-git-repo-check", "Rewrite this."]);
  });

  it("builds claude enhance argv with -p", async () => {
    const registry = createProfileAdapterRegistry();
    const spec = await registry.buildEnhance!(headlessClaude(), { prompt: "Compress this." });
    expect(spec.args).toEqual(["-p", "Compress this."]);
  });

  it("rejects enhance for adapters without the capability", async () => {
    const registry = createProfileAdapterRegistry();
    await expect(registry.buildEnhance!(base("generic", "anything"), { prompt: "x" })).rejects.toBeInstanceOf(EnhanceUnsupportedError);
  });
});
