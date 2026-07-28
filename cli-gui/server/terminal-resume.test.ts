// @vitest-environment node
import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverTerminalResumeToken, slugifyProjectPath } from "./terminal-resume.js";

let home: string;
const cwd = "/tmp/demo workspace";

async function writeWithMtime(file: string, content: string, mtimeMs: number) {
  await writeFile(file, content, "utf8");
  await utimes(file, new Date(mtimeMs), new Date(mtimeMs));
}

function codexRollout(sessionId: string, sessionCwd: string) {
  return JSON.stringify({ timestamp: "2026-07-28T00:00:00Z", type: "session_meta", payload: { session_id: sessionId, id: sessionId, cwd: sessionCwd } }) + "\n";
}

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "terminal-resume-"));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

describe("discoverTerminalResumeToken (codex)", () => {
  it("attributes the newest rollout by mtime window and cwd, ignoring other workspaces", async () => {
    const day = join(home, ".codex", "sessions", "2026", "07", "28");
    await mkdir(day, { recursive: true });
    // 窗口前的旧会话：不参与归因
    await writeWithMtime(join(day, "rollout-old.jsonl"), codexRollout("token-old", cwd), 1_000);
    // 窗口内但 cwd 属于其他工作区：跳过
    await writeWithMtime(join(day, "rollout-other.jsonl"), codexRollout("token-other", "/elsewhere"), 9_000);
    // 窗口内、cwd 匹配的两个候选：取 mtime 最新
    await writeWithMtime(join(day, "rollout-a.jsonl"), codexRollout("token-a", cwd), 6_000);
    await writeWithMtime(join(day, "rollout-b.jsonl"), codexRollout("token-b", cwd), 8_000);
    const token = await discoverTerminalResumeToken({ adapterId: "codex", cwd, sinceMs: 5_000, homeDir: home });
    expect(token).toBe("token-b");
  });

  it("falls back to the uuid embedded in the filename when meta lacks a session id", async () => {
    const day = join(home, ".codex", "sessions", "2026", "07", "28");
    await mkdir(day, { recursive: true });
    const meta = JSON.stringify({ type: "session_meta", payload: { cwd } }) + "\n";
    await writeWithMtime(join(day, "rollout-2026-07-28T00-00-00-019fa450-086b-7dc2-91f9-55a58260b90d.jsonl"), meta, 8_000);
    const token = await discoverTerminalResumeToken({ adapterId: "codex", cwd, sinceMs: 5_000, homeDir: home });
    expect(token).toBe("019fa450-086b-7dc2-91f9-55a58260b90d");
  });

  it("honors CODEX_HOME and stays silent when nothing matches", async () => {
    const custom = join(home, "custom-codex-home");
    const day = join(custom, "sessions", "2026", "07", "28");
    await mkdir(day, { recursive: true });
    await writeWithMtime(join(day, "rollout-x.jsonl"), codexRollout("token-x", cwd), 8_000);
    expect(await discoverTerminalResumeToken({ adapterId: "codex", cwd, sinceMs: 5_000, homeDir: home, env: { CODEX_HOME: custom } })).toBe("token-x");
    // 目录不存在 / 无匹配：静默 undefined
    expect(await discoverTerminalResumeToken({ adapterId: "codex", cwd: "/no/match", sinceMs: 5_000, homeDir: home })).toBeUndefined();
    expect(await discoverTerminalResumeToken({ adapterId: "codex", cwd, sinceMs: 5_000, homeDir: join(home, "missing") })).toBeUndefined();
  });

  it("skips corrupt first lines without failing", async () => {
    const day = join(home, ".codex", "sessions", "2026", "07", "28");
    await mkdir(day, { recursive: true });
    await writeWithMtime(join(day, "rollout-broken.jsonl"), "not json\n", 9_000);
    await writeWithMtime(join(day, "rollout-good.jsonl"), codexRollout("token-good", cwd), 7_000);
    expect(await discoverTerminalResumeToken({ adapterId: "codex", cwd, sinceMs: 5_000, homeDir: home })).toBe("token-good");
  });
});

describe("discoverTerminalResumeToken (claude family)", () => {
  it("returns the newest project session filename within the window for all family adapters", async () => {
    const dir = join(home, ".claude", "projects", slugifyProjectPath(cwd));
    await mkdir(dir, { recursive: true });
    await writeWithMtime(join(dir, "aaaa-old.jsonl"), "{}\n", 1_000);
    await writeWithMtime(join(dir, "bbbb-mid.jsonl"), "{}\n", 6_000);
    await writeWithMtime(join(dir, "cccc-new.jsonl"), "{}\n", 8_000);
    for (const adapterId of ["claude-code", "kimi", "glm"]) {
      expect(await discoverTerminalResumeToken({ adapterId, cwd, sinceMs: 5_000, homeDir: home })).toBe("cccc-new");
    }
  });

  it("stays silent when the project directory is missing and rejects unknown adapters", async () => {
    expect(await discoverTerminalResumeToken({ adapterId: "claude-code", cwd: "/never/seen", sinceMs: 0, homeDir: home })).toBeUndefined();
    expect(await discoverTerminalResumeToken({ adapterId: "generic", cwd, sinceMs: 0, homeDir: home })).toBeUndefined();
  });
});

describe("slugifyProjectPath", () => {
  it("replaces every non-alphanumeric character with a dash (claude project naming)", () => {
    expect(slugifyProjectPath("/Users/dev/code/my app")).toBe("-Users-dev-code-my-app");
  });
});
