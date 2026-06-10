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
  await mkdir(join(root, ".specos-bundle", "files", "agent-teams", "sample-team"), { recursive: true });
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
      "  - target: agent-teams/",
      "    from: files/agent-teams/",
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
    join(root, ".specos-bundle", "files", "agent-teams", "sample-team", "README.md"),
    "# Sample Team Pack\n",
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
  it("routes a raw request to a primary agent and supporting agents", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "强化测试 UI，覆盖 API、E2E、性能、并发，并接入 CI gate",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    expect(routed.stdout).toContain("SPECOS_REQUEST_ROUTE_OK");
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      requestKind: "test",
      primaryAgent: "qa-agent",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["frontend", "tests", "ci"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["frontend-agent", "ci-editor"]));
  });

  it("routes raw product ideas to the Product Architect agent", async () => {
    const cwd = await tempProject();

    const routed = await runCli(["route-request", "--request", "做一个眼镜验配小程序"], { cwd });

    expect(routed.exitCode).toBe(0);
    expect(routed.stdout).toContain("SPECOS_REQUEST_ROUTE_OK product-architect-agent");
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      requestKind: "raw-requirement",
      primaryAgent: "product-architect-agent",
      needsDraft: true,
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["product", "spec"]));
  });

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

  it("initializes the built-in lens fitting project template", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "lens-fitting"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("template lens-fitting");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("name: lens-fitting-specos");
    await expect(readFile(join(cwd, "README.md"), "utf8")).resolves.toContain("Idea");
    await expect(readFile(join(cwd, "spec-draft/idea/lens-fitting-idea.md"), "utf8")).resolves.toContain("眼镜验配小程序");
    const currentSpec = await readFile(join(cwd, "specs/current/lens-fitting.spec.yaml"), "utf8");
    expect(currentSpec).toContain("product:");
    expect(currentSpec).toContain("architecture:");
    expect(currentSpec).toContain("database:");
    expect(currentSpec).toContain("api:");
    expect(currentSpec).toContain("ui:");
    await expect(readFile(join(cwd, "specs/changes/lens-fitting-mvp/spec-blueprint.yaml"), "utf8")).resolves.toContain("Spec");
    await expect(readFile(join(cwd, "tasks/lens-fitting-mvp.tasks.md"), "utf8")).resolves.toContain("Prescription Intake");
    await expect(readFile(join(cwd, "code/README.md"), "utf8")).resolves.toContain("Code Handoff");
    await expect(readFile(join(cwd, "tests/plans/lens-fitting-mvp.test-plan.json"), "utf8")).resolves.toContain("create_order");
    await expect(readFile(join(cwd, "deploy/environments.md"), "utf8")).resolves.toContain("Rollback");

    const check = await runCli(["check"], { cwd });
    expect(check).toMatchObject({ exitCode: 0, stderr: "" });
  });

  it("rejects unknown templates with a stable error code", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "unknown"], { cwd });

    expect(init.exitCode).toBe(1);
    expect(init.stderr).toContain("SPECOS_TEMPLATE_UNKNOWN");
    expect(init.stderr).toContain("Available templates: fullstack, lens-fitting, spec-only");
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
    expect(result.stderr).toContain("Templates: fullstack, lens-fitting, spec-only");
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
    await expect(readFile(join(projectRoot, "agent-teams", "sample-team", "README.md"), "utf8")).resolves.toContain(
      "Sample Team Pack",
    );
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

  it("exports, validates, and installs the reusable agent team kit bundle", async () => {
    const exportRoot = await tempProject();
    const projectRoot = await tempProject();

    const exported = await runCli(["export-agent-kit", "--out", exportRoot], { cwd: process.cwd() });

    expect(exported.exitCode).toBe(0);
    expect(exported.stdout).toContain("SPECOS_AGENT_KIT_EXPORT_OK");
    await expect(readFile(join(exportRoot, ".specos-bundle", "bundle.yaml"), "utf8")).resolves.toContain(
      "id: specos-agent-team-kit",
    );
    await expect(readFile(join(exportRoot, ".specos-bundle", "files", ".agents", "manifest.yaml"), "utf8")).resolves.toContain(
      "roles:",
    );
    await expect(
      readFile(join(exportRoot, ".specos-bundle", "files", ".codex", "skills", "specos-ui-design", "SKILL.md"), "utf8"),
    ).resolves.toContain("SpecOS");

    await expect(readFile(join(exportRoot, ".specos-bundle", "files", ".codex", "config.toml"), "utf8")).rejects.toThrow();
    await expect(
      readFile(join(exportRoot, ".specos-bundle", "files", "tests", "results", "reward-order.run-2026-04-24-001.json"), "utf8"),
    ).rejects.toThrow();

    const validation = await runCli(["validate-bundle", exportRoot], { cwd: projectRoot });
    expect(validation.exitCode).toBe(0);
    expect(validation.stdout).toContain("SPECOS_BUNDLE_OK specos-agent-team-kit");

    const install = await runCli(["install-bundle", exportRoot], { cwd: projectRoot });
    expect(install.exitCode).toBe(0);
    expect(install.stdout).toContain("SPECOS_BUNDLE_INSTALL_OK specos-agent-team-kit");

    await expect(readFile(join(projectRoot, ".agents", "manifest.yaml"), "utf8")).resolves.toContain("roles:");
    await expect(readFile(join(projectRoot, "ai", "agents", "spec-editor.md"), "utf8")).resolves.toContain("Spec Editor");
    await expect(readFile(join(projectRoot, ".codex", "skills", "specos-ui-design", "SKILL.md"), "utf8")).resolves.toContain(
      "SpecOS",
    );
    await expect(readFile(join(projectRoot, "rules", "README.md"), "utf8")).resolves.toContain("Rules");
    await expect(readFile(join(projectRoot, "specs", "current", "README.md"), "utf8")).resolves.toContain("Accepted");
    await expect(readFile(join(projectRoot, ".specos", "manifest.yaml"), "utf8")).resolves.toContain("artifacts:");

    const check = await runCli(["check"], { cwd: projectRoot });
    expect(check.exitCode).toBe(0);
    expect(check.stdout).toContain("SPECOS_CHECK_OK");
  });

  it("runs a document-only request orchestration lifecycle", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });

    const intake = await runCli(["intake", "--id", "reward-flow", "--request", "Build reward claim flow"], { cwd });
    expect(intake.exitCode).toBe(0);
    expect(intake.stdout).toContain("SPECOS_INTAKE_OK reward-flow");
    await expect(readFile(join(cwd, "spec-draft", "reward-flow.md"), "utf8")).resolves.toContain(
      "Build reward claim flow",
    );

    const created = await runCli(["create-change", "reward-flow", "--change", "reward-flow"], { cwd });
    expect(created.exitCode).toBe(0);
    expect(created.stdout).toContain("SPECOS_CHANGE_OK reward-flow");
    await expect(readFile(join(cwd, "specs", "changes", "reward-flow", "spec.md"), "utf8")).resolves.toContain(
      "Source Draft: spec-draft/reward-flow.md",
    );
    await expect(
      readFile(join(cwd, "specs", "changes", "reward-flow", "test-strategy.md"), "utf8"),
    ).resolves.toContain("independent");

    const designGate = await runCli(["review-change", "reward-flow", "--stage", "design-gate", "--decision", "approved"], {
      cwd,
    });
    expect(designGate.exitCode).toBe(0);
    expect(designGate.stdout).toContain("SPECOS_REVIEW_OK reward-flow design-gate approved");

    const execution = await runCli(["run-change", "reward-flow", "--result", "implemented"], { cwd });
    expect(execution.exitCode).toBe(0);
    expect(execution.stdout).toContain("SPECOS_CHANGE_RUN_OK reward-flow implemented");

    const testing = await runCli(["test-change", "reward-flow", "--decision", "passed"], { cwd });
    expect(testing.exitCode).toBe(0);
    expect(testing.stdout).toContain("SPECOS_CHANGE_TEST_OK reward-flow passed");

    const implementationReview = await runCli(
      ["review-change", "reward-flow", "--stage", "implementation", "--decision", "approved"],
      { cwd },
    );
    expect(implementationReview.exitCode).toBe(0);
    expect(implementationReview.stdout).toContain("SPECOS_REVIEW_OK reward-flow implementation approved");

    const promoted = await runCli(["promote-change", "reward-flow", "--accept"], { cwd });
    expect(promoted.exitCode).toBe(0);
    expect(promoted.stdout).toContain("SPECOS_PROMOTE_OK reward-flow");
    await expect(readFile(join(cwd, "specs", "current", "accepted-changes", "reward-flow.md"), "utf8")).resolves.toContain(
      "reward-flow",
    );
    await expect(readFile(join(cwd, "specs", "archive", "reward-flow", "workflow-state.json"), "utf8")).resolves.toContain(
      '"archived": true',
    );
  });

  it("blocks promotion when an attached test plan has no ready gate report", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await runCli(["intake", "--id", "reward-flow", "--request", "Build reward claim flow"], { cwd });
    await runCli(["create-change", "reward-flow", "--change", "reward-flow"], { cwd });
    await runCli(["review-change", "reward-flow", "--stage", "design-gate", "--decision", "approved"], { cwd });
    await runCli(["run-change", "reward-flow", "--result", "implemented"], { cwd });
    await runCli(["test-change", "reward-flow", "--decision", "passed"], { cwd });
    await runCli(["review-change", "reward-flow", "--stage", "implementation", "--decision", "approved"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "results"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-flow.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-flow",
          specVersion: "1.0.0",
          changeId: "reward-flow",
          featureName: "Reward Flow",
          source: "accepted-spec",
          flows: [{ name: "Claim reward", stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }] }],
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
          releaseGates: [
            {
              id: "release",
              type: "release",
              requiredTestTypes: ["api"],
              blocking: true,
              evidenceRequired: ["trace"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-flow.reward-flow.gate-report.json"),
      JSON.stringify(
        {
          specId: "reward-flow",
          specVersion: "1.0.0",
          changeId: "reward-flow",
          decision: "blocked",
          requiredGates: [],
          passedGates: [],
          failedGates: ["release"],
          missingEvidence: ["release missing api result"],
          blockers: [],
          runIds: [],
        },
        null,
        2,
      ),
    );

    const blocked = await runCli(["promote-change", "reward-flow", "--accept"], { cwd });
    expect(blocked.exitCode).toBe(1);
    expect(blocked.stderr).toContain("SPECOS_GATE_BLOCKED");
    expect(blocked.stderr).toContain("ready gate report");

    await writeFile(
      join(cwd, "tests", "results", "reward-flow.reward-flow.gate-report.json"),
      JSON.stringify(
        {
          specId: "reward-flow",
          specVersion: "1.0.0",
          changeId: "reward-flow",
          decision: "ready",
          requiredGates: [],
          passedGates: ["release"],
          failedGates: [],
          missingEvidence: [],
          blockers: [],
          runIds: ["run-api"],
        },
        null,
        2,
      ),
    );

    const promoted = await runCli(["promote-change", "reward-flow", "--accept"], { cwd });
    expect(promoted.exitCode).toBe(0);
    expect(promoted.stdout).toContain("SPECOS_PROMOTE_OK reward-flow");
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

  it("validates test gates and writes JSON plus markdown gate reports", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "results"), { recursive: true });
    await mkdir(join(cwd, "specs", "changes", "reward-order-create"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-create",
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
          releaseGates: [
            {
              id: "p0-change-verification",
              type: "change-verification",
              requiredTestTypes: ["api", "scenario"],
              blocking: true,
              evidenceRequired: ["trace"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-order.run-api.json"),
      JSON.stringify(
        {
          runId: "run-api",
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-create",
          featureName: "Reward Order",
          status: "pass",
          releaseDecision: "ready",
          startedAt: "2026-05-28T00:00:00.000Z",
          endedAt: "2026-05-28T00:01:00.000Z",
          blockers: [],
          highRiskScenarios: [],
          coverageGaps: [],
          summary: { apiPassRate: 1, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 1 },
          flowResults: [],
          items: [
            {
              runId: "run-api",
              specId: "reward-order",
              specVersion: "1.0.0",
              changeId: "reward-order-create",
              testType: "api",
              target: "POST /api/reward-orders",
              status: "pass",
              durationMs: 100,
              summary: "api passed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-api" }],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-order.invalid-history.json"),
      JSON.stringify(
        {
          runId: "invalid-history",
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-create",
          featureName: "Reward Order",
          status: "warning",
          releaseDecision: "blocked",
          startedAt: "2026-05-28T00:00:00.000Z",
          endedAt: "2026-05-28T00:01:00.000Z",
          blockers: [],
          highRiskScenarios: [],
          coverageGaps: [],
          summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
          items: [],
        },
        null,
        2,
      ),
    );

    const gate = await runCli(["validate-test-gates", "reward-order", "--change", "reward-order-create"], { cwd });

    expect(gate.exitCode).toBe(1);
    expect(gate.stdout).toContain("SPECOS_TEST_GATES_BLOCKED");
    const jsonReport = JSON.parse(
      await readFile(join(cwd, "tests", "results", "reward-order.reward-order-create.gate-report.json"), "utf8"),
    );
    expect(jsonReport.decision).toBe("blocked");
    expect(jsonReport.missingEvidence).toContain("p0-change-verification missing scenario result");
    expect(jsonReport.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Invalid normalized result reward-order.invalid-history.json"),
      ]),
    );
    await expect(readFile(join(cwd, "specs", "changes", "reward-order-create", "gate-report.md"), "utf8")).resolves.toContain(
      "Decision: blocked",
    );
  });

  it("ignores unrelated invalid historical results when validating a specific change gate", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "results"), { recursive: true });
    await mkdir(join(cwd, "specs", "changes", "reward-order-ready"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-ready",
          featureName: "Reward Order",
          source: "accepted-spec",
          flows: [{ name: "Claim reward", stages: [{ name: "Open", scenarioNames: ["Happy"], stepNames: ["Open"] }] }],
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
          releaseGates: [
            {
              id: "ready-gate",
              type: "release",
              requiredTestTypes: ["api"],
              blocking: true,
              evidenceRequired: ["trace"],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-order.old-invalid.json"),
      JSON.stringify(
        {
          runId: "old-invalid",
          specId: "reward-order",
          specVersion: "1.0.0",
          featureName: "Reward Order",
          status: "warning",
          releaseDecision: "blocked",
          startedAt: "2026-05-28T00:00:00.000Z",
          endedAt: "2026-05-28T00:01:00.000Z",
          blockers: [],
          highRiskScenarios: [],
          coverageGaps: [],
          summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
          items: [],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-order.ready-run.json"),
      JSON.stringify(
        {
          runId: "ready-run",
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-ready",
          featureName: "Reward Order",
          status: "pass",
          releaseDecision: "ready",
          startedAt: "2026-05-28T00:00:00.000Z",
          endedAt: "2026-05-28T00:01:00.000Z",
          blockers: [],
          highRiskScenarios: [],
          coverageGaps: [],
          summary: { apiPassRate: 1, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 1 },
          flowResults: [],
          items: [
            {
              runId: "ready-run",
              specId: "reward-order",
              specVersion: "1.0.0",
              changeId: "reward-order-ready",
              testType: "api",
              target: "POST /api/reward-orders",
              status: "pass",
              durationMs: 100,
              summary: "api passed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-api" }],
            },
          ],
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(cwd, "tests", "results", "reward-order.session-2026-05-30T00-00-00-000Z.session.json"),
      JSON.stringify(
        {
          runId: "session-2026-05-30T00-00-00-000Z",
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-ready",
          featureName: "Reward Order",
          scope: "gate",
          status: "blocked",
          exitCode: 1,
          startedAt: "2026-05-30T00:00:00.000Z",
          endedAt: "2026-05-30T00:00:10.000Z",
          stdoutSummary: "",
          stderrSummary: "old local gate failed before fix",
          commands: [],
          resultArtifacts: [],
        },
        null,
        2,
      ),
    );

    const gate = await runCli(["validate-test-gates", "reward-order", "--change", "reward-order-ready"], { cwd });

    expect(gate.exitCode).toBe(0);
    expect(gate.stdout).toContain("SPECOS_TEST_GATES_OK");
  });

  it("runs performance and concurrency adapter commands as normalized results", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await writeFile(
      join(cwd, "tests", "plans", "reward-order.test-plan.json"),
      JSON.stringify(
        {
          specId: "reward-order",
          specVersion: "1.0.0",
          changeId: "reward-order-create",
          featureName: "Reward Order",
          source: "accepted-spec",
          flows: [
            {
              name: "Claim reward",
              stages: [{ name: "Submit", scenarioNames: ["Concurrent claim"], stepNames: ["Submit order"] }],
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
              name: "Concurrent claim",
              priority: "P0",
              branches: ["happy"],
              preconditions: ["one inventory item remains"],
              expectedResults: ["only one successful order"],
              steps: ["Submit order"],
            },
          ],
          performanceTargets: [
            {
              endpoint: "POST /api/reward-orders",
              priority: "P0",
              slo: { p95Ms: 300, p99Ms: 800, errorRate: 0.001 },
              gateImpact: "blocking",
            },
          ],
          concurrencyInvariants: [
            {
              scenario: "Concurrent claim",
              invariant: "Only one order may be created for one remaining inventory item",
              actorProfile: "50 users submit at the same time",
              expectedFinalState: "one successful order and zero remaining inventory",
              gateImpact: "blocking",
            },
          ],
        },
        null,
        2,
      ),
    );

    const performance = await runCli(
      ["run-performance-tests", "reward-order", "--change", "reward-order-create", "--command", "node -e \"console.log('p95=240')\""],
      { cwd },
    );
    const concurrency = await runCli(
      ["run-concurrency-tests", "reward-order", "--change", "reward-order-create", "--command", "node -e \"console.log('invariant ok')\""],
      { cwd },
    );

    expect(performance.exitCode).toBe(0);
    expect(performance.stdout).toContain("SPECOS_PERFORMANCE_TESTS_OK");
    expect(concurrency.exitCode).toBe(0);
    expect(concurrency.stdout).toContain("SPECOS_CONCURRENCY_TESTS_OK");

    const files = await import("node:fs/promises").then((fs) => fs.readdir(join(cwd, "tests", "results")));
    const performanceFile = files.find((file) => file.includes(".run-performance-"));
    const concurrencyFile = files.find((file) => file.includes(".run-concurrency-"));
    expect(performanceFile).toBeDefined();
    expect(concurrencyFile).toBeDefined();

    const performanceResult = JSON.parse(await readFile(join(cwd, "tests", "results", performanceFile!), "utf8"));
    const concurrencyResult = JSON.parse(await readFile(join(cwd, "tests", "results", concurrencyFile!), "utf8"));
    expect(performanceResult.items[0]).toMatchObject({
      testType: "performance",
      changeId: "reward-order-create",
      gateImpact: "blocking",
      target: "POST /api/reward-orders",
    });
    expect(performanceResult.items[0].slo).toMatchObject({ p95Ms: 300 });
    expect(concurrencyResult.items[0]).toMatchObject({
      testType: "concurrency",
      changeId: "reward-order-create",
      gateImpact: "blocking",
      target: "Concurrent claim",
    });
    expect(concurrencyResult.items[0].concurrencyProfile).toMatchObject({
      invariant: "Only one order may be created for one remaining inventory item",
    });
  });
});
