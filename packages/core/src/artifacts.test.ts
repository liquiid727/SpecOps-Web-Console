import { describe, expect, it } from "vitest";
import {
  buildAgentExecutionPlan,
  buildDispatchPromptEnvelopeSchema,
  buildExecutionPlanOutputSchema,
  buildHostPromptAssemblySchema,
  buildPrimaryDispatchPromptEnvelopeSchema,
  buildSpecialistDispatchPromptEnvelopeSchema,
  buildValidatedAgentExecutionPlan,
  buildValidatedRouteRequestOutput,
  buildBlockedApiScenarioResult,
  buildBrunoCollectionAssets,
  buildDeterministicTestPlan,
  buildExecutedApiScenarioResult,
  buildHostPromptAssembly,
  buildPrimaryDispatchPromptEnvelope,
  buildRequestRoute,
  buildRouteRequestOutputSchema,
  buildSpecialistDispatchPlan,
  buildSpecialistDispatchPromptEnvelope,
  buildTestGateReport,
  buildSpecChangeTestSchedule,
  formatRouteRequestOutput,
  validateAgentExecutionPlan,
  validateDispatchPromptEnvelope,
  validateExecutionPlanOutput,
  validatePrimaryDispatchPromptEnvelope,
  validateSpecialistDispatchPromptEnvelope,
  validateBundle,
  validateHostPromptAssembly,
  validateManifest,
  validateRouteRequestOutput,
  validateScenarioResult,
  validateSpec,
  validateTestSchedule,
  validateTestPlan,
} from "./artifacts";

