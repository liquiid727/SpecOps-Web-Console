import { open, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { isClaudeFamily } from "./profile-adapters.js";

/**
 * terminal 模式原生 resume 的 token 归因捕获（best-effort）：
 * PTY 输出拿不到 thread id，改为在会话退出后扫描 CLI 本地会话目录，
 * 用「mtime ≥ 本次 spawn 时刻 + cwd 等于工作区路径」归因出本次运行产生的 CLI 会话。
 * 任何异常（目录不存在、格式变化、权限问题）一律静默返回 undefined，降级为下次全新启动。
 */
export interface TerminalResumeDiscoveryInput {
  adapterId: string;
  /** 工作区绝对路径（归因条件之一）。 */
  cwd: string;
  /** 本次 spawn 时刻（毫秒）；早于该时刻的会话文件不参与归因。 */
  sinceMs: number;
  env?: Readonly<Record<string, string | undefined>>;
  /** 测试注入的 home 目录；缺省 os.homedir()。 */
  homeDir?: string;
}

/** 每次归因最多读取的候选文件数（按 mtime 新→旧）。 */
const MAX_CANDIDATES = 20;
/** 读取 rollout 首行 session meta 的最大字节数。 */
const META_READ_BYTES = 16 * 1024;

export async function discoverTerminalResumeToken(input: TerminalResumeDiscoveryInput): Promise<string | undefined> {
  try {
    const home = input.homeDir ?? homedir();
    if (input.adapterId === "codex") return await discoverCodexToken(input, home);
    if (isClaudeFamily(input.adapterId)) return await discoverClaudeToken(input, home);
    return undefined;
  } catch {
    return undefined;
  }
}

/** codex：$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl，首行 session_meta 含 session_id 与 cwd。 */
async function discoverCodexToken(input: TerminalResumeDiscoveryInput, home: string): Promise<string | undefined> {
  const root = input.env?.CODEX_HOME || join(home, ".codex");
  const files = await collectFilesRecursive(join(root, "sessions"), (name) => name.startsWith("rollout-") && name.endsWith(".jsonl"));
  const candidates = await newestSince(files, input.sinceMs);
  for (const file of candidates) {
    const meta = await readSessionMeta(file);
    if (!meta || meta.cwd !== input.cwd) continue;
    if (meta.sessionId) return meta.sessionId;
    // 回退：文件名内嵌 uuid（rollout-<timestamp>-<uuid>.jsonl）
    const match = basename(file).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
    if (match) return match[1];
  }
  return undefined;
}

/** claude 家族：~/.claude/projects/<slug(cwd)>/<session-id>.jsonl，文件名即 session id。 */
async function discoverClaudeToken(input: TerminalResumeDiscoveryInput, home: string): Promise<string | undefined> {
  const dir = join(home, ".claude", "projects", slugifyProjectPath(input.cwd));
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl")).map((entry) => join(dir, entry.name));
  const candidates = await newestSince(files, input.sinceMs);
  const newest = candidates[0];
  return newest ? basename(newest, ".jsonl") : undefined;
}

/** Claude Code 的项目目录命名：路径中非字母数字字符替换为 `-`。 */
export function slugifyProjectPath(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

async function collectFilesRecursive(dir: string, matches: (name: string) => boolean, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFilesRecursive(full, matches, depth + 1)));
    else if (entry.isFile() && matches(entry.name)) files.push(full);
  }
  return files;
}

/** mtime ≥ sinceMs 的文件按 mtime 新→旧排序，截断到候选上限。 */
async function newestSince(files: string[], sinceMs: number): Promise<string[]> {
  const stamped: Array<{ file: string; mtimeMs: number }> = [];
  for (const file of files) {
    try {
      const info = await stat(file);
      if (info.mtimeMs >= sinceMs) stamped.push({ file, mtimeMs: info.mtimeMs });
    } catch {
      // 扫描期间文件被清理：跳过
    }
  }
  return stamped.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, MAX_CANDIDATES).map((item) => item.file);
}

async function readSessionMeta(file: string): Promise<{ sessionId?: string; cwd?: string } | undefined> {
  let handle;
  try {
    handle = await open(file, "r");
    const buffer = Buffer.alloc(META_READ_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, META_READ_BYTES, 0);
    const firstLine = buffer.subarray(0, bytesRead).toString("utf8").split("\n", 1)[0];
    const parsed = JSON.parse(firstLine) as { type?: string; payload?: { session_id?: string; id?: string; cwd?: string } };
    if (parsed.type !== "session_meta" || !parsed.payload) return undefined;
    return { sessionId: parsed.payload.session_id ?? parsed.payload.id, cwd: parsed.payload.cwd };
  } catch {
    return undefined;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}
