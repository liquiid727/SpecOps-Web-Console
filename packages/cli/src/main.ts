#!/usr/bin/env node

import { access, mkdir, readFile, readdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { copyTemplateDirectory, validateManifest, type SpecosManifest } from "@specos/core";
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
const supportedCommands = "Supported commands: init, check";
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
