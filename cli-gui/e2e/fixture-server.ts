import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { main } from "../server/index.js";

const execFileAsync = promisify(execFile);

const root = await fs.mkdtemp(path.join(os.tmpdir(), "specos-cli-gui-e2e-"));
const dataDirectory = path.join(root, "data");
const workspacePath = path.join(root, "workspace");
await fs.mkdir(workspacePath, { recursive: true });
await fs.mkdir(dataDirectory, { recursive: true });
await fs.writeFile(path.join(workspacePath, "README.md"), "# fixture\n", "utf8");
await fs.mkdir(path.join(workspacePath, ".git"), { recursive: true });
const fixtureCliPath = path.join(root, "fixture-cli.sh");
await fs.writeFile(fixtureCliPath, `#!/bin/sh
while IFS= read -r line; do
  printf 'fixture:%s\\n' "$line"
done
`, "utf8");
await fs.chmod(fixtureCliPath, 0o755);
// 假 headless chat CLI（codex exec --json 行协议）：末尾 argv 为 prompt，回复 reply:<prompt>（test-spec §4.2 多会话冒烟）
// 未识别行 cli-raw 降级 pty_output（chat Terminal tab 回放验证）；slow: 前缀挂起 20s（取消路径验证）
const fixtureChatCliPath = path.join(root, "fixture-chat-cli.cjs");
await fs.writeFile(fixtureChatCliPath, [
  // Provider launch overrides are appended after the headless prompt. Keep the
  // fake engine's reply tied to the user prompt instead of a `-c` value.
  'const argv = process.argv.slice(2);',
  'const providerArg = argv.findIndex((value) => value.startsWith("model_provider=") || value.startsWith("model_providers."));',
  'const promptArgs = (providerArg >= 0 ? argv.slice(0, providerArg) : argv).filter((value) => !["exec", "--json", "-c"].includes(value));',
  'const prompt = promptArgs[promptArgs.length - 1] || "";',
  'console.log(JSON.stringify({ type: "thread.started", thread_id: "e2e-thread" }));',
  'const finish = () => {',
  '  console.log("cli-raw " + prompt);',
  '  console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "reply:" + prompt } }));',
  '  console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }));',
  '};',
  'if (prompt.startsWith("slow:")) setTimeout(finish, 20000); else finish();',
  ""
].join("\n"), "utf8");
const sessions = [{ id: "session-fixture", workspaceId: "workspace-fixture", profileId: "profile-fixture", name: "Fixture session", interactionMode: "terminal" as const, runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" }];
const providers = process.env.SPECOS_E2E_PROVIDER_UI === "1" ? [
  { id: "provider-a", name: "Fixture Provider A", protocol: "openai-compatible", baseUrl: "https://provider-a.invalid/v1", credentialRef: "env:FIXTURE_PROVIDER_A_KEY", models: ["provider-a-model"], enabled: true },
  { id: "provider-b", name: "Fixture Provider B", protocol: "openai-compatible", baseUrl: "https://provider-b.invalid/v1", credentialRef: "env:FIXTURE_PROVIDER_B_KEY", models: ["provider-b-model"], enabled: true }
] : undefined;

if (providers) {
  process.env.FIXTURE_PROVIDER_A_KEY = "fixture-provider-a-token";
  process.env.FIXTURE_PROVIDER_B_KEY = "fixture-provider-b-token";
}

if (process.env.SPECOS_E2E_MODEL_SYNC === "1") {
  const modelSyncHome = path.join(root, "model-sync-home");
  await fs.mkdir(path.join(modelSyncHome, ".codex"), { recursive: true });
  await fs.writeFile(path.join(modelSyncHome, ".codex", "config.toml"), 'model = "fixture-auto-model"\n[profiles.fixture]\nmodel = "fixture-profile-model"\n', "utf8");
  // model-catalog resolves the isolated home through os.homedir(); this keeps
  // the browser proof independent from the developer's real CLI config.
  process.env.HOME = modelSyncHome;
  process.env.USERPROFILE = modelSyncHome;
  sessions.push({ id: "session-model-sync", workspaceId: "workspace-fixture", profileId: "profile-headless", name: "Model sync fixture", interactionMode: "chat", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1050, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" });
}

if (process.env.SPECOS_E2E_PERF === "1") {
  const perfSessions = [
    { id: "session-perf-transcript", name: "Perf transcript 50k", profileId: "profile-headless", interactionMode: "chat" },
    { id: "session-perf-diff", name: "Perf diff 6k", profileId: "profile-fixture", interactionMode: "terminal" },
    { id: "session-perf-chat-c", name: "Perf chat C", profileId: "profile-headless", interactionMode: "chat" },
    { id: "session-perf-chat-d", name: "Perf chat D", profileId: "profile-headless", interactionMode: "chat" }
  ];
  sessions.push(...perfSessions.map(({ id, name, profileId, interactionMode }, index) => ({ id, workspaceId: "workspace-fixture", profileId, name, interactionMode, runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1100 + index, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" })));

  const transcriptPath = path.join(dataDirectory, "transcripts", "session-perf-transcript.jsonl");
  await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
  const transcriptRows = Array.from({ length: 50_000 }, (_, index) => {
    const sequence = index + 1;
    const raw = `perf-event-${sequence}`;
    return JSON.stringify({
      id: `perf-event-${sequence}`,
      sessionId: "session-perf-transcript",
      sequence,
      occurredAt: "2026-01-01T00:00:00.000Z",
      kind: "user_message",
      source: "e2e-performance-fixture",
      raw,
      rawBytes: Buffer.byteLength(raw, "utf8"),
      truncated: false,
      metadata: { turnId: `perf-turn-${sequence}` }
    });
  });
  await fs.writeFile(transcriptPath, `${transcriptRows.join("\n")}\n`, "utf8");

  // Make the Diff surface exercise the production Git inspector and parser rather than a mocked response.
  await fs.rm(path.join(workspacePath, ".git"), { recursive: true, force: true });
  await execFileAsync("git", ["init", "--quiet", "--initial-branch=fixture"], { cwd: workspacePath });
  await execFileAsync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: workspacePath });
  await execFileAsync("git", ["config", "user.name", "SpecOS fixture"], { cwd: workspacePath });
  const largeDiffPath = path.join(workspacePath, "large-diff.txt");
  await fs.writeFile(largeDiffPath, "base\n", "utf8");
  await execFileAsync("git", ["add", "README.md", "large-diff.txt"], { cwd: workspacePath });
  await execFileAsync("git", ["commit", "--quiet", "-m", "fixture baseline"], { cwd: workspacePath });
  await fs.writeFile(largeDiffPath, `${Array.from({ length: 6_001 }, (_, index) => `changed-${index + 1}`).join("\n")}\n`, "utf8");
}

await fs.writeFile(path.join(dataDirectory, "state.json"), JSON.stringify({
  schemaVersion: 2,
  state: {
    workspaces: [{ id: "workspace-fixture", name: "Fixture project", path: workspacePath, createdAt: "2026-01-01T00:00:00Z" }],
    profiles: [
      { id: "profile-fixture", name: "Fixture PTY", command: "/bin/sh", args: [fixtureCliPath], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" },
      { id: "profile-headless", name: "Fixture headless", command: process.execPath, args: [fixtureChatCliPath], adapterId: "codex", adapterVersionRange: ">=1.0.0 <100.0.0", createdAt: "2026-01-01T00:00:00Z" }
    ],
    sessions,
    ...(providers ? { providers } : {})
  }
}), "utf8");
process.env.SPECOS_DATA_DIRECTORY = dataDirectory;
process.env.SPECOS_E2E_PICKER_PATH = workspacePath;

let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  await fs.rm(root, { recursive: true, force: true });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void cleanup().finally(() => process.exit(0)); });
}

await main();
