export type RunStatus = "pass" | "warning" | "fail" | "running" | "draft-only";
export type BranchType = "happy" | "error" | "edge" | "limit" | "flow";
export type TestType = "api" | "scenario" | "unit" | "specialized";

export type ScenarioEvidence = {
  traceId?: string;
  logUrl?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  requestSummary?: string;
  responseSummary?: string;
  note?: string;
};

export type ResultItem = {
  runId: string;
  specId: string;
  specVersion: string;
  testType: TestType;
  target: string;
  flowName?: string;
  stageName?: string;
  scenarioName?: string;
  branchType?: BranchType;
  stepName?: string;
  relatedEndpointTargets?: string[];
  status: Exclude<RunStatus, "draft-only">;
  durationMs: number;
  summary: string;
  evidence?: ScenarioEvidence;
  endpoint?: {
    name: string;
    method: string;
    path: string;
    coverage: BranchType[];
    avgMs?: number;
    p95Ms?: number;
    errorRate?: number;
    relatedRule?: string;
    failureReason?: string;
  };
};

export type FlowResultEndpoint = {
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
};

export type FlowResultScenario = {
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
};

export type FlowResultStage = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  scenarios: FlowResultScenario[];
  endpoints: FlowResultEndpoint[];
};

export type FlowResult = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  stages: FlowResultStage[];
};

export type TestRun = {
  runId: string;
  specId: string;
  specVersion: string;
  featureName: string;
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
  flowResults?: FlowResult[];
  items: ResultItem[];
};

export type TestPlan = {
  specId: string;
  specVersion: string;
  featureName: string;
  source: "accepted-spec" | "draft";
  flows?: Array<{
    name: string;
    stages: Array<{
      name: string;
      scenarioNames: string[];
      stepNames: string[];
    }>;
  }>;
  endpoints: Array<{
    name: string;
    method: string;
    path: string;
    priority: "P0" | "P1" | "P2";
    branches: BranchType[];
    preconditions: string[];
    expectedResults: string[];
    relatedRule: string;
  }>;
  scenarios: Array<{
    name: string;
    priority: "P0" | "P1" | "P2";
    branches: BranchType[];
    preconditions: string[];
    expectedResults: string[];
    steps: string[];
  }>;
};

export type ScenarioChain = {
  name: string;
  priority: "P0" | "P1" | "P2";
  branches: BranchType[];
  preconditions: string[];
  expectedResults: string[];
  steps: Array<{
    name: string;
    status: "pass" | "warning" | "fail" | "pending";
    note?: string;
    traceId?: string;
  }>;
  branchRuns: ResultItem[];
  overallStatus: "pass" | "warning" | "fail" | "pending";
};

export type BusinessFlowStage = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  scenarios: Array<{
    name: string;
    status: "pass" | "warning" | "fail" | "pending";
  }>;
};

export type BusinessFlowMap = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  stages: BusinessFlowStage[];
};

export type ApiTopologyNode = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  method: string;
  path: string;
  avgMs?: number;
  p95Ms?: number;
  errorRate?: number;
  relatedRule?: string;
  summary: string;
};

export type ApiTopologyScenario = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  endpoints: ApiTopologyNode[];
};

export type ApiTopologyStage = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  scenarios: ApiTopologyScenario[];
};

export type ApiTopologyTree = {
  name: string;
  status: "pass" | "warning" | "fail" | "pending";
  stages: ApiTopologyStage[];
};
