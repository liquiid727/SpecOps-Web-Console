import { createHash } from "node:crypto";
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

function extractJsonPayload(stdout: string): unknown {
  return JSON.parse(stdout.split("\n").slice(1).join("\n"));
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
      "  prdTemplate: template-feature-draft",
      "  designTemplate: template-platform-design",
      "  featureTemplate: template-feature-spec",
      "  issueTemplate: template-issue",
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
    expect(routed.stdout).toContain("format full");
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      projectMode: "litespec",
      requestKind: "test",
      primaryAgent: "testing-agent",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["frontend", "tests", "ci"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["ui-design-agent", "ci-editor"]));
    expect(route.promptAssembly.overlayManifest).toBe(".agents/modes/litespec/manifest.overlay.yaml");
    expect(route.executionPlan).toMatchObject({
      projectMode: "litespec",
      specialistDispatch: "bounded-parallel",
    });
    expect(route.executionPlan.primaryTask).toMatchObject({
      role: "testing-agent",
      dispatch: "primary",
      parallelizable: false,
    });
    expect(route.executionPlan.specialistDispatchPlan.tasks.length).toBeGreaterThanOrEqual(2);
    expect(route.executionPlan.specialistDispatchPlan.tasks.length).toBeLessThanOrEqual(4);
    expect(route.executionPlan.specialistDispatchPlan.tasks[0].dispatchPromptEnvelope).toMatchObject({
      role: route.executionPlan.specialistDispatchPlan.tasks[0].role,
      sharedPromptStack: expect.arrayContaining(["AGENTS.md"]),
    });
    expect(route.promptAssembly.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "testing-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/litespec/roles/testing-agent.md",
        }),
        expect.objectContaining({
          role: "ui-design-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/litespec/roles/ui-design-agent.md",
        }),
      ]),
    );
  });

  it("supports dispatch-json output for host specialist dispatch", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "dispatch-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    expect(routed.stdout).toContain("SPECOS_REQUEST_ROUTE_OK architecture-agent format dispatch-json");
    const envelopes = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(Array.isArray(envelopes)).toBe(true);
    expect(envelopes.length).toBeGreaterThanOrEqual(2);
    expect(envelopes.length).toBeLessThanOrEqual(4);
    expect(envelopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
          sharedPromptStack: expect.arrayContaining(["AGENTS.md"]),
          taskBrief: expect.objectContaining({
            exactQuestion: expect.stringContaining("订单 API"),
          }),
        }),
      ]),
    );
  });

  it("supports primary-json output for host primary dispatch", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "primary-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    expect(routed.stdout).toContain("SPECOS_REQUEST_ROUTE_OK architecture-agent format primary-json");
    const envelope = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(envelope).toMatchObject({
      role: "architecture-agent",
      sharedPromptStack: expect.arrayContaining(["AGENTS.md"]),
      rolePromptStack: expect.arrayContaining([
        ".agents/roles/architecture-agent.md",
        "ai/agents/architecture-agent.md",
      ]),
      taskBrief: expect.objectContaining({
        exactQuestion: expect.stringContaining("订单 API"),
      }),
    });
    expect(envelope.message).toContain("Dispatch: primary");
  });

  it("supports execution-plan-json output for host runtime dispatch", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "execution-plan-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    expect(routed.stdout).toContain("SPECOS_REQUEST_ROUTE_OK architecture-agent format execution-plan-json");
    const executionPlan = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(executionPlan).toMatchObject({
      request: expect.stringContaining("订单 API"),
      primaryTask: expect.objectContaining({
        role: "architecture-agent",
        dispatch: "primary",
      }),
      primaryDispatchPromptEnvelope: expect.objectContaining({
        role: "architecture-agent",
      }),
    });
  });

  it("validates dispatch-json route output files", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "dispatch-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    const routeOutputPath = join(cwd, "dispatch-route.json");
    await writeFile(routeOutputPath, `${JSON.stringify(extractJsonPayload(routed.stdout), null, 2)}\n`, "utf8");

    const validated = await runCli(
      ["validate-route-output", "--file", "dispatch-route.json", "--format", "dispatch-json"],
      { cwd },
    );

    expect(validated.exitCode).toBe(0);
    expect(validated.stderr).toBe("");
    expect(validated.stdout).toContain("SPECOS_ROUTE_OUTPUT_OK format dispatch-json dispatch-route.json");
  });

  it("validates primary-json route output files", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "primary-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    const routeOutputPath = join(cwd, "primary-route.json");
    await writeFile(routeOutputPath, `${JSON.stringify(extractJsonPayload(routed.stdout), null, 2)}\n`, "utf8");

    const validated = await runCli(
      ["validate-route-output", "--file", "primary-route.json", "--format", "primary-json"],
      { cwd },
    );

    expect(validated.exitCode).toBe(0);
    expect(validated.stderr).toBe("");
    expect(validated.stdout).toContain("SPECOS_ROUTE_OUTPUT_OK format primary-json primary-route.json");
  });

  it("validates execution-plan-json route output files", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
        "--format",
        "execution-plan-json",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    const routeOutputPath = join(cwd, "execution-plan-route.json");
    await writeFile(routeOutputPath, `${JSON.stringify(extractJsonPayload(routed.stdout), null, 2)}\n`, "utf8");

    const validated = await runCli(
      ["validate-route-output", "--file", "execution-plan-route.json", "--format", "execution-plan-json"],
      { cwd },
    );

    expect(validated.exitCode).toBe(0);
    expect(validated.stderr).toBe("");
    expect(validated.stdout).toContain(
      "SPECOS_ROUTE_OUTPUT_OK format execution-plan-json execution-plan-route.json",
    );
  });

  it("rejects invalid route output files with a stable error code", async () => {
    const cwd = await tempProject();
    await writeFile(join(cwd, "invalid-route.json"), '{ "role": "architecture-agent" }\n', "utf8");

    const validated = await runCli(["validate-route-output", "--file", "invalid-route.json"], { cwd });

    expect(validated.exitCode).toBe(1);
    expect(validated.stdout).toBe("");
    expect(validated.stderr).toContain("SPECOS_ROUTE_OUTPUT_INVALID");
  });

  it("validates execution plan files", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    const full = extractJsonPayload(routed.stdout) as {
      executionPlan: unknown;
    };
    await writeFile(join(cwd, "execution-plan.json"), `${JSON.stringify(full.executionPlan, null, 2)}\n`, "utf8");

    const validated = await runCli(["validate-execution-plan", "--file", "execution-plan.json"], { cwd });

    expect(validated.exitCode).toBe(0);
    expect(validated.stderr).toBe("");
    expect(validated.stdout).toContain("SPECOS_EXECUTION_PLAN_OK execution-plan.json");
  });

  it("rejects invalid execution plan files with a stable error code", async () => {
    const cwd = await tempProject();
    await writeFile(join(cwd, "invalid-execution-plan.json"), '{ "request": "bad plan" }\n', "utf8");

    const validated = await runCli(["validate-execution-plan", "--file", "invalid-execution-plan.json"], { cwd });

    expect(validated.exitCode).toBe(1);
    expect(validated.stdout).toBe("");
    expect(validated.stderr).toContain("SPECOS_ROUTE_OUTPUT_INVALID");
  });

  it("routes architecture orchestration previews to the architecture agent", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      projectMode: "litespec",
      primaryAgent: "architecture-agent",
      requestKind: "test",
    });
    expect(route.executionPlan.primaryTask).toMatchObject({
      role: "architecture-agent",
      dispatch: "primary",
    });
    expect(route.supportingAgents).toEqual(
      expect.arrayContaining(["openapi-agent", "db-migration-agent", "performance-test-agent", "concurrency-test-agent"]),
    );
  });

  it("routes pure architecture review previews to the architecture agent", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      [
        "classify-request",
        "--request",
        "请评估这个领域边界和跨服务架构风险",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    expect(routed.stderr).toBe("");
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      projectMode: "litespec",
      primaryAgent: "architecture-agent",
      requestKind: "review",
      needsDraft: false,
    });
    expect(route.executionPlan.specialistDispatch).toBe("bounded-parallel");
  });

  it("initializes a fullstack project and checks it", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("written");
    expect(init.stdout).toContain("mode goalspec");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("type: fullstack");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("projectMode: goalspec");
    await expect(readFile(join(cwd, "AGENTS.md"), "utf8")).resolves.toContain("SpecOS");
    await expect(readFile(join(cwd, "docs", "spec-modes", "README.md"), "utf8")).resolves.toContain("Spec Modes");
    await expect(readFile(join(cwd, "docs", "spec-modes", "LiteSpec", "README.md"), "utf8")).resolves.toContain("LiteSpec");
    await expect(readFile(join(cwd, "current", "README.md"), "utf8")).resolves.toContain("active delivery workspace");
    await expect(readFile(join(cwd, "current", "project-status.md"), "utf8")).resolves.toContain("Project Status");
    await expect(readFile(join(cwd, "design", "README.md"), "utf8")).resolves.toContain("Stable platform");
    await expect(readFile(join(cwd, "implementation", "README.md"), "utf8")).resolves.toContain("Implementation handoff");
    await expect(readFile(join(cwd, ".features", "roadmap.md"), "utf8")).resolves.toContain("Spec Roadmap");
    await expect(readFile(join(cwd, ".features", "_template", "feature", "spec.example.md"), "utf8")).resolves.toContain("Feature Spec Example");
    await expect(readFile(join(cwd, "tests", "_template", "feature", "cases.example.md"), "utf8")).resolves.toContain("Test Cases Example");
    await expect(readFile(join(cwd, "tests", "plans", "test-plan.schema.md"), "utf8")).resolves.toContain("Test Plan Schema");
    await expect(readFile(join(cwd, "tests", "results", "scenario-result.schema.md"), "utf8")).resolves.toContain("Scenario Result Schema");

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

  it("scaffolds a .gitignore from the template and never leaves the raw .gitignore.template behind", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "fullstack"], { cwd });

    expect(init.exitCode).toBe(0);
    await expect(readFile(join(cwd, ".gitignore"), "utf8")).resolves.toContain("node_modules/");
    await expect(readFile(join(cwd, ".gitignore"), "utf8")).resolves.toContain(".agent/runs/");
    await expect(readFile(join(cwd, ".gitignore.template"), "utf8")).rejects.toThrow();
  });

  it("does not overwrite a human-authored .gitignore", async () => {
    const cwd = await tempProject();
    await writeFile(join(cwd, ".gitignore"), "custom-ignore/\n");

    const init = await runCli(["init", "--template", "fullstack"], { cwd });

    expect(init.exitCode).toBe(0);
    await expect(readFile(join(cwd, ".gitignore"), "utf8")).resolves.toBe("custom-ignore/\n");
  });

  it("initializes a fullstack project in enterprise mode", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "fullstack", "--mode", "enterprisespec"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("mode enterprisespec");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("projectMode: enterprisespec");
    await expect(readFile(join(cwd, "current", "project-status.md"), "utf8")).resolves.toContain("EnterpriseSpec");
    await expect(readFile(join(cwd, "current", "release-status.md"), "utf8")).resolves.toContain("Release Status");
    await expect(readFile(join(cwd, "design", "security.md"), "utf8")).resolves.toContain("# Security");
    await expect(readFile(join(cwd, ".features", "release-plan.md"), "utf8")).resolves.toContain("Release Plan");
    await expect(readFile(join(cwd, "tests", "security", "README.md"), "utf8")).resolves.toContain("Security Tests");
    await expect(readFile(join(cwd, "reviews", "release", "README.md"), "utf8")).resolves.toContain("Release Reviews");
    await expect(readFile(join(cwd, "docs", "runbook", "README.md"), "utf8")).resolves.toContain("Runbook");

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      ],
      { cwd },
    );

    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      projectMode: "enterprisespec",
      primaryAgent: "architecture-agent",
    });
    expect(route.promptAssembly.overlayManifest).toBe(".agents/modes/enterprisespec/manifest.overlay.yaml");
    expect(route.executionPlan).toMatchObject({
      projectMode: "enterprisespec",
      specialistDispatch: "bounded-parallel",
    });
    expect(route.executionPlan.specialistDispatchPlan.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
          parallelizable: true,
          dispatchPromptEnvelope: expect.objectContaining({
            role: "openapi-agent",
          }),
        }),
        expect.objectContaining({
          role: "db-migration-agent",
          parallelizable: true,
        }),
      ]),
    );
    expect(route.promptAssembly.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
          modeRolePrompt: ".agents/modes/enterprisespec/roles/openapi-agent.md",
        }),
        expect.objectContaining({
          role: "performance-test-agent",
          modeRolePrompt: ".agents/modes/enterprisespec/roles/performance-test-agent.md",
        }),
        expect.objectContaining({
          role: "ddd-domain-agent",
          overlayApplied: false,
        }),
      ]),
    );
  });

  it("initializes a fullstack project in goalspec mode", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "fullstack", "--mode", "goalspec"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("mode goalspec");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("projectMode: goalspec");
    await expect(readFile(join(cwd, "current", "project-status.md"), "utf8")).resolves.toContain("GoalSpec");
    await expect(readFile(join(cwd, ".issues", "README.md"), "utf8")).resolves.toContain("Issues");
    await expect(readFile(join(cwd, "docs", "workflow.md"), "utf8")).resolves.toContain("/prd");

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "请 QA agent 做最终质量验收，汇总 gate report 和 review findings",
      ],
      { cwd },
    );

    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    expect(route).toMatchObject({
      projectMode: "goalspec",
      primaryAgent: "qa-agent",
    });
    expect(route.promptAssembly.overlayManifest).toBe(".agents/modes/goalspec/manifest.overlay.yaml");
  });

  it("uses real host prompt assembly metadata when agent manifests are present", async () => {
    const cwd = await tempProject();
    await mkdir(join(cwd, ".specos"), { recursive: true });
    await mkdir(join(cwd, ".agents", "modes", "enterprisespec"), { recursive: true });

    await writeFile(
      join(cwd, ".specos", "manifest.yaml"),
      [
        "projectMode: enterprisespec",
        "artifacts:",
        "  draftsDir: .prd",
        "  specsDir: .features",
        "  issuesDir: .issues",
        "  testsDir: tests",
        "  resultsDir: tests/results",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(cwd, ".agents", "manifest.yaml"),
      [
        "calling_convention:",
        "  role_path_base: .agents",
        "  mode_overlay_roots:",
        "    role_overlays: .agents/modes",
        "    canonical_overlays: ai/agents/modes",
        "  prompt_assembly_order:",
        "    - AGENTS.md",
        "    - .codex/instructions.md",
        "    - .specos/manifest.yaml projectMode",
        "    - selected role metadata from .agents/manifest.yaml",
        "    - selected mode overlay manifest from .agents/modes/<projectMode>/manifest.overlay.yaml",
        "    - selected shared role_prompt",
        "    - selected shared canonical",
        "    - selected mode overlay role_prompt when present",
        "    - selected mode overlay canonical when present",
        "    - selected skills",
        "    - selected context_includes",
        "mode_overlays:",
        "  enterprisespec:",
        "    manifest_overlay: .agents/modes/enterprisespec/manifest.overlay.yaml",
        "roles:",
        "  testing-agent:",
        "    role_prompt: roles/testing-agent.md",
        "    canonical: ai/agents/testing-agent.md",
        "    skill_mode: scoped_only",
        "    skills: []",
        "    delegates_to:",
        "      - test-editor",
        "      - qa-agent",
        "    context_includes:",
        "      - tests/README.md",
        "      - tests/results/",
        "  test-editor:",
        "    role_prompt: roles/test-editor.md",
        "    canonical: ai/agents/test-editor.md",
        "    skill_mode: scoped_only",
        "    skills: []",
        "    context_includes:",
        "      - tests/README.md",
        "      - .features/",
        "  ddd-domain-agent:",
        "    role_prompt: roles/ddd-domain-agent.md",
        "    canonical: ai/agents/ddd-domain-agent.md",
        "    skills: []",
        "    context_includes:",
        "      - design/",
        "      - .features/",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(cwd, ".agents", "modes", "enterprisespec", "manifest.overlay.yaml"),
      [
        "mode: enterprisespec",
        "overrides:",
        "  - testing-agent",
        "  - test-editor",
        "",
      ].join("\n"),
    );

    const routed = await runCli(
      [
        "route-request",
        "--request",
        "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      ],
      { cwd },
    );

    expect(routed.exitCode).toBe(0);
    const route = JSON.parse(routed.stdout.split("\n").slice(1).join("\n"));
    const testEditor = route.promptAssembly.roles.find((role: { role: string }) => role.role === "test-editor");
    const domainAgent = route.promptAssembly.roles.find((role: { role: string }) => role.role === "ddd-domain-agent");

    expect(route.promptAssembly.overlayManifest).toBe(".agents/modes/enterprisespec/manifest.overlay.yaml");
    expect(route.executionPlan.primaryTask).toMatchObject({
      role: "architecture-agent",
      dispatch: "primary",
    });
    expect(route.executionPlan.specialistDispatchPlan.deferredRoles).toContain("reviewer");
    expect(route.executionPlan.specialistDispatchPlan.tasks[0].dispatchPromptEnvelope.message).toContain("Exact Question");
    expect(testEditor).toMatchObject({
      role: "test-editor",
      overlayApplied: true,
      contextIncludes: ["tests/README.md", ".features/"],
    });
    expect(domainAgent).toMatchObject({
      role: "ddd-domain-agent",
      overlayApplied: false,
      contextIncludes: ["design/", ".features/"],
    });
  });

  it("initializes a spec-only project from the template registry", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--template", "spec-only"], { cwd });

    expect(init.exitCode).toBe(0);
    expect(init.stdout).toContain("mode goalspec");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("type: spec-only");
    await expect(readFile(join(cwd, ".specos/manifest.yaml"), "utf8")).resolves.toContain("projectMode: goalspec");
    await expect(readFile(join(cwd, "docs", "spec-modes", "README.md"), "utf8")).resolves.toContain("Spec Modes");
    await expect(readFile(join(cwd, "current", "README.md"), "utf8")).resolves.toContain("active delivery workspace");
    await expect(readFile(join(cwd, "design", "README.md"), "utf8")).resolves.toContain("Stable platform");
    await expect(readFile(join(cwd, ".features", "README.md"), "utf8")).resolves.toContain("feature-spec layer");
    await expect(readFile(join(cwd, ".features", "roadmap.md"), "utf8")).resolves.toContain("Spec Roadmap");
    await expect(readFile(join(cwd, ".features", "_template", "feature", "task-plan.example.md"), "utf8")).resolves.toContain("Task Plan Example");
    await expect(readFile(join(cwd, "tests", "_template", "feature", "scenarios.example.md"), "utf8")).resolves.toContain("Test Scenarios Example");
    await expect(readFile(join(cwd, "tests", "plans", "test-plan.schema.md"), "utf8")).resolves.toContain("Test Plan Schema");
  });

  it("rejects unknown init modes with a stable error code", async () => {
    const cwd = await tempProject();

    const init = await runCli(["init", "--mode", "legacy"], { cwd });

    expect(init.exitCode).toBe(1);
    expect(init.stderr).toContain("SPECOS_ARGUMENT_INVALID");
    expect(init.stderr).toContain("--mode must be litespec, goalspec, or enterprisespec");
  });

  it("rejects unknown route-request formats with a stable error code", async () => {
    const cwd = await tempProject();

    const routed = await runCli(
      ["route-request", "--request", "test request", "--format", "legacy"],
      { cwd },
    );

    expect(routed.exitCode).toBe(1);
    expect(routed.stderr).toContain("SPECOS_ARGUMENT_INVALID");
    expect(routed.stderr).toContain("--format must be full, dispatch-json, primary-json, or execution-plan-json");
  });

  it("rejects unknown validate-route-output formats with a stable error code", async () => {
    const cwd = await tempProject();

    const validated = await runCli(
      ["validate-route-output", "--file", "route.json", "--format", "legacy"],
      { cwd },
    );

    expect(validated.exitCode).toBe(1);
    expect(validated.stderr).toContain("SPECOS_ARGUMENT_INVALID");
    expect(validated.stderr).toContain("--format must be full, dispatch-json, primary-json, or execution-plan-json");
  });

  it("rejects missing validate-execution-plan file args with a stable error code", async () => {
    const cwd = await tempProject();

    const validated = await runCli(["validate-execution-plan"], { cwd });

    expect(validated.exitCode).toBe(1);
    expect(validated.stderr).toContain("SPECOS_ARGUMENT_INVALID");
    expect(validated.stderr).toContain("validate-execution-plan requires --file <path>");
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
      manifest.replace("specsDir: .features", "specsDir: ../outside"),
    );

    const check = await runCli(["check"], { cwd });

    expect(check.exitCode).toBe(1);
    expect(check.stderr).toContain("SPECOS_MANIFEST_INVALID");
    expect(check.stderr).toContain("artifacts.specsDir");
  });

  it("rejects a project whose declared workflow file is missing", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await rm(join(cwd, ".specos", "workflows", "default-fullstack.yaml"));

    const check = await runCli(["check"], { cwd });

    expect(check.exitCode).toBe(1);
    expect(check.stderr).toContain("SPECOS_WORKFLOW_MISSING");
    expect(check.stderr).toContain(".specos/workflows/default-fullstack.yaml");
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
    await expect(readFile(join(projectRoot, "agent-teams", "sample-team", "README.md"), "utf8")).resolves.toContain(
      "Sample Team Pack",
    );
    await expect(readFile(join(projectRoot, "rules", "backend", "go-backend-governance.md"), "utf8")).resolves.toContain(
      "Go Backend Governance",
    );
    await expect(readFile(join(projectRoot, ".specos", "workflows", "spec-driven-default.yaml"), "utf8")).resolves.toContain(
      "bundle-step-ok",
    );
    await expect(readFile(join(projectRoot, ".specos", "bundles", "installed", "reward-center-bundle.yaml"), "utf8")).resolves.toContain(
      "defaultWorkflow: spec-driven-default",
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
    ).rejects.toThrow();

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
    await expect(
      readFile(join(projectRoot, ".codex", "skills", "specos-ui-design", "SKILL.md"), "utf8"),
    ).rejects.toThrow();
    await expect(readFile(join(projectRoot, "current", "README.md"), "utf8")).resolves.toContain("Current");
    await expect(readFile(join(projectRoot, "docs", "spec-modes", "README.md"), "utf8")).resolves.toContain("Spec Modes");
    await expect(readFile(join(projectRoot, "rules", "README.md"), "utf8")).resolves.toContain("Rules");
    await expect(readFile(join(projectRoot, "design", "README.md"), "utf8")).resolves.toContain("Stable platform");
    await expect(readFile(join(projectRoot, ".features", "roadmap.md"), "utf8")).resolves.toContain("Spec Roadmap");
    await expect(readFile(join(projectRoot, ".specos", "manifest.yaml"), "utf8")).resolves.toContain("projectMode: goalspec");
    await expect(readFile(join(projectRoot, ".specos", "manifest.yaml"), "utf8")).resolves.toContain("artifacts:");

    const check = await runCli(["check"], { cwd: projectRoot });
    expect(check.exitCode).toBe(0);
    expect(check.stdout).toContain("SPECOS_CHECK_OK");
  });

  it("generates a test plan and isolated test schedule from spec.md frontmatter", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, ".features", "RP-002-reward-order-create"), { recursive: true });
    await writeFile(
      join(cwd, ".features", "RP-002-reward-order-create", "spec.md"),
      [
        "---",
        "id: reward-order",
        "version: 1.0.0",
        "title: Reward Order",
        "goals:",
        "  - Create reward orders",
        "nonGoals:",
        "  - Payment",
        "actors:",
        "  - member",
        "userFlows:",
        "  - name: Claim reward",
        "    steps:",
        "      - Open page",
        "      - Click claim",
        "      - View result",
        "systemFlows:",
        "  - name: Create order",
        "    steps:",
        "      - Validate",
        "      - Persist",
        "      - Respond",
        "rules:",
        "  - id: reward.order.create",
        "    description: Create one order per claim",
        "edgeCases:",
        "  - stock is zero",
        "api:",
        "  - name: Create reward order",
        "    method: POST",
        "    path: /api/reward-orders",
        "ui:",
        "  - name: Reward page",
        "    route: /rewards",
        "observability:",
        "  - trace_id",
        "tests:",
        "  requiredBranches:",
        "    - happy",
        "    - limit",
        "    - error",
        "    - flow",
        "traceability:",
        "  prd: .prd/reward-order.md",
        "---",
        "",
        "# Reward Order Change Spec",
        "",
        "Human-readable contract body.",
        "",
      ].join("\n"),
    );
    const featureSpecPath = join(cwd, ".features", "RP-002-reward-order-create", "spec.md");
    const featureSpecHash = createHash("sha256").update(await readFile(featureSpecPath, "utf8")).digest("hex");
    await writeFile(
      join(cwd, ".features", "RP-002-reward-order-create", "test-spec.md"),
      [
        "---",
        "testSpecId: reward-order.test",
        "testSpecVersion: 1.0.0",
        "sourceSpec: .features/RP-002-reward-order-create/spec.md",
        `sourceSpecHash: ${featureSpecHash}`,
        "sourceSpecId: reward-order",
        "sourceSpecVersion: 1.0.0",
        "status: approved",
        "sourceApprovalEvidence: feature-review-001",
        "testSpecApprovalEvidence: review-001",
        "---",
        "# Test Spec: Reward Order",
        "",
      ].join("\n"),
    );

    const plan = await runCli(
      [
        "generate-test-plan",
        ".features/RP-002-reward-order-create/spec.md",
        "--change",
        "RP-002",
      ],
      { cwd },
    );

    expect(plan.exitCode).toBe(0);
    expect(plan.stdout).toContain("SPECOS_TEST_PLAN_OK");
    expect(plan.stdout).toContain("SPECOS_TEST_SCHEDULE_OK");

    const testPlan = JSON.parse(await readFile(join(cwd, "tests", "plans", "reward-order.test-plan.json"), "utf8"));
    const schedule = JSON.parse(await readFile(join(cwd, "tests", "schedules", "reward-order.test-schedule.json"), "utf8"));

    expect(testPlan).toMatchObject({
      testSpecPath: ".features/RP-002-reward-order-create/test-spec.md",
      testSpecId: "reward-order.test",
      testSpecVersion: "1.0.0",
      testSpecStatus: "approved",
      testSpecApprovalEvidence: "review-001",
    });
    expect(schedule).toMatchObject({
      testSpecPath: ".features/RP-002-reward-order-create/test-spec.md",
      testSpecId: "reward-order.test",
      testSpecVersion: "1.0.0",
      testSpecStatus: "approved",
      testSpecApprovalEvidence: "review-001",
    });
    expect(schedule.changeId).toBe("RP-002");
    expect(testPlan.scenarios.map((scenario: { branches: string[] }) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
    expect(schedule.changeId).toBe("RP-002");
    expect(schedule.tracks.map((track: { id: string }) => track.id)).toEqual(["execution", "testing"]);
    expect(schedule.tasks.map((task: { agentRole: string }) => task.agentRole)).toEqual(
      expect.arrayContaining(["execution-editor", "test-editor", "playwright-test-agent"]),
    );
  });

  it("keeps supporting JSON spec inputs for generate-test-plan", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, ".features", "RP-002-reward-order-create"), { recursive: true });
    await writeFile(
      join(cwd, ".features", "RP-002-reward-order-create", "spec.json"),
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
          observability: ["trace_id"],
          tests: { requiredBranches: ["happy", "limit", "error", "flow"] },
          traceability: { prd: ".prd/reward-order.md" },
        },
        null,
        2,
      ),
    );

    const featureSpecPath = join(cwd, ".features", "RP-002-reward-order-create", "spec.json");
    const featureSpecHash = createHash("sha256").update(await readFile(featureSpecPath, "utf8")).digest("hex");
    await writeFile(
      join(cwd, ".features", "RP-002-reward-order-create", "test-spec.md"),
      [
        "---",
        "testSpecId: reward-order.test",
        "testSpecVersion: 1.0.0",
        "sourceSpec: .features/RP-002-reward-order-create/spec.json",
        `sourceSpecHash: ${featureSpecHash}`,
        "sourceSpecId: reward-order",
        "sourceSpecVersion: 1.0.0",
        "status: approved",
        "sourceApprovalEvidence: feature-review-001",
        "testSpecApprovalEvidence: review-001",
        "---",
        "# Test Spec: Reward Order",
        "",
      ].join("\n"),
    );

    const plan = await runCli(
      [
        "generate-test-plan",
        ".features/RP-002-reward-order-create/spec.json",
        "--change",
        "RP-002",
      ],
      { cwd },
    );

    expect(plan.exitCode, plan.stderr).toBe(0);
    expect(plan.stdout).toContain("SPECOS_TEST_PLAN_OK");
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
              allowedInputs: [".features/RP-002-reward-order-create/spec.md"],
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
              agentRole: "test-editor",
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
              allowedInputs: [".features/RP-002-reward-order-create/spec.md"],
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
              agentRole: "test-editor",
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
    await mkdir(join(cwd, "reviews", "reward-order-create"), { recursive: true });
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
    await expect(readFile(join(cwd, "reviews", "reward-order-create", "gate-report.md"), "utf8")).resolves.toContain(
      "Decision: blocked",
    );
  });

  it("ignores unrelated invalid historical results when validating a specific change gate", async () => {
    const cwd = await tempProject();
    await runCli(["init"], { cwd });
    await mkdir(join(cwd, "tests", "plans"), { recursive: true });
    await mkdir(join(cwd, "tests", "results"), { recursive: true });
    await mkdir(join(cwd, "reviews", "reward-order-ready"), { recursive: true });
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
