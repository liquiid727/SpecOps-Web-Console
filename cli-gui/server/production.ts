import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pty from "node-pty";
import type { ApplicationDependencies, Clock, GitInspector, Logger, PtyProcess, PtyRuntime } from "./ports.js";
import type { GitDiffResponse, GitFileStatus, GitStatusResponse } from "../shared/types.js";
import { createJsonStateRepository } from "./store.js";
import { createJsonTranscriptRepository } from "./transcript-store.js";

const clock: Clock = { now: () => new Date().toISOString() };
const execFileAsync = promisify(execFile);

export function createProductionDependencies(options: {
  dataDirectory: string;
  readonly: boolean;
  processEnvironment: Readonly<Record<string, string | undefined>>;
}): ApplicationDependencies {
  return {
    stateRepository: createJsonStateRepository({ dataDirectory: options.dataDirectory, clock }),
    transcriptRepository: createJsonTranscriptRepository({ dataDirectory: options.dataDirectory }),
    ptyRuntime: createNodePtyRuntime(),
    filesystem: {
      stat: (target) => fs.stat(target),
      access: (target) => fs.access(target),
      readFile: (target) => fs.readFile(target),
      realpath: (target) => fs.realpath(target),
      readdir: async (target) => {
        const entries = await fs.readdir(target, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory() || entry.isFile()).map((entry) => ({ name: entry.name, type: entry.isDirectory() ? "directory" as const : "file" as const }));
      }
    },
    gitInspector: createLocalGitInspector(),
    directoryPicker: createMacDirectoryPicker(),
    profileAdapters: { availableAdapterIds: ["generic"] },
    clock,
    idGenerator: { create: (prefix) => `${prefix}-${randomUUID()}` },
    policy: { readonly: options.readonly, processEnvironment: { ...options.processEnvironment } },
    logger: createConsoleLogger()
  };
}

function createLocalGitInspector(): GitInspector {
  async function git(workspacePath: string, args: string[]) {
    return execFileAsync("git", args, { cwd: workspacePath, timeout: 5000, maxBuffer: 1_000_000 });
  }
  return {
    available: true,
    async status(workspacePath): Promise<GitStatusResponse> {
      try {
        const branchResult = await git(workspacePath, ["status", "--porcelain=v1", "--branch", "-z"]);
        const parts = branchResult.stdout.split("\0").filter(Boolean);
        const header = parts.shift() ?? "";
        const branch = header.match(/^## ([^.]+)(?:\.\.\.)?/)?.[1];
        const entries = parts.map(parseStatusEntry).filter((entry): entry is NonNullable<ReturnType<typeof parseStatusEntry>> => Boolean(entry));
        return { repository: true, branch, clean: entries.length === 0, entries, truncated: false };
      } catch {
        return { repository: false, clean: true, entries: [], truncated: false };
      }
    },
    async diff(workspacePath, scope): Promise<GitDiffResponse> {
      try {
        const args = scope === "staged" ? ["diff", "--cached", "--no-ext-diff", "--unified=80"] : ["diff", "--no-ext-diff", "--unified=80"];
        const result = await git(workspacePath, args);
        return parseDiff(scope, result.stdout);
      } catch {
        return { scope, files: [], truncated: false, originalBytes: 0, shownLines: 0 };
      }
    }
  };
}

function parseStatusEntry(raw: string) {
  if (raw.length < 4) return undefined;
  const staged = statusCode(raw[0]);
  const unstaged = statusCode(raw[1]);
  const filePath = raw.slice(3);
  return { path: filePath, staged, unstaged, conflicted: raw[0] === "U" || raw[1] === "U" };
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

function parseDiff(scope: "unstaged" | "staged", text: string): GitDiffResponse {
  const lines = text.split("\n");
  const files: GitDiffResponse["files"] = [];
  let current: GitDiffResponse["files"][number] | undefined;
  let hunk: GitDiffResponse["files"][number]["hunks"][number] | undefined;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      current = { status: "modified", hunks: [] };
      files.push(current);
      hunk = undefined;
    } else if (current && line.startsWith("--- ")) {
      current.oldPath = cleanDiffPath(line.slice(4));
    } else if (current && line.startsWith("+++ ")) {
      current.newPath = cleanDiffPath(line.slice(4));
    } else if (current && line.startsWith("@@")) {
      hunk = { header: line, lines: [] };
      current.hunks.push(hunk);
    } else if (hunk) {
      hunk.lines.push({ kind: line.startsWith("+") ? "addition" : line.startsWith("-") ? "deletion" : line.startsWith("\\") ? "meta" : "context", text: line });
    }
  }
  const shownLines = files.reduce((sum, file) => sum + file.hunks.reduce((inner, item) => inner + item.lines.length, 0), 0);
  return { scope, files, truncated: false, originalBytes: Buffer.byteLength(text), shownLines };
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
        const { stdout } = await execFileAsync("/usr/bin/osascript", ["-e", script], { timeout: 120_000 });
        const selected = stdout.trim();
        return selected ? { cancelled: false as const, path: selected } : { cancelled: true as const };
      } catch {
        return { cancelled: true as const };
      }
    }
  };
}

function createNodePtyRuntime(): PtyRuntime {
  const active = new Set<pty.IPty>();
  return {
    spawn(options): PtyProcess {
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

function createConsoleLogger(): Logger {
  return {
    info: (message, context) => console.log(message, context ?? ""),
    warn: (message, context) => console.warn(message, context ?? ""),
    error: (message, context) => console.error(message, context ?? "")
  };
}
