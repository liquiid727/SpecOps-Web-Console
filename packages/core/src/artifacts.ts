export type SpecosErrorCode =
  | "SPECOS_MANIFEST_INVALID"
  | "SPECOS_SPEC_INVALID"
  | "SPECOS_TRACE_MISSING"
  | "SPECOS_TEST_PLAN_INVALID"
  | "SPECOS_SCENARIO_RESULT_INVALID"
  | "SPECOS_WORKFLOW_INVALID"
  | "SPECOS_PROVIDER_MISSING"
  | "SPECOS_ARTIFACT_EXISTS";

export interface SpecosError {
  code: SpecosErrorCode;
  message: string;
  path?: string;
  suggestedFix: string;
}

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: SpecosError[] };

export interface SpecosManifest {
  project: {
    name: string;
    type: "backend" | "frontend" | "fullstack" | "spec-only";
  };
  stacks: {
    frontend?: string;
    backend?: string;
  };
  artifacts: {
    draftsDir: string;
    specsDir: string;
    testsDir: string;
    resultsDir: string;
  };
  rulePacks: string[];
  agentTemplates: string[];
  workflows: string[];
  ci: {
    checkCommand: string;
  };
  providers?: {
    configPath: string;
  };
}

export interface SpecFlow {
  name: string;
  steps: string[];
}

export interface SpecRule {
  id: string;
  description: string;
}

export interface SpecApiContract {
  name: string;
  method: string;
  path: string;
}

export interface SpecUiContract {
  name: string;
  route: string;
}

export interface SpecosSpec {
  id: string;
  version: string;
  title: string;
  goals: string[];
  nonGoals: string[];
  actors: string[];
  userFlows: SpecFlow[];
  systemFlows: SpecFlow[];
  rules: SpecRule[];
  edgeCases: string[];
  api?: SpecApiContract[];
  ui?: SpecUiContract[];
  observability: string[];
  tests: {
    requiredBranches: string[];
  };
  traceability: {
    draft: string;
  };
}

export type BranchType = "happy" | "error" | "edge" | "limit" | "flow";
export type Priority = "P0" | "P1" | "P2";
export type RunStatus = "pass" | "warning" | "fail" | "running" | "draft-only" | "pending";

export interface TestPlanFlow {
  name: string;
  stages: Array<{
    name: string;
    scenarioNames: string[];
    stepNames: string[];
  }>;
}

export interface TestPlanEndpoint {
  name: string;
  method: string;
  path: string;
  priority: Priority;
  branches: BranchType[];
  preconditions: string[];
  expectedResults: string[];
  relatedRule: string;
}

export interface TestPlanScenario {
  name: string;
  priority: Priority;
  branches: BranchType[];
  preconditions: string[];
  expectedResults: string[];
  steps: string[];
}

export interface SpecosTestPlan {
  specId: string;
  specVersion: string;
  featureName: string;
  source: "accepted-spec" | "draft";
  flows: TestPlanFlow[];
  endpoints: TestPlanEndpoint[];
  scenarios: TestPlanScenario[];
}

export interface ScenarioResult {
  runId: string;
  specId: string;
  specVersion: string;
  featureName: string;
  workflowId?: string;
  environment?: string;
  status: RunStatus;
  releaseDecision: "ready" | "blocked" | "draft-only";
  startedAt: string;
  endedAt: string;
  blockers: string[];
  highRiskScenarios: string[];
  coverageGaps: string[];
  summary: {
    apiPassRate: number;
    scenarioPassRate: number;
    totalEndpoints: number;
    totalScenarios: number;
  };
  flowResults: FlowResult[];
  items: ResultItem[];
}

export interface FlowResult {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  stages: FlowResultStage[];
}

export interface FlowResultStage {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  scenarios: FlowResultScenario[];
  endpoints: FlowResultEndpoint[];
}

export interface FlowResultScenario {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  branchType?: BranchType;
  currentStepName?: string;
  relatedEndpointTargets: string[];
  steps: Array<{
    name: string;
    status: "pass" | "warning" | "fail" | "pending";
    note?: string;
    traceId?: string;
  }>;
}

