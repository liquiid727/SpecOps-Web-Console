#!/usr/bin/env node

import { exec as execCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  buildBlockedApiScenarioResult,
  buildBrunoCollectionAssets,
  buildDeterministicTestPlan,
  buildExecutedApiScenarioResult,
  buildRequestRoute,
  buildSpecChangeTestSchedule,
  buildTestGateReport,
  copyTemplateDirectory,
  validateBundle,
  validateManifest,
  validateSpec,
  validateScenarioResult,
  validateTestPlan,
  validateTestSchedule,
  validateWorkflow,
  type SpecosBundleManifest,
  type SpecosManifest,
  type ScenarioResult,
  type SpecosSpec,
  type SpecosTestPlan,
  type SpecosTestSchedule,
  type SpecosWorkflow,
} from "@specos/core";
import { parse, stringify } from "yaml";

export interface RunCliOptions {
  cwd: string;
}

export interface RunCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

type ManifestRecord = Record<string, unknown>;
interface InitOptions {
  template: string;
}

interface CliContext {
  cwd: string;
}

interface TemplateDefinition {
  name: string;
  relativePath: string;
}

const templates: TemplateDefinition[] = [
  { name: "fullstack", relativePath: "../templates/fullstack" },
  { name: "lens-fitting", relativePath: "../templates/lens-fitting" },
  { name: "spec-only", relativePath: "../templates/spec-only" },
];
const templateNames = templates.map((template) => template.name).join(", ");
const exec = promisify(execCallback);
const supportedCommands = "Supported commands: init, check, route-request, classify-request, intake, create-change, review-change, run-change, test-change, promote-change, export-agent-kit, validate-bundle, install-bundle, list-workflows, run-workflow, generate-test-plan, generate-bruno-tests, run-api-tests, run-performance-tests, run-concurrency-tests, validate-test-gates";
const commandHelp = `${supportedCommands}\nTemplates: ${templateNames}`;
const agentKitBundleId = "specos-agent-team-kit";
const agentKitWorkflowId = "spec-driven-default";

interface AgentKitSource {
  source: string;
  target: string;
  exclude?: (relativePath: string) => boolean;
}

interface ExportAgentKitOptions {
  outDir: string;
}

type ReviewStage = "design-gate" | "implementation";
type ReviewDecision = "approved" | "changes-requested" | "blocked";
type ExecutionResult = "planned" | "implemented";
type TestDecision = "passed" | "failed" | "blocked";

interface IntakeOptions {
  id: string;
  request: string;
}

interface RouteRequestOptions {
  request: string;
}

interface CreateChangeOptions {
  draftId: string;
  changeId: string;
}

interface ReviewChangeOptions {
  changeId: string;
  stage: ReviewStage;
  decision: ReviewDecision;
}

interface RunChangeOptions {
  changeId: string;
  result: ExecutionResult;
}

interface TestChangeOptions {
  changeId: string;
  decision: TestDecision;
}

interface PromoteChangeOptions {
  changeId: string;
  accept: boolean;
}

interface ChangeWorkflowState {
  changeId: string;
  draftId: string;
  status: string;
  gates: {
    draftConfirmed: boolean;
    architectureReviewed: boolean;
    designReviewed: boolean;
    executionHandoffReady: boolean;
    implementationDone: boolean;
    implementationReviewed: boolean;
    independentTestsPassed: boolean;
    promoted: boolean;
    archived: boolean;
  };
  decisions: {
    designGate?: ReviewDecision;
    implementationReview?: ReviewDecision;
    test?: TestDecision;
  };
  artifacts: string[];
  updatedAt: string;
}

const agentKitSources: AgentKitSource[] = [
  { source: "AGENTS.md", target: "AGENTS.md" },
  { source: ".agents", target: ".agents" },
  { source: "ai/agents", target: "ai/agents" },
  { source: "ai/workflows", target: "ai/workflows" },
  { source: ".rules", target: ".rules" },
  { source: "rules", target: "rules" },
  { source: ".codex/instructions.md", target: ".codex/instructions.md" },
  { source: ".skills/ui-design-handoff/SKILL.md", target: ".codex/skills/specos-ui-design/SKILL.md" },
  { source: ".skills", target: ".skills" },
  { source: "spec-draft", target: "spec-draft" },
  { source: "specs", target: "specs" },
  {
    source: "tests",
    target: "tests",
    exclude: (relativePath) => relativePath.startsWith("results/") && relativePath.endsWith(".json"),
  },
  { source: "scripts/README.md", target: "scripts/README.md" },
  { source: "scripts/orchestration/README.md", target: "scripts/orchestration/README.md" },
  { source: "scripts/checks/README.md", target: "scripts/checks/README.md" },
  { source: ".specos/manifest.yaml", target: ".specos/manifest.yaml" },
];

const agentKitInstalls: SpecosBundleManifest["installs"] = [
  { target: "AGENTS.md", from: "files/AGENTS.md" },
  { target: ".agents/", from: "files/.agents/" },
  { target: "ai/agents/", from: "files/ai/agents/" },
  { target: "ai/workflows/", from: "files/ai/workflows/" },
  { target: ".rules/", from: "files/.rules/" },
  { target: "rules/", from: "files/rules/" },
  { target: ".codex/instructions.md", from: "files/.codex/instructions.md" },
  { target: ".codex/skills/", from: "files/.codex/skills/" },
  { target: ".skills/", from: "files/.skills/" },
  { target: "spec-draft/", from: "files/spec-draft/" },
  { target: "specs/", from: "files/specs/" },
  { target: "tests/", from: "files/tests/" },
  { target: "scripts/README.md", from: "files/scripts/README.md" },
  { target: "scripts/orchestration/README.md", from: "files/scripts/orchestration/README.md" },
  { target: "scripts/checks/README.md", from: "files/scripts/checks/README.md" },
  { target: ".specos/manifest.yaml", from: "files/.specos/manifest.yaml" },
  { target: ".specos/workflows/", from: "files/.specos/workflows/" },
];

export async function runCli(args: string[], options: RunCliOptions): Promise<RunCliResult> {
  const [command] = args;
  const context: CliContext = { cwd: options.cwd };

  if (command === "init") {
    const parsedInit = parseInitArgs(args.slice(1));
    if (!parsedInit.ok) {
      return parsedInit.error;
    }
    return initProject(context, parsedInit.value);
  }

  if (command === "check") {
    return checkProject(options.cwd);
  }

  if (command === "route-request" || command === "classify-request") {
    const parsedRoute = parseRouteRequestArgs(args.slice(1));
    if (!parsedRoute.ok) {
      return parsedRoute.error;
    }
    return routeRequestCommand(parsedRoute.value);
  }

  if (command === "intake") {
    const parsedIntake = parseIntakeArgs(args.slice(1));
    if (!parsedIntake.ok) {
      return parsedIntake.error;
    }
    return intakeCommand(context.cwd, parsedIntake.value);
  }

  if (command === "create-change") {
    const parsedCreate = parseCreateChangeArgs(args.slice(1));
    if (!parsedCreate.ok) {
      return parsedCreate.error;
    }
    return createChangeCommand(context.cwd, parsedCreate.value);
  }

  if (command === "review-change") {
    const parsedReview = parseReviewChangeArgs(args.slice(1));
    if (!parsedReview.ok) {
      return parsedReview.error;
    }
    return reviewChangeCommand(context.cwd, parsedReview.value);
  }

  if (command === "run-change") {
    const parsedRun = parseRunChangeArgs(args.slice(1));
    if (!parsedRun.ok) {
      return parsedRun.error;
    }
    return runChangeCommand(context.cwd, parsedRun.value);
  }

  if (command === "test-change") {
    const parsedTest = parseTestChangeArgs(args.slice(1));
    if (!parsedTest.ok) {
      return parsedTest.error;
    }
    return testChangeCommand(context.cwd, parsedTest.value);
  }

  if (command === "promote-change") {
    const parsedPromote = parsePromoteChangeArgs(args.slice(1));
    if (!parsedPromote.ok) {
      return parsedPromote.error;
    }
    return promoteChangeCommand(context.cwd, parsedPromote.value);
  }

  if (command === "export-agent-kit") {
    const parsedExport = parseExportAgentKitArgs(args.slice(1), context.cwd);
    if (!parsedExport.ok) {
      return parsedExport.error;
    }
    return exportAgentKitCommand(context.cwd, parsedExport.value);
  }

  if (command === "validate-bundle") {
    return validateBundleCommand(context.cwd, args[1]);
  }

  if (command === "install-bundle") {
    return installBundleCommand(context.cwd, args[1]);
  }

  if (command === "list-workflows") {
    return listWorkflowsCommand(context.cwd);
  }

  if (command === "run-workflow") {
    return runWorkflowCommand(context.cwd, args[1]);
  }

  if (command === "generate-test-plan") {
    return generateTestPlanCommand(context.cwd, args.slice(1));
  }

  if (command === "run-api-tests") {
    return runApiTestsCommand(context.cwd, args.slice(1));
  }

  if (command === "generate-bruno-tests") {
    return generateBrunoTestsCommand(context.cwd, args.slice(1));
  }

  if (command === "validate-test-gates") {
    return validateTestGatesCommand(context.cwd, args.slice(1));
  }

  if (command === "run-performance-tests") {
    return runAdapterTestsCommand(context.cwd, args.slice(1), "performance");
  }

  if (command === "run-concurrency-tests") {
    return runAdapterTestsCommand(context.cwd, args.slice(1), "concurrency");
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: `SPECOS_COMMAND_UNKNOWN Unknown command: ${command ?? ""}\n${commandHelp}\n`,
  };
}

