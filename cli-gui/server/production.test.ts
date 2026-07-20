// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createProductionDependencies } from "./production.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("production filesystem and Git adapters", () => {
  it("uses bounded local Git inspection and excludes ignored files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-git-"));
    roots.push(root);
    await execFileAsync("git", ["init", "--quiet"], { cwd: root });
    await fs.writeFile(path.join(root, "README.md"), "# workspace\n", "utf8");
    await fs.writeFile(path.join(root, "secret.tmp"), "private\n", "utf8");
    await fs.writeFile(path.join(root, ".gitignore"), "*.tmp\n", "utf8");
    const dependencies = createProductionDependencies({ dataDirectory: path.join(root, "data"), readonly: true, processEnvironment: {} });
    const status = await dependencies.gitInspector.status(root);
    const files = await dependencies.gitInspector.listVisibleFiles!(root);
    expect(status.repository).toBe(true);
    expect(status.entries.some((entry) => entry.path === "README.md" && entry.unstaged === "untracked")).toBe(true);
    expect(files).toContain("README.md");
    expect(files).not.toContain("secret.tmp");
  });

  it("returns an explicit non-repository state and rejects Git-only diff inspection", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-non-git-"));
    roots.push(root);
    const dependencies = createProductionDependencies({ dataDirectory: path.join(root, "data"), readonly: true, processEnvironment: {} });
    await expect(dependencies.gitInspector.status(root)).resolves.toMatchObject({ repository: false, clean: true });
    await expect(dependencies.gitInspector.diff(root, "unstaged")).rejects.toMatchObject({ code: "NOT_A_GIT_REPOSITORY" });
  });
});
