import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApiTopologyTree,
  BusinessFlowMap,
  FlowResult,
  ReadinessSummary,
  RunSession,
  ScenarioChain,
  TestPlan,
  TestRun,
  TestType,
  TestOwnerAgent,
} from "@/lib/types";

const repoRoot = path.resolve(process.cwd(), "..");
const plansDir = path.join(repoRoot, "tests", "plans");
const resultsDir = path.join(repoRoot, "tests", "results");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readJsonDirectory<T>(dirPath: string): Promise<T[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith(".gate-report.json"))
    .map((entry) => path.join(dirPath, entry.name));

  const items = await Promise.all(jsonFiles.map((filePath) => readJsonFile<T>(filePath)));
  return items;
}

export async function getAllTestPlans(): Promise<TestPlan[]> {
  return readJsonDirectory<TestPlan>(plansDir);
}

export async function getAllTestRuns(): Promise<TestRun[]> {
  const entries = await fs.readdir(resultsDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) =>
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      !entry.name.endsWith(".gate-report.json") &&
      !entry.name.endsWith(".session.json"),
    )
    .map((entry) => path.join(resultsDir, entry.name));
  const runs = await Promise.all(jsonFiles.map((filePath) => readJsonFile<TestRun>(filePath)));
  return runs.sort((left, right) => right.endedAt.localeCompare(left.endedAt));
}

export async function getAllRunSessions(): Promise<RunSession[]> {
  const entries = await fs.readdir(resultsDir, { withFileTypes: true });
  const sessionFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".session.json"))
    .map((entry) => path.join(resultsDir, entry.name));
  const sessions = await Promise.all(sessionFiles.map((filePath) => readJsonFile<RunSession>(filePath)));
  return sessions.sort((left, right) => right.endedAt.localeCompare(left.endedAt));
}

export async function getLatestRunsBySpec(): Promise<TestRun[]> {
  const runs = await getAllTestRuns();
  const latestBySpec = new Map<string, TestRun>();

  for (const run of runs) {
    if (!latestBySpec.has(run.specId)) {
      latestBySpec.set(run.specId, run);
    }
  }

  return [...latestBySpec.values()];
}

export async function getRunById(runId: string): Promise<TestRun | undefined> {
  const runs = await getAllTestRuns();
  return runs.find((run) => run.runId === runId);
}

export async function getSpecBundle(specId: string): Promise<{
  plan?: TestPlan;
  latestRun?: TestRun;
  allRuns: TestRun[];
  allSessions: RunSession[];
}> {
  const [plans, runs, sessions] = await Promise.all([getAllTestPlans(), getAllTestRuns(), getAllRunSessions()]);
  return {
    plan: plans.find((item) => item.specId === specId),
    latestRun: runs.find((item) => item.specId === specId),
    allRuns: runs.filter((item) => item.specId === specId),
    allSessions: sessions.filter((item) => item.specId === specId),
  };
}

function normalizeItemStatus(status: TestRun["items"][number]["status"]) {
  return status === "running" ? "warning" : status;
}

function statusForItems(items: TestRun["items"]): "pass" | "warning" | "fail" | "pending" {
  if (items.length === 0) return "pending";
  return mergeStatuses(items.map((item) => normalizeItemStatus(item.status)));
}

function ownerAgentForTestType(testType: TestType): TestOwnerAgent {
  if (testType === "api" || testType === "security" || testType === "compatibility") return "test-editor";
  if (testType === "scenario") return "playwright-test-agent";
  if (testType === "unit") return "unit-test-agent";
  if (testType === "performance" || testType === "latency") return "performance-test-agent";
  if (testType === "concurrency") return "concurrency-test-agent";
  return "specialized-check-agent";
}

function requirementMatchesTestType(layer: string, testType: TestType): boolean {
  if (layer === "e2e") return testType === "scenario";
  if (layer === "observability") return true;
  if (layer === "latency") return testType === "performance" || testType === "latency";
  if (layer === "security" || layer === "compatibility") return testType === "api" || testType === layer;
  return layer === testType;
}