describe("artifact validation", () => {
  it("routes UI test console requests to frontend, tests, and gate agents", () => {
    const route = buildRequestRoute(
      "强化测试 UI 首页，支持 API、E2E、性能、并发测试，并接入 CI gate",
    );

    expect(route).toMatchObject({
      projectMode: "litespec",
      requestKind: "test",
      primaryAgent: "testing-agent",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["frontend", "tests", "ci"]));
    expect(route.supportingAgents).toEqual(
      expect.arrayContaining([
        "ui-design-agent",
        "test-editor",
        "test-editor",
        "playwright-test-agent",
        "performance-test-agent",
        "concurrency-test-agent",
        "ci-editor",
        "qa-agent",
      ]),
    );
    expect(route.rules).toEqual(
      expect.arrayContaining(["rules/testing/production-test-standards.md", "rules/ci/spec-release-gates.md"]),
    );
    expect(route.skills).toContain(".codex/skills/specos-ui-design/SKILL.md");
    expect(route.requiredContext).toEqual(expect.arrayContaining([".specos/manifest.yaml", "current/", "docs/spec-modes/LiteSpec/README.md"]));
    expect(route.promptAssembly).toMatchObject({
      manifestPath: ".agents/manifest.yaml",
      overlayManifest: ".agents/modes/litespec/manifest.overlay.yaml",
    });
    expect(route.promptAssembly.loadOrder).toEqual(
      expect.arrayContaining([
        ".specos/manifest.yaml projectMode",
        "selected mode overlay manifest from .agents/modes/<projectMode>/manifest.overlay.yaml",
      ]),
    );
    expect(route.promptAssembly.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "testing-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/litespec/roles/testing-agent.md",
          modeCanonicalPrompt: "ai/agents/modes/litespec/testing-agent.md",
        }),
        expect.objectContaining({
          role: "ui-design-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/litespec/roles/ui-design-agent.md",
          modeCanonicalPrompt: "ai/agents/modes/litespec/ui-design-agent.md",
        }),
      ]),
    );
  });

  it("routes QA acceptance requests to the testing agent", () => {
    const route = buildRequestRoute("请 QA agent 做最终质量验收，汇总 gate report 和 review findings");

    expect(route).toMatchObject({
      requestKind: "acceptance",
      primaryAgent: "testing-agent",
      needsChangePackage: true,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["tests", "ci", "orchestration"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["test-editor", "ci-editor", "reviewer"]));
  });

  it("routes architecture orchestration requests to the architecture agent with bounded supporting agents", () => {
    const route = buildRequestRoute("让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工", {
      projectMode: "enterprisespec",
    });

    expect(route).toMatchObject({
      projectMode: "enterprisespec",
      requestKind: "test",
      primaryAgent: "architecture-agent",
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["architecture", "backend", "tests", "orchestration"]));
    expect(route.supportingAgents).toEqual(
      expect.arrayContaining([
        "openapi-agent",
        "db-migration-agent",
        "performance-test-agent",
        "concurrency-test-agent",
        "test-editor",
        "reviewer",
      ]),
    );
    expect(route.rules).toEqual(expect.arrayContaining(["ai/workflows/nested-agent-orchestration.md"]));
    expect(route.requiredContext).toContain("docs/spec-modes/EnterpriseSpec/README.md");
    expect(route.promptAssembly.overlayManifest).toBe(".agents/modes/enterprisespec/manifest.overlay.yaml");
    expect(route.promptAssembly.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/enterprisespec/roles/openapi-agent.md",
          modeCanonicalPrompt: "ai/agents/modes/enterprisespec/openapi-agent.md",
        }),
        expect.objectContaining({
          role: "db-migration-agent",
          overlayApplied: true,
          modeRolePrompt: ".agents/modes/enterprisespec/roles/db-migration-agent.md",
          modeCanonicalPrompt: "ai/agents/modes/enterprisespec/db-migration-agent.md",
        }),
      ]),
    );
  });

  it("builds host prompt assembly from manifest and overlay metadata", () => {
    const assembly = buildHostPromptAssembly(
      {
        calling_convention: {
          role_path_base: ".agents",
          mode_overlay_roots: {
            role_overlays: ".agents/modes",
            canonical_overlays: "ai/agents/modes",
          },
          prompt_assembly_order: [
            "AGENTS.md",
            ".codex/instructions.md",
            ".specos/manifest.yaml projectMode",
            "selected role metadata from .agents/manifest.yaml",
            "selected mode overlay manifest from .agents/modes/<projectMode>/manifest.overlay.yaml",
            "selected shared role_prompt",
            "selected shared canonical",
            "selected mode overlay role_prompt when present",
            "selected mode overlay canonical when present",
            "selected skills",
            "selected context_includes",
          ],
        },
        mode_overlays: {
          enterprisespec: {
            manifest_overlay: ".agents/modes/enterprisespec/manifest.overlay.yaml",
          },
        },
        roles: {
          "testing-agent": {
            role_prompt: "roles/testing-agent.md",
            canonical: "ai/agents/testing-agent.md",
            skill_mode: "scoped_only",
            skills: [],
            delegates_to: ["test-editor", "qa-agent"],
            context_includes: ["tests/README.md", "tests/results/"],
            owns: ["independent verification strategy"],
            outputs: ["test strategy and owner map"],
          },
          "test-editor": {
            role_prompt: "roles/test-editor.md",
            canonical: "ai/agents/test-editor.md",
            skill_mode: "scoped_only",
            skills: [],
            context_includes: ["tests/README.md", "specs/"],
            owns: ["tests/"],
            outputs: ["scenario coverage"],
          },
          "ddd-domain-agent": {
            role_prompt: "roles/ddd-domain-agent.md",
            canonical: "ai/agents/ddd-domain-agent.md",
            skills: [],
            context_includes: ["design/", "specs/"],
            owns: ["domain boundaries"],
            outputs: ["domain risk review"],
          },
        },
      },
      {
        projectMode: "enterprisespec",
        manifestPath: ".agents/manifest.yaml",
        primaryAgent: "testing-agent",
        supportingAgents: ["test-editor", "ddd-domain-agent"],
        overlayManifest: {
          mode: "enterprisespec",
          overrides: ["testing-agent", "test-editor"],
        },
      },
    );

    expect(assembly).toMatchObject({
      projectMode: "enterprisespec",
      manifestPath: ".agents/manifest.yaml",
      overlayManifest: ".agents/modes/enterprisespec/manifest.overlay.yaml",
    });
    expect(assembly.sharedContext).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        ".codex/instructions.md",
        ".agents/manifest.yaml",
        ".specos/manifest.yaml projectMode",
      ]),
    );
    const testingAgent = assembly.roles.find((role) => role.role === "testing-agent");
    const testEditor = assembly.roles.find((role) => role.role === "test-editor");
    const domainAgent = assembly.roles.find((role) => role.role === "ddd-domain-agent");

    expect(testingAgent).toMatchObject({
      role: "testing-agent",
      overlayApplied: true,
      modeRolePrompt: ".agents/modes/enterprisespec/roles/testing-agent.md",
      skills: [],
      contextIncludes: ["tests/README.md", "tests/results/"],
      delegatesTo: ["test-editor", "qa-agent"],
    });
    expect(testEditor).toMatchObject({
      role: "test-editor",
      overlayApplied: true,
      modeRolePrompt: ".agents/modes/enterprisespec/roles/test-editor.md",
      contextIncludes: ["tests/README.md", "specs/"],
    });
    expect(domainAgent).toMatchObject({
      role: "ddd-domain-agent",
      overlayApplied: false,
      contextIncludes: ["design/", "specs/"],
    });
    expect(domainAgent?.modeRolePrompt).toBeUndefined();
  });

  it("builds an agent execution plan from route plus prompt assembly", () => {
    const plan = buildAgentExecutionPlan(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      {
        projectMode: "enterprisespec",
        manifest: {
          calling_convention: {
            role_path_base: ".agents",
            mode_overlay_roots: {
              role_overlays: ".agents/modes",
              canonical_overlays: "ai/agents/modes",
            },
          },
          mode_overlays: {
            enterprisespec: {
              manifest_overlay: ".agents/modes/enterprisespec/manifest.overlay.yaml",
            },
          },
          roles: {
            "architecture-agent": {
              role_prompt: "roles/architecture-agent.md",
              canonical: "ai/agents/architecture-agent.md",
              skills: [],
              context_includes: ["design/", "specs/roadmap.md"],
              delegates_to: ["openapi-agent", "db-migration-agent", "reviewer"],
              owns: ["architecture decision synthesis"],
              outputs: ["architecture recommendation"],
            },
            "openapi-agent": {
              role_prompt: "roles/openapi-agent.md",
              canonical: "ai/agents/openapi-agent.md",
              skills: [],
              context_includes: ["specs/", "rules/shared/error-code-governance.md"],
              outputs: ["OpenAPI contract updates"],
            },
            "ddd-domain-agent": {
              role_prompt: "roles/ddd-domain-agent.md",
              canonical: "ai/agents/ddd-domain-agent.md",
              skills: [],
              context_includes: ["design/", "specs/"],
              outputs: ["domain risk review"],
            },
          },
        },
      },
    );

    expect(plan).toMatchObject({
      request: "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      projectMode: "enterprisespec",
      specialistDispatch: "bounded-parallel",
      recommendedParallelism: {
        suggested: 4,
        max: 4,
      },
    });
    expect(plan.route.primaryAgent).toBe("architecture-agent");
    expect(plan.primaryTask).toMatchObject({
      role: "architecture-agent",
      dispatch: "primary",
      parallelizable: false,
    });
    expect(plan.primaryDispatchPromptEnvelope).toMatchObject({
      role: "architecture-agent",
      sharedPromptStack: expect.arrayContaining(["AGENTS.md", ".codex/instructions.md"]),
    });
    expect(plan.primaryTask.requiredContext).toEqual(
      expect.arrayContaining(["design/", "specs/roadmap.md", "ai/workflows/nested-agent-orchestration.md"]),
    );
    expect(plan.supportingTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
          dispatch: "supporting",
          parallelizable: true,
          requestedRuntimeSkills: expect.arrayContaining([]),
        }),
        expect.objectContaining({
          role: "ddd-domain-agent",
          dispatch: "supporting",
          parallelizable: true,
        }),
      ]),
    );
    expect(plan.specialistDispatchPlan.tasks).toHaveLength(4);
    expect(plan.specialistDispatchPlan.tasks).toEqual(
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
        expect.objectContaining({
          role: "performance-test-agent",
          parallelizable: true,
        }),
        expect.objectContaining({
          role: "concurrency-test-agent",
          parallelizable: true,
        }),
      ]),
    );
  });

  it("builds bounded specialist dispatch tasks with deferred roles", () => {
    const executionPlan = buildAgentExecutionPlan(
      "强化测试 UI，覆盖 API、E2E、性能、并发，并接入 CI gate",
      {
        projectMode: "litespec",
      },
    );

    const specialistPlan = buildSpecialistDispatchPlan(executionPlan, {
      minTasks: 2,
      maxTasks: 4,
    });

    expect(specialistPlan).toMatchObject({
      primaryRole: "testing-agent",
      minTasks: 2,
      maxTasks: 4,
    });
    expect(specialistPlan.tasks.length).toBeGreaterThanOrEqual(2);
    expect(specialistPlan.tasks.length).toBeLessThanOrEqual(4);
    expect(specialistPlan.tasks[0]).toMatchObject({
      id: expect.stringContaining("dispatch-1-"),
      parallelizable: true,
      exactQuestion: expect.stringContaining("强化测试 UI"),
    });
    expect(specialistPlan.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "test-editor",
          expectedOutput: expect.arrayContaining(["concise findings"]),
          dispatchPromptEnvelope: expect.objectContaining({
            role: "test-editor",
          }),
        }),
        expect.objectContaining({
          role: "performance-test-agent",
        }),
      ]),
    );
    expect(specialistPlan.deferredRoles.length).toBeGreaterThan(0);
  });

  it("builds a direct specialist dispatch prompt envelope", () => {
    const executionPlan = buildAgentExecutionPlan(
      "强化测试 UI，覆盖 API、E2E、性能、并发，并接入 CI gate",
      {
        projectMode: "litespec",
      },
    );
    const task = executionPlan.specialistDispatchPlan.tasks[0];
    const envelope = buildSpecialistDispatchPromptEnvelope(task, executionPlan);

    expect(envelope).toMatchObject({
      role: task.role,
      sharedPromptStack: expect.arrayContaining([
        "AGENTS.md",
        ".codex/instructions.md",
      ]),
      rolePromptStack: expect.arrayContaining([
        expect.stringContaining(`.agents/roles/${task.role}.md`),
        expect.stringContaining(`ai/agents/${task.role}.md`),
      ]),
      contextPaths: expect.arrayContaining(task.inspectableSurfaces),
      requestedRuntimeSkills: task.requestedRuntimeSkills,
      taskBrief: {
        reason: task.reason,
        exactQuestion: task.exactQuestion,
        inspectableSurfaces: task.inspectableSurfaces,
        expectedOutput: task.expectedOutput,
        nonGoals: task.nonGoals,
      },
    });
    expect(envelope.message).toContain(`Role: ${task.role}`);
    expect(envelope.message).toContain("Exact Question");
    expect(envelope.message).toContain("Inspectable Surfaces");
  });

  it("builds a direct primary dispatch prompt envelope", () => {
    const executionPlan = buildAgentExecutionPlan(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      {
        projectMode: "enterprisespec",
      },
    );
    const envelope = buildPrimaryDispatchPromptEnvelope(executionPlan);

    expect(envelope).toMatchObject({
      role: "architecture-agent",
      sharedPromptStack: expect.arrayContaining([
        "AGENTS.md",
        ".codex/instructions.md",
      ]),
      rolePromptStack: expect.arrayContaining([
        ".agents/roles/architecture-agent.md",
        "ai/agents/architecture-agent.md",
      ]),
    });
    expect(envelope.taskBrief.exactQuestion).toContain("smallest correct cross-surface plan");
    expect(envelope.message).toContain("Dispatch: primary");
    expect(envelope.message).toContain("Expected Output");
  });

  it("formats route request output projections from one execution plan", () => {
    const executionPlan = buildAgentExecutionPlan(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      { projectMode: "enterprisespec" },
    );

    const full = formatRouteRequestOutput(executionPlan, "full");
    const dispatchJson = formatRouteRequestOutput(executionPlan, "dispatch-json");
    const primaryJson = formatRouteRequestOutput(executionPlan, "primary-json");

    expect(full).toMatchObject({
      primaryAgent: "architecture-agent",
      executionPlan: expect.objectContaining({
        projectMode: "enterprisespec",
      }),
    });
    expect(Array.isArray(dispatchJson)).toBe(true);
    expect(dispatchJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "openapi-agent",
        }),
      ]),
    );
    expect(primaryJson).toMatchObject({
      role: "architecture-agent",
    });
  });

  it("builds route request output schemas for all exported formats", () => {
    expect(buildDispatchPromptEnvelopeSchema()).toMatchObject({
      artifact: "dispatch-prompt-envelope",
      rootType: "object",
      requiredTopLevel: expect.arrayContaining(["role", "taskBrief", "message"]),
    });
    expect(buildPrimaryDispatchPromptEnvelopeSchema()).toEqual(buildDispatchPromptEnvelopeSchema());
    expect(buildSpecialistDispatchPromptEnvelopeSchema()).toEqual(buildDispatchPromptEnvelopeSchema());
    expect(buildRouteRequestOutputSchema("full")).toMatchObject({
      artifact: "route-output",
      format: "full",
      rootType: "object",
      requiredTopLevel: expect.arrayContaining(["projectMode", "executionPlan"]),
    });
    expect(buildRouteRequestOutputSchema("dispatch-json")).toMatchObject({
      artifact: "route-output",
      format: "dispatch-json",
      rootType: "array",
      itemRequiredTopLevel: expect.arrayContaining(["role", "message"]),
    });
    expect(buildRouteRequestOutputSchema("primary-json")).toMatchObject({
      artifact: "route-output",
      format: "primary-json",
      rootType: "object",
      requiredTopLevel: expect.arrayContaining(["role", "taskBrief", "message"]),
    });
    expect(buildRouteRequestOutputSchema("primary-json").requiredTopLevel).toEqual(
      buildDispatchPromptEnvelopeSchema().requiredTopLevel,
    );
    expect(buildRouteRequestOutputSchema("dispatch-json").itemRequiredTopLevel).toEqual(
      buildDispatchPromptEnvelopeSchema().requiredTopLevel,
    );
    expect(buildRouteRequestOutputSchema("execution-plan-json")).toMatchObject({
      artifact: "execution-plan-output",
      format: "execution-plan-json",
      rootType: "object",
      requiredTopLevel: expect.arrayContaining(["request", "route", "primaryTask", "specialistDispatchPlan"]),
    });
    expect(buildExecutionPlanOutputSchema()).toEqual(buildRouteRequestOutputSchema("execution-plan-json"));
    expect(buildHostPromptAssemblySchema()).toMatchObject({
      artifact: "host-prompt-assembly",
      rootType: "object",
      requiredTopLevel: expect.arrayContaining(["projectMode", "manifestPath", "roles"]),
      roleRequiredTopLevel: expect.arrayContaining(["role", "sharedRolePrompt", "overlayApplied", "loadOrder"]),
    });
  });

  it("validates route request output projections", () => {
    const executionPlan = buildAgentExecutionPlan(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      { projectMode: "enterprisespec" },
    );

    const full = formatRouteRequestOutput(executionPlan, "full");
    const dispatchJson = formatRouteRequestOutput(executionPlan, "dispatch-json");
    const primaryJson = formatRouteRequestOutput(executionPlan, "primary-json");
    const executionPlanJson = formatRouteRequestOutput(executionPlan, "execution-plan-json");

    expect(validateRouteRequestOutput(full, "full").ok).toBe(true);
    expect(validateRouteRequestOutput(dispatchJson, "dispatch-json").ok).toBe(true);
    expect(validateRouteRequestOutput(primaryJson, "primary-json").ok).toBe(true);
    expect(validateRouteRequestOutput(executionPlanJson, "execution-plan-json").ok).toBe(true);
    expect(validateDispatchPromptEnvelope(primaryJson).ok).toBe(true);
    expect(validatePrimaryDispatchPromptEnvelope(primaryJson).ok).toBe(true);
    expect(validateSpecialistDispatchPromptEnvelope(dispatchJson[0]).ok).toBe(true);
  });

  it("validates host prompt assemblies and execution plans for runtime reuse", () => {
    const executionPlan = buildAgentExecutionPlan(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      { projectMode: "enterprisespec" },
    );

    expect(validateHostPromptAssembly(executionPlan.promptAssembly).ok).toBe(true);
    expect(validateAgentExecutionPlan(executionPlan).ok).toBe(true);
    expect(validateExecutionPlanOutput(executionPlan).ok).toBe(true);
  });

  it("builds validated execution plans for host runtimes", () => {
    const executionPlan = buildValidatedAgentExecutionPlan(
      "强化测试 UI，覆盖 API、E2E、性能、并发，并接入 CI gate",
      { projectMode: "litespec" },
    );

    expect(executionPlan.primaryTask.role).toBe("testing-agent");
    expect(executionPlan.primaryDispatchPromptEnvelope.role).toBe("testing-agent");
    expect(executionPlan.specialistDispatchPlan.tasks.length).toBeGreaterThanOrEqual(2);
  });

  it("builds validated route request output projections for host reuse", () => {
    const { executionPlan, output } = buildValidatedRouteRequestOutput(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      "dispatch-json",
      { projectMode: "enterprisespec" },
    );

    expect(executionPlan.primaryTask.role).toBe("architecture-agent");
    expect(Array.isArray(output)).toBe(true);
    expect(validateRouteRequestOutput(output, "dispatch-json").ok).toBe(true);
  });

  it("builds validated execution-plan-json projections for host reuse", () => {
    const { executionPlan, output } = buildValidatedRouteRequestOutput(
      "让架构 agent 评估订单 API、数据库迁移、性能和并发风险，并输出子 agent 分工",
      "execution-plan-json",
      { projectMode: "enterprisespec" },
    );

    expect(executionPlan.primaryTask.role).toBe("architecture-agent");
    expect(output).toMatchObject({
      request: expect.stringContaining("订单 API"),
      primaryTask: expect.objectContaining({
        role: "architecture-agent",
      }),
    });
    expect(validateRouteRequestOutput(output, "execution-plan-json").ok).toBe(true);
  });

  it("rejects invalid route request output projections", () => {
    const invalidPrimary = {
      sharedPromptStack: ["AGENTS.md"],
      rolePromptStack: [".agents/roles/testing-agent.md"],
      contextPaths: ["design/"],
      requestedRuntimeSkills: [],
      taskBrief: {
        reason: "x",
        exactQuestion: "y",
        inspectableSurfaces: ["design/"],
        expectedOutput: ["plan"],
        nonGoals: ["none"],
      },
      message: "missing role",
    };

    const invalidDispatch = [
      {
        role: "openapi-agent",
        sharedPromptStack: ["AGENTS.md"],
        rolePromptStack: ["ai/agents/openapi-agent.md"],
        contextPaths: ["specs/"],
        requestedRuntimeSkills: [],
        taskBrief: {
          reason: "x",
          exactQuestion: "y",
          inspectableSurfaces: ["specs/"],
          expectedOutput: ["contract"],
          nonGoals: ["none"],
        },
      },
    ];

    expect(validateRouteRequestOutput(invalidPrimary, "primary-json").ok).toBe(false);
    expect(validateRouteRequestOutput(invalidDispatch, "dispatch-json").ok).toBe(false);
    expect(validateDispatchPromptEnvelope(invalidPrimary).ok).toBe(false);
    expect(validatePrimaryDispatchPromptEnvelope(invalidPrimary).ok).toBe(false);
    expect(validateSpecialistDispatchPromptEnvelope(invalidDispatch[0]).ok).toBe(false);
    expect(validateRouteRequestOutput(invalidPrimary, "primary-json").errors.map((error) => error.code)).toContain("SPECOS_ROUTE_OUTPUT_INVALID");
  });

  it("rejects invalid host prompt assemblies and execution plans", () => {
    expect(
      validateHostPromptAssembly({
        projectMode: "litespec",
        manifestPath: ".agents/manifest.yaml",
      }).ok,
    ).toBe(false);

    expect(
      validateAgentExecutionPlan({
        request: "bad plan",
        promptAssembly: {
          projectMode: "litespec",
        },
      }).ok,
    ).toBe(false);
    expect(
      validateExecutionPlanOutput({
        request: "bad plan",
        promptAssembly: {
          projectMode: "litespec",
        },
      }).ok,
    ).toBe(false);
  });

  it("routes pure architecture reviews to the architecture agent before spec intake", () => {
    const route = buildRequestRoute("请评估这个领域边界和跨服务架构风险");

    expect(route).toMatchObject({
      requestKind: "review",
      primaryAgent: "architecture-agent",
      needsDraft: false,
    });
    expect(route.workTypes).toEqual(expect.arrayContaining(["architecture"]));
    expect(route.supportingAgents).toEqual(expect.arrayContaining(["reviewer", "test-editor"]));
  });

  it("routes raw requirements to spec intake before implementation", () => {
    const route = buildRequestRoute("我有一个新的支付路由需求，还没有 spec，先帮我整理一下");

    expect(route).toMatchObject({
      requestKind: "raw-requirement",
      primaryAgent: "architecture-agent",
      needsDraft: true,
      needsChangePackage: true,
    });
    expect(route.workTypes).toContain("spec");
    expect(route.nextStep).toContain("spec-draft");
  });

  it("accepts a minimal fullstack manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      projectMode: "litespec",
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["fullstack-base"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
  });

  it("accepts a minimal spec-only manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "spec-only" },
      projectMode: "enterprisespec",
      stacks: { frontend: "none", backend: "none" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["spec-driven-delivery"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-spec-only"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects an unknown project mode", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      projectMode: "legacy",
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["fullstack-base"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("projectMode");
  });

  it("rejects a manifest without rule packs and agent templates", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["rulePacks", "agentTemplates"]),
    );
  });

  it("rejects provider secret fields in manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "specs",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      rulePacks: ["fullstack-base"],
      agentTemplates: ["spec-editor"],
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
      providers: { configPath: ".specos/providers.yaml", apiKey: "secret" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("providers.apiKey");
  });

  it("rejects specs without required coverage fields", () => {
    const result = validateSpec({
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("SPECOS_SPEC_INVALID");
  });

  it("rejects specs missing happy, limit, error, and flow coverage", () => {
    const result = validateSpec({
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
      observability: ["trace_id"],
      tests: { requiredBranches: ["happy"] },
      traceability: { draft: "spec-draft/reward-order.md" },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("tests.requiredBranches");
  });

  it("builds deterministic happy, limit, error, and flow scenarios from a spec", () => {
    const spec = {
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
    };

    const plan = buildDeterministicTestPlan(spec);
    const validation = validateTestPlan(plan);

    expect(validation.ok).toBe(true);
    expect(plan.specId).toBe("reward-order");
    expect(plan.featureName).toBe("Reward Order");
    expect(plan.source).toBe("accepted-spec");
    expect(plan.endpoints[0]).toMatchObject({
      name: "Create reward order",
      method: "POST",
      path: "/api/reward-orders",
      branches: ["happy", "limit", "error", "flow"],
      relatedRule: "reward.order.create",
    });
    expect(plan.scenarios.map((scenario) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
  });

  it("adds production testing standard metadata to generated test plans", () => {
    const spec = {
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
    };

    const plan = buildDeterministicTestPlan(spec);

    expect(validateTestPlan(plan).ok).toBe(true);
    expect(plan).toMatchObject({
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "fullstack-flow",
      riskTier: "P0",
      flakePolicy: {
        allowedRetries: 1,
        quarantineAllowed: false,
        classificationRequired: true,
      },
    });
    expect(plan.standardRequirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "std.p0.api.contract",
          layer: "api",
          ownerAgent: "test-editor",
          requiredFor: ["P0", "P1"],
          requiredEvidence: ["trace"],
          gateImpact: "blocking",
        }),
      ]),
    );
  });

  it("rejects production test plans without standard owner and flake policy", () => {
    const result = validateTestPlan({
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "backend-api",
      riskTier: "P0",
      specId: "reward-order",
      specVersion: "1.0.0",
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
      standardRequirements: [
        {
          id: "std.p0.api.contract",
          layer: "api",
          appliesTo: ["POST /api/reward-orders"],
          requiredFor: ["P0"],
          requiredEvidence: ["trace"],
          gateImpact: "blocking",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["standardRequirements[0].ownerAgent", "flakePolicy"]),
    );
  });

  it("rejects blocking production result items without requirement and artifact evidence", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      standardVersion: "specos-test-standard/v1",
      qualityProfile: "backend-api",
      featureName: "Reward Order",
      status: "fail",
      releaseDecision: "blocked",
      startedAt: "2026-05-28T00:00:00.000Z",
      endedAt: "2026-05-28T00:01:00.000Z",
      blockers: ["api failed"],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 1, totalScenarios: 0 },
      flowResults: [],
      items: [
        {
          runId: "run-demo",
          specId: "reward-order",
          specVersion: "1.0.0",
          testType: "api",
          target: "POST /api/reward-orders",
          status: "fail",
          durationMs: 120,
          summary: "api failed",
          gateImpact: "blocking",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["items[0].requirementId", "items[0].ownerAgent", "items[0].artifactRefs"]),
    );
  });

  it("builds an isolated execution and test schedule from a test plan", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };

    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "RP-002",
      executionMode: "parallel",
      specPath: "specs/RP-002-reward-order-create/spec.md",
    });
    const validation = validateTestSchedule(schedule);

    expect(validation.ok).toBe(true);
    expect(schedule.changeId).toBe("RP-002");
    expect(schedule.executionMode).toBe("parallel");
    expect(schedule.tracks.map((track) => track.id)).toEqual(["execution", "testing"]);
    expect(schedule.tracks[0]).toMatchObject({
      id: "execution",
      agentRole: "execution-editor",
      isolation: "implementation-only",
    });
    expect(schedule.tracks[1]).toMatchObject({
      id: "testing",
      agentRole: "test-editor",
      isolation: "spec-and-contract-only",
    });
    expect(schedule.tasks.map((task) => task.agentRole)).toEqual([
      "execution-editor",
      "test-editor",
      "playwright-test-agent",
    ]);
    expect(schedule.tasks.find((task) => task.id === "implement-reward-order")?.outputs).toEqual([
      "implementation/RP-002-reward-order-create/implementation-report.md",
      "tests/unit/reward-order/",
    ]);
    expect(schedule.tasks.find((task) => task.id === "ui-gap-Happy")).toMatchObject({
      status: "blocked",
      reason: "UI execution is scheduled as a gap until Playwright assets and selectors are available.",
    });
  });

  it("allows execution schedules to own implementation-coupled unit tests", () => {
    const result = validateTestSchedule({
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      changeId: "RP-002",
      executionMode: "parallel",
      tracks: [
        {
          id: "execution",
          agentRole: "execution-editor",
          isolation: "implementation-only",
          allowedInputs: ["specs/RP-002-reward-order-create/spec.md"],
          forbiddenInputs: ["tests/results/", "tests/bruno/", "tests/scenarios/"],
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
          id: "implementation-with-unit-tests",
          trackId: "execution",
          agentRole: "execution-editor",
          type: "implementation",
          status: "ready",
          inputs: ["specs/RP-002-reward-order-create/spec.md"],
          outputs: ["src/reward.ts", "tests/unit/reward-order/"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
        {
          id: "api-tests",
          trackId: "testing",
          agentRole: "test-editor",
          type: "api-test",
          status: "ready",
          inputs: ["tests/plans/reward-order.test-plan.json"],
          outputs: ["tests/bruno/reward-order/", "tests/results/reward-order.run.json"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
      ],
      gates: ["implementation_done", "tests_passed"],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects test schedules that merge execution and testing responsibilities", () => {
    const result = validateTestSchedule({
      specId: "reward-order",
      specVersion: "1.0.0",
      changeId: "RP-002",
      executionMode: "parallel",
      tracks: [
        {
          id: "execution",
          agentRole: "execution-editor",
          isolation: "implementation-only",
          allowedInputs: ["specs/RP-002-reward-order-create/spec.md"],
          forbiddenInputs: ["tests/results/"],
        },
      ],
      tasks: [
        {
          id: "mixed-task",
          trackId: "execution",
          agentRole: "execution-editor",
          type: "implementation",
          status: "ready",
          inputs: ["specs/RP-002-reward-order-create/spec.md"],
          outputs: ["src/reward.ts", "tests/bruno/reward-order/"],
          dependsOn: [],
          traceability: { scenarios: ["Happy"], endpoints: ["POST /api/reward-orders"] },
        },
      ],
      gates: ["implementation_done", "tests_passed"],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["tracks", "tasks[0].outputs"]),
    );
  });

  it("rejects test plans with unknown branch names", () => {
    const result = validateTestPlan({
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
          branches: ["happy", "limit", "error", "flow", "typo"],
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
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("endpoints[0].branches");
  });

  it("validates production test-plan metadata for performance, concurrency, and release gates", () => {
    const valid = validateTestPlan({
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
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
          branches: ["happy", "limit", "error", "flow"],
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
      releaseGates: [
        {
          id: "p0-api-and-concurrency",
          type: "change-verification",
          requiredTestTypes: ["api", "scenario", "performance", "concurrency"],
          blocking: true,
          evidenceRequired: ["trace", "raw-report", "gate-report"],
        },
      ],
    });

    expect(valid.ok).toBe(true);

    const invalid = validateTestPlan({
      specId: "reward-order",
      specVersion: "1.2.0",
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
          branches: ["happy", "limit", "error", "flow"],
          preconditions: ["one inventory item remains"],
          expectedResults: ["only one successful order"],
          steps: ["Submit order"],
        },
      ],
      performanceTargets: [
        {
          endpoint: "POST /api/reward-orders",
          priority: "P0",
          slo: { p95Ms: "fast" },
          gateImpact: "blocking",
        },
      ],
      concurrencyInvariants: [
        {
          scenario: "Concurrent claim",
          invariant: "",
          actorProfile: "50 users submit at the same time",
          expectedFinalState: "one successful order",
          gateImpact: "blocking",
        },
      ],
      releaseGates: [
        {
          id: "broken",
          type: "unknown",
          requiredTestTypes: ["api", "bad-type"],
          blocking: true,
          evidenceRequired: ["trace"],
        },
      ],
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        "performanceTargets[0].slo.p95Ms",
        "concurrencyInvariants[0].invariant",
        "releaseGates[0].type",
        "releaseGates[0].requiredTestTypes",
      ]),
    );
  });

  it("accepts a normalized empty scenario result", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      blockers: [],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [],
      items: [],
    });

    expect(result.ok).toBe(true);
  });

  it("accepts production test result metadata for performance, latency, concurrency, and gate evidence", () => {
    const result = validateScenarioResult({
      runId: "run-production",
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
      featureName: "Reward Order",
      runner: {
        name: "k6",
        command: "k6 run tests/performance/reward-order/load.js",
        exitCode: 0,
      },
      environment: {
        id: "staging-cn",
        fixtureVersion: "reward-fixture-v3",
        seedCommand: "node scripts/seed-reward.js",
        cleanupCommand: "node scripts/cleanup-reward.js",
        externalDependencyMode: "stubbed",
      },
      commitSha: "abc1234",
      baselineRunId: "run-baseline",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-05-28T00:00:00.000Z",
      endedAt: "2026-05-28T00:01:00.000Z",
      blockers: ["P0 concurrency invariant failed"],
      highRiskScenarios: ["多人同时领取最后一份库存"],
      coverageGaps: [],
      summary: { apiPassRate: 1, scenarioPassRate: 1, totalEndpoints: 1, totalScenarios: 1 },
      flowResults: [],
      items: [
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "performance",
          target: "POST /api/reward-orders",
          status: "pass",
          durationMs: 60000,
          summary: "p95 stayed within the blocking SLO",
          gateImpact: "blocking",
          slo: {
            p95Ms: 300,
            p99Ms: 800,
            errorRate: 0.001,
          },
          metrics: {
            p50Ms: 120,
            p95Ms: 240,
            p99Ms: 620,
            requestRate: 80,
            errorRate: 0,
          },
          artifactRefs: [
            {
              type: "raw-report",
              path: "tests/results/reward-order.k6.json",
            },
          ],
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "latency",
          target: "GET /api/reward-orders/:id",
          status: "pass",
          durationMs: 30000,
          summary: "read latency stayed under warning threshold",
          gateImpact: "warning",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "concurrency",
          target: "reward.order.inventory",
          status: "fail",
          durationMs: 1800,
          summary: "50 concurrent claims created 2 successful orders for one remaining item",
          gateImpact: "blocking",
          concurrencyProfile: {
            actors: 50,
            requests: 50,
            invariant: "Only one order may be created for one remaining inventory item",
            expectedFinalState: "one successful order and zero remaining inventory",
            observedFinalState: "two successful orders and negative inventory",
          },
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "security",
          target: "POST /api/reward-orders",
          status: "pass",
          durationMs: 100,
          summary: "unauthenticated request rejected",
          gateImpact: "blocking",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "migration",
          target: "reward_orders schema",
          status: "pass",
          durationMs: 500,
          summary: "migration dry-run completed",
          gateImpact: "blocking",
        },
        {
          runId: "run-production",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
          testType: "compatibility",
          target: "reward-order result schema",
          status: "pass",
          durationMs: 120,
          summary: "previous client response fields remain compatible",
          gateImpact: "warning",
        },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it("builds a blocking gate report when required test evidence is missing or failed", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.2.0",
      changeId: "reward-order-last-inventory",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Concurrent claim",
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["one inventory item remains"],
          expectedResults: ["only one successful order"],
          steps: ["Submit order"],
        },
      ],
      releaseGates: [
        {
          id: "p0-release",
          type: "release" as const,
          requiredTestTypes: ["api", "scenario", "performance", "concurrency"] as const,
          blocking: true,
          evidenceRequired: ["trace", "raw-report"] as const,
        },
      ],
    };
    const report = buildTestGateReport(
      plan,
      [
        {
          runId: "run-api",
          specId: "reward-order",
          specVersion: "1.2.0",
          changeId: "reward-order-last-inventory",
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
              specVersion: "1.2.0",
              changeId: "reward-order-last-inventory",
              testType: "api",
              target: "POST /api/reward-orders",
              status: "pass",
              durationMs: 100,
              summary: "api passed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-api" }],
            },
            {
              runId: "run-concurrency",
              specId: "reward-order",
              specVersion: "1.2.0",
              changeId: "reward-order-last-inventory",
              testType: "concurrency",
              target: "reward.order.inventory",
              status: "fail",
              durationMs: 1800,
              summary: "invariant failed",
              gateImpact: "blocking",
              artifactRefs: [{ type: "trace", path: "trace-concurrency" }],
            },
          ],
        },
      ],
      { changeId: "reward-order-last-inventory" },
    );

    expect(report.decision).toBe("blocked");
    expect(report.failedGates).toContain("p0-release");
    expect(report.missingEvidence).toEqual(
      expect.arrayContaining(["p0-release missing scenario result", "p0-release missing performance result"]),
    );
    expect(report.blockers).toContain("p0-release concurrency failed: invariant failed");
    expect(report.requiredGates[0]).toMatchObject({
      id: "p0-release",
      requiredTestTypes: ["api", "scenario", "performance", "concurrency"],
      blocking: true,
    });
    expect(report.standardCompliance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: "gate.p0-release.scenario",
          status: "missing",
          gateImpact: "blocking",
        }),
        expect.objectContaining({
          requirementId: "gate.p0-release.concurrency",
          status: "failed",
          ownerAgent: "concurrency-test-agent",
        }),
      ]),
    );
    expect(report.riskSummary.P0.blocked).toBeGreaterThan(0);
    expect(report.agentEvidenceSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerAgent: "test-editor", passed: 1 }),
        expect.objectContaining({ ownerAgent: "concurrency-test-agent", failed: 1 }),
      ]),
    );
  });

  it("builds a blocked API scenario result when API execution assets are missing", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };
    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "RP-002",
      executionMode: "parallel",
      specPath: "specs/RP-002-reward-order-create/spec.md",
    });

    const result = buildBlockedApiScenarioResult(plan, schedule, {
      reason: "Bruno collection not found at tests/bruno/reward-order",
      runId: "run-api-blocked",
      timestamp: "2026-05-15T00:00:00.000Z",
    });
    const validation = validateScenarioResult(result);

    expect(validation.ok).toBe(true);
    expect(result.releaseDecision).toBe("blocked");
    expect(result.status).toBe("warning");
    expect(result.summary.apiPassRate).toBe(0);
    expect(result.summary.totalEndpoints).toBe(1);
    expect(result.blockers).toEqual(["Bruno collection not found at tests/bruno/reward-order"]);
    expect(result.items[0]).toMatchObject({
      testType: "api",
      target: "POST /api/reward-orders",
      status: "warning",
      summary: "Bruno collection not found at tests/bruno/reward-order",
    });
    expect(result.flowResults[0].stages[0].endpoints[0]).toMatchObject({
      target: "POST /api/reward-orders",
      status: "warning",
    });
  });

  it("builds deterministic Bruno API assets from a test plan", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
        {
          name: "Read reward order",
          method: "GET",
          path: "/api/reward-orders/:id",
          priority: "P1" as const,
          branches: ["happy", "error", "edge"] as const,
          preconditions: ["order exists"],
          expectedResults: ["order returned"],
          relatedRule: "reward.order.read",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };

    const assets = buildBrunoCollectionAssets(plan);

    expect(assets.map((asset) => asset.path)).toEqual([
      "bruno.json",
      "README.md",
      "create-reward-order.bru",
      "read-reward-order.bru",
    ]);
    expect(assets.find((asset) => asset.path === "bruno.json")?.content).toContain('"name": "reward-order"');
    expect(assets.find((asset) => asset.path === "create-reward-order.bru")?.content).toContain("post {");
    expect(assets.find((asset) => asset.path === "create-reward-order.bru")?.content).toContain("url: {{baseUrl}}/api/reward-orders");
    expect(assets.find((asset) => asset.path === "read-reward-order.bru")?.content).toContain("get {");
    expect(assets.find((asset) => asset.path === "README.md")?.content).toContain("Spec version: `1.0.0`");
  });

  it("builds a normalized passing API result from a command execution", () => {
    const plan = {
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      source: "accepted-spec" as const,
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
          priority: "P0" as const,
          branches: ["happy", "limit", "error", "flow"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          relatedRule: "reward.order.create",
        },
      ],
      scenarios: [
        {
          name: "Happy",
          priority: "P0" as const,
          branches: ["happy"] as const,
          preconditions: ["user logged in"],
          expectedResults: ["order created"],
          steps: ["Open"],
        },
      ],
    };
    const schedule = buildSpecChangeTestSchedule(plan, {
      changeId: "RP-002",
      executionMode: "parallel",
      specPath: "specs/RP-002-reward-order-create/spec.md",
    });

    const result = buildExecutedApiScenarioResult(plan, schedule, {
      exitCode: 0,
      stdout: "bruno passed",
      stderr: "",
      command: "bru run tests/bruno/reward-order",
      runId: "run-api-pass",
      timestamp: "2026-05-15T00:00:00.000Z",
    });
    const validation = validateScenarioResult(result);

    expect(validation.ok).toBe(true);
    expect(result.status).toBe("pass");
    expect(result.releaseDecision).toBe("ready");
    expect(result.summary.apiPassRate).toBe(1);
    expect(result.items[0]).toMatchObject({
      status: "pass",
      summary: "API command completed successfully",
    });
    expect(result.items[0].evidence.command).toBe("bru run tests/bruno/reward-order");
  });

  it("rejects scenario result arrays that would break the console", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "warning",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      blockers: [],
      highRiskScenarios: [],
      coverageGaps: [],
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [{}],
      items: [{}],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["flowResults[0].name", "flowResults[0].stages", "items[0].testType"]),
    );
  });

  it("accepts a valid installable bundle manifest", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["backend", "frontend", "mixed"],
      installs: [
        { target: "rules/", from: "files/rules/" },
        { target: "ai/agents/", from: "files/ai/agents/" },
        { target: ".specos/workflows/", from: "files/.specos/workflows/" },
      ],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        designTemplate: "template-platform-design",
        specTemplate: "template-feature-spec",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(true);
  });

  it("accepts the reusable SpecOS agent team kit bundle manifest", () => {
    const result = validateBundle({
      id: "specos-agent-team-kit",
      name: "SpecOS Agent Team Kit",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["backend", "frontend", "mixed", "fullstack", "spec-only"],
      installs: [
        { target: "AGENTS.md", from: "files/AGENTS.md" },
        { target: ".agents/", from: "files/.agents/" },
        { target: "ai/agents/", from: "files/ai/agents/" },
        { target: "ai/workflows/", from: "files/ai/workflows/" },
        { target: ".rules/", from: "files/.rules/" },
        { target: "rules/", from: "files/rules/" },
        { target: ".codex/instructions.md", from: "files/.codex/instructions.md" },
        { target: ".codex/skills/", from: "files/.codex/skills/" },
        { target: ".skills/", from: "files/.skills/" },
        { target: "spec-draft/", from: "files/spec-draft/" },
        { target: "specs/", from: "files/specs/" },
        { target: "tests/", from: "files/tests/" },
        { target: "scripts/README.md", from: "files/scripts/README.md" },
        { target: "scripts/orchestration/README.md", from: "files/scripts/orchestration/README.md" },
        { target: "scripts/checks/README.md", from: "files/scripts/checks/README.md" },
        { target: ".specos/manifest.yaml", from: "files/.specos/manifest.yaml" },
        { target: ".specos/workflows/", from: "files/.specos/workflows/" },
      ],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "spec-draft/_template/feature/product-ui.template.md",
        designTemplate: "design/_template/platform-design.template.md",
        specTemplate: "specs/_template/feature/spec.example.md",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: true,
        runUiTests: true,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects bundles whose default workflow is not installable", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["mixed"],
      installs: [{ target: "rules/", from: "files/rules/" }],
      workflow: {
        default: "missing-workflow",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        designTemplate: "template-platform-design",
        specTemplate: "template-feature-spec",
        workflowId: "missing-workflow",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["workflow.default", "entrypoints.workflowId"]),
    );
  });

  it("rejects bundles that escape the files payload root", () => {
    const result = validateBundle({
      id: "reward-center-bundle",
      name: "Reward Center Bundle",
      version: "0.1.0",
      specosVersion: ">=0.1.0",
      projectTypes: ["mixed"],
      installs: [{ target: "../outside", from: "files/../../outside" }],
      workflow: {
        default: "spec-driven-default",
        available: ["spec-driven-default"],
      },
      entrypoints: {
        draftTemplate: "template-feature-draft",
        designTemplate: "template-platform-design",
        specTemplate: "template-feature-spec",
        workflowId: "spec-driven-default",
      },
      capabilities: {
        refineSpec: true,
        generateTestPlan: true,
        runApiTests: false,
        runUiTests: false,
        normalizeResults: true,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["installs[0].target", "installs[0].from"]),
    );
  });
});
