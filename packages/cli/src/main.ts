#!/usr/bin/env node

import { accessSync, realpathSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { copyTemplateDirectory, validateManifest } from "@specos/core";
import type { SpecosManifest } from "@specos/core";
import { parse } from "yaml";

export interface RunCliOptions {
  cwd: string;
}

export interface RunCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface GoalSpecSelection {
  kind: "child-package";
  requirementId: string;
  requirementSlug: string;
  specId: string;
  specSlug: string;
  packagePath: string;
  specPath: string;
  testPath: string;
  issuePath: string;
  reviewPath: string;
  acceptancePath: string;
  evidencePath: string;
}

interface TemplateDefinition {
  name: "fullstack" | "spec-only";
  entry: string;
}

interface CliManifest extends SpecosManifest {}

const packageRequire = createRequire(import.meta.url);
const templates: TemplateDefinition[] = [
  { name: "fullstack", entry: "@specos/templates/fullstack/AGENTS.md" },
  { name: "spec-only", entry: "@specos/templates/spec-only/AGENTS.md" },
];
const supportedCommands = "Supported commands: init, intake, check, test, gate, resolve";

export async function runCli(args: string[], options: RunCliOptions): Promise<RunCliResult> {
  try {
    const [command, ...commandArgs] = args;

    if (command === "init") return await initProject(options.cwd, commandArgs);
    if (command === "intake") return await intakeCommand(options.cwd, commandArgs);
    if (command === "check") return await checkProject(options.cwd);
    if (command === "test") return await testCommand(options.cwd, commandArgs);
    if (command === "gate") return await gateCommand(options.cwd, commandArgs);
    if (command === "resolve") return await resolveCommand(options.cwd, commandArgs);

    return failure("SPECOS_COMMAND_UNKNOWN", `${supportedCommands}\n`);
  } catch (error) {
    if (error instanceof CliError) return failure(error.code, error.message);
    return failure("SPECOS_COMMAND_FAILED", error instanceof Error ? error.message : String(error));
  }
}

export function resolveTemplate(name: string): string | undefined {
  const template = templates.find((item) => item.name === name);
  if (!template) return undefined;
  return dirname(packageRequire.resolve(template.entry));
}

export async function resolveGoalSpecSelection(cwd: string, selector: string): Promise<GoalSpecSelection> {
  const manifest = await loadManifest(cwd);
  if (!manifest) throw new CliError("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  assertValidManifest(cwd, manifest);

  const parsed = parseChildSelector(selector);
  if (!parsed.ok) throw new CliError("SPECOS_SELECTOR_INVALID", parsed.error);
  const requirementsRoot = resolveInside(cwd, manifest.artifacts.requirementsDir);
  const packagePath = resolve(requirementsRoot, parsed.requirementDirectory, "specs", parsed.specDirectory);
  if (!isWithin(requirementsRoot, packagePath)) {
    throw new CliError("SPECOS_SELECTOR_INVALID", `Selector escapes ${manifest.artifacts.requirementsDir}`);
  }
  if (!(await pathExists(packagePath))) {
    throw new CliError("SPECOS_PACKAGE_MISSING", `Child Spec Package not found: ${parsed.canonical}`);
  }

  return {
    kind: "child-package",
    requirementId: parsed.requirementId,
    requirementSlug: parsed.requirementSlug,
    specId: parsed.specId,
    specSlug: parsed.specSlug,
    packagePath,
    specPath: join(packagePath, "spec.md"),
    testPath: join(packagePath, "test.md"),
    issuePath: join(packagePath, "issues"),
    reviewPath: join(packagePath, "review.md"),
    acceptancePath: join(packagePath, "acceptance.md"),
    evidencePath: join(packagePath, "evidence"),
  };
}

async function initProject(cwd: string, args: string[]): Promise<RunCliResult> {
  let templateName: string = "fullstack";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--template") {
      const value = args[index + 1];
      if (!value) return failure("SPECOS_ARGUMENT_INVALID", "--template requires a value");
      templateName = value;
      index += 1;
      continue;
    }
    if (arg === "--mode") {
      return failure("SPECOS_ARGUMENT_INVALID", "init does not accept --mode; GoalSpec is the only workflow");
    }
    return failure("SPECOS_ARGUMENT_INVALID", `Unsupported init argument: ${arg}`);
  }

  const template = templates.find((item) => item.name === templateName);
  if (!template) {
    return failure("SPECOS_TEMPLATE_UNKNOWN", `Unknown template: ${templateName}; available: fullstack, spec-only`);
  }

  const templateDir = dirname(packageRequire.resolve(template.entry));
  const copied = await copyTemplateDirectory(templateDir, cwd, { exclude: [".gitignore.template"] });
  const gitignore = await writeGitignore(templateDir, cwd);
  const manifest = await loadManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_INVALID", "initialized template has no valid manifest");
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.ok) {
    return failure("SPECOS_MANIFEST_INVALID", manifestValidation.errors.map((error) => `${error.path} ${error.message}`).join("; "));
  }

  await mkdir(resolveInside(cwd, manifest.artifacts.requirementsDir), { recursive: true });
  await mkdir(resolveInside(cwd, manifest.artifacts.templatesDir), { recursive: true });

  return success([
    "SPECOS_INIT_OK",
    `template ${template.name}`,
    `written ${copied.written.length + gitignore.written.length}`,
    `skipped ${copied.skipped.length + gitignore.skipped.length}`,
  ]);
}