async function initProject(context: CliContext, options: InitOptions): Promise<RunCliResult> {
  const template = resolveTemplate(options.template);
  if (!template) {
    return failure("SPECOS_TEMPLATE_UNKNOWN", `Unknown template: ${options.template}\nAvailable templates: ${templateNames}`);
  }

  const templateDir = resolve(dirname(fileURLToPath(import.meta.url)), template.relativePath);
  const result = await copyTemplateDirectory(templateDir, context.cwd);

  await mkdir(join(context.cwd, "tests/results"), { recursive: true });

  const lines = [
    "SPECOS_INIT_OK",
    `template ${template.name}`,
    `written ${result.written.length}`,
    `skipped ${result.skipped.length}`,
  ];

  return {
    exitCode: 0,
    stdout: `${lines.join("\n")}\n`,
    stderr: "",
  };
}

async function checkProject(cwd: string): Promise<RunCliResult> {
  const manifestPath = join(cwd, ".specos/manifest.yaml");

  if (!(await pathExists(manifestPath))) {
    return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  }

  const manifestSource = await readFile(manifestPath, "utf8");
  const manifest = parseManifestYaml(manifestSource);
  const validation = validateManifest(manifest);

  if (!validation.ok) {
    return failure(
      "SPECOS_MANIFEST_INVALID",
      validation.errors.map((error) => `${error.path ?? "manifest"} ${error.message}`).join("; "),
    );
  }

  const validManifest = manifest as unknown as SpecosManifest;
  const pathValidation = validateArtifactPaths(validManifest);
  if (pathValidation.length > 0) {
    return failure("SPECOS_MANIFEST_INVALID", `Invalid artifact paths: ${pathValidation.join(", ")}`);
  }

  const missingDirs = await missingRequiredDirs(cwd, validManifest);

  if (missingDirs.length > 0) {
    return failure("SPECOS_DIRECTORY_MISSING", `Missing required directories: ${missingDirs.join(", ")}`);
  }

  const specs = await discoverYamlFiles(join(cwd, validManifest.artifacts.specsDir));

  return {
    exitCode: 0,
    stdout: `SPECOS_CHECK_OK manifest valid; directories valid; specs ${specs.length}\n`,
    stderr: "",
  };
}

function validateArtifactPaths(manifest: SpecosManifest): string[] {
  return Object.entries(manifest.artifacts)
    .filter(([, path]) => isUnsafeProjectRelativePath(path))
    .map(([key]) => `artifacts.${key}`);
}

function isUnsafeProjectRelativePath(path: string): boolean {
  if (isAbsolute(path)) return true;
  const normalized = relative(".", path);
  return normalized === ".." || normalized.startsWith(`..${sep}`) || normalized.split(sep).includes("..");
}

function failure(code: string, message: string): RunCliResult {
  return {
    exitCode: 1,
    stdout: "",
    stderr: `${code} ${message}\n`,
  };
}

async function missingRequiredDirs(cwd: string, manifest: SpecosManifest): Promise<string[]> {
  const dirs = [
    manifest.artifacts.draftsDir,
    manifest.artifacts.specsDir,
    manifest.artifacts.testsDir,
    manifest.artifacts.resultsDir,
  ];
  const missing: string[] = [];

  for (const dir of dirs) {
    const absolutePath = join(cwd, dir);
    if (!(await pathExists(absolutePath))) {
      missing.push(dir);
    }
  }

  return missing;
}

async function discoverYamlFiles(root: string): Promise<string[]> {
  if (!(await pathExists(root))) {
    return [];
  }

  const files: string[] = [];

  async function visit(current: string) {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = join(current, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
        files.push(toPosixPath(absolutePath.slice(root.length + 1)));
      }
    }
  }

  await visit(root);
  return files;
}

async function discoverJsonFiles(root: string): Promise<string[]> {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseManifestYaml(source: string): ManifestRecord {
  const parsed = parse(source, { prettyErrors: false, uniqueKeys: true });
  return typeof parsed === "object" && parsed !== null ? (parsed as ManifestRecord) : {};
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function parseInitArgs(args: string[]): { ok: true; value: InitOptions } | { ok: false; error: RunCliResult } {
  let template = "fullstack";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--template") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_TEMPLATE_REQUIRED", "--template requires a value") };
      }
      template = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported init argument: ${arg}\n${commandHelp}`) };
  }

  return { ok: true, value: { template } };
}

function parseExportAgentKitArgs(
  args: string[],
  cwd: string,
): { ok: true; value: ExportAgentKitOptions } | { ok: false; error: RunCliResult } {
  let outDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--out requires a value") };
      }
      outDir = resolve(cwd, value);
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported export-agent-kit argument: ${arg}`) };
  }

  if (!outDir) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "export-agent-kit requires --out <directory>") };
  }

  return { ok: true, value: { outDir } };
}

function parseIntakeArgs(args: string[]): { ok: true; value: IntakeOptions } | { ok: false; error: RunCliResult } {
  let id: string | undefined;
  let request: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--id") {
      id = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--request") {
      request = args[index + 1];
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported intake argument: ${arg}`) };
  }

  if (!id || !isStableId(id)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "intake requires --id <stable-id>") };
  }

  if (!request?.trim()) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "intake requires --request <text>") };
  }

  return { ok: true, value: { id, request: request.trim() } };
}

function parseRouteRequestArgs(args: string[]): { ok: true; value: RouteRequestOptions } | { ok: false; error: RunCliResult } {
  let request: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--request") {
      request = args[index + 1];
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported route-request argument: ${arg}`) };
  }

  if (!request?.trim()) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "route-request requires --request <text>") };
  }

  return { ok: true, value: { request: request.trim() } };
}

function parseCreateChangeArgs(args: string[]): { ok: true; value: CreateChangeOptions } | { ok: false; error: RunCliResult } {
  const draftId = args[0];
  let changeId: string | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--change") {
      changeId = args[index + 1];
      index += 1;
      continue;
    }
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported create-change argument: ${arg}`) };
  }

  if (!draftId || !isStableId(draftId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "create-change requires <draft-id>") };
  }

  if (!changeId || !isStableId(changeId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "create-change requires --change <change-id>") };
  }

  return { ok: true, value: { draftId, changeId } };
}

function parseReviewChangeArgs(args: string[]): { ok: true; value: ReviewChangeOptions } | { ok: false; error: RunCliResult } {
  const changeId = args[0];
  let stage: ReviewStage | undefined;
  let decision: ReviewDecision | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--stage") {
      const value = args[index + 1];
      if (value !== "design-gate" && value !== "implementation") {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--stage must be design-gate or implementation") };
      }
      stage = value;
      index += 1;
      continue;
    }
    if (arg === "--decision") {
      const value = args[index + 1];
      if (value !== "approved" && value !== "changes-requested" && value !== "blocked") {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--decision must be approved, changes-requested, or blocked") };
      }
      decision = value;
      index += 1;
      continue;
    }
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported review-change argument: ${arg}`) };
  }

  if (!changeId || !isStableId(changeId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "review-change requires <change-id>") };
  }
  if (!stage || !decision) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "review-change requires --stage and --decision") };
  }

  return { ok: true, value: { changeId, stage, decision } };
}

