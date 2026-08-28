export type RunStatus = "pass" | "warning" | "fail" | "running" | "draft-only";
export type BranchType = "happy" | "error" | "edge" | "limit" | "flow";
export type TestType =
  | "api"
  | "scenario"
  | "unit"
  | "specialized"
  | "performance"
  | "latency"
  | "concurrency"
  | "security"
  | "migration"
  | "compatibility";
export type RunScope = "unit" | "api" | "scenario" | "performance" | "concurrency" | "gate" | "all";
export type GateImpact = "blocking" | "warning" | "informational";
export type QualityProfile = "backend-api" | "frontend-ui" | "fullstack-flow" | "data-migration" | "agent-workflow";
export type TestOwnerAgent =
  | "test-editor"
  | "unit-test-agent"
  | "playwright-test-agent"
  | "e2e-test-agent"
  | "performance-test-agent"
  | "concurrency-test-agent"
  | "specialized-check-agent"
  | "ci-editor";
export type EvidenceQuality = "complete" | "partial" | "missing" | "invalid";
export type FlakeClassification = "not-flaky" | "suspected-flaky" | "confirmed-flaky" | "quarantined";

export type RunnerMetadata = {
  name: string;
  command: string;
  exitCode: number;
};

export type TestEnvironmentMetadata = {
  id: string;
  fixtureVersion?: string;
  seedCommand?: string;
  cleanupCommand?: string;
  externalDependencyMode?: "live" | "stubbed" | "mocked";
};

export type TestSlo = {
  p95Ms?: number;
  p99Ms?: number;
  errorRate?: number;
};

export type TestMetrics = {
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  requestRate?: number;
  errorRate?: number;
};

export type ArtifactRef = {
  type: "trace" | "log" | "screenshot" | "video" | "raw-report" | "gate-report";
  path: string;
};

export type ConcurrencyProfile = {
  actors: number;
  requests: number;
  invariant: string;
  expectedFinalState: string;
  observedFinalState?: string;
};

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
  changeId?: string;
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
  requirementId?: string;
  ownerAgent?: TestOwnerAgent;
  evidenceQuality?: EvidenceQuality;
  attempts?: number;
  flakeClassification?: FlakeClassification;
  gateImpact?: GateImpact;
  slo?: TestSlo;
  metrics?: TestMetrics;
  artifactRefs?: ArtifactRef[];
  concurrencyProfile?: ConcurrencyProfile;
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
  standardVersion?: "specos-test-standard";
  qualityProfile?: QualityProfile;
  changeId?: string;
  featureName: string;
  runner?: RunnerMetadata;
  environment?: string | TestEnvironmentMetadata;
  commitSha?: string;
  baselineRunId?: string;
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

export type RunSessionCommand = {
  scope: RunScope;
  command: string;
  args: string[];
  cwd: string;
  status: "pass" | "blocked";
  exitCode: number;
  stdoutSummary: string;
  stderrSummary: string;
  startedAt: string;
  endedAt: string;
  resultArtifacts: string[];
  gateReportPath?: string;
};

export type RunSession = {
  runId: string;
  specId: string;
  specVersion: string;
  changeId?: string;
  featureName: string;
  scope: RunScope;
  status: "pass" | "blocked" | "running";
  exitCode: number;
  startedAt: string;
  endedAt: string;
  stdoutSummary: string;
  stderrSummary: string;
  commands: RunSessionCommand[];
  resultArtifacts: string[];
  gateReportPath?: string;
};

export type TestPlan = {
  requirementId?: string;
  requirementDir?: string;
  selector?: string;
  standardVersion?: "specos-test-standard";
  qualityProfile?: QualityProfile;
  riskTier?: "P0" | "P1" | "P2";
  specId: string;
  specVersion: string;
  changeId?: string;
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
  performanceTargets?: Array<{
    endpoint: string;
    priority: "P0" | "P1" | "P2";
    slo: TestSlo;
    gateImpact: GateImpact;
  }>;
  concurrencyInvariants?: Array<{
    scenario: string;
    invariant: string;
    actorProfile: string;
    expectedFinalState: string;
    gateImpact: GateImpact;
  }>;
  releaseGates?: Array<{
    id: string;
    type: "pr-fast" | "change-verification" | "release" | "promote";
    requiredTestTypes: TestType[];
    blocking: boolean;
    evidenceRequired: ArtifactRef["type"][];
  }>;
  standardRequirements?: Array<{
    id: string;
    layer: string;
    appliesTo: string[];
    requiredFor: Array<"P0" | "P1" | "P2">;
    ownerAgent: TestOwnerAgent;
    requiredEvidence: ArtifactRef["type"][];
    gateImpact: GateImpact;
  }>;
  flakePolicy?: {
    allowedRetries: number;
    quarantineAllowed: boolean;
    classificationRequired: boolean;
  };
  dataPolicy?: {
    seedCommand?: string;
    cleanupCommand?: string;
    externalDependencyMode: "live" | "stubbed" | "mocked";
    piiAllowed: boolean;
    secretsAllowed: boolean;
  };
  securityPolicy?: {
    baseline: "owasp-api-top-10-2023";
    requiredChecks: string[];
  };
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

export type ReadinessSummary = {
  decision: "ready" | "blocked" | "draft-only";
  performanceStatus: "pass" | "warning" | "fail" | "pending";
  concurrencyStatus: "pass" | "warning" | "fail" | "pending";
  gateStatus: "pass" | "warning" | "fail" | "pending";
  requiredGates: Array<{
    id: string;
    type: "pr-fast" | "change-verification" | "release" | "promote";
    requiredTestTypes: TestType[];
    blocking: boolean;
  }>;
  missingEvidence: string[];
  blockers: string[];
  standardCompliance: Array<{
    requirementId: string;
    status: "passed" | "failed" | "missing" | "waived";
    riskTier: "P0" | "P1" | "P2";
    ownerAgent: TestOwnerAgent;
    gateImpact: GateImpact;
    summary: string;
  }>;
  riskSummary: Record<"P0" | "P1" | "P2", { passed: number; failed: number; missing: number; waived: number; blocked: number }>;
  agentEvidenceSummary: Array<{
    ownerAgent: TestOwnerAgent;
    passed: number;
    failed: number;
    missing: number;
    waived: number;
  }>;
};