async function intakeCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const parsed = parseIntakeArgs(args);
  if (!parsed.ok) return parsed.error;

  const manifest = await loadManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  const manifestError = getManifestValidationError(cwd, manifest);
  if (manifestError) return failure("SPECOS_MANIFEST_INVALID", manifestError);

  const workspaceName = `${parsed.id}-${parsed.slug}`;
  const workspacePath = join(resolveInside(cwd, manifest.artifacts.requirementsDir), workspaceName);
  if (await pathExists(workspacePath)) {
    return failure("SPECOS_ARTIFACT_EXISTS", `Requirement Workspace already exists: ${workspaceName}`);
  }

  const templateRoot = resolveInside(cwd, manifest.artifacts.templatesDir);
  const templateFiles = ["prd.md", "index.yaml", "acceptance.md"];
  for (const file of templateFiles) {
    if (!(await pathExists(join(templateRoot, file)))) {
      return failure("SPECOS_TEMPLATE_MISSING", `Missing GoalSpec template: ${manifest.artifacts.templatesDir}/${file}`);
    }
  }

  await mkdir(join(workspacePath, "specs"), { recursive: true });
  const title = toTitle(parsed.slug);
  const replacements = new Map([
    ["R001", parsed.id],
    ["<Requirement Title>", title],
    ["<owner>", "unassigned"],
  ]);

  for (const file of templateFiles) {
    let content = await readFile(join(templateRoot, file), "utf8");
    for (const [from, to] of replacements) content = content.split(from).join(to);
    if (file === "prd.md") {
      content += `\n## Intake Request\n\n${parsed.request}\n`;
    }
    await writeFile(join(workspacePath, file), content, "utf8");
  }

  return success(["SPECOS_INTAKE_OK", `workspace ${toPosix(relative(cwd, workspacePath))}`, `request ${parsed.id}`]);
}

async function checkProject(cwd: string): Promise<RunCliResult> {
  const manifest = await loadManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");

  const manifestError = getManifestValidationError(cwd, manifest);
  if (manifestError) return failure("SPECOS_MANIFEST_INVALID", manifestError);

  const missingDirectories = [manifest.artifacts.requirementsDir, manifest.artifacts.templatesDir]
    .filter((path) => !pathExistsSync(resolveInside(cwd, path)));
  if (missingDirectories.length > 0) return failure("SPECOS_DIRECTORY_MISSING", missingDirectories.join(", "));

  const missingWorkflows: string[] = [];
  for (const workflow of manifest.workflows) {
    const workflowPath = join(cwd, ".specos", "workflows", `${workflow}.yaml`);
    if (!(await pathExists(workflowPath))) missingWorkflows.push(toPosix(relative(cwd, workflowPath)));
  }
  if (missingWorkflows.length > 0) return failure("SPECOS_WORKFLOW_MISSING", missingWorkflows.join(", "));

  const workspaces = await countDirectories(resolveInside(cwd, manifest.artifacts.requirementsDir));
  return success([`SPECOS_CHECK_OK manifest valid; workflows valid; workspaces ${workspaces}`]);
}

