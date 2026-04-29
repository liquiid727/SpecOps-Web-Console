#!/usr/bin/env node

import { exec as execCallback } from "node:child_process";
import { realpathSync } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  copyTemplateDirectory,
  validateBundle,
  validateManifest,
  validateWorkflow,
  type SpecosBundleManifest,
  type SpecosManifest,
  type SpecosWorkflow,
} from "@specos/core";
import { parse } from "yaml";

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
  { name: "spec-only", relativePath: "../templates/spec-only" },
];
const templateNames = templates.map((template) => template.name).join(", ");
const exec = promisify(execCallback);
const supportedCommands = "Supported commands: init, check, validate-bundle, install-bundle, list-workflows, run-workflow";
const commandHelp = `${supportedCommands}\nTemplates: ${templateNames}`;

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

function resolveTemplate(name: string): TemplateDefinition | undefined {
  return templates.find((template) => template.name === name);
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
