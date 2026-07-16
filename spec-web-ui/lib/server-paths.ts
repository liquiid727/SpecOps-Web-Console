import { existsSync } from "node:fs";
import path from "node:path";

const appRootCandidates = [
  process.cwd(),
  path.join(process.cwd(), "spec-web-ui"),
  path.resolve(process.cwd(), "..", "spec-web-ui")
];

export const appRoot =
  appRootCandidates.find((candidate) =>
    existsSync(path.join(candidate, "catalog", "catalog-assets.json"))
  ) ?? process.cwd();

const repoRootCandidates = [
  appRoot,
  path.resolve(appRoot, ".."),
  path.resolve(appRoot, "..", "..")
];

export const repoRoot =
  repoRootCandidates.find((candidate) =>
    ["rules", "spec-draft", "specs"].some((directory) =>
      existsSync(path.join(candidate, directory))
    )
  ) ?? path.resolve(appRoot, "..");

export function ensureRelativeRepoPath(relativePath: string) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const relativeToRepoRoot = path.relative(repoRoot, absolutePath);

  if (relativeToRepoRoot.startsWith("..") || path.isAbsolute(relativeToRepoRoot)) {
    throw new Error(`Unsafe repository path: ${relativePath}`);
  }

  return absolutePath;
}