async function testCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const selector = parseSelectorArgs(args);
  if (!selector.ok) return selector.error;
  const target = await resolveGoalSpecSelection(cwd, selector.value);
  const missing = [];
  if (!(await pathExists(target.specPath))) missing.push("spec.md");
  if (!(await pathExists(target.testPath))) missing.push("test.md");
  if (missing.length > 0) return failure("SPECOS_TEST_TARGET_INVALID", `Missing ${missing.join(", ")} in ${selector.value}`);
  return success(["SPECOS_TEST_TARGET_OK", `selector ${selector.value}`, `package ${toPosix(relative(cwd, target.packagePath))}`]);
}

async function gateCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const parsed = parseGateArgs(args);
  if (!parsed.ok) return parsed.error;
  const target = await resolveGoalSpecSelection(cwd, parsed.selector);
  const planPath = join(target.evidencePath, "plans", `${parsed.specId}.test-plan.json`);
  const issues: string[] = [];
  let plan: Record<string, unknown> | undefined;

  try {
    plan = parseJsonRecord(await readFile(planPath, "utf8"));
    if (plan.standardVersion !== "specos-test-standard") issues.push("test plan must declare specos-test-standard");
  } catch {
    issues.push(`test plan not found: ${toPosix(relative(cwd, planPath))}`);
  }

  const runFiles = await listJsonFiles(join(target.evidencePath, "artifacts"));
  if (runFiles.length === 0) {
    issues.push("no normalized test result found");
  } else {
    try {
      const latest = parseJsonRecord(await readFile(join(target.evidencePath, "artifacts", runFiles[0]), "utf8"));
      if (parsed.change && latest.changeId !== parsed.change) issues.push(`latest result changeId does not match ${parsed.change}`);
      if (latest.status !== "pass" || latest.releaseDecision !== "ready") issues.push("latest normalized result is not release-ready");
    } catch {
      issues.push(`invalid normalized result: ${runFiles[0]}`);
    }
  }

  const gateDir = join(target.evidencePath, "gates");
  await mkdir(gateDir, { recursive: true });
  const reportPath = join(gateDir, `${parsed.specId}.${parsed.change ?? "latest"}.gate-report.json`);
  const report = {
    schemaVersion: "specos-test-standard",
    selector: parsed.selector,
    changeId: parsed.change ?? null,
    status: issues.length === 0 ? "ready" : "blocked",
    checkedAt: new Date().toISOString(),
    plan: plan ? toPosix(relative(cwd, planPath)) : null,
    issues,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (issues.length > 0) return failure("SPECOS_GATE_BLOCKED", `${issues.join("; ")}\n${toPosix(relative(cwd, reportPath))}`);
  return success(["SPECOS_GATE_OK", `selector ${parsed.selector}`, `report ${toPosix(relative(cwd, reportPath))}`]);
}

async function resolveCommand(cwd: string, args: string[]): Promise<RunCliResult> {
  const [kind, value] = args;
  if (!kind || !value || args.length > 2) return failure("SPECOS_ARGUMENT_INVALID", "resolve requires <workspace|package|issue|design|workflow|template> <value>");

  if (kind === "package") {
    const target = await resolveGoalSpecSelection(cwd, value);
    return success(["SPECOS_RESOLVE_OK", `kind ${kind}`, `path ${toPosix(relative(cwd, target.packagePath))}`]);
  }
  if (kind === "workspace") return resolveWorkspace(cwd, value);
  if (kind === "issue") return resolveIssue(cwd, value);
  if (kind === "design") return resolveExistingPath(cwd, "design", value);
  if (kind === "workflow") return resolveExistingPath(cwd, join(".specos", "workflows"), `${value}.yaml`);
  if (kind === "template") {
    const path = resolveTemplate(value);
    return path ? success(["SPECOS_RESOLVE_OK", `kind template`, `path ${path}`]) : failure("SPECOS_TEMPLATE_UNKNOWN", value);
  }
  return failure("SPECOS_ARGUMENT_INVALID", `Unknown resolve kind: ${kind}`);
}

