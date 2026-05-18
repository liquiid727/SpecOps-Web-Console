import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function writeBundleFixture(root: string) {
  await mkdir(join(root, ".specos-bundle", "files", "rules", "backend"), { recursive: true });
  await mkdir(join(root, ".specos-bundle", "files", ".specos", "workflows"), { recursive: true });

  await writeFile(
    join(root, ".specos-bundle", "bundle.yaml"),
    [
      "id: reward-center-bundle",
      "name: Reward Center Bundle",
      "version: 0.1.0",
      'specosVersion: ">=0.1.0"',
      "projectTypes:",
      "  - mixed",
      "installs:",
      "  - target: rules/",
      "    from: files/rules/",
      "  - target: .specos/workflows/",
      "    from: files/.specos/workflows/",
      "workflow:",
      "  default: spec-driven-default",
      "  available:",
      "    - spec-driven-default",
      "entrypoints:",
      "  draftTemplate: template-feature-draft",
      "  specTemplate: feature-spec-v1",
      "  workflowId: spec-driven-default",
      "capabilities:",
      "  refineSpec: true",
      "  generateTestPlan: true",
      "  runApiTests: false",
      "  runUiTests: false",
      "  normalizeResults: true",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, ".specos-bundle", "files", "rules", "backend", "go-backend-governance.md"),
    "# Go Backend Governance\n",
  );
  await writeFile(
    join(root, ".specos-bundle", "files", ".specos", "workflows", "spec-driven-default.yaml"),
    [
      "id: spec-driven-default",
      "name: Spec Driven Default",
      "steps:",
      '  - id: smoke',
      '    run: "node -e \\"console.log(\'bundle-step-ok\')\\""',
      "",
    ].join("\n"),
  );
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
    await expect(readFile(join(cwd, "specs/README.md"), "utf8")).resolves.toContain("current/change/archive");
    await expect(readFile(join(cwd, "specs/current/README.md"), "utf8")).resolves.toContain("Accepted");
    await expect(readFile(join(cwd, "specs/changes/README.md"), "utf8")).resolves.toContain("Proposed");
    await expect(readFile(join(cwd, "specs/archive/README.md"), "utf8")).resolves.toContain("Completed");
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
      manifest.replace("specsDir: specs/current", "specsDir: ../outside"),
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

  it("validates, installs, lists, and runs bundle workflows", async () => {
    const bundleRoot = await tempProject();
    const projectRoot = await tempProject();
    await writeBundleFixture(bundleRoot);

    const validation = await runCli(["validate-bundle", bundleRoot], { cwd: projectRoot });
    expect(validation.exitCode).toBe(0);
    expect(validation.stdout).toContain("SPECOS_BUNDLE_OK");

    const install = await runCli(["install-bundle", bundleRoot], { cwd: projectRoot });
    expect(install.exitCode).toBe(0);
    expect(install.stdout).toContain("SPECOS_BUNDLE_INSTALL_OK");
    await expect(readFile(join(projectRoot, "rules", "backend", "go-backend-governance.md"), "utf8")).resolves.toContain(
      "Go Backend Governance",
    );
    await expect(readFile(join(projectRoot, ".specos", "workflows", "spec-driven-default.yaml"), "utf8")).resolves.toContain(
      "bundle-step-ok",
    );

    const workflows = await runCli(["list-workflows"], { cwd: projectRoot });
    expect(workflows.exitCode).toBe(0);
    expect(workflows.stdout).toContain("spec-driven-default");

    const run = await runCli(["run-workflow", "spec-driven-default"], { cwd: projectRoot });
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("bundle-step-ok");
    expect(run.stdout).toContain("SPECOS_WORKFLOW_RUN_OK");
  });

  it("generates a test plan and isolated test schedule from a normalized spec", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "specs", "changes", "reward-order-create"), { recursive: true });
    await writeFile(
      join(cwd, "specs", "changes", "reward-order-create", "spec.json"),
      JSON.stringify(
        {
          id: "reward-order",
          version: "1.0.0",
          title: "Reward Order",
          goals: ["Create reward orders"],
          nonGoals: ["Payment"],
          actors: ["member"],
          userFlows: [{ name: "Claim reward", steps: ["Open page", "Click claim", "View result"] }],
          systemFlows: [{ name: "Create order", steps: ["Validate", "Persist", "Respond"] }],
          rules: [{ id: "reward.order.create", description: "Create one order per claim" }],
          edgeCases: ["stock is zero"],
          api: [{ name: "Create reward order", method: "POST", path: "/api/reward-orders" }],
          ui: [{ name: "Reward page", route: "/rewards" }],
          observability: ["trace_id"],
          tests: { requiredBranches: ["happy", "limit", "error", "flow"] },
          traceability: { draft: "spec-draft/reward-order.md" },
        },
        null,
        2,
      ),
    );

    const plan = await runCli(
      [
        "generate-test-plan",
        "specs/changes/reward-order-create/spec.json",
        "--change",
        "reward-order-create",
      ],
      { cwd },
    );

    expect(plan.exitCode).toBe(0);
    expect(plan.stdout).toContain("SPECOS_TEST_PLAN_OK");
    expect(plan.stdout).toContain("SPECOS_TEST_SCHEDULE_OK");

    const testPlan = JSON.parse(await readFile(join(cwd, "tests", "plans", "reward-order.test-plan.json"), "utf8"));
    const schedule = JSON.parse(await readFile(join(cwd, "tests", "schedules", "reward-order.test-schedule.json"), "utf8"));

    expect(testPlan.specId).toBe("reward-order");
    expect(testPlan.scenarios.map((scenario: { branches: string[] }) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
    expect(schedule.changeId).toBe("reward-order-create");
    expect(schedule.tracks.map((track: { id: string }) => track.id)).toEqual(["execution", "testing"]);
    expect(schedule.tasks.map((task: { agentRole: string }) => task.agentRole)).toEqual(
      expect.arrayContaining(["execution-editor", "bruno-test-agent", "playwright-test-agent"]),
    );
  });

  it("writes a blocked normalized API result when Bruno assets are missing", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "schedules"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          source: "accepted-spec",
          flows: [
            {
              name: "Claim reward",
              stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }],
            },
          ],
          endpoints: [
            {
              name: "Create reward order",
              method: "POST",
              path: "/api/reward-orders",
              priority: "P0",
              branches: ["happy", "limit", "error", "flow"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              relatedRule: "reward.order.create",
            },
          ],
          scenarios: [
            {
              name: "Happy",
              priority: "P0",
              branches: ["happy"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              steps: ["Open"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "schedules", "reward-order.test-schedule.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          changeId: "reward-order-create",
          executionMode: "parallel",
          tracks: [
            {
              id: "execution",
              agentRole: "execution-editor",
              isolation: "implementation-only",
              allowedInputs: ["specs/changes/reward-order-create/spec.md"],
              forbiddenInputs: ["tests/results/"],
            },
            {
              id: "testing",
              agentRole: "test-editor",
              isolation: "spec-and-contract-only",
              allowedInputs: ["tests/plans/reward-order.test-plan.json"],
              forbiddenInputs: ["implementation report"],
            },
          ],
          tasks: [
            {
              id: "api-tests-reward-order",
              trackId: "testing",
              agentRole: "bruno-test-agent",
              type: "api-test",
              status: "ready",
              inputs: ["tests/plans/reward-order.test-plan.json"],
              outputs: ["tests/bruno/reward-order/", "tests/results/reward-order.*.json"],
              dependsOn: ["test_plan_ready"],
              traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
            },
          ],
          gates: ["api_tests_passed"],
        },
        null,
        2,
      ),
    );

    const run = await runCli(["run-api-tests", "reward-order"], { cwd });

    expect(run.exitCode).toBe(1);
    expect(run.stdout).toContain("SPECOS_API_TESTS_BLOCKED");
    const files = await import("node:fs/promises").then((fs) => fs.readdir(join(cwd, "tests", "results")));
    const resultFile = files.find((file) => file.startsWith("reward-order.run-api-"));
    expect(resultFile).toBeDefined();
    const result = JSON.parse(await readFile(join(cwd, "tests", "results", resultFile!), "utf8"));
    expect(result.releaseDecision).toBe("blocked");
    expect(result.blockers[0]).toContain("Bruno collection not found");
    expect(result.items[0]).toMatchObject({ testType: "api", status: "warning" });
  });

  it("generates Bruno assets from an existing test plan", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          source: "accepted-spec",
          flows: [
            {
              name: "Claim reward",
              stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }],
            },
          ],
          endpoints: [
            {
              name: "Create reward order",
              method: "POST",
              path: "/api/reward-orders",
              priority: "P0",
              branches: ["happy", "limit", "error", "flow"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              relatedRule: "reward.order.create",
            },
          ],
          scenarios: [
            {
              name: "Happy",
              priority: "P0",
              branches: ["happy"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              steps: ["Open"],
            },
          ],
        },
        null,
        2,
      ),
    );

    const result = await runCli(["generate-bruno-tests", "reward-order"], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SPECOS_BRUNO_TESTS_OK");
    await expect(readFile(join(cwd, "tests", "bruno", "reward-order", "bruno.json"), "utf8")).resolves.toContain(
      '"name": "reward-order"',
    );
    await expect(readFile(join(cwd, "tests", "bruno", "reward-order", "create-reward-order.bru"), "utf8")).resolves.toContain(
      "url: {{baseUrl}}/api/reward-orders",
    );
  });

  it("runs a configured API command and writes a passing normalized result", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "schedules"), { recursive: true });
    await mkdir(join(cwd, "tests", "bruno", "reward-order"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          source: "accepted-spec",
          flows: [
            {
              name: "Claim reward",
              stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }],
            },
          ],
          endpoints: [
            {
              name: "Create reward order",
              method: "POST",
              path: "/api/reward-orders",
              priority: "P0",
              branches: ["happy", "limit", "error", "flow"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              relatedRule: "reward.order.create",
            },
          ],
          scenarios: [
            {
              name: "Happy",
              priority: "P0",
              branches: ["happy"],
              preconditions: ["user logged in"],
              expectedResults: ["order created"],
              steps: ["Open"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "schedules", "reward-order.test-schedule.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          changeId: "reward-order-create",
          executionMode: "parallel",
          tracks: [
            {
              id: "execution",
              agentRole: "execution-editor",
              isolation: "implementation-only",
              allowedInputs: ["specs/changes/reward-order-create/spec.md"],
              forbiddenInputs: ["tests/results/"],
            },
            {
              id: "testing",
              agentRole: "test-editor",
              isolation: "spec-and-contract-only",
              allowedInputs: ["tests/plans/reward-order.test-plan.json"],
              forbiddenInputs: ["implementation report"],
            },
          ],
          tasks: [
            {
              id: "api-tests-reward-order",
              trackId: "testing",
              agentRole: "bruno-test-agent",
              type: "api-test",
              status: "ready",
              inputs: ["tests/plans/reward-order.test-plan.json"],
              outputs: ["tests/bruno/reward-order/", "tests/results/reward-order.*.json"],
              dependsOn: ["test_plan_ready"],
              traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
            },
          ],
          gates: ["api_tests_passed"],
        },
        null,
        2,
      ),
    );

    const result = await runCli(["run-api-tests", "reward-order", "--command", "node -e \"console.log('api ok')\""], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("SPECOS_API_TESTS_OK");
    const files = await import("node:fs/promises").then((fs) => fs.readdir(join(cwd, "tests", "results")));
    const resultFile = files.find((file) => file.startsWith("reward-order.run-api-"));
    expect(resultFile).toBeDefined();
    const apiResult = JSON.parse(await readFile(join(cwd, "tests", "results", resultFile!), "utf8"));
    expect(apiResult.releaseDecision).toBe("ready");
    expect(apiResult.items[0]).toMatchObject({ testType: "api", status: "pass" });
    expect(apiResult.items[0].evidence.stdout).toContain("api ok");
  });
});