function emptyRiskSummary(): ReadinessSummary["riskSummary"] {
  return {
    P0: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
    P1: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
    P2: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
  };
}

function buildStandardCompliance(
  plan: TestPlan | undefined,
  run: TestRun,
  gates: NonNullable<TestPlan["releaseGates"]>,
): ReadinessSummary["standardCompliance"] {
  const compliance: ReadinessSummary["standardCompliance"] = [];

  for (const requirement of plan?.standardRequirements ?? []) {
    const matchingItems = run.items.filter((item) =>
      (requirementMatchesTestType(requirement.layer, item.testType) && item.requirementId === requirement.id) ||
      (requirementMatchesTestType(requirement.layer, item.testType) &&
        (requirement.appliesTo.includes(item.target) ||
          (item.scenarioName ? requirement.appliesTo.includes(item.scenarioName) : false))),
    );

    if (matchingItems.length === 0) {
      compliance.push({
        requirementId: requirement.id,
        status: "missing",
        riskTier: requirement.requiredFor[0] ?? plan?.riskTier ?? "P2",
        ownerAgent: requirement.ownerAgent,
        gateImpact: requirement.gateImpact,
        summary: `${requirement.id} missing normalized evidence`,
      });
      continue;
    }

    for (const item of matchingItems) {
      const hasEvidence = requirement.requiredEvidence.every((type) =>
        item.artifactRefs?.some((ref) => ref.type === type),
      );
      compliance.push({
        requirementId: requirement.id,
        status: item.status === "pass" && hasEvidence ? "passed" : item.status === "pass" ? "missing" : "failed",
        riskTier: requirement.requiredFor[0] ?? plan?.riskTier ?? "P2",
        ownerAgent: item.ownerAgent ?? requirement.ownerAgent,
        gateImpact: item.gateImpact ?? requirement.gateImpact,
        summary: hasEvidence ? item.summary : `${item.summary}; missing ${requirement.requiredEvidence.join(", ")} evidence`,
      });
    }
  }

  for (const gate of gates) {
    for (const testType of gate.requiredTestTypes) {
      if (compliance.some((item) => item.requirementId === `gate.${gate.id}.${testType}`)) {
        continue;
      }
      const matchingItems = run.items.filter((item) => item.testType === testType);
      if (matchingItems.length === 0) {
        compliance.push({
          requirementId: `gate.${gate.id}.${testType}`,
          status: "missing",
          riskTier: gate.blocking ? "P0" : "P2",
          ownerAgent: ownerAgentForTestType(testType),
          gateImpact: gate.blocking ? "blocking" : "warning",
          summary: `${gate.id} missing ${testType} result`,
        });
      }
    }
  }

  return compliance;
}

function buildRiskSummary(
  compliance: ReadinessSummary["standardCompliance"],
): ReadinessSummary["riskSummary"] {
  const summary = emptyRiskSummary();
  for (const item of compliance) {
    summary[item.riskTier][item.status] += 1;
    if (item.gateImpact === "blocking" && (item.status === "failed" || item.status === "missing")) {
      summary[item.riskTier].blocked += 1;
    }
  }
  return summary;
}

function buildAgentEvidenceSummary(
  compliance: ReadinessSummary["standardCompliance"],
): ReadinessSummary["agentEvidenceSummary"] {
  const byAgent = new Map<TestOwnerAgent, ReadinessSummary["agentEvidenceSummary"][number]>();
  for (const item of compliance) {
    const existing = byAgent.get(item.ownerAgent) ?? {
      ownerAgent: item.ownerAgent,
      passed: 0,
      failed: 0,
      missing: 0,
      waived: 0,
    };
    existing[item.status] += 1;
    byAgent.set(item.ownerAgent, existing);
  }
  return [...byAgent.values()].sort((left, right) => left.ownerAgent.localeCompare(right.ownerAgent));
}

