import path from "node:path";

export const appRoot = process.cwd();
export const repoRoot = path.resolve(appRoot, "..");

export function ensureRelativeRepoPath(relativePath: string) {
  const absolutePath = path.resolve(repoRoot, relativePath);

  if (!absolutePath.startsWith(repoRoot)) {
    throw new Error(`Unsafe repository path: ${relativePath}`);
  }

  return absolutePath;
}
