#!/usr/bin/env node

import { exec as execCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  buildValidatedRouteRequestOutput,
  buildBlockedApiScenarioResult,
  buildBrunoCollectionAssets,
  buildDeterministicTestPlan,
  buildExecutedApiScenarioResult,
  buildRequestRoute,
  buildSpecChangeTestSchedule,
  buildTestGateReport,
  copyTemplateDirectory,
  validateBundle,
  validateExecutionPlanOutput,
  validateManifest,
  validateRouteRequestOutput,
  validateSpec,
  validateScenarioResult,
  validateTestPlan,
  validateTestSchedule,
  validateWorkflow,
  type AgentModeOverlayManifest,
  type AgentRuntimeManifest,
  type RouteRequestOutputFormat,
  type SpecosBundleManifest,
  type SpecosManifest,
  type ScenarioResult,
  type SpecosSpec,
  type SpecosTestPlan,
  type SpecosTestSchedule,
  type TestSpecBinding,
  type SpecosWorkflow,
} from "@specos/core";
import { installBundle } from "@specos/installer";
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
  mode: ProjectMode;
}

interface CliContext {
  cwd: string;
}

type CliManifest = SpecosManifest & {
  artifacts: SpecosManifest["artifacts"] & { issuesDir: string };
};

interface TemplateDefinition {
  name: string;
  packageSubpath: string;
}

type ProjectMode = "litespec" | "goalspec" | "enterprisespec";

const templates: TemplateDefinition[] = [
  { name: "fullstack", packageSubpath: "@specos/templates/fullstack/AGENTS.md" },
  { name: "spec-only", packageSubpath: "@specos/templates/spec-only/AGENTS.md" },
];
const templateNames = templates.map((template) => template.name).join(", ");
const exec = promisify(execCallback);
const packageRequire = createRequire(import.meta.url);
const supportedCommands =
  "Supported commands: init, check, route-request, classify-request, validate-route-output, validate-execution-plan, validate-bundle, install-bundle, list-workflows, run-workflow";
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

interface IntakeOptions {
  id: string;
  request: string;
}

interface RouteRequestOptions {
  request: string;
  format: RouteRequestOutputFormat;
}

interface ValidateRouteOutputOptions {
  file: string;
  format: RouteRequestOutputFormat;
}

interface ValidateExecutionPlanOptions {
  file: string;
}