export interface FlowResultEndpoint {
  target: string;
  name: string;
  method: string;
  path: string;
  status: "pass" | "warning" | "fail" | "pending";
  avgMs?: number;
  p95Ms?: number;
  errorRate?: number;
  relatedRule?: string;
  summary: string;
}

export interface ResultItem {
  runId: string;
  specId: string;
  specVersion: string;
  testType: "api" | "scenario" | "unit" | "specialized";
  target: string;
  status: Exclude<RunStatus, "draft-only" | "pending">;
  durationMs: number;
  summary: string;
}

type MutableValidation = {
  errors: SpecosError[];
};

export function validateManifest(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const manifest = asRecord(value);

  requireString(state, manifest?.project, "name", "SPECOS_MANIFEST_INVALID", "project.name");
  requireOneOf(
    state,
    manifest?.project?.type,
    ["backend", "frontend", "fullstack", "spec-only"],
    "SPECOS_MANIFEST_INVALID",
    "project.type",
  );
  requireObject(state, manifest?.stacks, "SPECOS_MANIFEST_INVALID", "stacks");
  requireString(state, manifest?.artifacts, "draftsDir", "SPECOS_MANIFEST_INVALID", "artifacts.draftsDir");
  requireString(state, manifest?.artifacts, "specsDir", "SPECOS_MANIFEST_INVALID", "artifacts.specsDir");
  requireString(state, manifest?.artifacts, "testsDir", "SPECOS_MANIFEST_INVALID", "artifacts.testsDir");
  requireString(state, manifest?.artifacts, "resultsDir", "SPECOS_MANIFEST_INVALID", "artifacts.resultsDir");
  requireStringArray(state, manifest?.rulePacks, "SPECOS_MANIFEST_INVALID", "rulePacks");
  requireStringArray(state, manifest?.agentTemplates, "SPECOS_MANIFEST_INVALID", "agentTemplates");
  requireStringArray(state, manifest?.workflows, "SPECOS_MANIFEST_INVALID", "workflows");
  requireString(state, manifest?.ci, "checkCommand", "SPECOS_MANIFEST_INVALID", "ci.checkCommand");
  if (manifest?.providers !== undefined) {
    requireString(state, manifest.providers, "configPath", "SPECOS_MANIFEST_INVALID", "providers.configPath");
    rejectUnknownKeys(state, manifest.providers, ["configPath"], "SPECOS_MANIFEST_INVALID", "providers");
  }

  return result(state.errors);
}

export function validateSpec(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const spec = asRecord(value);

  requireString(state, spec, "id", "SPECOS_SPEC_INVALID", "id");
  requireString(state, spec, "version", "SPECOS_SPEC_INVALID", "version");
  requireString(state, spec, "title", "SPECOS_SPEC_INVALID", "title");
  requireStringArray(state, spec?.goals, "SPECOS_SPEC_INVALID", "goals");
  requireStringArray(state, spec?.nonGoals, "SPECOS_SPEC_INVALID", "nonGoals");
  requireStringArray(state, spec?.actors, "SPECOS_SPEC_INVALID", "actors");
  requireFlowArray(state, spec?.userFlows, "userFlows");
  requireFlowArray(state, spec?.systemFlows, "systemFlows");
  requireRuleArray(state, spec?.rules);
  requireStringArray(state, spec?.edgeCases, "SPECOS_SPEC_INVALID", "edgeCases");
  requireStringArray(state, spec?.observability, "SPECOS_SPEC_INVALID", "observability");
  requireStringArray(state, spec?.tests?.requiredBranches, "SPECOS_SPEC_INVALID", "tests.requiredBranches");
  requireRequiredBranches(state, spec?.tests?.requiredBranches, "SPECOS_SPEC_INVALID", "tests.requiredBranches");

  if (!isNonEmptyString(spec?.traceability?.draft)) {
    state.errors.push(makeError("SPECOS_TRACE_MISSING", "traceability.draft"));
  }

  if (spec?.api !== undefined) {
    requireApiArray(state, spec.api);
  }

  if (spec?.ui !== undefined) {
    requireUiArray(state, spec.ui);
  }

  return result(state.errors);
}