function parseRunChangeArgs(args: string[]): { ok: true; value: RunChangeOptions } | { ok: false; error: RunCliResult } {
  const changeId = args[0];
  let result: ExecutionResult = "planned";

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--result") {
      const value = args[index + 1];
      if (value !== "planned" && value !== "implemented") {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--result must be planned or implemented") };
      }
      result = value;
      index += 1;
      continue;
    }
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported run-change argument: ${arg}`) };
  }

  if (!changeId || !isStableId(changeId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "run-change requires <change-id>") };
  }

  return { ok: true, value: { changeId, result } };
}

function parseTestChangeArgs(args: string[]): { ok: true; value: TestChangeOptions } | { ok: false; error: RunCliResult } {
  const changeId = args[0];
  let decision: TestDecision | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--decision") {
      const value = args[index + 1];
      if (value !== "passed" && value !== "failed" && value !== "blocked") {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--decision must be passed, failed, or blocked") };
      }
      decision = value;
      index += 1;
      continue;
    }
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported test-change argument: ${arg}`) };
  }

  if (!changeId || !isStableId(changeId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "test-change requires <change-id>") };
  }
  if (!decision) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "test-change requires --decision <passed|failed|blocked>") };
  }

  return { ok: true, value: { changeId, decision } };
}

