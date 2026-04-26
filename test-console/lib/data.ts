import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApiTopologyTree,
  BusinessFlowMap,
  FlowResult,
  ScenarioChain,
  TestPlan,
  TestRun,
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
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dirPath, entry.name));

  const items = await Promise.all(jsonFiles.map((filePath) => readJsonFile<T>(filePath)));
  return items;
}

export async function getAllTestPlans(): Promise<TestPlan[]> {
  return readJsonDirectory<TestPlan>(plansDir);
}

export async function getAllTestRuns(): Promise<TestRun[]> {
  const runs = await readJsonDirectory<TestRun>(resultsDir);
  return runs.sort((left, right) => right.endedAt.localeCompare(left.endedAt));
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
}> {
  const [plans, runs] = await Promise.all([getAllTestPlans(), getAllTestRuns()]);
  return {
    plan: plans.find((item) => item.specId === specId),
    latestRun: runs.find((item) => item.specId === specId),
    allRuns: runs.filter((item) => item.specId === specId),
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