export function buildReadinessSummary(plan: TestPlan | undefined, run: TestRun): ReadinessSummary {
  const performanceItems = run.items.filter((item) => item.testType === "performance" || item.testType === "latency");
  const concurrencyItems = run.items.filter((item) => item.testType === "concurrency");
  const gates = plan?.releaseGates?.length
    ? plan.releaseGates
    : [
        {
          id: "default-verification",
          type: "change-verification" as const,
          requiredTestTypes: ["api", "scenario"] as TestType[],
          blocking: true,
          evidenceRequired: ["trace"] as NonNullable<TestPlan["releaseGates"]>[number]["evidenceRequired"],
        },
      ];
  const missingEvidence: string[] = [];
  const blockers: string[] = [...run.blockers];
  const failedGates: string[] = [];
  const standardCompliance = buildStandardCompliance(plan, run, gates);
  const riskSummary = buildRiskSummary(standardCompliance);
  const agentEvidenceSummary = buildAgentEvidenceSummary(standardCompliance);

  for (const gate of gates) {
    let failed = false;

    for (const testType of gate.requiredTestTypes) {
      const matchingItems = run.items.filter((item) => item.testType === testType);
      if (matchingItems.length === 0) {
        missingEvidence.push(`${gate.id} missing ${testType} result`);
        failed = gate.blocking || failed;
        continue;
      }

      for (const item of matchingItems) {
        if (item.status !== "pass" && (gate.blocking || item.gateImpact === "blocking")) {
          blockers.push(`${gate.id} ${testType} failed: ${item.summary}`);
          failed = true;
        }
      }
    }

    for (const evidenceType of gate.evidenceRequired) {
      const hasEvidence = run.items.some((item) => item.artifactRefs?.some((ref) => ref.type === evidenceType));
      if (!hasEvidence) {
        missingEvidence.push(`${gate.id} missing ${evidenceType} evidence`);
        failed = gate.blocking || failed;
      }
    }

    if (failed) {
      failedGates.push(gate.id);
    }
  }

  const decision =
    plan?.source === "draft"
      ? "draft-only"
      : failedGates.length > 0 || blockers.length > 0 || run.releaseDecision === "blocked"
        ? "blocked"
        : "ready";

  return {
    decision,
    performanceStatus: statusForItems(performanceItems),
    concurrencyStatus: statusForItems(concurrencyItems),
    gateStatus: failedGates.length > 0 ? "fail" : gates.length > 0 ? "pass" : "pending",
    requiredGates: gates.map((gate) => ({
      id: gate.id,
      type: gate.type,
      requiredTestTypes: gate.requiredTestTypes,
      blocking: gate.blocking,
    })),
    missingEvidence,
    blockers,
    standardCompliance,
    riskSummary,
    agentEvidenceSummary,
  };
}