function parsePromoteChangeArgs(args: string[]): { ok: true; value: PromoteChangeOptions } | { ok: false; error: RunCliResult } {
  const changeId = args[0];
  let accept = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--accept") {
      accept = true;
      continue;
    }
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported promote-change argument: ${arg}`) };
  }

  if (!changeId || !isStableId(changeId)) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "promote-change requires <change-id>") };
  }

  return { ok: true, value: { changeId, accept } };
}

function resolveTemplate(name: string): TemplateDefinition | undefined {
  return templates.find((template) => template.name === name);
}

async function exportAgentKitCommand(cwd: string, options: ExportAgentKitOptions): Promise<RunCliResult> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const bundleRoot = join(options.outDir, ".specos-bundle");
  const filesRoot = join(bundleRoot, "files");
  const workflowPath = join(filesRoot, ".specos", "workflows", `${agentKitWorkflowId}.yaml`);

  await rm(bundleRoot, { recursive: true, force: true });
  await mkdir(filesRoot, { recursive: true });

  let copiedFiles = 0;
  for (const source of agentKitSources) {
    copiedFiles += await copyAgentKitSource(
      join(repoRoot, source.source),
      join(filesRoot, source.target),
      source.exclude,
    );
  }

  await mkdir(dirname(workflowPath), { recursive: true });
  await writeFile(workflowPath, buildAgentKitWorkflow(), "utf8");
  copiedFiles += 1;

  const bundleManifest = buildAgentKitBundleManifest();
  await writeFile(join(bundleRoot, "bundle.yaml"), stringify(bundleManifest), "utf8");
  await writeFile(
    join(bundleRoot, "manifest.json"),
    `${JSON.stringify(
      {
        id: agentKitBundleId,
        generatedAt: new Date().toISOString(),
        source: toPosixPath(relative(cwd, repoRoot)),
        copiedFiles,
        excluded: ["tests/results/*.json", ".codex/config.toml"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const checksums = await buildChecksums(filesRoot);
  await writeFile(join(bundleRoot, "checksums.json"), `${JSON.stringify(checksums, null, 2)}\n`, "utf8");

  return {
    exitCode: 0,
    stdout: [
      `SPECOS_AGENT_KIT_EXPORT_OK ${agentKitBundleId}`,
      `out ${options.outDir}`,
      `files ${copiedFiles}`,
      `validate node packages/cli/dist/main.js validate-bundle ${options.outDir}`,
      `install node packages/cli/dist/main.js install-bundle ${options.outDir}`,
      "",
    ].join("\n"),
    stderr: "",
  };
}

async function intakeCommand(cwd: string, options: IntakeOptions): Promise<RunCliResult> {
  const draftPath = join(cwd, "spec-draft", `${options.id}.md`);
  await mkdir(dirname(draftPath), { recursive: true });
  await writeFile(
    draftPath,
    [
      `# ${toTitle(options.id)} Draft`,
      "",
      "## Meta",
      "",
      `- Draft ID: \`${options.id}\``,
      "- Status: draft",
      "- Source: user request",
      "",
      "## Raw Request",
      "",
      options.request,
      "",
      "## Clarifications Needed",
      "",
      "- Confirm business goal, success criteria, and non-goals before creating an executable change.",
      "- Confirm impacted domains, frontend/backend surfaces, data contracts, and test expectations.",
      "",
      "## Agent Handoff",
      "",
      "- Spec-draft agent owns requirement wording, assumptions, and open questions.",
      "- Architecture agent owns initial architecture impact and risk questions.",
      "- Human confirmation is required before this draft becomes `specs/changes/<change-id>/`.",
      "",
    ].join("\n"),
    "utf8",
  );

  return {
    exitCode: 0,
    stdout: `SPECOS_INTAKE_OK ${options.id} ${toPosixPath(relative(cwd, draftPath))}\n`,
    stderr: "",
  };
}

function routeRequestCommand(options: RouteRequestOptions): RunCliResult {
  const route = buildRequestRoute(options.request);
  return {
    exitCode: 0,
    stdout: `SPECOS_REQUEST_ROUTE_OK ${route.primaryAgent}\n${JSON.stringify(route, null, 2)}\n`,
    stderr: "",
  };
}

async function createChangeCommand(cwd: string, options: CreateChangeOptions): Promise<RunCliResult> {
  const draftPath = join(cwd, "spec-draft", `${options.draftId}.md`);
  if (!(await pathExists(draftPath))) {
    return failure("SPECOS_DRAFT_MISSING", `Draft not found: spec-draft/${options.draftId}.md`);
  }

  const draftSource = await readFile(draftPath, "utf8");
  const changeDir = changeDirectory(cwd, options.changeId);
  await mkdir(changeDir, { recursive: true });
  await writeFile(join(changeDir, "spec.md"), buildChangeSpec(options, draftSource), "utf8");
  await writeFile(join(changeDir, "architecture-review.md"), buildGateDoc("Architecture Review", options.changeId), "utf8");
  await writeFile(join(changeDir, "design-review.md"), buildGateDoc("Design Review", options.changeId), "utf8");
  await writeFile(join(changeDir, "test-strategy.md"), buildTestStrategy(options.changeId), "utf8");
  await writeFile(join(changeDir, "execution-plan.md"), buildExecutionPlan(options.changeId), "utf8");
  await writeFile(join(changeDir, "review-report.md"), buildReviewReport(options.changeId), "utf8");
  await writeFile(join(changeDir, "changelog.md"), buildChangelog(options.changeId), "utf8");
  await saveWorkflowState(cwd, buildInitialWorkflowState(options));

  return {
    exitCode: 0,
    stdout: `SPECOS_CHANGE_OK ${options.changeId} specs/changes/${options.changeId}/\n`,
    stderr: "",
  };
}

async function reviewChangeCommand(cwd: string, options: ReviewChangeOptions): Promise<RunCliResult> {
  const loaded = await loadWorkflowState(cwd, options.changeId);
  if (!loaded.ok) return loaded.error;
  const state = loaded.value;

  if (options.stage === "design-gate") {
    state.decisions.designGate = options.decision;
    state.gates.architectureReviewed = options.decision === "approved";
    state.gates.designReviewed = options.decision === "approved";
    state.status = options.decision === "approved" ? "design_gate_approved" : "design_gate_blocked";
    await appendFileSection(
      join(changeDirectory(cwd, options.changeId), "architecture-review.md"),
      "Gate Decision",
      `Decision: ${options.decision}`,
    );
    await appendFileSection(
      join(changeDirectory(cwd, options.changeId), "design-review.md"),
      "Gate Decision",
      `Decision: ${options.decision}`,
    );
  } else {
    if (options.decision === "approved" && !state.gates.implementationDone) {
      return failure("SPECOS_GATE_BLOCKED", "Implementation review requires implementation evidence from run-change");
    }
    state.decisions.implementationReview = options.decision;
    state.gates.implementationReviewed = options.decision === "approved";
    state.status = options.decision === "approved" ? "implementation_reviewed" : "implementation_review_blocked";
    await appendFileSection(
      join(changeDirectory(cwd, options.changeId), "review-report.md"),
      "Implementation Review Decision",
      `Decision: ${options.decision}`,
    );
  }

  await saveWorkflowState(cwd, touchState(state));
  return {
    exitCode: 0,
    stdout: `SPECOS_REVIEW_OK ${options.changeId} ${options.stage} ${options.decision}\n`,
    stderr: "",
  };
}

async function runChangeCommand(cwd: string, options: RunChangeOptions): Promise<RunCliResult> {
  const loaded = await loadWorkflowState(cwd, options.changeId);
  if (!loaded.ok) return loaded.error;
  const state = loaded.value;

  if (!state.gates.architectureReviewed || !state.gates.designReviewed) {
    return failure("SPECOS_GATE_BLOCKED", "run-change requires approved architecture/design gate");
  }

  state.gates.executionHandoffReady = true;
  state.gates.implementationDone = options.result === "implemented";
  state.status = options.result === "implemented" ? "implementation_done" : "execution_handoff_ready";
  await writeFile(
    join(changeDirectory(cwd, options.changeId), "implementation-report.md"),
    [
      `# ${toTitle(options.changeId)} Implementation Report`,
      "",
      `- Change ID: \`${options.changeId}\``,
      `- Result: ${options.result}`,
      "",
      "## Notes",
      "",
      options.result === "implemented"
        ? "Implementation evidence was recorded for the document-only workflow."
        : "Execution handoff is ready. Real implementation is expected outside this CLI step.",
      "",
    ].join("\n"),
    "utf8",
  );

  await saveWorkflowState(cwd, touchState(state));
  return {
    exitCode: 0,
    stdout: `SPECOS_CHANGE_RUN_OK ${options.changeId} ${options.result}\n`,
    stderr: "",
  };
}

async function testChangeCommand(cwd: string, options: TestChangeOptions): Promise<RunCliResult> {
  const loaded = await loadWorkflowState(cwd, options.changeId);
  if (!loaded.ok) return loaded.error;
  const state = loaded.value;

  state.decisions.test = options.decision;
  state.gates.independentTestsPassed = options.decision === "passed";
  state.status = options.decision === "passed" ? "independent_tests_passed" : "independent_tests_blocked";
  await writeFile(
    join(changeDirectory(cwd, options.changeId), "test-result-summary.md"),
    [
      `# ${toTitle(options.changeId)} Test Result Summary`,
      "",
      `- Change ID: \`${options.changeId}\``,
      `- Decision: ${options.decision}`,
      "- Scope: independent scenario/API/E2E verification track",
      "",
      "## Independence Rule",
      "",
      "This result records the independent test track. It must not be derived from execution-agent private notes.",
      "",
    ].join("\n"),
    "utf8",
  );

  await saveWorkflowState(cwd, touchState(state));
  return {
    exitCode: 0,
    stdout: `SPECOS_CHANGE_TEST_OK ${options.changeId} ${options.decision}\n`,
    stderr: "",
  };
}

async function promoteChangeCommand(cwd: string, options: PromoteChangeOptions): Promise<RunCliResult> {
  if (!options.accept) {
    return failure("SPECOS_ARGUMENT_INVALID", "promote-change requires --accept");
  }

  const loaded = await loadWorkflowState(cwd, options.changeId);
  if (!loaded.ok) return loaded.error;
  const state = loaded.value;
  const missing = requiredPromotionGates(state);
  if (missing.length > 0) {
    return failure("SPECOS_GATE_BLOCKED", `Cannot promote before gates pass: ${missing.join(", ")}`);
  }

  const gateMissing = await missingPromotionGateReports(cwd, options.changeId);
  if (gateMissing.length > 0) {
    return failure("SPECOS_GATE_BLOCKED", `Cannot promote before ready gate report: ${gateMissing.join(", ")}`);
  }

  state.gates.promoted = true;
  state.gates.archived = true;
  state.status = "promoted_and_archived";
  await saveWorkflowState(cwd, touchState(state));

  const currentPath = join(cwd, "specs", "current", "accepted-changes", `${options.changeId}.md`);
  await mkdir(dirname(currentPath), { recursive: true });
  await writeFile(
    currentPath,
    [
      `# Accepted Change: ${options.changeId}`,
      "",
      `- Source: specs/changes/${options.changeId}/`,
      `- Archived: specs/archive/${options.changeId}/`,
      "- Status: accepted",
      "",
    ].join("\n"),
    "utf8",
  );

  const archiveDir = join(cwd, "specs", "archive", options.changeId);
  await rm(archiveDir, { recursive: true, force: true });
  await copyInstallSource(changeDirectory(cwd, options.changeId), archiveDir);

  return {
    exitCode: 0,
    stdout: `SPECOS_PROMOTE_OK ${options.changeId} specs/current/accepted-changes/${options.changeId}.md specs/archive/${options.changeId}/\n`,
    stderr: "",
  };
}

async function validateBundleCommand(cwd: string, bundlePathArg: string | undefined): Promise<RunCliResult> {
  if (!bundlePathArg) {
    return failure("SPECOS_BUNDLE_PATH_REQUIRED", "validate-bundle requires a bundle path");
  }

  const bundleLocation = await resolveBundleLocation(cwd, bundlePathArg);
  if (!bundleLocation) {
    return failure("SPECOS_BUNDLE_INVALID", `bundle.yaml not found in ${bundlePathArg}`);
  }

  const bundleSource = await readFile(bundleLocation.manifestPath, "utf8");
  const bundle = parseYamlObject(bundleSource);
  const validation = validateBundle(bundle);

  if (!validation.ok) {
    return failure(
      "SPECOS_BUNDLE_INVALID",
      validation.errors.map((error) => `${error.path ?? "bundle"} ${error.message}`).join("; "),
    );
  }

  const validBundle = bundle as unknown as SpecosBundleManifest;
  return {
    exitCode: 0,
    stdout: `SPECOS_BUNDLE_OK ${validBundle.id} workflows ${validBundle.workflow.available.length}\n`,
    stderr: "",
  };
}

async function installBundleCommand(cwd: string, bundlePathArg: string | undefined): Promise<RunCliResult> {
  if (!bundlePathArg) {
    return failure("SPECOS_BUNDLE_PATH_REQUIRED", "install-bundle requires a bundle path");
  }

  const bundleLocation = await resolveBundleLocation(cwd, bundlePathArg);
  if (!bundleLocation) {
    return failure("SPECOS_BUNDLE_INVALID", `bundle.yaml not found in ${bundlePathArg}`);
  }

  const bundleSource = await readFile(bundleLocation.manifestPath, "utf8");
  const bundle = parseYamlObject(bundleSource);
  const validation = validateBundle(bundle);

  if (!validation.ok) {
    return failure(
      "SPECOS_BUNDLE_INVALID",
      validation.errors.map((error) => `${error.path ?? "bundle"} ${error.message}`).join("; "),
    );
  }

  const validBundle = bundle as unknown as SpecosBundleManifest;
  let installedFiles = 0;

  for (const install of validBundle.installs) {
    installedFiles += await copyInstallSource(join(bundleLocation.rootDir, install.from), join(cwd, install.target));
  }

  const installedRecordPath = join(cwd, ".specos", "bundles", "installed", `${validBundle.id}.yaml`);
  await mkdir(dirname(installedRecordPath), { recursive: true });
  await writeFile(
    installedRecordPath,
    [
      `id: ${validBundle.id}`,
      `version: ${validBundle.version}`,
      `installedAt: ${new Date().toISOString()}`,
      `defaultWorkflow: ${validBundle.workflow.default}`,
      "",
    ].join("\n"),
    "utf8",
  );

  return {
    exitCode: 0,
    stdout: `SPECOS_BUNDLE_INSTALL_OK ${validBundle.id} files ${installedFiles}\n`,
    stderr: "",
  };
}

async function listWorkflowsCommand(cwd: string): Promise<RunCliResult> {
  const workflowsDir = join(cwd, ".specos", "workflows");
  const files = await discoverYamlFiles(workflowsDir);

  if (files.length === 0) {
    return {
      exitCode: 0,
      stdout: "SPECOS_WORKFLOWS_OK count 0\n",
      stderr: "",
    };
  }

  const workflowLines: string[] = [];

  for (const file of files) {
    const source = await readFile(join(workflowsDir, file), "utf8");
    const workflow = parseYamlObject(source);
    const id = typeof workflow.id === "string" ? workflow.id : file;
    const name = typeof workflow.name === "string" ? workflow.name : id;
    workflowLines.push(`${id} ${name}`);
  }

  return {
    exitCode: 0,
    stdout: `SPECOS_WORKFLOWS_OK count ${workflowLines.length}\n${workflowLines.join("\n")}\n`,
    stderr: "",
  };
}

async function runWorkflowCommand(cwd: string, workflowId: string | undefined): Promise<RunCliResult> {
  if (!workflowId) {
    return failure("SPECOS_WORKFLOW_REQUIRED", "run-workflow requires a workflow id");
  }

  const workflow = await loadWorkflowById(cwd, workflowId);
  if (!workflow) {
    return failure("SPECOS_WORKFLOW_INVALID", `Workflow not found: ${workflowId}`);
  }

  const validation = validateWorkflow(workflow);
  if (!validation.ok) {
    return failure(
      "SPECOS_WORKFLOW_INVALID",
      validation.errors.map((error) => `${error.path ?? "workflow"} ${error.message}`).join("; "),
    );
  }

  const validWorkflow = workflow as unknown as SpecosWorkflow;
  let stdout = "";

  for (const step of validWorkflow.steps) {
    try {
      const result = await exec(step.run, {
        cwd,
        maxBuffer: 1024 * 1024,
      });
      stdout += result.stdout;
      if (result.stderr) {
        stdout += result.stderr;
      }
    } catch (error) {
      if (error instanceof Error && "stdout" in error && "stderr" in error) {
        const failureStdout = typeof error.stdout === "string" ? error.stdout : "";
        const failureStderr = typeof error.stderr === "string" ? error.stderr : "";
        return {
          exitCode: 1,
          stdout: failureStdout,
          stderr: `SPECOS_WORKFLOW_STEP_FAILED ${step.id}\n${failureStderr}`,
        };
      }

      return failure("SPECOS_WORKFLOW_INVALID", `Workflow step failed: ${step.id}`);
    }
  }

  return {
    exitCode: 0,
    stdout: `${stdout}SPECOS_WORKFLOW_RUN_OK ${validWorkflow.id} steps ${validWorkflow.steps.length}\n`,
    stderr: "",
  };
}

async function generateTestPlanCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const parsed = parseGenerateTestPlanArgs(args);
  if (!parsed.ok) {
    return parsed.error;
  }

  const specPath = resolve(cwd, parsed.value.specPath);
  if (!(await pathExists(specPath))) {
    return failure("SPECOS_SPEC_INVALID", `Spec file not found: ${parsed.value.specPath}`);
  }

  const specSource = await readFile(specPath, "utf8");
  const spec = parseArtifactObject(specSource, specPath);
  const specValidation = validateSpec(spec);

  if (!specValidation.ok) {
    return failure(
      "SPECOS_SPEC_INVALID",
      specValidation.errors.map((error) => `${error.path ?? "spec"} ${error.message}`).join("; "),
    );
  }

  const validSpec = spec as unknown as SpecosSpec;
  const testPlan = buildDeterministicTestPlan(validSpec);
  const planValidation = validateTestPlan(testPlan);

  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const changeId = parsed.value.changeId ?? inferChangeIdFromSpecPath(cwd, specPath) ?? validSpec.id;
  const schedule = buildSpecChangeTestSchedule(testPlan, {
    changeId,
    executionMode: parsed.value.executionMode,
  });
  const scheduleValidation = validateTestSchedule(schedule);

  if (!scheduleValidation.ok) {
    return failure(
      "SPECOS_TEST_SCHEDULE_INVALID",
      scheduleValidation.errors.map((error) => `${error.path ?? "testSchedule"} ${error.message}`).join("; "),
    );
  }

  const planPath = join(cwd, "tests", "plans", `${validSpec.id}.test-plan.json`);
  const schedulePath = join(cwd, "tests", "schedules", `${validSpec.id}.test-schedule.json`);
  await mkdir(dirname(planPath), { recursive: true });
  await mkdir(dirname(schedulePath), { recursive: true });
  await writeFile(planPath, `${JSON.stringify(testPlan, null, 2)}\n`, "utf8");
  await writeFile(schedulePath, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");

  return {
    exitCode: 0,
    stdout: [
      `SPECOS_TEST_PLAN_OK ${toPosixPath(relative(cwd, planPath))}`,
      `SPECOS_TEST_SCHEDULE_OK ${toPosixPath(relative(cwd, schedulePath))}`,
      "",
    ].join("\n"),
    stderr: "",
  };
}

async function runApiTestsCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const specId = args[0];
  if (!specId) {
    return failure("SPECOS_TEST_PLAN_INVALID", "run-api-tests requires a spec id");
  }
  const parsed = parseRunApiTestsArgs(args.slice(1));
  if (!parsed.ok) {
    return parsed.error;
  }

  const planPath = join(cwd, "tests", "plans", `${specId}.test-plan.json`);
  const schedulePath = join(cwd, "tests", "schedules", `${specId}.test-schedule.json`);

  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: tests/plans/${specId}.test-plan.json`);
  }

  if (!(await pathExists(schedulePath))) {
    return failure("SPECOS_TEST_SCHEDULE_INVALID", `Test schedule not found: tests/schedules/${specId}.test-schedule.json`);
  }

  const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
  const schedule = parseArtifactObject(await readFile(schedulePath, "utf8"), schedulePath) as unknown as SpecosTestSchedule;
  const planValidation = validateTestPlan(plan);
  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const scheduleValidation = validateTestSchedule(schedule);
  if (!scheduleValidation.ok) {
    return failure(
      "SPECOS_TEST_SCHEDULE_INVALID",
      scheduleValidation.errors.map((error) => `${error.path ?? "testSchedule"} ${error.message}`).join("; "),
    );
  }

  const brunoDir = join(cwd, "tests", "bruno", specId);
  if (!(await pathExists(brunoDir))) {
    return writeBlockedApiResult(cwd, plan, schedule, `Bruno collection not found at tests/bruno/${specId}`);
  }

  if (parsed.value.command) {
    return runApiCommand(cwd, plan, schedule, parsed.value.command);
  }

  return writeBlockedApiResult(cwd, plan, schedule, "Bruno execution adapter is not configured for this project");
}

async function runApiCommand(
  cwd: string,
  plan: SpecosTestPlan,
  schedule: SpecosTestSchedule,
  command: string,
): Promise<RunCliResult> {
  const startedAt = Date.now();
  const execution = await execCommandCapture(command, cwd);
  const result = buildExecutedApiScenarioResult(plan, schedule, {
    ...execution,
    command,
    durationMs: Date.now() - startedAt,
  });
  const validation = validateScenarioResult(result);

  if (!validation.ok) {
    return failure(
      "SPECOS_SCENARIO_RESULT_INVALID",
      validation.errors.map((error) => `${error.path ?? "scenarioResult"} ${error.message}`).join("; "),
    );
  }

  const outputDir = join(cwd, "tests", "results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${plan.specId}.${result.runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  if (execution.exitCode === 0) {
    return {
      exitCode: 0,
      stdout: `SPECOS_API_TESTS_OK ${toPosixPath(relative(cwd, outputPath))}\n`,
      stderr: "",
    };
  }

  return {
    exitCode: 1,
    stdout: `SPECOS_API_TESTS_FAILED ${toPosixPath(relative(cwd, outputPath))}\n`,
    stderr: execution.stderr,
  };
}

async function execCommandCapture(command: string, cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const result = await exec(command, {
      cwd,
      maxBuffer: 1024 * 1024,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      const commandError = error as Error & { stdout?: unknown; stderr?: unknown; code?: unknown };
      const exitCode = typeof commandError.code === "number" ? commandError.code : 1;
      return {
        exitCode,
        stdout: typeof commandError.stdout === "string" ? commandError.stdout : "",
        stderr: typeof commandError.stderr === "string" ? commandError.stderr : error.message,
      };
    }

    return { exitCode: 1, stdout: "", stderr: error instanceof Error ? error.message : "Unknown command failure" };
  }
}

async function generateBrunoTestsCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const specId = args[0];
  if (!specId) {
    return failure("SPECOS_TEST_PLAN_INVALID", "generate-bruno-tests requires a spec id");
  }

  const planPath = join(cwd, "tests", "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: tests/plans/${specId}.test-plan.json`);
  }

  const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
  const planValidation = validateTestPlan(plan);

  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const assets = buildBrunoCollectionAssets(plan);
  const outputDir = join(cwd, "tests", "bruno", specId);
  await mkdir(outputDir, { recursive: true });

  for (const asset of assets) {
    const outputPath = join(outputDir, asset.path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, asset.content, "utf8");
  }

  return {
    exitCode: 0,
    stdout: `SPECOS_BRUNO_TESTS_OK tests/bruno/${specId} files ${assets.length}\n`,
    stderr: "",
  };
}