export function buildDeterministicTestPlan(spec: SpecosSpec): SpecosTestPlan {
  const api = spec.api ?? [];
  const branches = normalizeBranches(spec.tests.requiredBranches);
  const firstRule = spec.rules[0]?.id ?? "spec.rule";
  const firstUserFlow = spec.userFlows[0];

  return {
    specId: spec.id,
    specVersion: spec.version,
    featureName: spec.title,
    source: "accepted-spec",
    flows: [
      {
        name: firstUserFlow.name,
        stages: firstUserFlow.steps.map((step) => ({
          name: step,
          scenarioNames: branches.map((branch) => `${spec.title} ${branch} scenario`),
          stepNames: [step],
        })),
      },
    ],
    endpoints: api.map((contract) => ({
      name: contract.name,
      method: contract.method.toUpperCase(),
      path: contract.path,
      priority: "P0",
      branches,
      preconditions: spec.goals,
      expectedResults: spec.tests.requiredBranches.map((branch) => `${branch} branch is covered`),
      relatedRule: firstRule,
    })),
    scenarios: branches.map((branch) => ({
      name: `${spec.title} ${branch} scenario`,
      priority: branch === "happy" || branch === "flow" ? "P0" : "P1",
      branches: [branch],
      preconditions: spec.goals,
      expectedResults: branch === "error" ? spec.edgeCases : spec.tests.requiredBranches.map((item) => `${item} branch covered`),
      steps: firstUserFlow.steps,
    })),
  };
}

export function validateTestPlan(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const plan = asRecord(value);

  requireString(state, plan, "specId", "SPECOS_TEST_PLAN_INVALID", "specId");
  requireString(state, plan, "specVersion", "SPECOS_TEST_PLAN_INVALID", "specVersion");
  requireString(state, plan, "featureName", "SPECOS_TEST_PLAN_INVALID", "featureName");
  requireOneOf(state, plan?.source, ["accepted-spec", "draft"], "SPECOS_TEST_PLAN_INVALID", "source");
  requireFlowPlanArray(state, plan?.flows);
  requireEndpointPlanArray(state, plan?.endpoints);

  if (!Array.isArray(plan?.scenarios) || plan.scenarios.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "scenarios"));
  } else {
    plan.scenarios.forEach((scenario, index) => {
      const path = `scenarios[${index}]`;
      requireString(state, scenario, "name", "SPECOS_TEST_PLAN_INVALID", `${path}.name`);
      requireBranchArray(state, scenario?.branches, "SPECOS_TEST_PLAN_INVALID", `${path}.branches`);
      requireOneOf(state, scenario?.priority, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", `${path}.priority`);
      requireStringArray(state, scenario?.preconditions, "SPECOS_TEST_PLAN_INVALID", `${path}.preconditions`);
      requireStringArray(state, scenario?.expectedResults, "SPECOS_TEST_PLAN_INVALID", `${path}.expectedResults`);
      requireStringArray(state, scenario?.steps, "SPECOS_TEST_PLAN_INVALID", `${path}.steps`);
    });
  }

  requirePlanBranches(state, plan);

  return result(state.errors);
}