const agentKitSources: AgentKitSource[] = [
  { source: "AGENTS.md", target: "AGENTS.md" },
  { source: ".agents", target: ".agents" },
  { source: "ai/agents", target: "ai/agents" },
  { source: "ai/workflows", target: "ai/workflows" },
  { source: ".rules", target: ".rules" },
  { source: "rules", target: "rules" },
  { source: ".codex/instructions.md", target: ".codex/instructions.md" },
  { source: "assets/skills", target: ".codex/skills" },
  { source: "skills/developer", target: "skills/developer" },
  { source: "current", target: "current" },
  { source: "docs/spec-modes", target: "docs/spec-modes" },
  { source: "design", target: "design" },
  { source: ".prd", target: ".prd" },
  { source: ".features", target: ".features" },
  { source: ".issues", target: ".issues" },
  { source: "implementation", target: "implementation" },
  { source: "reviews", target: "reviews" },
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
  { target: "skills/developer/", from: "files/skills/developer/" },
  { target: "current/", from: "files/current/" },
  { target: "docs/spec-modes/", from: "files/docs/spec-modes/" },
  { target: ".prd/", from: "files/.prd/" },
  { target: "design/", from: "files/design/" },
  { target: ".features/", from: "files/.features/" },
  { target: "implementation/", from: "files/implementation/" },
  { target: ".issues/", from: "files/.issues/" },
  { target: "reviews/", from: "files/reviews/" },
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
    return routeRequestCommand(context.cwd, parsedRoute.value);
  }

  if (command === "validate-route-output") {
    const parsedValidateRouteOutput = parseValidateRouteOutputArgs(args.slice(1), context.cwd);
    if (!parsedValidateRouteOutput.ok) {
      return parsedValidateRouteOutput.error;
    }
    return validateRouteOutputCommand(context.cwd, parsedValidateRouteOutput.value);
  }

  if (command === "validate-execution-plan") {
    const parsedValidateExecutionPlan = parseValidateExecutionPlanArgs(args.slice(1), context.cwd);
    if (!parsedValidateExecutionPlan.ok) {
      return parsedValidateExecutionPlan.error;
    }
    return validateExecutionPlanCommand(context.cwd, parsedValidateExecutionPlan.value);
  }

  if (command === "intake") {
    const parsedIntake = parseIntakeArgs(args.slice(1));
    if (!parsedIntake.ok) {
      return parsedIntake.error;
    }
    return intakeCommand(context.cwd, parsedIntake.value);
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

  const templateEntry = resolveTemplateEntry(template.packageSubpath);
  const templateDir = dirname(templateEntry);
  const templatePackageRoot = dirname(templateDir);
  const baseResult = await copyTemplateDirectory(templateDir, context.cwd, { exclude: [".gitignore.template"] });
  const overlayResult = await applyProjectModeOverlay(templatePackageRoot, template.name, options.mode, context.cwd);
  await persistProjectMode(join(context.cwd, ".specos", "manifest.yaml"), options.mode);
  const gitignoreResult = await writeGitignoreFromTemplate(templateDir, context.cwd);

  const initializedManifest = await loadProjectManifest(context.cwd);
  if (initializedManifest) {
    await mkdir(join(context.cwd, initializedManifest.artifacts.draftsDir), { recursive: true });
    await mkdir(join(context.cwd, initializedManifest.artifacts.specsDir), { recursive: true });
    await mkdir(join(context.cwd, initializedManifest.artifacts.issuesDir), { recursive: true });
    await mkdir(join(context.cwd, initializedManifest.artifacts.testsDir), { recursive: true });
    await mkdir(join(context.cwd, initializedManifest.artifacts.resultsDir), { recursive: true });
  }

  const lines = [
    "SPECOS_INIT_OK",
    `template ${template.name}`,
    `mode ${options.mode}`,
    `written ${baseResult.written.length + overlayResult.written.length + gitignoreResult.written.length}`,
    `skipped ${baseResult.skipped.length + overlayResult.skipped.length + gitignoreResult.skipped.length}`,
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

  const validManifest = manifest as unknown as CliManifest;
  const pathValidation = validateArtifactPaths(validManifest);
  if (pathValidation.length > 0) {
    return failure("SPECOS_MANIFEST_INVALID", `Invalid artifact paths: ${pathValidation.join(", ")}`);
  }

  const missingDirs = await missingRequiredDirs(cwd, validManifest);

  if (missingDirs.length > 0) {
    return failure("SPECOS_DIRECTORY_MISSING", `Missing required directories: ${missingDirs.join(", ")}`);
  }

  const missingWorkflows = await missingRequiredWorkflowDefs(cwd, validManifest);

  if (missingWorkflows.length > 0) {
    return failure("SPECOS_WORKFLOW_MISSING", `Missing required workflows: ${missingWorkflows.join(", ")}`);
  }

  const features = await discoverMarkdownFiles(join(cwd, validManifest.artifacts.specsDir));

  return {
    exitCode: 0,
    stdout: `SPECOS_CHECK_OK manifest valid; directories valid; workflows valid; features ${features.length}\n`,
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
    (manifest.artifacts as CliManifest["artifacts"]).issuesDir,
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

async function missingRequiredWorkflowDefs(cwd: string, manifest: SpecosManifest): Promise<string[]> {
  const missing: string[] = [];

  for (const workflowId of manifest.workflows) {
    const workflowPath = join(cwd, ".specos", "workflows", `${workflowId}.yaml`);
    if (!(await pathExists(workflowPath))) {
      missing.push(`.specos/workflows/${workflowId}.yaml`);
    }
  }

  return missing;
}

async function discoverMarkdownFiles(root: string): Promise<string[]> {
  if (!(await pathExists(root))) return [];
  const files: string[] = [];
  async function visit(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) { await visit(absolutePath); continue; }
      if (entry.isFile() && entry.name.endsWith(".md")) files.push(toPosixPath(absolutePath.slice(root.length + 1)));
    }
  }
  await visit(root);
  return files;
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
  let mode: ProjectMode = "goalspec";

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

    if (arg === "--mode") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--mode requires a value") };
      }
      if (value !== "litespec" && value !== "goalspec" && value !== "enterprisespec") {
        return {
          ok: false,
          error: failure("SPECOS_ARGUMENT_INVALID", "--mode must be litespec, goalspec, or enterprisespec"),
        };
      }
      mode = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported init argument: ${arg}\n${commandHelp}`) };
  }

  return { ok: true, value: { template, mode } };
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
  let format: RouteRequestOptions["format"] = "full";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--request") {
      request = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--format") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--format requires a value") };
      }
      if (
        value !== "full" &&
        value !== "dispatch-json" &&
        value !== "primary-json" &&
        value !== "execution-plan-json"
      ) {
        return {
          ok: false,
          error: failure(
            "SPECOS_ARGUMENT_INVALID",
            "--format must be full, dispatch-json, primary-json, or execution-plan-json",
          ),
        };
      }
      format = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported route-request argument: ${arg}`) };
  }

  if (!request?.trim()) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "route-request requires --request <text>") };
  }

  return { ok: true, value: { request: request.trim(), format } };
}