async function validateTestGatesCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const specId = args[0];
  if (!specId) {
    return failure("SPECOS_TEST_PLAN_INVALID", "validate-test-gates requires a spec id");
  }
  const parsed = parseValidateTestGatesArgs(args.slice(1));
  if (!parsed.ok) {
    return parsed.error;
  }

  const planPath = join(cwd, "tests", "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: tests/plans/${specId}.test-plan.json`);
  }

  const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
  const planValidation = validateTestPlan(plan);
  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const resultFiles = await discoverJsonFiles(join(cwd, "tests", "results"));
  const results: ScenarioResult[] = [];
  const invalidResultMessages: string[] = [];
  for (const file of resultFiles.filter((item) => !item.endsWith(".gate-report.json") && !item.endsWith(".session.json"))) {
    const filePath = join(cwd, "tests", "results", file);
    const result = parseArtifactObject(await readFile(filePath, "utf8"), filePath) as unknown as ScenarioResult;
    if (!isResultInGateScope(result, plan, parsed.value.changeId)) {
      continue;
    }
    const validation = validateScenarioResult(result);
    if (!validation.ok) {
      invalidResultMessages.push(
        `Invalid normalized result ${file}: ${validation.errors.map((error) => error.path ?? "scenarioResult").join(", ")}`,
      );
      continue;
    }
    results.push(result);
  }

  const report = buildTestGateReport(plan, results, { changeId: parsed.value.changeId });
  if (invalidResultMessages.length > 0) {
    report.decision = "blocked";
    if (!report.failedGates.includes("invalid-normalized-results")) {
      report.failedGates.push("invalid-normalized-results");
    }
    report.blockers.push(...invalidResultMessages);
  }
  const reportName = `${specId}.${parsed.value.changeId ?? plan.changeId ?? "latest"}.gate-report`;
  const jsonPath = join(cwd, "tests", "results", `${reportName}.json`);
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (parsed.value.changeId) {
    const markdownPath = join(cwd, "specs", "changes", parsed.value.changeId, "gate-report.md");
    await mkdir(dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, buildGateReportMarkdown(report), "utf8");
  }

  const relativeJsonPath = toPosixPath(relative(cwd, jsonPath));
  if (report.decision === "ready") {
    return {
      exitCode: 0,
      stdout: `SPECOS_TEST_GATES_OK ${relativeJsonPath}\n`,
      stderr: "",
    };
  }

  return {
    exitCode: 1,
    stdout: `SPECOS_TEST_GATES_BLOCKED ${relativeJsonPath}\n${report.blockers.concat(report.missingEvidence).join("\n")}\n`,
    stderr: "",
  };
}

