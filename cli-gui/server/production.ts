import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn as spawnChild } from "node:child_process";
import { promisify } from "node:util";
import pty from "node-pty";
import { GitInspectorError, type ApplicationDependencies, type Clock, type GitInspector, type Logger, type PtyProcess, type PtyRuntime } from "./ports.js";
import type { GitDiffResponse, GitFileStatus, GitStatusResponse } from "../shared/types.js";
import { createJsonStateRepository } from "./store.js";
import { createJsonExecutionRepository } from "./execution-store.js";
import { createJsonTranscriptRepository } from "./transcript-store.js";
import { createProfileAdapterRegistry } from "./profile-adapters.js";
import { createCodexMcpRuntime } from "./codex-mcp-runtime.js";
import { createAgentBackendRegistry, createProfileAdapterTurnExecutor } from "./agent-backends.js";
import { createCompositeSecretStore, createEnvironmentSecretStore, createMacKeychainSecretStore } from "./secret-store.js";

const clock: Clock = { now: () => new Date().toISOString() };
const execFileAsync = promisify(execFile);

export function createProductionDependencies(options: {
  dataDirectory: string;
  readonly: boolean;
  processEnvironment: Readonly<Record<string, string | undefined>>;
}): ApplicationDependencies {
  const logger = createConsoleLogger();
  const profileAdapters = createProfileAdapterRegistry({ logger });
  const persistentChatRuntime = createCodexMcpRuntime({ logger });
  return {
    stateRepository: createJsonStateRepository({ dataDirectory: options.dataDirectory, clock, readonly: options.readonly }),
    transcriptRepository: createJsonTranscriptRepository({ dataDirectory: options.dataDirectory, readonly: options.readonly }),
    executionRepository: createJsonExecutionRepository({ dataDirectory: options.dataDirectory, clock, readonly: options.readonly }),
    ptyRuntime: createNodePtyRuntime(),
    filesystem: {
      stat: (target) => fs.stat(target),
      access: (target) => fs.access(target),
      readFile: (target) => fs.readFile(target),
      realpath: (target) => fs.realpath(target),
      readdir: async (target) => {
        const entries = await fs.readdir(target, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory() || entry.isFile() || entry.isSymbolicLink()).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" as const : "file" as const, isSymlink: entry.isSymbolicLink() }));
      },
      readFileBounded: async (target, maxBytes) => {
        const handle = await fs.open(target, "r");
        try {
          const stat = await handle.stat();
          const buffer = Buffer.alloc(Math.min(maxBytes + 1, Math.max(0, stat.size)));
          let bytesRead = 0;
          if (buffer.length) ({ bytesRead } = await handle.read(buffer, 0, buffer.length, 0));
          return { buffer: buffer.subarray(0, bytesRead), size: stat.size };
        } finally {
          await handle.close();
        }
      }
    },
    gitInspector: createLocalGitInspector(),
    directoryPicker: createConfiguredDirectoryPicker(options.processEnvironment) ?? createMacDirectoryPicker(),
    profileAdapters,
    // codex chat 常驻运行时（streaming-spec §3.3）：不可用时 orchestrator 自动回落 spawn 冷路径
    persistentChatRuntime,
    agentBackends: createAgentBackendRegistry(profileAdapters, createProfileAdapterTurnExecutor({
      processEnvironment: options.processEnvironment,
      persistentChatRuntime,
      logger
    })),
    secretStore: createCompositeSecretStore(createEnvironmentSecretStore(options.processEnvironment), createMacKeychainSecretStore()),
    clock,
    idGenerator: { create: (prefix) => `${prefix}-${randomUUID()}` },
    policy: { readonly: options.readonly, processEnvironment: { ...options.processEnvironment }, csrfCapability: options.processEnvironment.SPECOS_CSRF_CAPABILITY ?? randomBytes(24).toString("base64url") },
    logger
  };
}

function createLocalGitInspector(): GitInspector {
  async function git(workspacePath: string, args: string[], maxBuffer = 2_100_000) {
    return execFileAsync("git", args, {
      cwd: workspacePath,
      timeout: 2_000,
      maxBuffer,
      shell: false,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C", LANG: "C" }
    });
  }
  return {
    available: true,
    async status(workspacePath): Promise<GitStatusResponse> {
      try {
        const branchResult = await git(workspacePath, ["status", "--porcelain=v2", "--branch", "-z"], 1_050_000);
        return parseStatusV2(branchResult.stdout);
      } catch (error) {
        if (isNotRepository(error)) return { repository: false, clean: true, entries: [], truncated: false };
        if (isOutputLimit(error)) {
          const partial = childOutput(error);
          if (partial) return parseStatusV2(partial, true);
        }
        throw toGitInspectorError(error);
      }
    },
    async diff(workspacePath, scope): Promise<GitDiffResponse> {
      try {
        const args = scope === "staged" ? ["diff", "--cached", "--no-ext-diff", "--no-color", "--binary", "--unified=80"] : ["diff", "--no-ext-diff", "--no-color", "--binary", "--unified=80"];
        const result = await git(workspacePath, args, 2_100_000);
        return parseDiff(scope, result.stdout, false);
      } catch (error) {
        if (isNotRepository(error)) throw new GitInspectorError("NOT_A_GIT_REPOSITORY", "Workspace is not a Git repository.", { cause: error instanceof Error ? error : undefined });
        if (isOutputLimit(error)) {
          const partial = childOutput(error);
          if (partial) return parseDiff(scope, partial, true);
        }
        throw toGitInspectorError(error);
      }
    },
    async listVisibleFiles(workspacePath) {
      const result = await git(workspacePath, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], 2_000_000);
      return result.stdout.split("\0").filter(Boolean).filter((filePath) => !filePath.split("/").includes(".git"));
    }
  };
}