export function buildScenarioChains(plan: TestPlan | undefined, run: TestRun): ScenarioChain[] {
  if (run.flowResults?.length) {
    const scenarioMap = new Map();
    const flow = run.flowResults[0];

    for (const stage of flow.stages) {
      for (const scenario of stage.scenarios) {
        if (!scenarioMap.has(scenario.name)) {
          scenarioMap.set(scenario.name, scenario);
        }
      }
    }

    return [...scenarioMap.values()].map((scenario) => ({
      name: scenario.name,
      priority:
        plan?.scenarios.find((item) => item.name === scenario.name)?.priority ?? "P1",
      branches:
        plan?.scenarios.find((item) => item.name === scenario.name)?.branches ?? [],
      preconditions:
        plan?.scenarios.find((item) => item.name === scenario.name)?.preconditions ?? [],
      expectedResults:
        plan?.scenarios.find((item) => item.name === scenario.name)?.expectedResults ?? [],
      steps: scenario.steps,
      branchRuns: run.items.filter((item) => item.scenarioName === scenario.name),
      overallStatus: scenario.status,
    }));
  }

  if (!plan) {
    return [];
  }

  const scenarioItems = run.items.filter((item) => item.testType === "scenario");

  return plan.scenarios.map((scenario) => {
    const branchRuns = scenarioItems.filter((item) => item.scenarioName === scenario.name);
    const matchedStatuses = branchRuns.map((item) => item.status);
    const overallStatus = matchedStatuses.includes("fail")
      ? "fail"
      : matchedStatuses.includes("warning")
        ? "warning"
        : matchedStatuses.includes("pass")
          ? "pass"
          : "pending";

    const lastBranchRun = branchRuns[branchRuns.length - 1];
    const reachedStepName = lastBranchRun?.stepName;
    const reachedStepIndex = reachedStepName ? scenario.steps.indexOf(reachedStepName) : -1;
    const normalizeScenarioStatus = (
      status: "pass" | "warning" | "fail" | "running" | "pending",
    ): "pass" | "warning" | "fail" | "pending" =>
      status === "running" ? "warning" : status;

    return {
      name: scenario.name,
      priority: scenario.priority,
      branches: scenario.branches,
      preconditions: scenario.preconditions,
      expectedResults: scenario.expectedResults,
      branchRuns,
      overallStatus,
      steps: scenario.steps.map((stepName, index) => {
        const isReached = reachedStepIndex >= index && reachedStepIndex !== -1;
        const status =
          index < reachedStepIndex
            ? "pass"
            : index === reachedStepIndex
              ? normalizeScenarioStatus(lastBranchRun?.status ?? "pending")
              : isReached
                ? "pass"
                : "pending";

        return {
          name: stepName,
          status,
          note: index === reachedStepIndex ? lastBranchRun?.summary : undefined,
          traceId: index === reachedStepIndex ? lastBranchRun?.evidence?.traceId : undefined,
        };
      }),
    };
  });
}

function normalizeStageName(stepName: string): string {
  if (stepName.includes("打开")) return "进入场景";
  if (stepName.includes("点击")) return "触发动作";
  if (stepName.includes("提交")) return "提交请求";
  if (stepName.includes("查看")) return "确认结果";
  return stepName;
}

function deriveFlowName(chains: ScenarioChain[]): string {
  const names = chains.map((item) => item.name);
  if (names.some((item) => item.includes("领取奖励"))) {
    return "奖励领取业务流";
  }

  return "核心业务验证流";
}

function mergeStatuses(statuses: Array<"pass" | "warning" | "fail" | "pending">) {
  if (statuses.includes("fail")) return "fail" as const;
  if (statuses.includes("warning")) return "warning" as const;
  if (statuses.includes("pass")) return "pass" as const;
  return "pending" as const;
}

export function buildBusinessFlowMap(chains: ScenarioChain[]): BusinessFlowMap | undefined {
  if (chains.length === 0) {
    return undefined;
  }

  const stageMap = new Map<
    string,
    Array<{
      name: string;
      status: "pass" | "warning" | "fail" | "pending";
    }>
  >();

  for (const chain of chains) {
    for (const step of chain.steps) {
      const stageName = normalizeStageName(step.name);
      const existing = stageMap.get(stageName) ?? [];
      existing.push({
        name: chain.name,
        status: step.status,
      });
      stageMap.set(stageName, existing);
    }
  }

  const stages = [...stageMap.entries()].map(([name, scenarios]) => ({
    name,
    scenarios,
    status: mergeStatuses(scenarios.map((item) => item.status)),
  }));

  return {
    name: deriveFlowName(chains),
    status: mergeStatuses(stages.map((item) => item.status)),
    stages,
  };
}