function parseValidateRouteOutputArgs(
  args: string[],
  cwd: string,
): { ok: true; value: ValidateRouteOutputOptions } | { ok: false; error: RunCliResult } {
  let file: string | undefined;
  let format: ValidateRouteOutputOptions["format"] = "full";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--file") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "validate-route-output requires --file <path>") };
      }
      file = resolve(cwd, value);
      index += 1;
      continue;
    }

    if (arg === "--format") {
      const value = args[index + 1];
      if (!value) {
        return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "--format requires a value") };
      }
      if (
        value !== "full" &&
        value !== "dispatch-json" &&
        value !== "primary-json" &&
        value !== "execution-plan-json"
      ) {
        return {
          ok: false,
          error: failure(
            "SPECOS_ARGUMENT_INVALID",
            "--format must be full, dispatch-json, primary-json, or execution-plan-json",
          ),
        };
      }
      format = value;
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported validate-route-output argument: ${arg}`) };
  }

  if (!file) {
    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "validate-route-output requires --file <path>") };
  }

  return { ok: true, value: { file, format } };
}

function parseValidateExecutionPlanArgs(
  args: string[],
  cwd: string,
): { ok: true; value: ValidateExecutionPlanOptions } | { ok: false; error: RunCliResult } {
  let file: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--file") {
      const value = args[index + 1];
      if (!value) {
        return {
          ok: false,
          error: failure("SPECOS_ARGUMENT_INVALID", "validate-execution-plan requires --file <path>"),
        };
      }
      file = resolve(cwd, value);
      index += 1;
      continue;
    }

    return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported validate-execution-plan argument: ${arg}`) };
  }

  if (!file) {
    return {
      ok: false,
      error: failure("SPECOS_ARGUMENT_INVALID", "validate-execution-plan requires --file <path>"),
    };
  }

  return { ok: true, value: { file } };
}

function resolveTemplate(name: string): TemplateDefinition | undefined {
  return templates.find((template) => template.name === name);
}

function resolveTemplateEntry(packageSubpath: string): string {
  return realpathSync(packageRequire.resolve(packageSubpath));
}

function loadProjectManifestSync(cwd: string): CliManifest | undefined {
  try { return parseManifestYaml(readFileSync(join(cwd, ".specos", "manifest.yaml"), "utf8")) as unknown as CliManifest; } catch { return undefined; }
}

async function loadProjectManifest(cwd: string): Promise<CliManifest | undefined> {
  try { return parseManifestYaml(await readFile(join(cwd, ".specos", "manifest.yaml"), "utf8")) as unknown as CliManifest; } catch { return undefined; }
}

function artifactRoot(manifest: CliManifest | undefined, key: "testsDir" | "resultsDir"): string {
  return manifest?.artifacts[key] ?? (key === "testsDir" ? "tests" : "tests/results");
}

function testArtifactPath(cwd: string, manifest: CliManifest | undefined, ...segments: string[]): string {
  return join(cwd, artifactRoot(manifest, "testsDir"), ...segments);
}

function resultArtifactPath(cwd: string, manifest: CliManifest | undefined, ...segments: string[]): string {
  return join(cwd, artifactRoot(manifest, "resultsDir"), ...segments);
}

async function applyProjectModeOverlay(
  templatePackageRoot: string,
  templateName: string,
  mode: ProjectMode,
  cwd: string,
) {
  if (mode === "litespec") {
    return { written: [], skipped: [] };
  }

  const overlayDir = join(templatePackageRoot, "modes", mode, templateName);
  if (!(await pathExists(overlayDir))) {
    return { written: [], skipped: [] };
  }

  return copyTemplateDirectory(overlayDir, cwd, { overwrite: true });
}

async function writeGitignoreFromTemplate(templateDir: string, cwd: string) {
  const source = join(templateDir, ".gitignore.template");
  const target = join(cwd, ".gitignore");

  if (!(await pathExists(source))) {
    return { written: [], skipped: [] };
  }

  if (await pathExists(target)) {
    return { written: [], skipped: [".gitignore"] };
  }

  await copyFile(source, target);
  return { written: [".gitignore"], skipped: [] };
}

