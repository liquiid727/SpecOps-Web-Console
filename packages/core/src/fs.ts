import { access, copyFile, lstat, mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

export interface CopyTemplateOptions {
  overwrite?: boolean;
  exclude?: string[];
}

export interface CopyTemplateResult {
  written: string[];
  skipped: string[];
}

export async function copyTemplateDirectory(
  source: string,
  target: string,
  options: CopyTemplateOptions = {},
): Promise<CopyTemplateResult> {
  await assertNotSymlink(target, target);
  const excluded = new Set(options.exclude ?? []);
  const files = (await listFiles(source)).filter((relativePath) => !excluded.has(relativePath));
  const result: CopyTemplateResult = { written: [], skipped: [] };

  for (const relativePath of files) {
    const sourcePath = join(source, relativePath);
    const targetPath = join(target, relativePath);

    if (!options.overwrite && (await pathExists(targetPath))) {
      result.skipped.push(relativePath);
      continue;
    }

    await assertNoSymlinkTargetSegments(target, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    result.written.push(relativePath);
  }

  return result;
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(current: string) {
    const entries = await readdir(current);

    for (const entry of entries.sort()) {
      const absolutePath = join(current, entry);
      const stat = await lstat(absolutePath);

      if (stat.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (stat.isFile()) {
        files.push(toPosixPath(relative(root, absolutePath)));
      }
    }
  }

  await visit(root);
  return files.sort();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

async function assertNotSymlink(targetRoot: string, path: string): Promise<void> {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlink: ${toPosixPath(relative(targetRoot, path)) || "."}`);
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function assertNoSymlinkTargetSegments(targetRoot: string, relativePath: string): Promise<void> {
  const segments = relativePath.split("/");
  let current = targetRoot;

  for (const segment of segments) {
    current = join(current, segment);
    await assertNotSymlink(targetRoot, current);
  }
}