export function validateScenarioResult(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const scenario = asRecord(value);

  requireString(state, scenario, "runId", "SPECOS_SCENARIO_RESULT_INVALID", "runId");
  requireString(state, scenario, "specId", "SPECOS_SCENARIO_RESULT_INVALID", "specId");
  requireString(state, scenario, "specVersion", "SPECOS_SCENARIO_RESULT_INVALID", "specVersion");
  requireString(state, scenario, "featureName", "SPECOS_SCENARIO_RESULT_INVALID", "featureName");
  requireOneOf(
    state,
    scenario?.status,
    ["pass", "warning", "fail", "running", "draft-only", "pending"],
    "SPECOS_SCENARIO_RESULT_INVALID",
    "status",
  );
  requireOneOf(
    state,
    scenario?.releaseDecision,
    ["ready", "blocked", "draft-only"],
    "SPECOS_SCENARIO_RESULT_INVALID",
    "releaseDecision",
  );
  requireString(state, scenario, "startedAt", "SPECOS_SCENARIO_RESULT_INVALID", "startedAt");
  requireString(state, scenario, "endedAt", "SPECOS_SCENARIO_RESULT_INVALID", "endedAt");
  requireStringArrayAllowEmpty(state, scenario?.blockers, "SPECOS_SCENARIO_RESULT_INVALID", "blockers");
  requireStringArrayAllowEmpty(
    state,
    scenario?.highRiskScenarios,
    "SPECOS_SCENARIO_RESULT_INVALID",
    "highRiskScenarios",
  );
  requireStringArrayAllowEmpty(state, scenario?.coverageGaps, "SPECOS_SCENARIO_RESULT_INVALID", "coverageGaps");
  requireNumber(state, scenario?.summary, "apiPassRate", "SPECOS_SCENARIO_RESULT_INVALID", "summary.apiPassRate");
  requireNumber(
    state,
    scenario?.summary,
    "scenarioPassRate",
    "SPECOS_SCENARIO_RESULT_INVALID",
    "summary.scenarioPassRate",
  );
  requireNumber(
    state,
    scenario?.summary,
    "totalEndpoints",
    "SPECOS_SCENARIO_RESULT_INVALID",
    "summary.totalEndpoints",
  );
  requireNumber(
    state,
    scenario?.summary,
    "totalScenarios",
    "SPECOS_SCENARIO_RESULT_INVALID",
    "summary.totalScenarios",
  );

  requireFlowResultArray(state, scenario?.flowResults);
  requireResultItemArray(state, scenario?.items);

  return result(state.errors);
}

function asRecord(value: unknown): Record<string, any> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, any>) : undefined;
}

function result(errors: SpecosError[]): ValidationResult {
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

function makeError(code: SpecosErrorCode, path: string): SpecosError {
  return {
    code,
    message: `Invalid or missing artifact field: ${path}`,
    path,
    suggestedFix: `Provide a valid ${path} value in the SpecOS artifact.`,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireObject(state: MutableValidation, value: unknown, code: SpecosErrorCode, path: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    state.errors.push(makeError(code, path));
  }
}

function requireString(
  state: MutableValidation,
  object: Record<string, any> | undefined,
  key: string,
  code: SpecosErrorCode,
  path: string,
): void {
  if (!isNonEmptyString(object?.[key])) {
    state.errors.push(makeError(code, path));
  }
}

function requireNumber(
  state: MutableValidation,
  object: Record<string, any> | undefined,
  key: string,
  code: SpecosErrorCode,
  path: string,
): void {
  if (typeof object?.[key] !== "number" || !Number.isFinite(object[key])) {
    state.errors.push(makeError(code, path));
  }
}

function requireOneOf(
  state: MutableValidation,
  value: unknown,
  allowed: string[],
  code: SpecosErrorCode,
  path: string,
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    state.errors.push(makeError(code, path));
  }
}

function rejectUnknownKeys(
  state: MutableValidation,
  object: Record<string, any> | undefined,
  allowed: string[],
  code: SpecosErrorCode,
  path: string,
): void {
  if (!object || typeof object !== "object" || Array.isArray(object)) return;
  Object.keys(object)
    .filter((key) => !allowed.includes(key))
    .forEach((key) => state.errors.push(makeError(code, `${path}.${key}`)));
}

function requireStringArray(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !isNonEmptyString(item))) {
    state.errors.push(makeError(code, path));
  }
}

function requireStringArrayAllowEmpty(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    state.errors.push(makeError(code, path));
  }
}

function requireRequiredBranches(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  if (!Array.isArray(value)) return;
  const branches = new Set(value);
  const required = ["happy", "limit", "error", "flow"];
  if (required.some((branch) => !branches.has(branch))) {
    state.errors.push(makeError(code, path));
  }
}

function requireBranchArray(state: MutableValidation, value: unknown, code: SpecosErrorCode, path: string): void {
  const allowed = ["happy", "error", "edge", "limit", "flow"];
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError(code, path));
    return;
  }
  if (value.some((item) => typeof item !== "string" || !allowed.includes(item))) {
    state.errors.push(makeError(code, path));
  }
}

function normalizeBranches(value: string[]): BranchType[] {
  const ordered: BranchType[] = ["happy", "limit", "error", "flow"];
  const extras = value.filter((branch) => !ordered.includes(branch as BranchType)) as BranchType[];
  return [...ordered, ...extras];
}

function requireFlowPlanArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "flows"));
    return;
  }

  value.forEach((flow, index) => {
    const path = `flows[${index}]`;
    requireString(state, flow, "name", "SPECOS_TEST_PLAN_INVALID", `${path}.name`);
    if (!Array.isArray(flow?.stages) || flow.stages.length === 0) {
      state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", `${path}.stages`));
      return;
    }
    flow.stages.forEach((stage: Record<string, any>, stageIndex: number) => {
      const stagePath = `${path}.stages[${stageIndex}]`;
      requireString(state, stage, "name", "SPECOS_TEST_PLAN_INVALID", `${stagePath}.name`);
      requireStringArray(state, stage?.scenarioNames, "SPECOS_TEST_PLAN_INVALID", `${stagePath}.scenarioNames`);
      requireStringArray(state, stage?.stepNames, "SPECOS_TEST_PLAN_INVALID", `${stagePath}.stepNames`);
    });
  });
}

function requireEndpointPlanArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "endpoints"));
    return;
  }

  value.forEach((endpoint, index) => {
    const path = `endpoints[${index}]`;
    requireString(state, endpoint, "name", "SPECOS_TEST_PLAN_INVALID", `${path}.name`);
    requireString(state, endpoint, "method", "SPECOS_TEST_PLAN_INVALID", `${path}.method`);
    requireString(state, endpoint, "path", "SPECOS_TEST_PLAN_INVALID", `${path}.path`);
    requireOneOf(state, endpoint?.priority, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", `${path}.priority`);
    requireBranchArray(state, endpoint?.branches, "SPECOS_TEST_PLAN_INVALID", `${path}.branches`);
    requireStringArray(state, endpoint?.preconditions, "SPECOS_TEST_PLAN_INVALID", `${path}.preconditions`);
    requireStringArray(state, endpoint?.expectedResults, "SPECOS_TEST_PLAN_INVALID", `${path}.expectedResults`);
    requireString(state, endpoint, "relatedRule", "SPECOS_TEST_PLAN_INVALID", `${path}.relatedRule`);
  });
}

function requireFlowResultArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", "flowResults"));
    return;
  }

  value.forEach((flow, index) => {
    const path = `flowResults[${index}]`;
    requireString(state, flow, "name", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.name`);
    requireOneOf(state, flow?.status, ["pass", "warning", "fail", "pending"], "SPECOS_SCENARIO_RESULT_INVALID", `${path}.status`);
    if (!Array.isArray(flow?.stages)) {
      state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", `${path}.stages`));
      return;
    }
    flow.stages.forEach((stage: Record<string, any>, stageIndex: number) => {
      const stagePath = `${path}.stages[${stageIndex}]`;
      requireString(state, stage, "name", "SPECOS_SCENARIO_RESULT_INVALID", `${stagePath}.name`);
      requireOneOf(
        state,
        stage?.status,
        ["pass", "warning", "fail", "pending"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${stagePath}.status`,
      );
      requireFlowResultScenarioArray(state, stage?.scenarios, `${stagePath}.scenarios`);
      requireFlowResultEndpointArray(state, stage?.endpoints, `${stagePath}.endpoints`);
    });
  });
}

function requireFlowResultScenarioArray(state: MutableValidation, value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", path));
    return;
  }
  value.forEach((scenario, index) => {
    const itemPath = `${path}[${index}]`;
    requireString(state, scenario, "name", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.name`);
    requireOneOf(
      state,
      scenario?.status,
      ["pass", "warning", "fail", "pending"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${itemPath}.status`,
    );
    if (scenario?.branchType !== undefined) {
      requireOneOf(
        state,
        scenario.branchType,
        ["happy", "error", "edge", "limit", "flow"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${itemPath}.branchType`,
      );
    }
    requireStringArrayAllowEmpty(
      state,
      scenario?.relatedEndpointTargets,
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${itemPath}.relatedEndpointTargets`,
    );
    if (!Array.isArray(scenario?.steps)) {
      state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.steps`));
      return;
    }
    scenario.steps.forEach((step: Record<string, any>, stepIndex: number) => {
      const stepPath = `${itemPath}.steps[${stepIndex}]`;
      requireString(state, step, "name", "SPECOS_SCENARIO_RESULT_INVALID", `${stepPath}.name`);
      requireOneOf(
        state,
        step?.status,
        ["pass", "warning", "fail", "pending"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${stepPath}.status`,
      );
    });
  });
}

