import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface InstallManifest {
  id: string;
  version: string;
  installs: Array<{
    target: string;
    from: string;
  }>;
  workflow: {
    default: string;
  };
}

export interface InstallBundleInput {
  bundleRoot: string;
  targetRoot: string;
  manifest: InstallManifest;
  installedAt?: Date;
}

export interface InstallBundleResult {
  bundleId: string;
  installedFiles: number;
  installedRecordPath: string;
}

export async function installBundle(input: InstallBundleInput): Promise<InstallBundleResult> {
  let installedFiles = 0;

  for (const install of input.manifest.installs) {
    installedFiles += await copyInstallSource(
      join(input.bundleRoot, install.from),
      join(input.targetRoot, install.target)
    );
  }

  const installedRecordPath = join(
    input.targetRoot,
    ".specos",
    "bundles",
    "installed",
    `${input.manifest.id}.yaml`
  );
  await mkdir(dirname(installedRecordPath), { recursive: true });
  await writeFile(
    installedRecordPath,
    [
      `id: ${input.manifest.id}`,
      `version: ${input.manifest.version}`,
      `installedAt: ${(input.installedAt ?? new Date()).toISOString()}`,
      `defaultWorkflow: ${input.manifest.workflow.default}`,
      ""
    ].join("\n"),
    "utf8"
  );

  return {
    bundleId: input.manifest.id,
    installedFiles,
    installedRecordPath
  };
}

async function copyInstallSource(sourcePath: string, targetPath: string): Promise<number> {
  const sourceStat = await stat(sourcePath);

  if (sourceStat.isDirectory()) {
    await mkdir(targetPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    let written = 0;

    for (const entry of entries) {
      written += await copyInstallSource(
        join(sourcePath, entry.name),
        join(targetPath, entry.name)
      );
    }

    return written;
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
  return 1;
}
