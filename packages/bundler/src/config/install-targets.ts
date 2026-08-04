import type { ExportFile, SpecosBundleInstall } from "../types.js";

export const INSTALL_TARGET_PRIORITY = [
  "skills/developer/",
  "agent-teams/",
  "ai/agents/",
  "engineering-packs/",
  "current/",
  "design/",
  "docs/",
  "implementation/",
  "reviews/",
  "rules/",
  ".prd/_template/",
  ".features/_rules/",
  ".features/_template/",
  ".issues/_template/",
  ".specos/workflows/"
] as const;

const TARGET_PREFIXES = INSTALL_TARGET_PRIORITY.filter((target) => target !== ".specos/workflows/");

export function resolveInstallTarget(targetPath: string) {
  const configuredTarget = TARGET_PREFIXES.find((target) => targetPath.startsWith(target));

  if (configuredTarget) {
    return configuredTarget;
  }

  const [firstSegment] = targetPath.split("/");
  return firstSegment ? `${firstSegment}/` : undefined;
}

export function deriveInstallMappings(files: ExportFile[]): SpecosBundleInstall[] {
  const installs = new Set<string>();

  for (const file of files) {
    const target = resolveInstallTarget(file.targetPath);
    if (target) {
      installs.add(target);
    }
  }

  installs.add(".specos/workflows/");

  return INSTALL_TARGET_PRIORITY.filter((target) => installs.has(target)).map((target) => ({
    target,
    from: `files/${target}`
  }));
}
