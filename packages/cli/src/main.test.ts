import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveGoalSpecSelection, runCli } from "./main.js";

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "specos-cli-"));
}

describe("GoalSpec CLI", () => {
  it("initializes a GoalSpec project and rejects mode selectors", async () => {
    const cwd = await tempProject();

    const rejected = await runCli(["init", "--mode", "goalspec"], { cwd });
    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr).toContain("SPECOS_ARGUMENT_INVALID");

    const initialized = await runCli(["init", "--template", "spec-only"], { cwd });
    expect(initialized.exitCode).toBe(0);
    expect(await readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).toContain("schemaVersion: specos/goalspec");
    expect(await runCli(["check"], { cwd })).toMatchObject({ exitCode: 0, stderr: "" });
  });

  it("intakes a request into a canonical Requirement Workspace", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });

    const result = await runCli(
      ["intake", "--id", "R042", "--slug", "invoice-export", "--request", "Export invoices as CSV"],
      { cwd },
    );

    expect(result.exitCode).toBe(0);
    const workspace = join(cwd, ".requirements", "requirements", "R042-invoice-export");
    expect(await readFile(join(workspace, "prd.md"), "utf8")).toContain("Export invoices as CSV");
    expect(await readFile(join(workspace, "index.yaml"), "utf8")).toContain("id: R042");
    expect(await runCli(["intake", "--id", "R042", "--slug", "invoice-export", "--request", "duplicate"], { cwd })).toMatchObject({
      exitCode: 1,
      stderr: expect.stringContaining("SPECOS_ARTIFACT_EXISTS"),
    });
  });

  it("resolves only canonical child-package selectors and writes gates beside evidence", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await runCli(["intake", "--id", "R042", "--slug", "invoice-export", "--request", "Export invoices"], { cwd });
    const packagePath = join(cwd, ".requirements", "requirements", "R042-invoice-export", "specs", "S01-cli");
    await mkdir(join(packagePath, "evidence", "plans"), { recursive: true });
    await mkdir(join(packagePath, "evidence", "artifacts"), { recursive: true });
    await writeFile(join(packagePath, "spec.md"), "# Spec\n", "utf8");
    await writeFile(join(packagePath, "test.md"), "# Test\n", "utf8");
    await writeFile(join(packagePath, "evidence", "plans", "S01-cli.test-plan.json"), JSON.stringify({ standardVersion: "specos-test-standard" }), "utf8");
    await writeFile(join(packagePath, "evidence", "artifacts", "run.json"), JSON.stringify({ status: "pass", releaseDecision: "ready" }), "utf8");

    const selected = await resolveGoalSpecSelection(cwd, "R042-invoice-export/S01-cli");
    expect(selected.specPath).toBe(join(packagePath, "spec.md"));
    expect((await runCli(["test", ".requirements/requirements/R042-invoice-export/specs/S01-cli"], { cwd })).exitCode).toBe(0);

    const gate = await runCli(["gate", "R042-invoice-export/S01-cli"], { cwd });
    expect(gate.exitCode).toBe(0);
    expect(gate.stdout).toContain("SPECOS_GATE_OK");
    expect(gate.stdout).toContain("evidence/gates/S01-cli.latest.gate-report.json");

    const legacy = await runCli(["test", "legacy-flat-spec"], { cwd });
    expect(legacy.exitCode).toBe(1);
    expect(legacy.stderr).toContain("SPECOS_SELECTOR_INVALID");
  });

  it("resolves workspace, issue, design, workflow, and template entrypoints", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await runCli(["intake", "--id", "R042", "--slug", "invoice-export", "--request", "Export invoices"], { cwd });
    const packagePath = join(cwd, ".requirements", "requirements", "R042-invoice-export", "specs", "S01-cli");
    await mkdir(join(packagePath, "issues"), { recursive: true });
    await writeFile(join(packagePath, "issues", "ISSUE-R042-S01-001-implement.md"), "# Issue\n", "utf8");
    await writeFile(join(cwd, "design", "local.md"), "# Local\n", "utf8");

    expect((await runCli(["resolve", "workspace", "R042-invoice-export"], { cwd })).exitCode).toBe(0);
    expect((await runCli(["resolve", "issue", "ISSUE-R042-S01-001-implement"], { cwd })).exitCode).toBe(0);
    expect((await runCli(["resolve", "design", "local.md"], { cwd })).exitCode).toBe(0);
    expect((await runCli(["resolve", "workflow", "default-fullstack"], { cwd })).exitCode).toBe(0);
    expect((await runCli(["resolve", "template", "fullstack"], { cwd })).exitCode).toBe(0);
  });
});