function parseStatusV2(text: string, truncated = false): GitStatusResponse {
  const entries: GitStatusResponse["entries"] = [];
  let branch: string | undefined;
  let detachedHead: string | undefined;
  let upstream: string | undefined;
  let ahead: number | undefined;
  let behind: number | undefined;
  const parts = text.split("\0").filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    const raw = parts[index];
    if (raw.startsWith("# branch.head ")) {
      const value = raw.slice("# branch.head ".length);
      if (value === "(detached)") detachedHead = undefined;
      else branch = value;
      continue;
    }
    if (raw.startsWith("# branch.oid ")) {
      const value = raw.slice("# branch.oid ".length);
      if (value !== "(initial)") detachedHead = value;
      continue;
    }
    if (raw.startsWith("# branch.upstream ")) {
      upstream = raw.slice("# branch.upstream ".length);
      continue;
    }
    if (raw.startsWith("# branch.ab ")) {
      const match = raw.match(/\+(-?\d+) -(-?\d+)/);
      if (match) {
        ahead = Number(match[1]);
        behind = Number(match[2]);
      }
      continue;
    }
    const type = raw[0];
    if (type === "?" || type === "!") {
      entries.push({ path: raw.slice(2), staged: "unmodified", unstaged: type === "?" ? "untracked" : "ignored", conflicted: false });
      continue;
    }
    if (type === "1" || type === "u" || type === "2") {
      const tab = raw.indexOf("\t");
      const fields = (tab >= 0 ? raw.slice(0, tab) : raw).split(" ");
      const xy = fields[1] ?? "..";
      const filePath = tab >= 0 ? raw.slice(tab + 1) : fields.at(-1) ?? "";
      const previousPath = type === "2" && index + 1 < parts.length ? parts[++index] : undefined;
      entries.push({ path: filePath, previousPath, staged: statusCode(xy[0]), unstaged: statusCode(xy[1]), conflicted: type === "u" || xy.includes("U") });
    }
  }
  return { repository: true, branch, detachedHead, upstream, ahead, behind, clean: entries.length === 0, entries: entries.slice(0, 10_000), truncated: truncated || entries.length > 10_000 };
}

function statusCode(code: string): GitFileStatus {
  if (code === "A") return "added";
  if (code === "D") return "deleted";
  if (code === "M") return "modified";
  if (code === "R") return "renamed";
  if (code === "C") return "copied";
  if (code === "?") return "untracked";
  if (code === "!") return "ignored";
  if (code === "U") return "conflicted";
  return "unmodified";
}

function parseDiff(scope: "unstaged" | "staged", text: string, truncated: boolean): GitDiffResponse {
  const lines = text.split("\n");
  const files: GitDiffResponse["files"] = [];
  let current: GitDiffResponse["files"][number] | undefined;
  let hunk: GitDiffResponse["files"][number]["hunks"][number] | undefined;
  let oldLine = 0;
  let newLine = 0;
  let shownLines = 0;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      current = { status: "modified", hunks: [] };
      files.push(current);
      hunk = undefined;
    } else if (line.startsWith("diff --cc ")) {
      const conflictedPath = line.slice("diff --cc ".length).trim();
      current = { status: "conflicted", oldPath: conflictedPath, newPath: conflictedPath, hunks: [] };
      files.push(current);
      hunk = undefined;
    } else if (current && line.startsWith("new file mode ")) {
      current.status = "added";
    } else if (current && line.startsWith("deleted file mode ")) {
      current.status = "deleted";
    } else if (current && (line.startsWith("similarity index ") || line.startsWith("rename from ") || line.startsWith("rename to "))) {
      current.status = "renamed";
      if (line.startsWith("rename from ")) current.oldPath = line.slice("rename from ".length);
      if (line.startsWith("rename to ")) current.newPath = line.slice("rename to ".length);
    } else if (current && (line.startsWith("Binary files ") || line.startsWith("GIT binary patch"))) {
      current.status = "binary";
    } else if (current && line.startsWith("--- ")) {
      current.oldPath = cleanDiffPath(line.slice(4));
    } else if (current && line.startsWith("+++ ")) {
      current.newPath = cleanDiffPath(line.slice(4));
    } else if (current && line.startsWith("@@")) {
      hunk = { header: line, lines: [] };
      current.hunks.push(hunk);
      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (!match) throw new GitInspectorError("GIT_UNAVAILABLE", "Git returned an invalid diff hunk.");
      oldLine = Number(match?.[1] ?? 0);
      newLine = Number(match?.[2] ?? 0);
    } else if (hunk) {
      if (shownLines >= 10_000) continue;
      const kind = line.startsWith("+") ? "addition" : line.startsWith("-") ? "deletion" : line.startsWith("\\") ? "meta" : "context";
      hunk.lines.push({ kind, text: line, oldLine: kind === "addition" ? undefined : oldLine, newLine: kind === "deletion" ? undefined : newLine });
      shownLines += 1;
      if (kind !== "addition" && kind !== "meta") oldLine += 1;
      if (kind !== "deletion" && kind !== "meta") newLine += 1;
    }
  }
  return { scope, files: files.slice(0, 10_000), truncated: truncated || shownLines >= 10_000, originalBytes: Buffer.byteLength(text), shownLines };
}

