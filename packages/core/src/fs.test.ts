import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyTemplateDirectory } from "./fs";

const tempDirs: string[] = [];

async function tempProject() {
  const dir = await mkdtemp(join(tmpdir(), "specos-copy-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("copyTemplateDirectory", () => {
  it("copies template files into an empty project in deterministic order", async () => {
    const source = await tempProject();
    const target = await tempProject();
    await mkdir(join(source, ".specos", "workflows"), { recursive: true });
    await writeFile(join(source, "AGENTS.md"), "template agents\n");
    await writeFile(join(source, ".specos", "manifest.yaml"), "project:\n  name: demo\n");
    await writeFile(join(source, ".specos", "workflows", "default-fullstack.yaml"), "id: default-fullstack\n");

    const result = await copyTemplateDirectory(source, target);

    expect(result).toEqual({
      written: [".specos/manifest.yaml", ".specos/workflows/default-fullstack.yaml", "AGENTS.md"],
      skipped: [],
    });
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("template agents\n");
  });

  it("does not overwrite existing files without overwrite", async () => {
    const source = await tempProject();
    const target = await tempProject();
    await writeFile(join(source, "AGENTS.md"), "template agents\n");
    await writeFile(join(target, "AGENTS.md"), "human agents\n");

    const result = await copyTemplateDirectory(source, target);

    expect(result).toEqual({
      written: [],
      skipped: ["AGENTS.md"],
    });
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("human agents\n");
  });

  it("overwrites existing files when overwrite is true", async () => {
    const source = await tempProject();
    const target = await tempProject();
    await writeFile(join(source, "AGENTS.md"), "template agents\n");
    await writeFile(join(target, "AGENTS.md"), "human agents\n");

    const result = await copyTemplateDirectory(source, target, { overwrite: true });

    expect(result).toEqual({
      written: ["AGENTS.md"],
      skipped: [],
    });
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("template agents\n");
  });

  it("rejects symlinked target path segments before writing", async () => {
    const source = await tempProject();
    const target = await tempProject();
    const outside = await tempProject();
    await mkdir(join(source, ".specos"), { recursive: true });
    await writeFile(join(source, ".specos", "manifest.yaml"), "project:\n  name: demo\n");
    await symlink(outside, join(target, ".specos"));

    await expect(copyTemplateDirectory(source, target)).rejects.toThrow("Refusing to write through symlink");
    await expect(readFile(join(outside, "manifest.yaml"), "utf8")).rejects.toThrow();
  });
});
