import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./main.js";

const tempDirs: string[] = [];

async function tempProject() {
  const dir = await mkdtemp(join(tmpdir(), "specos-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("specos cli", () => {
  it("initializes a fullstack project and checks it", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("written");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("type: fullstack");
    await expect(readFile(join(cwd, "AGENTS.md"), "utf8")).resolves.toContain("SpecOS");

    const secondInit = await runCli(["init"], { cwd });

    expect(secondInit.exitCode).toBe(0);
    expect(secondInit.stdout).toContain("skipped");

    const check = await runCli(["check"], { cwd });

    expect(check).toMatchObject({ exitCode: 0, stderr: "" });
    expect(check.stdout).toContain("SPECOS_CHECK_OK");
  });

  it("accepts an explicit fullstack template selector", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "fullstack"], { cwd });

    expect(init.exitCode).toBe(0);
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("type: fullstack");
  });

  it("initializes a spec-only project from the template registry", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "spec-only"], { cwd });

    expect(init.exitCode).toBe(0);
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("type: spec-only");
    await expect(readFile(join(cwd, "spec/README.md"), "utf8")).resolves.toContain("Spec bundle");
  });

  it("rejects unknown templates with a stable error code", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "unknown"], { cwd });

    expect(init.exitCode).toBe(1);
    expect(init.stderr).toContain("SPECOS_TEMPLATE_UNKNOWN");
    expect(init.stderr).toContain("Available templates: fullstack, spec-only");
  });

  it("reports a stable error code when manifest is missing", async () => {
    const cwd = await tempProject();

    const check = await runCli(["check"], { cwd });

    expect(check.exitCode).toBe(1);
    expect(check.stderr).toContain("SPECOS_MANIFEST_MISSING");
  });

  it("rejects manifest artifact paths that escape the project", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    const manifest = await readFile(join(cwd, ".specos/manifest.yaml"), "utf8");
    await writeFile(
      join(cwd, ".specos/manifest.yaml"),
      manifest.replace("specsDir: spec", "specsDir: ../outside"),
    );

    const check = await runCli(["check"], { cwd });

    expect(check.exitCode).toBe(1);
    expect(check.stderr).toContain("SPECOS_MANIFEST_INVALID");
    expect(check.stderr).toContain("artifacts.specsDir");
  });

  it("prints supported commands for unknown commands", async () => {
    const cwd = await tempProject();

    const result = await runCli([], { cwd });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Supported commands: init, check");
    expect(result.stderr).toContain("Templates: fullstack, spec-only");
  });
});