function toGitInspectorError(error: unknown) {
  if (error instanceof GitInspectorError) return error;
  if (isTimeout(error)) return new GitInspectorError("GIT_TIMEOUT", "Git inspection timed out.", { cause: error instanceof Error ? error : undefined });
  return new GitInspectorError("GIT_UNAVAILABLE", "Git inspection is unavailable.", { cause: error instanceof Error ? error : undefined });
}

function isNotRepository(error: unknown) {
  const candidate = error as { stderr?: unknown; code?: unknown };
  return (candidate.code === 128 || candidate.code === 129 || candidate.code === "128" || candidate.code === "129") && typeof candidate.stderr === "string" && /not a git repository/i.test(candidate.stderr);
}

function isTimeout(error: unknown) {
  const candidate = error as { code?: unknown; killed?: unknown; signal?: unknown };
  return candidate.code === "ETIMEDOUT" || candidate.killed === true || candidate.signal === "SIGTERM";
}

function isOutputLimit(error: unknown) {
  return (error as { code?: unknown }).code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
}

function childOutput(error: unknown) {
  const stdout = (error as { stdout?: unknown }).stdout;
  return typeof stdout === "string" ? stdout : "";
}

function cleanDiffPath(value: string) {
  if (value === "/dev/null") return undefined;
  return value.replace(/^[ab]\//, "");
}

function createMacDirectoryPicker() {
  return {
    available: process.platform === "darwin",
    async pick() {
      if (process.platform !== "darwin") return { cancelled: true as const };
      try {
        const script = "POSIX path of (choose folder with prompt \"Open workspace folder\")";
        const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 60_000, shell: false, maxBuffer: 32 * 1024, windowsHide: true });
        const selected = stdout.trim();
        return selected ? { cancelled: false as const, path: selected } : { cancelled: true as const };
      } catch {
        return { cancelled: true as const };
      }
    }
  };
}

function createConfiguredDirectoryPicker(environment: Readonly<Record<string, string | undefined>>) {
  const configuredPath = environment.SPECOS_E2E_PICKER_PATH;
  if (!configuredPath) return undefined;
  return {
    available: true,
    async pick() { return { cancelled: false as const, path: configuredPath }; }
  };
}

function createNodePtyRuntime(): PtyRuntime {
  const active = new Set<PtyProcess>();
  return {
    spawn(options): PtyProcess {
      try {
        const process = pty.spawn(options.command, options.args, {
          name: options.name,
          cols: options.cols,
          rows: options.rows,
          cwd: options.cwd,
          env: options.env
        });
        active.add(process);
        process.onExit(() => active.delete(process));
        return process;
      } catch (error) {
        const process = createPipeBackedProcess(options);
        active.add(process);
        process.onExit(() => active.delete(process));
        console.warn("node-pty spawn failed; falling back to pipe-backed process.", error);
        return process;
      }
    },
    async shutdown() {
      const processes = [...active];
      const failures: unknown[] = [];
      for (const process of processes) {
        try {
          process.kill();
          active.delete(process);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) throw new AggregateError(failures, "Failed to stop active PTYs");
    }
  };
}

function createPipeBackedProcess(options: Parameters<PtyRuntime["spawn"]>[0]): PtyProcess {
  const child = spawnChild(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"]
  });
  return {
    write(data) {
      if (child.stdin.writable) child.stdin.write(data);
    },
    resize() {
      // Pipe-backed fallback has no terminal dimensions.
    },
    kill() {
      child.kill();
    },
    onData(listener) {
      child.stdout.on("data", (data) => listener(data.toString()));
      child.stderr.on("data", (data) => listener(data.toString()));
    },
    onExit(listener) {
      child.on("exit", (code) => listener({ exitCode: code ?? 1 }));
    }
  };
}

function createConsoleLogger(): Logger {
  return {
    info: (message, context) => console.log(message, context ?? ""),
    warn: (message, context) => console.warn(message, context ?? ""),
    error: (message, context) => console.error(message, context ?? "")
  };
}