function requireFlowResultEndpointArray(state: MutableValidation, value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", path));
    return;
  }
  value.forEach((endpoint, index) => {
    const itemPath = `${path}[${index}]`;
    requireString(state, endpoint, "target", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.target`);
    requireString(state, endpoint, "name", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.name`);
    requireString(state, endpoint, "method", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.method`);
    requireString(state, endpoint, "path", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.path`);
    requireOneOf(
      state,
      endpoint?.status,
      ["pass", "warning", "fail", "pending"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${itemPath}.status`,
    );
    requireString(state, endpoint, "summary", "SPECOS_SCENARIO_RESULT_INVALID", `${itemPath}.summary`);
  });
}

function requireResultItemArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", "items"));
    return;
  }
  value.forEach((item, index) => {
    const path = `items[${index}]`;
    requireString(state, item, "runId", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.runId`);
    requireString(state, item, "specId", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.specId`);
    requireString(state, item, "specVersion", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.specVersion`);
    requireOneOf(
      state,
      item?.testType,
      ["api", "scenario", "unit", "specialized"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${path}.testType`,
    );
    requireString(state, item, "target", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.target`);
    requireOneOf(
      state,
      item?.status,
      ["pass", "warning", "fail", "running"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${path}.status`,
    );
    requireNumber(state, item, "durationMs", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.durationMs`);
    requireString(state, item, "summary", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.summary`);
  });
}

function requirePlanBranches(state: MutableValidation, plan: Record<string, any> | undefined): void {
  if (!plan) return;
  const branches = new Set<string>();
  if (Array.isArray(plan.endpoints)) {
    plan.endpoints.forEach((endpoint) => {
      if (Array.isArray(endpoint?.branches)) {
        endpoint.branches.forEach((branch: unknown) => {
          if (typeof branch === "string") branches.add(branch);
        });
      }
    });
  }
  if (Array.isArray(plan.scenarios)) {
    plan.scenarios.forEach((scenario) => {
      if (Array.isArray(scenario?.branches)) {
        scenario.branches.forEach((branch: unknown) => {
          if (typeof branch === "string") branches.add(branch);
        });
      }
    });
  }
  if (["happy", "limit", "error", "flow"].some((branch) => !branches.has(branch))) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "branches"));
  }
}

function requireFlowArray(state: MutableValidation, value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_SPEC_INVALID", path));
    return;
  }

  value.forEach((flow, index) => {
    requireString(state, flow, "name", "SPECOS_SPEC_INVALID", `${path}[${index}].name`);
    requireStringArray(state, flow?.steps, "SPECOS_SPEC_INVALID", `${path}[${index}].steps`);
  });
}

function requireRuleArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_SPEC_INVALID", "rules"));
    return;
  }

  value.forEach((rule, index) => {
    requireString(state, rule, "id", "SPECOS_SPEC_INVALID", `rules[${index}].id`);
    requireString(state, rule, "description", "SPECOS_SPEC_INVALID", `rules[${index}].description`);
  });
}

function requireApiArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SPEC_INVALID", "api"));
    return;
  }

  value.forEach((contract, index) => {
    requireString(state, contract, "name", "SPECOS_SPEC_INVALID", `api[${index}].name`);
    requireString(state, contract, "method", "SPECOS_SPEC_INVALID", `api[${index}].method`);
    requireString(state, contract, "path", "SPECOS_SPEC_INVALID", `api[${index}].path`);
  });
}

function requireUiArray(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SPEC_INVALID", "ui"));
    return;
  }

  value.forEach((contract, index) => {
    requireString(state, contract, "name", "SPECOS_SPEC_INVALID", `ui[${index}].name`);
    requireString(state, contract, "route", "SPECOS_SPEC_INVALID", `ui[${index}].route`);
  });
}