async function resolveWorkspace(cwd: string, selector: string): Promise<RunCliResult> {
  const manifest = await loadManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  const manifestError = getManifestValidationError(cwd, manifest);
  if (manifestError) return failure("SPECOS_MANIFEST_INVALID", manifestError);
  const match = /^(R\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(selector);
  if (!match) return failure("SPECOS_SELECTOR_INVALID", `Invalid workspace selector: ${selector}`);
  const path = join(resolveInside(cwd, manifest.artifacts.requirementsDir), selector);
  return (await pathExists(path))
    ? success(["SPECOS_RESOLVE_OK", "kind workspace", `path ${toPosix(relative(cwd, path))}`])
    : failure("SPECOS_WORKSPACE_MISSING", selector);
}

async function resolveIssue(cwd: string, selector: string): Promise<RunCliResult> {
  if (!/^ISSUE-R\d{3}-S\d{2}-\d{3}(?:-[a-z0-9-]+)?$/u.test(selector)) {
    return failure("SPECOS_SELECTOR_INVALID", `Invalid Issue selector: ${selector}`);
  }
  const manifest = await loadManifest(cwd);
  if (!manifest) return failure("SPECOS_MANIFEST_MISSING", ".specos/manifest.yaml is required");
  const manifestError = getManifestValidationError(cwd, manifest);
  if (manifestError) return failure("SPECOS_MANIFEST_INVALID", manifestError);
  const issue = await findFile(resolveInside(cwd, manifest.artifacts.requirementsDir), `${selector}.md`);
  return issue ? success(["SPECOS_RESOLVE_OK", "kind issue", `path ${toPosix(relative(cwd, issue))}`]) : failure("SPECOS_ISSUE_MISSING", selector);
}

async function resolveExistingPath(cwd: string, root: string, value: string): Promise<RunCliResult> {
  const path = resolveInside(cwd, join(root, value));
  if (!isWithin(resolveInside(cwd, root), path)) return failure("SPECOS_SELECTOR_INVALID", `Path escapes ${root}`);
  return (await pathExists(path))
    ? success(["SPECOS_RESOLVE_OK", `kind ${root}`, `path ${toPosix(relative(cwd, path))}`])
    : failure("SPECOS_ENTRYPOINT_MISSING", toPosix(relative(cwd, path)));
}

function parseIntakeArgs(args: string[]): { ok: true; id: string; slug: string; request: string } | { ok: false; error: RunCliResult } {
  let id: string | undefined;
  let slug: string | undefined;
  let request: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--id") id = args[++index];
    else if (arg === "--slug") slug = args[++index];
    else if (arg === "--request") request = args[++index];
    else return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported intake argument: ${arg}`) };
  }
  if (!id || !/^R\d{3}$/u.test(id)) return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "intake requires --id R0NN") };
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "intake requires --slug <lower-kebab-slug>") };
  if (!request?.trim()) return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "intake requires --request <text>") };
  return { ok: true, id, slug, request: request.trim() };
}

function parseSelectorArgs(args: string[]): { ok: true; value: string } | { ok: false; error: RunCliResult } {
  if (args.length === 1 && !args[0].startsWith("--")) return { ok: true, value: args[0] };
  if (args.length === 2 && args[0] === "--selector" && args[1]) return { ok: true, value: args[1] };
  return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "command requires a GoalSpec child selector") };
}

function parseGateArgs(args: string[]): { ok: true; selector: string; specId: string; change?: string } | { ok: false; error: RunCliResult } {
  let selector: string | undefined;
  let change: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--change") change = args[++index];
    else if (arg === "--selector") selector = args[++index];
    else if (!selector && !arg.startsWith("--")) selector = arg;
    else return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", `Unsupported gate argument: ${arg}`) };
  }
  if (!selector) return { ok: false, error: failure("SPECOS_ARGUMENT_INVALID", "gate requires a GoalSpec child selector") };
  const parsed = parseChildSelector(selector);
  if (!parsed.ok) return { ok: false, error: failure("SPECOS_SELECTOR_INVALID", parsed.error) };
  return { ok: true, selector, specId: parsed.specDirectory, change };
}

function parseChildSelector(selector: string): { ok: true; canonical: string; requirementId: string; requirementSlug: string; requirementDirectory: string; specId: string; specSlug: string; specDirectory: string } | { ok: false; error: string } {
  const normalized = selector.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
  const canonicalMatch = /^(R\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\/(S\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(normalized);
  const pathMatch = /^(?:\.requirements\/requirements\/)?(R\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\/specs\/(S\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(normalized);
  const match = canonicalMatch ?? pathMatch;
  if (!match) return { ok: false, error: `Invalid GoalSpec child selector: ${selector}` };
  const [, requirementId, requirementSlug, specId, specSlug] = match;
  return {
    ok: true,
    canonical: `${requirementId}-${requirementSlug}/${specId}-${specSlug}`,
    requirementId,
    requirementSlug,
    requirementDirectory: `${requirementId}-${requirementSlug}`,
    specId,
    specSlug,
    specDirectory: `${specId}-${specSlug}`,
  };
}

async function loadManifest(cwd: string): Promise<CliManifest | undefined> {
  try {
    const source = await readFile(join(cwd, ".specos", "manifest.yaml"), "utf8");
    const value = parse(source);
    return typeof value === "object" && value !== null ? value as CliManifest : undefined;
  } catch {
    return undefined;
  }
}

function assertValidManifest(cwd: string, manifest: CliManifest): void {
  const error = getManifestValidationError(cwd, manifest);
  if (error) throw new CliError("SPECOS_MANIFEST_INVALID", error);
}

function getManifestValidationError(cwd: string, manifest: CliManifest): string | undefined {
  const validation = validateManifest(manifest);
  if (!validation.ok) return validation.errors.map((error) => `${error.path} ${error.message}`).join("; ");

  const invalidPaths = Object.entries(manifest.artifacts)
    .filter(([, value]) => !isSafeProjectRelativePath(cwd, value))
    .map(([key]) => `artifacts.${key}`);
  return invalidPaths.length > 0 ? `Invalid artifact paths: ${invalidPaths.join(", ")}` : undefined;
}

function parseJsonRecord(source: string): Record<string, unknown> {
  const value: unknown = JSON.parse(source);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("JSON object required");
  return value as Record<string, unknown>;
}

async function writeGitignore(templateDir: string, cwd: string): Promise<{ written: string[]; skipped: string[] }> {
  const source = join(templateDir, ".gitignore.template");
  const target = join(cwd, ".gitignore");
  if (!(await pathExists(source))) return { written: [], skipped: [] };
  if (await pathExists(target)) return { written: [], skipped: [".gitignore"] };
  await copyFile(source, target);
  return { written: [".gitignore"], skipped: [] };
}

async function listJsonFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory)).filter((entry) => entry.endsWith(".json")).sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
}

async function findFile(root: string, filename: string): Promise<string | undefined> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(root, entry.name);
      if (entry.isFile() && entry.name === filename) return path;
      if (entry.isDirectory()) {
        const found = await findFile(path, filename);
        if (found) return found;
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function countDirectories(root: string): Promise<number> {
  try {
    return (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory() && /^R\d{3}-/u.test(entry.name)).length;
  } catch {
    return 0;
  }
}

function resolveInside(cwd: string, path: string): string {
  return resolve(cwd, path);
}

function isWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function isSafeProjectRelativePath(cwd: string, path: string): boolean {
  if (isAbsolute(path)) return false;
  const normalized = resolve(cwd, path);
  const relativePath = relative(cwd, normalized);
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`);
}

function pathExistsSync(path: string): boolean {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function toTitle(value: string): string {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function success(lines: string[]): RunCliResult {
  return { exitCode: 0, stdout: `${lines.join("\n")}\n`, stderr: "" };
}

function failure(code: string, message: string): RunCliResult {
  return { exitCode: 1, stdout: "", stderr: `${code} ${message}\n` };
}

class CliError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runCli(process.argv.slice(2), { cwd: process.cwd() });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
