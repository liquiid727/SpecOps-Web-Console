"use server";

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAllTestPlans } from "@/lib/data";
import type { RunScope, RunSession } from "@/lib/types";

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const runScopeOrder: Exclude<RunScope, "all">[] = [
  "unit",
  "api",
  "scenario",
  "performance",
  "concurrency",
  "gate",
];

function normalizeRunScope(rawValue: string): RunScope {
  if (
    rawValue === "unit" ||
    rawValue === "api" ||
    rawValue === "scenario" ||
    rawValue === "performance" ||
    rawValue === "concurrency" ||
    rawValue === "gate" ||
    rawValue === "all"
  ) {
    return rawValue;
  }

  return "all";
}

async function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve) => {
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      const exitCode =
        error && typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number"
          ? ((error as NodeJS.ErrnoException & { code: number }).code)
          : error
            ? 1
            : 0;
      resolve({ exitCode, stdout, stderr });
    });
  });
}

type TriggerDeps = {
  runRunner?: (command: string, args: string[], cwd: string) => Promise<CommandResult>;
  writeSession?: (session: RunSession, repoRoot: string) => Promise<void>;
  revalidate?: (path: string) => void;
  goTo?: (path: string) => never | void;
  now?: () => Date;
};

function summarize(value: string): string {
  return value.trim().split("\n").slice(0, 12).join("\n");
}

function extractArtifacts(stdout: string): string[] {
  return stdout
    .split(/\s+/)
    .filter((item) => item.includes("/evidence/artifacts/") && item.endsWith(".json"));
}

function extractGateReportPath(stdout: string): string | undefined {
  return stdout
    .split(/\s+/)
    .find((item) => item.includes("/evidence/gates/") && item.endsWith(".json"));
}

function commandForScope(
  scope: Exclude<RunScope, "all">,
  options: { repoRoot: string; specId: string; specVersion: string; changeId?: string },
): { command: string; args: string[]; cwd: string } {
  if (scope === "unit") {
    return { command: "npm", args: ["test"], cwd: options.repoRoot };
  }

  if (scope === "gate") {
    const gateScript = path.join(options.repoRoot, "scripts", "checks", "spec-test-gates.mjs");
    const args = [gateScript, options.specId];
    if (options.changeId) {
      args.push("--change", options.changeId);
    }
    return { command: "node", args, cwd: options.repoRoot };
  }

  const runnerPath = path.join(options.repoRoot, "scripts", "orchestration", "test-runner.mjs");
  return {
    command: "node",
    args: [runnerPath, options.specId, options.specVersion, scope],
    cwd: options.repoRoot,
  };
}

async function writeSessionArtifact(session: RunSession, repoRoot: string): Promise<void> {
  const [requirementSelector, specSelector] = session.specId.split("/");
  if (!requirementSelector || !specSelector) throw new Error(`Invalid GoalSpec child selector: ${session.specId}`);
  const outputPath = path.join(repoRoot, ".requirements", "requirements", requirementSelector, "specs", specSelector, "evidence", "runs", `${session.runId}.session.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

export async function triggerTestRunAction(formData: FormData, deps?: TriggerDeps) {
  const specId = String(formData.get("specId") ?? "").trim();
  const rawVersion = String(formData.get("specVersion") ?? "latest").trim();
  const runScope = normalizeRunScope(String(formData.get("runScope") ?? "all"));

  const plans = await getAllTestPlans();
  const plan = plans.find((item) => item.selector === specId);

  if (!plan) {
    throw new Error(`Unknown specId: ${specId}`);
  }

  const specVersion = rawVersion || plan.specVersion || "latest";
  const repoRoot = path.resolve(process.cwd(), "..");
  const now = deps?.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const sessionRunId = `session-${startedAt.replace(/[:.]/g, "-")}`;
  const scopes: Exclude<RunScope, "all">[] = runScope === "all" ? runScopeOrder : [runScope];
  const commands: RunSession["commands"] = [];

  for (const scope of scopes) {
    const commandSpec = commandForScope(scope, {
      repoRoot,
      specId,
      specVersion,
      changeId: plan.changeId,
    });
    const commandStartedAt = now().toISOString();
    const result = await (deps?.runRunner ?? runCommand)(commandSpec.command, commandSpec.args, commandSpec.cwd);
    const commandEndedAt = now().toISOString();
    commands.push({
      scope,
      command: commandSpec.command,
      args: commandSpec.args,
      cwd: commandSpec.cwd,
      status: result.exitCode === 0 ? "pass" : "blocked",
      exitCode: result.exitCode,
      stdoutSummary: summarize(result.stdout),
      stderrSummary: summarize(result.stderr),
      startedAt: commandStartedAt,
      endedAt: commandEndedAt,
      resultArtifacts: extractArtifacts(result.stdout),
      gateReportPath: extractGateReportPath(result.stdout),
    });
  }

  const endedAt = now().toISOString();
  const blocked = commands.some((command) => command.exitCode !== 0);
  const session: RunSession = {
    runId: sessionRunId,
    specId,
    specVersion,
    changeId: plan.changeId,
    featureName: plan.featureName,
    scope: runScope,
    status: blocked ? "blocked" : "pass",
    exitCode: blocked ? 1 : 0,
    startedAt,
    endedAt,
    stdoutSummary: summarize(commands.map((command) => command.stdoutSummary).filter(Boolean).join("\n")),
    stderrSummary: summarize(commands.map((command) => command.stderrSummary).filter(Boolean).join("\n")),
    commands,
    resultArtifacts: commands.flatMap((command) => command.resultArtifacts),
    gateReportPath: commands.find((command) => command.gateReportPath)?.gateReportPath,
  };

  await (deps?.writeSession ?? writeSessionArtifact)(session, repoRoot);

  (deps?.revalidate ?? revalidatePath)("/");
  (deps?.revalidate ?? revalidatePath)(`/spec/${specId}`);
  (deps?.revalidate ?? revalidatePath)(`/spec/${specId}/gates`);
  return (deps?.goTo ?? redirect)(`/spec/${specId}`);
}