function isResultInGateScope(result: Partial<ScenarioResult>, plan: SpecosTestPlan, changeId: string | undefined): boolean {
  if (result.specId !== plan.specId || result.specVersion !== plan.specVersion) {
    return false;
  }
  const scopedChangeId = changeId ?? plan.changeId;
  if (!scopedChangeId) {
    return true;
  }
  if (result.changeId === scopedChangeId || result.workflowId === scopedChangeId) {
    return true;
  }
  if (Array.isArray(result.items)) {
    return result.items.some((item) => item?.changeId === scopedChangeId);
  }
  return false;
}

async function runAdapterTestsCommand(
  cwd: string,
  args: string[],
  testType: "performance" | "concurrency",
): Promise<RunCliResult> {
  const specId = args[0];
  if (!specId) {
    return failure("SPECOS_TEST_PLAN_INVALID", `run-${testType}-tests requires a spec id`);
  }
  const parsed = parseAdapterTestsArgs(args.slice(1));
  if (!parsed.ok) {
    return parsed.error;
  }

  const planPath = join(cwd, "tests", "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: tests/plans/${specId}.test-plan.json`);
  }

  const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
  const planValidation = validateTestPlan(plan);
  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  if (!parsed.value.command) {
    return failure("SPECOS_ARGUMENT_INVALID", `run-${testType}-tests requires --command <adapter-command>`);
  }

  const startedAt = Date.now();
  const execution = await execCommandCapture(parsed.value.command, cwd);
  const result = buildAdapterScenarioResult(plan, {
    testType,
    changeId: parsed.value.changeId ?? plan.changeId,
    command: parsed.value.command,
    exitCode: execution.exitCode,
    stdout: execution.stdout,
    stderr: execution.stderr,
    durationMs: Date.now() - startedAt,
  });
  const validation = validateScenarioResult(result);
  if (!validation.ok) {
    return failure(
      "SPECOS_SCENARIO_RESULT_INVALID",
      validation.errors.map((error) => `${error.path ?? "scenarioResult"} ${error.message}`).join("; "),
    );
  }

  const outputDir = join(cwd, "tests", "results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${plan.specId}.${result.runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const commandLabel = testType === "performance" ? "PERFORMANCE" : "CONCURRENCY";
  if (execution.exitCode === 0) {
    return {
      exitCode: 0,
      stdout: `SPECOS_${commandLabel}_TESTS_OK ${toPosixPath(relative(cwd, outputPath))}\n`,
      stderr: "",
    };
  }

  return {
    exitCode: 1,
    stdout: `SPECOS_${commandLabel}_TESTS_FAILED ${toPosixPath(relative(cwd, outputPath))}\n`,
    stderr: execution.stderr,
  };
}

async function writeBlockedApiResult(
  cwd: string,
  plan: SpecosTestPlan,
  schedule: SpecosTestSchedule,
  reason: string,
): Promise<RunCliResult> {
  const result = buildBlockedApiScenarioResult(plan, schedule, { reason });
  const validation = validateScenarioResult(result);

  if (!validation.ok) {
    return failure(
      "SPECOS_SCENARIO_RESULT_INVALID",
      validation.errors.map((error) => `${error.path ?? "scenarioResult"} ${error.message}`).join("; "),
    );
  }

  const outputDir = join(cwd, "tests", "results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${plan.specId}.${result.runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return {
    exitCode: 1,
    stdout: `SPECOS_API_TESTS_BLOCKED ${toPosixPath(relative(cwd, outputPath))}\n${reason}\n`,
    stderr: "",
  };
}

function parseGenerateTestPlanArgs(
  args: string[],
): { ok: true; value: { specPath: string; changeId?: string; executionMode: "parallel" | "test-after-execution" } } | { ok: false; error: RunCliResult } {
  const specPath = args[0];
  if (!specPath) {
    return { ok: false, error: failure("SPECOS_SPEC_INVALID", "generate-test-plan requires a spec file path") };
  }

  let changeId: string | undefined;
  let executionMode: "parallel" | "test-after-execution" = "parallel";

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--change") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--change requires a value") };
      }
      changeId = value;
      index += 1;
      continue;
    }

    if (arg === "--mode") {
      const value = args[index + 1];
      if (value !== "parallel" && value !== "test-after-execution") {
        return {
          ok: false,
          error: failure("SPECOS_ARGUMENT_INVALID", "--mode must be parallel or test-after-execution"),
        };
      }
      executionMode = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported generate-test-plan argument: ${arg}`) };
  }

  return { ok: true, value: { specPath, changeId, executionMode } };
}

function parseRunApiTestsArgs(args: string[]): { ok: true; value: { command?: string } } | { ok: false; error: RunCliResult } {
  let command: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--command") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--command requires a value") };
      }
      command = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported run-api-tests argument: ${arg}`) };
  }

  return { ok: true, value: { command } };
}

function parseValidateTestGatesArgs(args: string[]): { ok: true; value: { changeId?: string } } | { ok: false; error: RunCliResult } {
  let changeId: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--change") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--change requires a value") };
      }
      changeId = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported validate-test-gates argument: ${arg}`) };
  }

  return { ok: true, value: { changeId } };
}

function parseAdapterTestsArgs(
  args: string[],
): { ok: true; value: { changeId?: string; command?: string } } | { ok: false; error: RunCliResult } {
  let changeId: string | undefined;
  let command: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--change") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--change requires a value") };
      }
      changeId = value;
      index += 1;
      continue;
    }

    if (arg === "--command") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--command requires a value") };
      }
      command = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported adapter test argument: ${arg}`) };
  }

  return { ok: true, value: { changeId, command } };
}

