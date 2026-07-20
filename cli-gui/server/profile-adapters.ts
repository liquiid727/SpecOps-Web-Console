import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CliProfileV2, CliProfileCapabilities, CliOptionDefinition } from "../shared/types.js";
import type { ProfileAdapterRegistry } from "./ports.js";

const execFileAsync = promisify(execFile);

export class UnsupportedCliOptionError extends Error {
  readonly code = "CLI_OPTION_UNSUPPORTED" as const;
  constructor(readonly option: string) {
    super(`CLI option is not supported: ${option}`);
    this.name = "UnsupportedCliOptionError";
  }
}

const genericCapabilities: CliProfileCapabilities = {
  adapterId: "generic",
  compatibility: "supported",
  permissions: [],
  modes: [],
  models: [],
  supportsComposer: true,
  supportsStructuredRecognition: false
};

const claudeOptions = {
  permissions: options(["default", "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan"]),
  modes: options([]),
  models: options(["default", "sonnet", "opus", "haiku"])
};

const codexOptions = {
  permissions: options(["default", "untrusted", "on-request", "never"]),
  modes: options(["default", "read-only", "workspace-write", "danger-full-access"]),
  models: options(["default", "gpt-5", "gpt-5-codex"])
};

export function createProfileAdapterRegistry(): ProfileAdapterRegistry {
  const capabilityCache = new Map<string, Promise<CliProfileCapabilities>>();

  async function capabilities(profile: CliProfileV2): Promise<CliProfileCapabilities> {
    const key = `${profile.id}:${profile.command}:${profile.adapterId}:${profile.adapterVersionRange ?? ""}`;
    const cached = capabilityCache.get(key);
    if (cached) return cached;
    const pending = detectCapabilities(profile);
    capabilityCache.set(key, pending);
    return pending;
  }

  return {
    availableAdapterIds: ["claude-code", "codex", "generic"],
    capabilities,
    async resolveLaunch(profile, config) {
      const detected = await capabilities(profile);
      const args = [...profile.args];
      if (detected.compatibility !== "supported") return { command: profile.command, args, capabilities: detected };
      const adapter = profile.adapterId;
      appendOption(args, config.permission, adapter === "claude-code" ? "--permission-mode" : adapter === "codex" ? "--ask-for-approval" : undefined, detected.permissions);
      appendOption(args, config.mode, adapter === "codex" ? "--sandbox" : undefined, detected.modes);
      appendOption(args, config.model, "--model", detected.models);
      return { command: profile.command, args, capabilities: detected };
    }
  };
}

async function detectCapabilities(profile: CliProfileV2): Promise<CliProfileCapabilities> {
  if (profile.adapterId === "generic") return { ...genericCapabilities };
  let detectedVersion: string | undefined;
  let compatibility: CliProfileCapabilities["compatibility"] = "unknown-version";
  try {
    const result = await execFileAsync(profile.command, ["--version"], { timeout: 2_000, maxBuffer: 64 * 1024, shell: false, env: process.env });
    detectedVersion = `${result.stdout} ${result.stderr}`.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0];
    compatibility = detectedVersion ? "supported" : "unknown-version";
  } catch (error) {
    compatibility = (error as NodeJS.ErrnoException).code === "ENOENT" ? "unavailable" : "unknown-version";
  }
  const optionSet = profile.adapterId === "claude-code" ? claudeOptions : codexOptions;
  return {
    adapterId: profile.adapterId,
    detectedVersion,
    compatibility,
    permissions: compatibility === "supported" ? optionSet.permissions : [],
    modes: compatibility === "supported" ? optionSet.modes : [],
    models: compatibility === "supported" ? optionSet.models : [],
    supportsComposer: true,
    supportsStructuredRecognition: compatibility === "supported"
  };
}

function appendOption(args: string[], value: string | null, flag: string | undefined, definitions: CliOptionDefinition[]) {
  if (!value || value === "default") return;
  if (!flag || !definitions.some((definition) => definition.id === value)) throw new UnsupportedCliOptionError(value);
  args.push(flag, value);
}

function options(ids: string[]): CliOptionDefinition[] {
  return ids.map((id) => ({ id, labelKey: `cli.option.${id}`, requiresRestart: true }));
}
