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
    type: "backend" | "frontend" | "fullstack";
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
  workflows: string[];
  ci: {
    checkCommand: string;
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

export interface TestPlanApiSkeleton {
  name: string;
  method: string;
  path: string;
  request: {
    body: Record<string, never>;
  };
  expectedResponse: {
    status: number;
    body: Record<string, never>;
  };
  assertions: string[];
}

export interface TestPlanUiSkeleton {
  name: string;
  route: string;
  actions: string[];
  assertions: string[];
}

export interface TestPlanScenario {
  id: string;
  name: string;
  specId: string;
  branches: string[];
  api: TestPlanApiSkeleton[];
  ui: TestPlanUiSkeleton[];
}

export interface SpecosTestPlan {
  schemaVersion: "specos.test-plan.v1";
  specId: string;
  specVersion: string;
  traceability: {
    draft: string;
  };
  scenarios: TestPlanScenario[];
}

export interface ScenarioResult {
  runId: string;
  specId: string;
  specVersion: string;
  featureName: string;
  status: "pending" | "passed" | "failed" | "running";
  releaseDecision: "approved" | "blocked" | "needs-review";
  startedAt: string;
  endedAt: string;
  summary: {
    apiPassRate: number;
    scenarioPassRate: number;
    totalEndpoints: number;
    totalScenarios: number;
  };
  flowResults: unknown[];
  items: unknown[];
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
    ["backend", "frontend", "fullstack"],
    "SPECOS_MANIFEST_INVALID",
    "project.type",
  );
  requireObject(state, manifest?.stacks, "SPECOS_MANIFEST_INVALID", "stacks");
  requireString(state, manifest?.artifacts, "draftsDir", "SPECOS_MANIFEST_INVALID", "artifacts.draftsDir");
  requireString(state, manifest?.artifacts, "specsDir", "SPECOS_MANIFEST_INVALID", "artifacts.specsDir");
  requireString(state, manifest?.artifacts, "testsDir", "SPECOS_MANIFEST_INVALID", "artifacts.testsDir");
  requireString(state, manifest?.artifacts, "resultsDir", "SPECOS_MANIFEST_INVALID", "artifacts.resultsDir");
  requireStringArray(state, manifest?.workflows, "SPECOS_MANIFEST_INVALID", "workflows");
  requireString(state, manifest?.ci, "checkCommand", "SPECOS_MANIFEST_INVALID", "ci.checkCommand");

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
  const ui = spec.ui ?? [];

  return {
    schemaVersion: "specos.test-plan.v1",
    specId: spec.id,
    specVersion: spec.version,
    traceability: {
      draft: spec.traceability.draft,
    },
    scenarios: spec.tests.requiredBranches.map((branch, index) => ({
      id: `${spec.id}.${branch}`,
      name: `${spec.title} ${branch} scenario`,
      specId: spec.id,
      branches: [branch],
      api: api.map((contract) => ({
        name: contract.name,
        method: contract.method.toUpperCase(),
        path: contract.path,
        request: { body: {} },
        expectedResponse: { status: branch === "error" ? 400 : 200, body: {} },
        assertions: [`${branch} API contract ${index + 1}`],
      })),
      ui: ui.map((contract) => ({
        name: contract.name,
        route: contract.route,
        actions: [`Open ${contract.route}`],
        assertions: [`${branch} UI flow ${index + 1}`],
      })),
    })),
  };
}

export function validateTestPlan(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const plan = asRecord(value);

  requireOneOf(
    state,
    plan?.schemaVersion,
    ["specos.test-plan.v1"],
    "SPECOS_TEST_PLAN_INVALID",
    "schemaVersion",
  );
  requireString(state, plan, "specId", "SPECOS_TEST_PLAN_INVALID", "specId");
  requireString(state, plan, "specVersion", "SPECOS_TEST_PLAN_INVALID", "specVersion");

  if (!isNonEmptyString(plan?.traceability?.draft)) {
    state.errors.push(makeError("SPECOS_TRACE_MISSING", "traceability.draft"));
  }

  if (!Array.isArray(plan?.scenarios) || plan.scenarios.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "scenarios"));
  } else {
    plan.scenarios.forEach((scenario, index) => {
      const path = `scenarios[${index}]`;
      requireString(state, scenario, "id", "SPECOS_TEST_PLAN_INVALID", `${path}.id`);
      requireString(state, scenario, "name", "SPECOS_TEST_PLAN_INVALID", `${path}.name`);
      requireString(state, scenario, "specId", "SPECOS_TEST_PLAN_INVALID", `${path}.specId`);
      requireStringArray(state, scenario?.branches, "SPECOS_TEST_PLAN_INVALID", `${path}.branches`);

      if (!Array.isArray(scenario?.api)) {
        state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", `${path}.api`));
      }

      if (!Array.isArray(scenario?.ui)) {
        state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", `${path}.ui`));
      }
    });
  }

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
    ["pending", "passed", "failed", "running"],
    "SPECOS_SCENARIO_RESULT_INVALID",
    "status",
  );
  requireOneOf(
    state,
    scenario?.releaseDecision,
    ["approved", "blocked", "needs-review"],
    "SPECOS_SCENARIO_RESULT_INVALID",
    "releaseDecision",
  );
  requireString(state, scenario, "startedAt", "SPECOS_SCENARIO_RESULT_INVALID", "startedAt");
  requireString(state, scenario, "endedAt", "SPECOS_SCENARIO_RESULT_INVALID", "endedAt");
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

  if (!Array.isArray(scenario?.flowResults)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", "flowResults"));
  }

  if (!Array.isArray(scenario?.items)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", "items"));
  }

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