export function buildBusinessFlowMapFromPlan(
  plan: TestPlan | undefined,
  chains: ScenarioChain[],
  run?: TestRun,
): BusinessFlowMap | undefined {
  if (run?.flowResults?.length) {
    const flow = run.flowResults[0];
    return {
      name: flow.name,
      status: flow.status,
      stages: flow.stages.map((stage) => ({
        name: stage.name,
        status: stage.status,
        scenarios: stage.scenarios.map((scenario) => ({
          name: scenario.name,
          status: scenario.status,
        })),
      })),
    };
  }

  if (!plan?.flows?.length) {
    return buildBusinessFlowMap(chains);
  }

  const chainByName = new Map(chains.map((chain) => [chain.name, chain]));
  const flow = plan.flows[0];

  const stages = flow.stages.map((stage) => {
    const scenarios = stage.scenarioNames.map((scenarioName) => {
      const chain = chainByName.get(scenarioName);
      const matchedStep = chain?.steps.find((step) => stage.stepNames.includes(step.name));
      return {
        name: scenarioName,
        status: matchedStep?.status ?? chain?.overallStatus ?? "pending",
      };
    });

    return {
      name: stage.name,
      scenarios,
      status: mergeStatuses(scenarios.map((item) => item.status)),
    };
  });

  return {
    name: flow.name,
    status: mergeStatuses(stages.map((item) => item.status)),
    stages,
  };
}

function inferScenarioApiMatches(
  scenarioName: string,
  apiItems: TestRun["items"],
) {
  const normalizedScenario = scenarioName.toLowerCase();

  return apiItems.filter((item) => {
    if (item.testType !== "api" || !item.endpoint) {
      return false;
    }

    const endpointName = item.endpoint.name.toLowerCase();
    const endpointRule = item.endpoint.relatedRule?.toLowerCase() ?? "";

    if (normalizedScenario.includes("领取") || normalizedScenario.includes("奖励")) {
      return endpointName.includes("奖励") || endpointRule.includes("reward.order");
    }

    return true;
  });
}

export function buildApiTopologyTree(
  plan: TestPlan | undefined,
  run: TestRun,
  businessFlow: BusinessFlowMap | undefined,
): ApiTopologyTree | undefined {
  if (run.flowResults?.length) {
    const flow = run.flowResults[0];
    return {
      name: `${flow.name} · API Topology`,
      status: flow.status,
      stages: flow.stages.map((stage) => ({
        name: stage.name,
        status: stage.status,
        scenarios: stage.scenarios.map((scenario) => ({
          name: scenario.name,
          status: scenario.status,
          endpoints: stage.endpoints.filter((endpoint) =>
            scenario.relatedEndpointTargets.includes(endpoint.target),
          ),
        })),
      })),
    };
  }

  const apiItems = run.items.filter((item) => item.testType === "api");
  if (!plan || !businessFlow || apiItems.length === 0) {
    return undefined;
  }

  const stages = businessFlow.stages.map((stage) => {
    const scenarios = stage.scenarios.map((scenario) => {
      const endpoints = inferScenarioApiMatches(scenario.name, apiItems).map((item) => ({
        name: item.endpoint?.name ?? item.target,
        status: (item.status === "running" ? "warning" : item.status) as
          | "pass"
          | "warning"
          | "fail"
          | "pending",
        method: item.endpoint?.method ?? "GET",
        path: item.endpoint?.path ?? item.target,
        avgMs: item.endpoint?.avgMs,
        p95Ms: item.endpoint?.p95Ms,
        errorRate: item.endpoint?.errorRate,
        relatedRule: item.endpoint?.relatedRule,
        summary: item.summary,
      }));

      const scenarioStatus: "pass" | "warning" | "fail" | "pending" =
        endpoints.some((item) => item.status === "fail")
          ? "fail"
          : endpoints.some((item) => item.status === "warning")
            ? "warning"
            : endpoints.some((item) => item.status === "pass")
              ? "pass"
              : "pending";

      return {
        name: scenario.name,
        status: scenarioStatus,
        endpoints,
      };
    });

    const stageStatus = mergeStatuses(
      scenarios.map((item) => item.status as "pass" | "warning" | "fail" | "pending"),
    );

    return {
      name: stage.name,
      status: stageStatus,
      scenarios,
    };
  });

  return {
    name: `${businessFlow.name} · API Topology`,
    status: mergeStatuses(
      stages.map((item) => item.status as "pass" | "warning" | "fail" | "pending"),
    ),
    stages,
  };
}
