import { mkdtemp, readFile, rm } from "node:fs/promises";
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

  it("reports a stable error code when manifest is missing", async () => {
    const cwd = await tempProject();

    const check = await runCli(["check"], { cwd });

    expect(check.exitCode).toBe(1);
    expect(check.stderr).toContain("SPECOS_MANIFEST_MISSING");
  });
});