async function persistProjectMode(manifestPath: string, mode: ProjectMode) {
  if (!(await pathExists(manifestPath))) {
    return;
  }

  const source = await readFile(manifestPath, "utf8");
  const manifest = parseManifestYaml(source);
  manifest.projectMode = mode;
  const artifacts = typeof manifest.artifacts === "object" && manifest.artifacts !== null ? manifest.artifacts as Record<string, unknown> : {};
  artifacts.draftsDir = ".prd";
  artifacts.specsDir = ".features";
  artifacts.issuesDir = ".issues";
  manifest.artifacts = artifacts;
  await writeFile(manifestPath, stringify(manifest), "utf8");
}

async function exportAgentKitCommand(cwd: string, options: ExportAgentKitOptions): Promise<RunCliResult> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const bundleRoot = join(options.outDir, ".specos-bundle");
  const filesRoot = join(bundleRoot, "files");
  const manifestPath = join(filesRoot, ".specos", "manifest.yaml");
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

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, buildAgentKitProjectManifest(), "utf8");
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
  const manifest = await loadProjectManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  const prdPath = join(cwd, manifest.artifacts.draftsDir, `${options.id}.md`);
  await mkdir(dirname(prdPath), { recursive: true });
  await writeFile(
    prdPath,
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
      "- Human confirmation is required before this PRD updates `design/`, `.features/roadmap.md`, or a Feature Spec/Test Spec under `.features/` and creates implementation/verification Issues under `.issues/`.",
      "",
    ].join("\n"),
    "utf8",
  );

  return {
    exitCode: 0,
    stdout: `SPECOS_INTAKE_OK ${options.id} ${toPosixPath(relative(cwd, prdPath))}\n`,
    stderr: "",
  };
}

function routeRequestCommand(cwd: string, options: RouteRequestOptions): RunCliResult {
  try {
    const projectMode = detectProjectMode(cwd);
    const manifest = loadAgentRuntimeManifest(cwd);
    const overlayManifest = loadAgentModeOverlayManifest(cwd, projectMode);
    const { executionPlan, output } = buildValidatedRouteRequestOutput(options.request, options.format, {
      projectMode,
      manifest,
      manifestPath: ".agents/manifest.yaml",
      overlayManifest,
    });
    const route = executionPlan.route;

    return {
      exitCode: 0,
      stdout: `SPECOS_REQUEST_ROUTE_OK ${route.primaryAgent} format ${options.format}\n${JSON.stringify(output, null, 2)}\n`,
      stderr: "",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failure("SPECOS_ROUTE_OUTPUT_INVALID", reason);
  }
}

async function validateRouteOutputCommand(cwd: string, options: ValidateRouteOutputOptions): Promise<RunCliResult> {
  let source: string;

  try {
    source = await readFile(options.file, "utf8");
  } catch {
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      `Route output file not found: ${toPosixPath(relative(cwd, options.file))}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      `Invalid JSON in route output file ${toPosixPath(relative(cwd, options.file))}: ${reason}`,
    );
  }

  const validation = validateRouteRequestOutput(parsed, options.format);
  if (!validation.ok) {
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      validation.errors.map((issue) => `${issue.path ?? "route-output"} ${issue.message}`).join("; "),
    );
  }

  return {
    exitCode: 0,
    stdout: `SPECOS_ROUTE_OUTPUT_OK format ${options.format} ${toPosixPath(relative(cwd, options.file))}\n`,
    stderr: "",
  };
}

async function validateExecutionPlanCommand(cwd: string, options: ValidateExecutionPlanOptions): Promise<RunCliResult> {
  let source: string;

  try {
    source = await readFile(options.file, "utf8");
  } catch {
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      `Execution plan file not found: ${toPosixPath(relative(cwd, options.file))}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      `Invalid JSON in execution plan file ${toPosixPath(relative(cwd, options.file))}: ${reason}`,
    );
  }

  const validation = validateExecutionPlanOutput(parsed);
  if (!validation.ok) {
    return failure(
      "SPECOS_ROUTE_OUTPUT_INVALID",
      validation.errors.map((issue) => `${issue.path ?? "executionPlan"} ${issue.message}`).join("; "),
    );
  }

  return {
    exitCode: 0,
    stdout: `SPECOS_EXECUTION_PLAN_OK ${toPosixPath(relative(cwd, options.file))}\n`,
    stderr: "",
  };
}