function buildAdapterScenarioResult(
  plan: SpecosTestPlan,
  execution: {
    testType: "performance" | "concurrency";
    changeId?: string;
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  },
): ScenarioResult {
  const runId = `run-${execution.testType}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const timestamp = new Date().toISOString();
  const passed = execution.exitCode === 0;
  const targetItems =
    execution.testType === "performance"
      ? (plan.performanceTargets?.length ? plan.performanceTargets : plan.endpoints.map((endpoint) => ({
          endpoint: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
          priority: endpoint.priority,
          slo: {},
          gateImpact: "warning" as const,
        }))).map((target) => ({
          runId,
          specId: plan.specId,
          specVersion: plan.specVersion,
          changeId: execution.changeId,
          testType: "performance" as const,
          target: target.endpoint,
          status: passed ? "pass" as const : "warning" as const,
          durationMs: execution.durationMs,
          summary: passed ? "Performance adapter command completed successfully" : `Performance adapter failed with exit code ${execution.exitCode}`,
          requirementId: "std.p0.performance.slo",
          ownerAgent: "performance-test-agent" as const,
          evidenceQuality: passed ? "complete" as const : "partial" as const,
          attempts: 1,
          flakeClassification: "not-flaky" as const,
          gateImpact: target.gateImpact,
          slo: target.slo,
          artifactRefs: [{ type: "raw-report" as const, path: `tests/results/${plan.specId}.${runId}.json` }],
        }))
      : (plan.concurrencyInvariants?.length ? plan.concurrencyInvariants : plan.scenarios.map((scenario) => ({
          scenario: scenario.name,
          invariant: `${scenario.name} remains consistent under concurrent execution`,
          actorProfile: "single actor profile not specified",
          expectedFinalState: scenario.expectedResults.join("; "),
          gateImpact: "warning" as const,
        }))).map((invariant) => ({
          runId,
          specId: plan.specId,
          specVersion: plan.specVersion,
          changeId: execution.changeId,
          testType: "concurrency" as const,
          target: invariant.scenario,
          status: passed ? "pass" as const : "warning" as const,
          durationMs: execution.durationMs,
          summary: passed ? "Concurrency adapter command completed successfully" : `Concurrency adapter failed with exit code ${execution.exitCode}`,
          requirementId: "std.p0.concurrency.invariant",
          ownerAgent: "concurrency-test-agent" as const,
          evidenceQuality: passed ? "complete" as const : "partial" as const,
          attempts: 1,
          flakeClassification: "not-flaky" as const,
          gateImpact: invariant.gateImpact,
          concurrencyProfile: {
            actors: 0,
            requests: 0,
            invariant: invariant.invariant,
            expectedFinalState: invariant.expectedFinalState,
            observedFinalState: execution.stdout.trim() || execution.stderr.trim() || undefined,
          },
          artifactRefs: [{ type: "raw-report" as const, path: `tests/results/${plan.specId}.${runId}.json` }],
        }));

  return {
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    standardVersion: plan.standardVersion,
    qualityProfile: plan.qualityProfile,
    changeId: execution.changeId,
    featureName: plan.featureName,
    runner: {
      name: execution.testType,
      command: execution.command,
      exitCode: execution.exitCode,
    },
    status: passed ? "pass" : "warning",
    releaseDecision: passed ? "ready" : "blocked",
    startedAt: timestamp,
    endedAt: timestamp,
    blockers: passed ? [] : [`${execution.testType} adapter failed with exit code ${execution.exitCode}`],
    highRiskScenarios: passed ? [] : plan.scenarios.map((scenario) => scenario.name),
    coverageGaps: [],
    summary: {
      apiPassRate: 0,
      scenarioPassRate: 0,
      totalEndpoints: plan.endpoints.length,
      totalScenarios: plan.scenarios.length,
    },
    flowResults: [],
    items: targetItems,
  };
}

function buildGateReportMarkdown(report: ReturnType<typeof buildTestGateReport>): string {
  return [
    `# ${toTitle(report.changeId ?? report.specId)} Gate Report`,
    "",
    `- Spec ID: \`${report.specId}\``,
    `- Spec Version: \`${report.specVersion}\``,
    report.changeId ? `- Change ID: \`${report.changeId}\`` : "- Change ID: not provided",
    `- Decision: ${report.decision}`,
    "",
    "## Required Gates",
    "",
    ...report.requiredGates.map(
      (gate) =>
        `- ${gate.id}: ${gate.type}, required ${gate.requiredTestTypes.join(", ")}, ${gate.blocking ? "blocking" : "non-blocking"}`,
    ),
    "",
    "## Passed Gates",
    "",
    ...(report.passedGates.length > 0 ? report.passedGates.map((gate) => `- ${gate}`) : ["- none"]),
    "",
    "## Failed Gates",
    "",
    ...(report.failedGates.length > 0 ? report.failedGates.map((gate) => `- ${gate}`) : ["- none"]),
    "",
    "## Missing Evidence",
    "",
    ...(report.missingEvidence.length > 0 ? report.missingEvidence.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length > 0 ? report.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Standard Compliance",
    "",
    ...(report.standardCompliance.length > 0
      ? report.standardCompliance.map(
          (item) =>
            `- ${item.requirementId}: ${item.status}, ${item.riskTier}, owner ${item.ownerAgent}, impact ${item.gateImpact}`,
        )
      : ["- none"]),
    "",
    "## Risk Summary",
    "",
    ...(["P0", "P1", "P2"] as const).map(
      (risk) =>
        `- ${risk}: passed ${report.riskSummary[risk].passed}, failed ${report.riskSummary[risk].failed}, missing ${report.riskSummary[risk].missing}, blocked ${report.riskSummary[risk].blocked}`,
    ),
    "",
    "## Agent Evidence Summary",
    "",
    ...(report.agentEvidenceSummary.length > 0
      ? report.agentEvidenceSummary.map(
          (item) =>
            `- ${item.ownerAgent}: passed ${item.passed}, failed ${item.failed}, missing ${item.missing}, waived ${item.waived}`,
        )
      : ["- none"]),
    "",
  ].join("\n");
}

function inferChangeIdFromSpecPath(cwd: string, specPath: string): string | undefined {
  const parts = toPosixPath(relative(cwd, specPath)).split("/");
  const changesIndex = parts.indexOf("changes");
  if (changesIndex >= 0 && parts[changesIndex + 1]) {
    return parts[changesIndex + 1];
  }
  return undefined;
}

async function resolveBundleLocation(cwd: string, bundlePathArg: string): Promise<{ rootDir: string; manifestPath: string } | undefined> {
  const absoluteInput = resolve(cwd, bundlePathArg);
  const candidates: Array<{ rootDir: string; manifestPath: string }> = [
    { rootDir: absoluteInput, manifestPath: join(absoluteInput, "bundle.yaml") },
    { rootDir: join(absoluteInput, ".specos-bundle"), manifestPath: join(absoluteInput, ".specos-bundle", "bundle.yaml") },
  ];

  if (absoluteInput.endsWith(".yaml") || absoluteInput.endsWith(".yml")) {
    candidates.push({ rootDir: dirname(absoluteInput), manifestPath: absoluteInput });
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate.manifestPath)) {
      return candidate;
    }
  }

  return undefined;
}