function detectProjectMode(cwd: string): ProjectMode {
  try {
    const manifestPath = join(cwd, ".specos", "manifest.yaml");
    const manifest = parseManifestYaml(readFileSync(manifestPath, "utf8"));
    if (manifest.projectMode === "enterprisespec" || manifest.projectMode === "goalspec") {
      return manifest.projectMode;
    }
    return "litespec";
  } catch {
    return "litespec";
  }
}

function loadAgentRuntimeManifest(cwd: string): AgentRuntimeManifest | undefined {
  try {
    return parseManifestYaml(readFileSync(join(cwd, ".agents", "manifest.yaml"), "utf8")) as AgentRuntimeManifest;
  } catch {
    return undefined;
  }
}

function loadAgentModeOverlayManifest(cwd: string, projectMode: ProjectMode): AgentModeOverlayManifest | undefined {
  try {
    return parseManifestYaml(
      readFileSync(join(cwd, ".agents", "modes", projectMode, "manifest.overlay.yaml"), "utf8"),
    ) as AgentModeOverlayManifest;
  } catch {
    return undefined;
  }
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
  const installation = await installBundle({
    bundleRoot: bundleLocation.rootDir,
    targetRoot: cwd,
    manifest: validBundle,
  });

  return {
    exitCode: 0,
    stdout: `SPECOS_BUNDLE_INSTALL_OK ${validBundle.id} files ${installation.installedFiles}\n`,
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
  if (!workflowId) return failure("SPECOS_WORKFLOW_REQUIRED", "run-workflow requires a workflow id");
  const workflow = await loadWorkflowById(cwd, workflowId);
  if (!workflow) return failure("SPECOS_WORKFLOW_INVALID", `Workflow not found: ${workflowId}`);

  const executable = Array.isArray(workflow.steps);
  const declarative = Array.isArray(workflow.inputs) && Array.isArray(workflow.outputs) && Array.isArray(workflow.gates);
  if (!executable && !declarative) {
    return failure("SPECOS_WORKFLOW_INVALID", "Workflow must declare inputs, outputs, and gates or executable steps");
  }
  if (typeof workflow.id !== "string" || typeof workflow.name !== "string") {
    return failure("SPECOS_WORKFLOW_INVALID", "Workflow id and name are required");
  }

  if (declarative && !executable) {
    return {
      exitCode: 0,
      stdout: `SPECOS_WORKFLOW_RUN_OK ${workflow.id} inputs ${((workflow.inputs as unknown[]).length)} outputs ${((workflow.outputs as unknown[]).length)} gates ${((workflow.gates as unknown[]).length)}\n`,
      stderr: "",
    };
  }

  const validation = validateWorkflow(workflow);
  if (!validation.ok) {
    return failure("SPECOS_WORKFLOW_INVALID", validation.errors.map((error) => `${error.path ?? "workflow"} ${error.message}`).join("; "));
  }
  const validWorkflow = workflow as unknown as SpecosWorkflow;
  let stdout = "";
  for (const step of validWorkflow.steps ?? []) {
    try {
      const result = await exec(step.run, { cwd, maxBuffer: 1024 * 1024 });
      stdout += result.stdout;
      if (result.stderr) stdout += result.stderr;
    } catch (error) {
      if (error instanceof Error && "stdout" in error && "stderr" in error) {
        const failureStdout = typeof error.stdout === "string" ? error.stdout : "";
        const failureStderr = typeof error.stderr === "string" ? error.stderr : "";
        return { exitCode: 1, stdout: failureStdout, stderr: `SPECOS_WORKFLOW_STEP_FAILED ${step.id}\n${failureStderr}` };
      }
      return failure("SPECOS_WORKFLOW_INVALID", `Workflow step failed: ${step.id}`);
    }
  }
  return { exitCode: 0, stdout: `${stdout}SPECOS_WORKFLOW_RUN_OK ${validWorkflow.id} steps ${(validWorkflow.steps ?? []).length}\n`, stderr: "" };
}

async function generateTestPlanCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const parsed = parseGenerateTestPlanArgs(args);
  if (!parsed.ok) {
    return parsed.error;
  }

  const projectManifest = await loadProjectManifest(cwd);
  if (!projectManifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
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
  const testSpecBinding = await loadTestSpecBinding(cwd, specPath, projectManifest);
  if (!testSpecBinding.ok) {
    return testSpecBinding.error;
  }
  const testPlan = buildDeterministicTestPlan(validSpec, testSpecBinding.value);
  const planValidation = validateTestPlan(testPlan);

  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const changeId = parsed.value.changeId ?? inferChangeIdFromSpecPath(cwd, specPath, projectManifest) ?? validSpec.id;
  const schedule = buildSpecChangeTestSchedule(testPlan, {
    changeId,
    executionMode: parsed.value.executionMode,
    specPath: toPosixPath(relative(cwd, specPath)),
    manifest: projectManifest,
    testSpecBinding: testSpecBinding.value,
  });
  const scheduleValidation = validateTestSchedule(schedule);

  if (!scheduleValidation.ok) {
    return failure(
      "SPECOS_TEST_SCHEDULE_INVALID",
      scheduleValidation.errors.map((error) => `${error.path ?? "testSchedule"} ${error.message}`).join("; "),
    );
  }

  const testsDir = artifactRoot(projectManifest, "testsDir");
  const planPath = join(cwd, testsDir, "plans", `${validSpec.id}.test-plan.json`);
  const schedulePath = join(cwd, testsDir, "schedules", `${validSpec.id}.test-schedule.json`);
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

async function loadTestSpecBinding(
  cwd: string,
  specPath: string,
  manifest: CliManifest,
): Promise<{ ok: true; value: TestSpecBinding } | { ok: false; error: RunCliResult }> {
  const specsRoot = manifest.artifacts.specsDir;
  const relativeSpecPath = toPosixPath(relative(cwd, specPath));
  const match = relativeSpecPath.match(new RegExp(`^${escapeRegExp(specsRoot.replace(/\\/g, "/"))}/([^/]+)/(?:spec\\.(?:md|json))$`));
  if (!match) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_INVALID", "Feature Spec must be inside the manifest specsDir feature directory") };
  }

  const featureDir = match[1];
  const testSpecPath = join(cwd, specsRoot, featureDir, "test-spec.md");
  if (!(await pathExists(testSpecPath))) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_MISSING", `Test Spec not found: ${toPosixPath(relative(cwd, testSpecPath))}`) };
  }

  const source = await readFile(testSpecPath, "utf8");
  const frontmatter = parseMarkdownFrontmatter(source);
  const record = frontmatter ?? {};
  const sourceSpecId = String(record.sourceSpecId ?? record.specId ?? "").trim();
  const sourceSpecVersion = String(record.sourceSpecVersion ?? record.specVersion ?? "").trim();
  const testSpecVersion = String(record.testSpecVersion ?? "").trim();
  const status = String(record.status ?? "").trim();
  const testSpecId = String(record.testSpecId ?? "").trim();
  const declaredSourceSpec = String(record.sourceSpec ?? record.sourceSpecPath ?? "").trim();
  const expectedSourceSpec = toPosixPath(relative(cwd, specPath));
  const featureSpecSource = await readFile(specPath, "utf8");
  const sourceFeatureSpecHash = createHash("sha256").update(featureSpecSource).digest("hex");
  const declaredSourceSpecHash = String(record.sourceSpecHash ?? "").trim();
  const sourceApprovalEvidence = String(record.sourceApprovalEvidence ?? "").trim();
  const testSpecApprovalEvidence = String(record.testSpecApprovalEvidence ?? record.approvalEvidence ?? "").trim();

  if (!testSpecVersion || !sourceSpecId || !sourceSpecVersion || !status || !testSpecId || !declaredSourceSpec) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_INVALID", `Test Spec metadata is incomplete: ${toPosixPath(relative(cwd, testSpecPath))}`) };
  }
  if (declaredSourceSpec !== expectedSourceSpec) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_STALE", "Test Spec source path does not match Feature Spec") };
  }
  if (!declaredSourceSpecHash) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_INVALID", "Approved Test Spec requires sourceSpecHash") };
  }
  if (declaredSourceSpecHash !== sourceFeatureSpecHash) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_STALE", "Test Spec source hash does not match Feature Spec") };
  }
  const expectedSpec = parseArtifactObject(featureSpecSource, specPath) as Record<string, unknown>;
  if (sourceSpecId !== String(expectedSpec.id) || sourceSpecVersion !== String(expectedSpec.version)) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_STALE", "Test Spec source Spec ID or version does not match Feature Spec") };
  }
  if (status !== "approved") {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_UNAPPROVED", `Test Spec status must be approved, received ${status}`) };
  }
  if (!sourceApprovalEvidence || !testSpecApprovalEvidence) {
    return { ok: false, error: failure("SPECOS_TEST_SPEC_UNAPPROVED", "Approved Test Spec requires source and Test Spec approval evidence") };
  }

  return {
    ok: true,
    value: {
      testSpecPath: toPosixPath(relative(cwd, testSpecPath)),
      testSpecId,
      testSpecVersion,
      testSpecStatus: "approved",
      testSpecHash: createHash("sha256").update(source).digest("hex"),
      testSpecApprovalEvidence,
      sourceFeatureSpecHash,
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&");
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

  const projectManifest = await loadProjectManifest(cwd);
  const testsDir = artifactRoot(projectManifest, "testsDir");
  const planPath = join(cwd, testsDir, "plans", `${specId}.test-plan.json`);
  const schedulePath = join(cwd, testsDir, "schedules", `${specId}.test-schedule.json`);

  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: ${toPosixPath(relative(cwd, planPath))}`);
  }

  if (!(await pathExists(schedulePath))) {
    return failure("SPECOS_TEST_SCHEDULE_INVALID", `Test schedule not found: ${toPosixPath(relative(cwd, schedulePath))}`);
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

  const brunoDir = join(cwd, testsDir, "bruno", specId);
  if (!(await pathExists(brunoDir))) {
    return writeBlockedApiResult(cwd, plan, schedule, `Bruno collection not found at ${toPosixPath(relative(cwd, brunoDir))}`);
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

  const outputDir = resultArtifactPath(cwd, await loadProjectManifest(cwd));
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

  const projectManifest = await loadProjectManifest(cwd);
  const planPath = testArtifactPath(cwd, projectManifest, "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: ${toPosixPath(relative(cwd, planPath))}`);
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
  const outputDir = join(cwd, artifactRoot(projectManifest, "testsDir"), "bruno", specId);
  await mkdir(outputDir, { recursive: true });

  for (const asset of assets) {
    const outputPath = join(outputDir, asset.path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, asset.content, "utf8");
  }

  return {
    exitCode: 0,
    stdout: `SPECOS_BRUNO_TESTS_OK ${toPosixPath(relative(cwd, outputDir))} files ${assets.length}`,
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

  const projectManifest = await loadProjectManifest(cwd);
  const planPath = testArtifactPath(cwd, projectManifest, "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: ${toPosixPath(relative(cwd, planPath))}`);
  }

  const plan = parseArtifactObject(await readFile(planPath, "utf8"), planPath) as unknown as SpecosTestPlan;
  const planValidation = validateTestPlan(plan);
  if (!planValidation.ok) {
    return failure(
      "SPECOS_TEST_PLAN_INVALID",
      planValidation.errors.map((error) => `${error.path ?? "testPlan"} ${error.message}`).join("; "),
    );
  }

  const resultsRoot = resultArtifactPath(cwd, projectManifest);
  const resultFiles = await discoverJsonFiles(resultsRoot);
  const results: ScenarioResult[] = [];
  const invalidResultMessages: string[] = [];
  for (const file of resultFiles.filter((item) => !item.endsWith(".gate-report.json") && !item.endsWith(".session.json"))) {
    const filePath = join(resultsRoot, file);
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
  const jsonPath = join(resultsRoot, `${reportName}.json`);
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (parsed.value.changeId) {
    const projectManifest = await loadProjectManifest(cwd);
    const specDirectory = (await findFeatureSpecDirectoryById(cwd, parsed.value.changeId, projectManifest?.artifacts.specsDir)) ?? parsed.value.changeId;
    const markdownPath = join(cwd, "reviews", specDirectory, "gate-report.md");
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

  const projectManifest = await loadProjectManifest(cwd);
  const planPath = testArtifactPath(cwd, projectManifest, "plans", `${specId}.test-plan.json`);
  if (!(await pathExists(planPath))) {
    return failure("SPECOS_TEST_PLAN_INVALID", `Test plan not found: ${toPosixPath(relative(cwd, planPath))}`);
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
  }, artifactRoot(projectManifest, "resultsDir"));
  const validation = validateScenarioResult(result);
  if (!validation.ok) {
    return failure(
      "SPECOS_SCENARIO_RESULT_INVALID",
      validation.errors.map((error) => `${error.path ?? "scenarioResult"} ${error.message}`).join("; "),
    );
  }

  const outputDir = resultArtifactPath(cwd, await loadProjectManifest(cwd));
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

  const outputDir = resultArtifactPath(cwd, await loadProjectManifest(cwd));
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
  resultsDir: string,
): ScenarioResult {
  const runId = `run-${execution.testType}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const timestamp = new Date().toISOString();
  const passed = execution.exitCode === 0;
  const rawReportPath = toPosixPath(join(resultsDir, `${plan.specId}.${runId}.json`));
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
          artifactRefs: [{ type: "raw-report" as const, path: rawReportPath }],
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
          artifactRefs: [{ type: "raw-report" as const, path: rawReportPath }],
        }));

  return {
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    testSpecPath: plan.testSpecPath,
    testSpecId: plan.testSpecId,
    testSpecVersion: plan.testSpecVersion,
    testSpecHash: plan.testSpecHash,
    testSpecStatus: plan.testSpecStatus,
    testSpecApprovalEvidence: plan.testSpecApprovalEvidence,
    sourceFeatureSpecHash: plan.sourceFeatureSpecHash,
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

function inferChangeIdFromSpecPath(cwd: string, specPath: string, manifest?: CliManifest): string | undefined {
  const parts = toPosixPath(relative(cwd, specPath)).split("/");
  const featureRoot = manifest?.artifacts.specsDir ?? ".features";
  const rootParts = featureRoot.split("/");
  const rootIndex = parts.findIndex((part, index) => rootParts.every((item, offset) => parts[index + offset] === item));
  const featureDir = rootIndex >= 0 ? parts[rootIndex + rootParts.length] : undefined;
  if (featureDir) {
    const featureMatch = featureDir.match(/^([A-Z]+-\d{3})-/u);
    if (featureMatch) return featureMatch[1];
  }
  return undefined;
}

async function findFeatureSpecDirectoryById(cwd: string, specId: string, specsDir = ".features"): Promise<string | undefined> {
  const specsRoot = join(cwd, specsDir);
  if (!(await pathExists(specsRoot))) return undefined;
  const entries = await readdir(specsRoot, { withFileTypes: true });
  const prefix = `${specId}-`;
  return entries.find((entry) => entry.isDirectory() && entry.name.startsWith(prefix))?.name;
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
      prdTemplate: ".prd/_template/feature/product-ui.template.md",
      designTemplate: "design/_template/platform-design.template.md",
      featureTemplate: ".features/_template/feature/spec.example.md",
      issueTemplate: ".issues/_template/issue.md",
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

function buildAgentKitProjectManifest(): string {
  return stringify({
    project: {
      name: "specos-agent-team-kit",
      type: "fullstack",
    },
    projectMode: "goalspec",
    stacks: {
      frontend: "next",
      backend: "node-api",
    },
    artifacts: {
      draftsDir: ".prd",
      specsDir: ".features",
      issuesDir: ".issues",
      testsDir: "tests",
      resultsDir: "tests/results",
    },
    rulePacks: ["spec-driven-delivery"],
    agentTemplates: [
      "product-architect-agent",
      "spec-editor",
      "frontend-agent",
      "backend-agent",
      "testing-agent",
      "qa-agent",
      "ci-editor",
      "reviewer",
    ],
    workflows: [agentKitWorkflowId],
    ci: {
      checkCommand: "npx specos check",
    },
  });
}

function buildAgentKitWorkflow(): string {
  return [
    `id: ${agentKitWorkflowId}`,
    "name: Spec Driven Default",
    "steps:",
    "  - id: smoke-agent-kit",
    `    run: "node -e \\"const fs=require('fs'); for (const p of ['.agents/manifest.yaml','ai/agents/spec-editor.md','rules/README.md','current/README.md','docs/spec-modes/README.md','design/README.md','.prd','.features','.issues','implementation/README.md','reviews/README.md','tests/README.md']) { if (!fs.existsSync(p)) throw new Error('Missing '+p); } console.log('agent-kit-smoke-ok');\\""`,
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
  void runCli(process.argv.slice(2), { cwd: process.cwd() }).then((result) => {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exitCode = result.exitCode;
  });
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

function parseMarkdownFrontmatter(source: string): Record<string, unknown> | undefined {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") {
    return undefined;
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---" || lines[index] === "...") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex < 0) {
    return undefined;
  }

  const frontmatterSource = lines.slice(1, closingIndex).join("\n");
  if (frontmatterSource.trim().length === 0) {
    return {};
  }
  return parseYamlObject(frontmatterSource);
}

function parseArtifactObject(source: string, filePath: string): Record<string, unknown> {
  if (filePath.endsWith(".json")) {
    const parsed = JSON.parse(source);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  }

  if (filePath.endsWith(".md")) {
    const frontmatter = parseMarkdownFrontmatter(source);
    if (frontmatter !== undefined) {
      return frontmatter;
    }
  }

  return parseYamlObject(source);
}