async function copyInstallSource(sourcePath: string, targetPath: string): Promise<number> {
  const sourceStat = await stat(sourcePath);

  if (sourceStat.isDirectory()) {
    await mkdir(targetPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    let written = 0;

    for (const entry of entries) {
      written += await copyInstallSource(join(sourcePath, entry.name), join(targetPath, entry.name));
    }

    return written;
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  return 1;
}

function changeDirectory(cwd: string, changeId: string): string {
  return join(cwd, "specs", "changes", changeId);
}

function workflowStatePath(cwd: string, changeId: string): string {
  return join(changeDirectory(cwd, changeId), "workflow-state.json");
}

function isStableId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function toTitle(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildInitialWorkflowState(options: CreateChangeOptions): ChangeWorkflowState {
  return {
    changeId: options.changeId,
    draftId: options.draftId,
    status: "change_created",
    gates: {
      draftConfirmed: true,
      architectureReviewed: false,
      designReviewed: false,
      executionHandoffReady: false,
      implementationDone: false,
      implementationReviewed: false,
      independentTestsPassed: false,
      promoted: false,
      archived: false,
    },
    decisions: {},
    artifacts: [
      "spec.md",
      "architecture-review.md",
      "design-review.md",
      "test-strategy.md",
      "execution-plan.md",
      "review-report.md",
      "changelog.md",
      "workflow-state.json",
    ],
    updatedAt: new Date().toISOString(),
  };
}

function touchState(state: ChangeWorkflowState): ChangeWorkflowState {
  return { ...state, updatedAt: new Date().toISOString() };
}

async function saveWorkflowState(cwd: string, state: ChangeWorkflowState): Promise<void> {
  const statePath = workflowStatePath(cwd, state.changeId);
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function loadWorkflowState(
  cwd: string,
  changeId: string,
): Promise<{ ok: true; value: ChangeWorkflowState } | { ok: false; error: RunCliResult }> {
  const statePath = workflowStatePath(cwd, changeId);
  if (!(await pathExists(statePath))) {
    return { ok: false, error: failure("SPECOS_CHANGE_MISSING", `Change workflow state not found: specs/changes/${changeId}/workflow-state.json`) };
  }

  return { ok: true, value: JSON.parse(await readFile(statePath, "utf8")) as ChangeWorkflowState };
}

async function appendFileSection(path: string, heading: string, body: string): Promise<void> {
  const existing = (await pathExists(path)) ? await readFile(path, "utf8") : "";
  await writeFile(path, `${existing.trimEnd()}\n\n## ${heading}\n\n${body}\n`, "utf8");
}

function requiredPromotionGates(state: ChangeWorkflowState): string[] {
  const required: Array<[string, boolean]> = [
    ["architectureReviewed", state.gates.architectureReviewed],
    ["designReviewed", state.gates.designReviewed],
    ["implementationDone", state.gates.implementationDone],
    ["implementationReviewed", state.gates.implementationReviewed],
    ["independentTestsPassed", state.gates.independentTestsPassed],
  ];
  return required.filter(([, passed]) => !passed).map(([name]) => name);
}

async function missingPromotionGateReports(cwd: string, changeId: string): Promise<string[]> {
  const planFiles = await discoverJsonFiles(join(cwd, "tests", "plans"));
  const attachedPlans: SpecosTestPlan[] = [];

  for (const file of planFiles.filter((item) => item.endsWith(".test-plan.json"))) {
    const planPath = join(cwd, "tests", "plans", file);
    const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
    if (plan.changeId === changeId) {
      attachedPlans.push(plan);
    }
  }

  const missing: string[] = [];
  for (const plan of attachedPlans) {
    const reportPath = join(cwd, "tests", "results", `${plan.specId}.${changeId}.gate-report.json`);
    if (!(await pathExists(reportPath))) {
      missing.push(`${plan.specId} gate report missing`);
      continue;
    }

    const report = parseArtifactObject(await readFile(reportPath, "utf8"), reportPath);
    if (report.decision !== "ready") {
      missing.push(`${plan.specId} gate report is ${String(report.decision ?? "invalid")}`);
    }
  }

  return missing;
}

function buildChangeSpec(options: CreateChangeOptions, draftSource: string): string {
  return [
    `# ${toTitle(options.changeId)} Change Spec`,
    "",
    "## Meta",
    "",
    `- Change ID: \`${options.changeId}\``,
    `- Source Draft: spec-draft/${options.draftId}.md`,
    "- Status: executable-change",
    "",
    "## Draft Summary",
    "",
    extractRawRequest(draftSource),
    "",
    "## Agent Content Ownership",
    "",
    "- Architecture agents own backend/frontend architecture, contracts, data, concurrency, and risk content.",
    "- Module-specific execution agents own implementation plans after architecture/design gates pass.",
    "- Spec agent owns document shape, traceability, wording consistency, and current/archive promotion.",
    "- Test agents own independent scenario/API/E2E strategy from this change spec and contracts, not from implementation notes.",
    "",
    "## Required Gates",
    "",
    "- Architecture and design review before execution.",
    "- Independent test strategy before final acceptance.",
    "- Implementation review and independent test pass before promotion.",
    "",
  ].join("\n");
}

function extractRawRequest(draftSource: string): string {
  const marker = "## Raw Request";
  const nextHeading = "\n## ";
  const start = draftSource.indexOf(marker);
  if (start < 0) return draftSource.trim();
  const afterMarker = draftSource.slice(start + marker.length).trim();
  const end = afterMarker.indexOf(nextHeading);
  return (end >= 0 ? afterMarker.slice(0, end) : afterMarker).trim();
}

function buildGateDoc(title: string, changeId: string): string {
  return [
    `# ${toTitle(changeId)} ${title}`,
    "",
    `- Change ID: \`${changeId}\``,
    "- Status: pending",
    "",
    "## Scope",
    "",
    "Record review findings, blockers, assumptions, and approval decision for this gate.",
    "",
  ].join("\n");
}

function buildTestStrategy(changeId: string): string {
  return [
    `# ${toTitle(changeId)} Test Strategy`,
    "",
    `- Change ID: \`${changeId}\``,
    "- Status: planned",
    "",
    "## Independence Rule",
    "",
    "Scenario, API, and E2E tests are designed from the change spec, contracts, flows, and acceptance conditions. They must stay independent from execution-agent private implementation notes.",
    "",
    "## Tracks",
    "",
    "- Unit tests: implementation-coupled and owned by execution agents after implementation.",
    "- Scenario/API/E2E tests: independent and owned by test agents from the change stage.",
    "",
  ].join("\n");
}

function buildExecutionPlan(changeId: string): string {
  return [
    `# ${toTitle(changeId)} Execution Plan`,
    "",
    `- Change ID: \`${changeId}\``,
    "- Status: pending-gates",
    "",
    "## Rule",
    "",
    "Execution agents may start only after architecture and design gates are approved.",
    "",
  ].join("\n");
}

function buildReviewReport(changeId: string): string {
  return [
    `# ${toTitle(changeId)} Review Report`,
    "",
    `- Change ID: \`${changeId}\``,
    "- Status: pending",
    "",
  ].join("\n");
}

function buildChangelog(changeId: string): string {
  return [
    `# ${toTitle(changeId)} Changelog`,
    "",
    `- Change ID: \`${changeId}\``,
    "- Status: pending-promotion",
    "",
  ].join("\n");
}

async function copyAgentKitSource(
  sourcePath: string,
  targetPath: string,
  exclude?: (relativePath: string) => boolean,
  rootPath = sourcePath,
): Promise<number> {
  const sourceStat = await stat(sourcePath);
  const relativePath = toPosixPath(relative(rootPath, sourcePath));

  if (relativePath && exclude?.(relativePath)) {
    return 0;
  }

  if (sourceStat.isDirectory()) {
    await mkdir(targetPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    let written = 0;

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      written += await copyAgentKitSource(
        join(sourcePath, entry.name),
        join(targetPath, entry.name),
        exclude,
        rootPath,
      );
    }

    return written;
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  return 1;
}

function buildAgentKitBundleManifest(): SpecosBundleManifest {
  return {
    id: agentKitBundleId,
    name: "SpecOS Agent Team Kit",
    version: "0.1.0",
    specosVersion: ">=0.1.0",
    projectTypes: ["backend", "frontend", "mixed", "fullstack", "spec-only"],
    installs: agentKitInstalls,
    workflow: {
      default: agentKitWorkflowId,
      available: [agentKitWorkflowId],
    },
    entrypoints: {
      draftTemplate: "spec-draft/_template/feature/product-ui.template.md",
      specTemplate: "specs/_template/feature/spec.example.md",
      workflowId: agentKitWorkflowId,
    },
    capabilities: {
      refineSpec: true,
      generateTestPlan: true,
      runApiTests: true,
      runUiTests: true,
      normalizeResults: true,
    },
  };
}

function buildAgentKitWorkflow(): string {
  return [
    `id: ${agentKitWorkflowId}`,
    "name: Spec Driven Default",
    "steps:",
    "  - id: smoke-agent-kit",
    `    run: "node -e \\"const fs=require('fs'); for (const p of ['.agents/manifest.yaml','ai/agents/spec-editor.md','rules/README.md','specs/current/README.md','tests/README.md']) { if (!fs.existsSync(p)) throw new Error('Missing '+p); } console.log('agent-kit-smoke-ok');\\""`,
    "",
  ].join("\n");
}

async function buildChecksums(root: string): Promise<Record<string, string>> {
  const checksums: Record<string, string> = {};

  async function visit(current: string) {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = join(current, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        const relativePath = toPosixPath(relative(root, absolutePath));
        const content = await readFile(absolutePath);
        checksums[relativePath] = createHash("sha256").update(content).digest("hex");
      }
    }
  }

  await visit(root);
  return checksums;
}

async function loadWorkflowById(cwd: string, workflowId: string): Promise<Record<string, unknown> | undefined> {
  const workflowsDir = join(cwd, ".specos", "workflows");
  const files = await discoverYamlFiles(workflowsDir);

  for (const file of files) {
    const source = await readFile(join(workflowsDir, file), "utf8");
    const workflow = parseYamlObject(source);
    if (workflow.id === workflowId) {
      return workflow;
    }
  }

  return undefined;
}

if (isCliEntrypoint()) {
  const result = await runCli(process.argv.slice(2), { cwd: process.cwd() });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return process.argv[1] === fileURLToPath(import.meta.url);
  }
}

function parseYamlObject(source: string): Record<string, unknown> {
  const parsed = parse(source, { prettyErrors: false, uniqueKeys: true });
  return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

function parseArtifactObject(source: string, filePath: string): Record<string, unknown> {
  if (filePath.endsWith(".json")) {
    const parsed = JSON.parse(source);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  }

  return parseYamlObject(source);
}
