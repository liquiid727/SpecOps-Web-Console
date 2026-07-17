import { isAbsolute } from "node:path";

export type SpecosErrorCode =
  | "SPECOS_MANIFEST_INVALID"
  | "SPECOS_SPEC_INVALID"
  | "SPECOS_TRACE_MISSING"
  | "SPECOS_TEST_PLAN_INVALID"
  | "SPECOS_TEST_SCHEDULE_INVALID"
  | "SPECOS_SCENARIO_RESULT_INVALID"
  | "SPECOS_WORKFLOW_INVALID"
  | "SPECOS_BUNDLE_INVALID"
  | "SPECOS_PROVIDER_MISSING"
  | "SPECOS_ARTIFACT_EXISTS"
  | "SPECOS_ROUTE_OUTPUT_INVALID";

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
  projectMode?: "litespec" | "goalspec" | "enterprisespec";
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

export type BundleProjectType = "backend" | "frontend" | "mixed" | "fullstack" | "spec-only";

export interface SpecosBundleInstall {
  target: string;
  from: string;
}

export interface SpecosBundleManifest {
  id: string;
  name: string;
  version: string;
  specosVersion: string;
  projectTypes: BundleProjectType[];
  installs: SpecosBundleInstall[];
  workflow: {
    default: string;
    available: string[];
  };
  entrypoints: {
    draftTemplate: string;
    designTemplate: string;
    specTemplate: string;
    workflowId: string;
  };
  capabilities: {
    refineSpec: boolean;
    generateTestPlan: boolean;
    runApiTests: boolean;
    runUiTests: boolean;
    normalizeResults: boolean;
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
export type GateImpact = "blocking" | "warning" | "informational";
export type TestStandardVersion = "specos-test-standard/v1";
export type QualityProfile = "backend-api" | "frontend-ui" | "fullstack-flow" | "data-migration" | "agent-workflow";
export type TestLayer =
  | "unit"
  | "api"
  | "scenario"
  | "e2e"
  | "performance"
  | "latency"
  | "concurrency"
  | "security"
  | "migration"
  | "compatibility"
  | "observability";
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
export type RequestKind =
  | "raw-requirement"
  | "draft-only"
  | "active-change"
  | "implementation"
  | "test"
  | "review"
  | "acceptance"
  | "tooling-configuration";
export type RequestWorkType =
  | "architecture"
  | "backend"
  | "frontend"
  | "ui_prototype"
  | "spec"
  | "tests"
  | "ci"
  | "orchestration";
export type RequestRouteAgentRole =
  | "architecture-agent"
  | "implementation-agent"
  | "deployment-agent"
  | "testing-agent"
  | "spec-editor"
  | "ui-design-agent"
  | "cli-gui-agent"
  | "ddd-domain-agent"
  | "openapi-agent"
  | "db-migration-agent"
  | "e2e-test-agent"
  | "playwright-test-agent"
  | "unit-test-agent"
  | "specialized-check-agent"
  | "performance-test-agent"
  | "concurrency-test-agent"
  | "ci-editor"
  | "execution-editor"
  | "implementation-editor"
  | "test-editor"
  | "qa-agent"
  | "reviewer";
export type ProjectMode = "litespec" | "goalspec" | "enterprisespec";

const productionTestStandardVersion: TestStandardVersion = "specos-test-standard/v1";

export interface RunnerMetadata {
  name: string;
  command: string;
  exitCode: number;
}

export interface TestEnvironmentMetadata {
  id: string;
  fixtureVersion?: string;
  seedCommand?: string;
  cleanupCommand?: string;
  externalDependencyMode?: "live" | "stubbed" | "mocked";
}

export interface TestSlo {
  p95Ms?: number;
  p99Ms?: number;
  errorRate?: number;
}

export interface TestMetrics {
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  requestRate?: number;
  errorRate?: number;
}

export interface ArtifactRef {
  type: "trace" | "log" | "screenshot" | "video" | "raw-report" | "gate-report";
  path: string;
}

export interface ConcurrencyProfile {
  actors: number;
  requests: number;
  invariant: string;
  expectedFinalState: string;
  observedFinalState?: string;
}

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

export type ReleaseGateType = "pr-fast" | "change-verification" | "release" | "promote";

export interface TestPlanPerformanceTarget {
  endpoint: string;
  priority: Priority;
  slo: TestSlo;
  gateImpact: GateImpact;
}

export interface TestPlanConcurrencyInvariant {
  scenario: string;
  invariant: string;
  actorProfile: string;
  expectedFinalState: string;
  gateImpact: GateImpact;
}

export interface TestPlanReleaseGate {
  id: string;
  type: ReleaseGateType;
  requiredTestTypes: TestType[];
  blocking: boolean;
  evidenceRequired: ArtifactRef["type"][];
}

export interface TestPlanStandardRequirement {
  id: string;
  layer: TestLayer;
  appliesTo: string[];
  requiredFor: Priority[];
  ownerAgent: TestOwnerAgent;
  requiredEvidence: ArtifactRef["type"][];
  gateImpact: GateImpact;
}

export interface TestPlanFlakePolicy {
  allowedRetries: number;
  quarantineAllowed: boolean;
  classificationRequired: boolean;
}

export interface TestPlanDataPolicy {
  seedCommand?: string;
  cleanupCommand?: string;
  externalDependencyMode: "live" | "stubbed" | "mocked";
  piiAllowed: boolean;
  secretsAllowed: boolean;
}

export interface TestPlanSecurityPolicy {
  baseline: "owasp-api-top-10-2023";
  requiredChecks: string[];
}

export interface SpecosTestPlan {
  standardVersion?: TestStandardVersion;
  qualityProfile?: QualityProfile;
  riskTier?: Priority;
  specId: string;
  specVersion: string;
  changeId?: string;
  featureName: string;
  source: "accepted-spec" | "draft";
  flows: TestPlanFlow[];
  endpoints: TestPlanEndpoint[];
  scenarios: TestPlanScenario[];
  performanceTargets?: TestPlanPerformanceTarget[];
  concurrencyInvariants?: TestPlanConcurrencyInvariant[];
  releaseGates?: TestPlanReleaseGate[];
  standardRequirements?: TestPlanStandardRequirement[];
  flakePolicy?: TestPlanFlakePolicy;
  dataPolicy?: TestPlanDataPolicy;
  securityPolicy?: TestPlanSecurityPolicy;
}

export type TestScheduleExecutionMode = "parallel" | "test-after-execution";
export type TestScheduleTrackId = "execution" | "testing";
export type TestScheduleIsolation = "implementation-only" | "spec-and-contract-only";
export type TestScheduleTaskType = "implementation" | "api-test" | "ui-test-gap";
export type TestScheduleTaskStatus = "ready" | "blocked";

export interface TestScheduleTrack {
  id: TestScheduleTrackId;
  agentRole: "execution-editor" | "test-editor";
  isolation: TestScheduleIsolation;
  allowedInputs: string[];
  forbiddenInputs: string[];
}

export interface TestScheduleTask {
  id: string;
  trackId: TestScheduleTrackId;
  agentRole: "execution-editor" | "test-editor" | "playwright-test-agent";
  type: TestScheduleTaskType;
  status: TestScheduleTaskStatus;
  reason?: string;
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
  traceability: {
    scenarios: string[];
    endpoints: string[];
  };
}

export interface SpecosTestSchedule {
  specId: string;
  specVersion: string;
  featureName: string;
  changeId: string;
  executionMode: TestScheduleExecutionMode;
  tracks: TestScheduleTrack[];
  tasks: TestScheduleTask[];
  gates: string[];
}

export interface GeneratedTextAsset {
  path: string;
  content: string;
}

export interface ScenarioResult {
  runId: string;
  specId: string;
  specVersion: string;
  standardVersion?: TestStandardVersion;
  qualityProfile?: QualityProfile;
  changeId?: string;
  featureName: string;
  workflowId?: string;
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
  flowResults: FlowResult[];
  items: ResultItem[];
}

export interface TestGateReportGate {
  id: string;
  type: ReleaseGateType;
  requiredTestTypes: TestType[];
  blocking: boolean;
}

export interface TestGateReport {
  specId: string;
  specVersion: string;
  changeId?: string;
  decision: "ready" | "blocked" | "draft-only";
  requiredGates: TestGateReportGate[];
  passedGates: string[];
  failedGates: string[];
  missingEvidence: string[];
  blockers: string[];
  runIds: string[];
  standardCompliance: TestGateStandardCompliance[];
  riskSummary: Record<Priority, { passed: number; failed: number; missing: number; waived: number; blocked: number }>;
  agentEvidenceSummary: TestGateAgentEvidenceSummary[];
}

export interface TestGateStandardCompliance {
  requirementId: string;
  status: "passed" | "failed" | "missing" | "waived";
  riskTier: Priority;
  ownerAgent: TestOwnerAgent;
  gateImpact: GateImpact;
  evidence: ArtifactRef["type"][];
  summary: string;
}

export interface TestGateAgentEvidenceSummary {
  ownerAgent: TestOwnerAgent;
  passed: number;
  failed: number;
  missing: number;
  waived: number;
}

export interface RequestRouteDecision {
  projectMode: ProjectMode;
  requestKind: RequestKind;
  workTypes: RequestWorkType[];
  primaryAgent: RequestRouteAgentRole;
  supportingAgents: RequestRouteAgentRole[];
  rules: string[];
  skills: string[];
  requiredContext: string[];
  promptAssembly: RequestRoutePromptAssembly;
  needsDraft: boolean;
  needsChangePackage: boolean;
  nextStep: string;
  confidence: "high" | "medium" | "low";
  matchedSignals: string[];
}

export interface AgentManifestSkillBinding {
  name: string;
  path: string;
  required?: boolean;
  purpose?: string;
}

export interface AgentManifestRoleRecord {
  role_prompt: string;
  canonical: string;
  skill_mode?: string;
  skills?: AgentManifestSkillBinding[];
  delegates_to?: RequestRouteAgentRole[];
  context_includes?: string[];
  owns?: string[];
  outputs?: string[];
}

export interface AgentRuntimeManifest {
  calling_convention?: {
    role_path_base?: string;
    canonical_path_base?: string;
    mode_overlay_roots?: {
      role_overlays?: string;
      canonical_overlays?: string;
    };
    prompt_assembly_order?: string[];
  };
  mode_overlays?: Partial<Record<ProjectMode, {
    manifest_overlay?: string;
    purpose?: string;
  }>>;
  roles?: Partial<Record<RequestRouteAgentRole, AgentManifestRoleRecord>>;
}

export interface AgentModeOverlayManifest {
  mode?: ProjectMode;
  description?: string;
  load_order?: string[];
  overrides?: RequestRouteAgentRole[];
}

export interface HostPromptAssembly {
  projectMode: ProjectMode;
  manifestPath: string;
  overlayManifest: string;
  sharedContext: string[];
  loadOrder: string[];
  roles: HostPromptRoleAssembly[];
}

export interface HostPromptRoleAssembly {
  role: RequestRouteAgentRole;
  sharedRolePrompt: string;
  sharedCanonicalPrompt: string;
  overlayApplied: boolean;
  modeRolePrompt?: string;
  modeCanonicalPrompt?: string;
  skillMode?: string;
  skills: AgentManifestSkillBinding[];
  contextIncludes: string[];
  delegatesTo: RequestRouteAgentRole[];
  owns: string[];
  outputs: string[];
  loadOrder: string[];
}

export type RequestRoutePromptAssembly = HostPromptAssembly;
export type RequestRouteRolePromptAssembly = HostPromptRoleAssembly;

export interface AgentExecutionTask {
  role: RequestRouteAgentRole;
  dispatch: "primary" | "supporting";
  parallelizable: boolean;
  prompt: HostPromptRoleAssembly;
  sharedContext: string[];
  requiredContext: string[];
  rules: string[];
  requestedRuntimeSkills: string[];
  nextStep: string;
}

export interface SpecialistDispatchTask {
  id: string;
  role: RequestRouteAgentRole;
  priority: number;
  parallelizable: true;
  reason: string;
  sourceContext: string[];
  inspectableSurfaces: string[];
  exactQuestion: string;
  expectedOutput: string[];
  nonGoals: string[];
  requestedRuntimeSkills: string[];
  dispatchPromptEnvelope: SpecialistDispatchPromptEnvelope;
}

export interface SpecialistDispatchPlan {
  primaryRole: RequestRouteAgentRole;
  maxTasks: number;
  minTasks: number;
  tasks: SpecialistDispatchTask[];
  deferredRoles: RequestRouteAgentRole[];
}

export interface SpecialistDispatchPromptEnvelope {
  role: RequestRouteAgentRole;
  sharedPromptStack: string[];
  rolePromptStack: string[];
  contextPaths: string[];
  requestedRuntimeSkills: string[];
  taskBrief: {
    reason: string;
    exactQuestion: string;
    inspectableSurfaces: string[];
    expectedOutput: string[];
    nonGoals: string[];
  };
  message: string;
}

export type PrimaryDispatchPromptEnvelope = SpecialistDispatchPromptEnvelope;
export type RouteRequestOutputFormat = "full" | "dispatch-json" | "primary-json" | "execution-plan-json";
export type RouteRequestFormattedOutput =
  | (RequestRouteDecision & { promptAssembly: HostPromptAssembly; executionPlan: AgentExecutionPlan })
  | SpecialistDispatchPromptEnvelope[]
  | PrimaryDispatchPromptEnvelope
  | AgentExecutionPlan;

export interface ArtifactShapeSchema {
  rootType: "object" | "array";
  requiredTopLevel: string[];
  itemRequiredTopLevel?: string[];
  roleRequiredTopLevel?: string[];
  format?: RouteRequestOutputFormat;
  artifact?: "route-output" | "dispatch-prompt-envelope" | "host-prompt-assembly" | "execution-plan-output";
}

export type RouteRequestOutputSchema = ArtifactShapeSchema & {
  format: RouteRequestOutputFormat;
};

export type DispatchPromptEnvelopeSchema = ArtifactShapeSchema & {
  rootType: "object";
  artifact: "dispatch-prompt-envelope";
};

export type HostPromptAssemblySchema = ArtifactShapeSchema & {
  rootType: "object";
  artifact: "host-prompt-assembly";
};

export interface BuildAgentExecutionPlanOptions {
  projectMode?: ProjectMode;
  manifest?: AgentRuntimeManifest;
  manifestPath?: string;
  overlayManifest?: AgentModeOverlayManifest;
}

export interface AgentExecutionPlan {
  request: string;
  projectMode: ProjectMode;
  route: RequestRouteDecision;
  promptAssembly: HostPromptAssembly;
  sharedContext: string[];
  primaryTask: AgentExecutionTask;
  primaryDispatchPromptEnvelope: PrimaryDispatchPromptEnvelope;
  supportingTasks: AgentExecutionTask[];
  specialistDispatchPlan: SpecialistDispatchPlan;
  orderedRoles: RequestRouteAgentRole[];
  specialistDispatch: "primary-only" | "bounded-parallel";
  recommendedParallelism: {
    suggested: number;
    max: number;
  };
}

export interface SpecosWorkflowStep {
  id: string;
  run: string;
}

export interface SpecosWorkflow {
  id: string;
  name: string;
  steps: SpecosWorkflowStep[];
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
  changeId?: string;
  testType: TestType;
  target: string;
  status: Exclude<RunStatus, "draft-only" | "pending">;
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
}

type MutableValidation = {
  errors: SpecosError[];
};

const requestRoutingRules: Record<RequestWorkType, string[]> = {
  architecture: [
    ".rules/project.md",
    "design/README.md",
    "specs/roadmap.md",
    "specs/_rules/README.md",
    "rules/backend/go-backend-governance.md",
    "rules/shared/error-code-governance.md",
    "ai/workflows/nested-agent-orchestration.md",
  ],
  backend: [
    "rules/backend/go-backend-governance.md",
    "rules/backend/redis-key-governance.md",
    "rules/shared/error-code-governance.md",
  ],
  frontend: ["rules/frontend/react-workbench-delivery.md", "rules/shared/error-code-governance.md"],
  ui_prototype: ["rules/ui/pencil-prototype-ui.md", "rules/frontend/react-workbench-delivery.md"],
  spec: ["specs/_rules/README.md", "rules/testing/production-test-standards.md", "rules/shared/error-code-governance.md"],
  tests: ["tests/README.md", "rules/testing/production-test-standards.md", "rules/ci/spec-release-gates.md"],
  ci: ["rules/testing/production-test-standards.md", "rules/ci/spec-release-gates.md", "scripts/checks/README.md"],
  orchestration: ["ai/workflows/README.md", "scripts/orchestration/README.md", "rules/ci/spec-release-gates.md"],
};

const requestRoutingAgents: Record<RequestWorkType, RequestRouteAgentRole[]> = {
  architecture: [
    "spec-editor",
    "ddd-domain-agent",
    "openapi-agent",
    "db-migration-agent",
    "test-editor",
    "performance-test-agent",
    "concurrency-test-agent",
    "reviewer",
  ],
  backend: ["ddd-domain-agent", "openapi-agent", "db-migration-agent", "unit-test-agent"],
  frontend: ["ui-design-agent", "test-editor"],
  ui_prototype: ["spec-editor", "ui-design-agent"],
  spec: ["spec-editor", "ddd-domain-agent", "test-editor"],
  tests: [
    "test-editor",
    "unit-test-agent",
    "playwright-test-agent",
    "e2e-test-agent",
    "performance-test-agent",
    "concurrency-test-agent",
    "qa-agent",
  ],
  ci: ["ci-editor", "execution-editor", "qa-agent"],
  orchestration: ["execution-editor", "ci-editor", "qa-agent", "reviewer"],
};

const routeModeRoleOverrides: Record<ProjectMode, RequestRouteAgentRole[]> = {
  litespec: [
    "spec-editor",
    "implementation-agent",
    "testing-agent",
    "reviewer",
    "openapi-agent",
    "db-migration-agent",
    "ui-design-agent",
    "test-editor",
    "performance-test-agent",
    "concurrency-test-agent",
  ],
  goalspec: [
    "spec-editor",
    "implementation-agent",
    "testing-agent",
    "reviewer",
    "ci-editor",
    "deployment-agent",
    "openapi-agent",
    "db-migration-agent",
    "ui-design-agent",
    "test-editor",
    "performance-test-agent",
    "concurrency-test-agent",
  ],
  enterprisespec: [
    "architecture-agent",
    "spec-editor",
    "deployment-agent",
    "testing-agent",
    "qa-agent",
    "reviewer",
    "ci-editor",
    "openapi-agent",
    "db-migration-agent",
    "ui-design-agent",
    "test-editor",
    "performance-test-agent",
    "concurrency-test-agent",
  ],
};

const allRouteAgentRoles: RequestRouteAgentRole[] = [
  "architecture-agent",
  "implementation-agent",
  "deployment-agent",
  "testing-agent",
  "spec-editor",
  "ui-design-agent",
  "ddd-domain-agent",
  "openapi-agent",
  "db-migration-agent",
  "e2e-test-agent",
  "playwright-test-agent",
  "unit-test-agent",
  "specialized-check-agent",
  "performance-test-agent",
  "concurrency-test-agent",
  "ci-editor",
  "execution-editor",
  "implementation-editor",
  "test-editor",
  "qa-agent",
  "reviewer",
];

const defaultPromptAssemblyOrder = [
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
];

const defaultRoutePromptManifest: AgentRuntimeManifest = {
  calling_convention: {
    role_path_base: ".agents",
    canonical_path_base: "repository root",
    mode_overlay_roots: {
      role_overlays: ".agents/modes",
      canonical_overlays: "ai/agents/modes",
    },
    prompt_assembly_order: defaultPromptAssemblyOrder,
  },
  mode_overlays: {
    litespec: {
      manifest_overlay: ".agents/modes/litespec/manifest.overlay.yaml",
    },
    goalspec: {
      manifest_overlay: ".agents/modes/goalspec/manifest.overlay.yaml",
    },
    enterprisespec: {
      manifest_overlay: ".agents/modes/enterprisespec/manifest.overlay.yaml",
    },
  },
  roles: Object.fromEntries(
    allRouteAgentRoles.map((role) => [
      role,
      {
        role_prompt: `roles/${role}.md`,
        canonical: `ai/agents/${role}.md`,
        skills: [],
        context_includes: [],
        delegates_to: [],
        owns: [],
        outputs: [],
      },
    ]),
  ) as Partial<Record<RequestRouteAgentRole, AgentManifestRoleRecord>>,
};

const specialistRoleKeywords: Partial<Record<RequestRouteAgentRole, string[]>> = {
  "ddd-domain-agent": ["domain", "ddd", "bounded context", "领域", "边界", "invariant", "不变量"],
  "openapi-agent": ["api", "contract", "schema", "swagger", "openapi", "接口"],
  "db-migration-agent": ["db", "database", "sql", "migration", "schema", "table", "迁移", "表"],
  "ui-design-agent": ["ui", "frontend", "react", "next", "console", "page", "页面", "前端", "交互", "prototype", "原型"],
  "cli-gui-agent": ["cli gui", "cli-gui", "terminal", "session", "workspace", "终端", "会话", "工作区"],
  "test-editor": ["test", "qa", "coverage", "scenario", "contract", "测试", "验收"],
  "performance-test-agent": ["performance", "latency", "throughput", "slo", "benchmark", "性能", "延迟"],
  "concurrency-test-agent": ["concurrency", "race", "lock", "idempot", "duplicate", "并发", "一致性", "重试"],
  "ci-editor": ["ci", "pipeline", "gate", "workflow", "发布", "门禁"],
  "execution-editor": ["workflow", "script", "orchestration", "脚本", "编排"],
  "qa-agent": ["qa", "acceptance", "release", "验收", "发布"],
  "reviewer": ["review", "risk", "评审", "审查", "风险"],
  "unit-test-agent": ["unit", "单元"],
  "playwright-test-agent": ["playwright", "browser", "ui", "浏览器"],
  "e2e-test-agent": ["e2e", "journey", "flow", "端到端"],
  "spec-editor": ["spec", "draft", "roadmap", "design", "规格", "草稿"],
};

const primaryRoleDispatchPriority: Record<RequestRouteAgentRole, RequestRouteAgentRole[]> = {
  "architecture-agent": [
    "openapi-agent",
    "db-migration-agent",
    "ddd-domain-agent",
    "performance-test-agent",
    "concurrency-test-agent",
    "test-editor",
    "ui-design-agent",
    "reviewer",
    "spec-editor",
    "qa-agent",
    "ci-editor",
    "execution-editor",
    "unit-test-agent",
    "playwright-test-agent",
    "e2e-test-agent",
    "specialized-check-agent",
    "implementation-editor",
    "implementation-agent",
    "deployment-agent",
    "testing-agent",
  ],
  "implementation-agent": [
    "ui-design-agent",
    "openapi-agent",
    "db-migration-agent",
    "unit-test-agent",
    "specialized-check-agent",
    "test-editor",
    "reviewer",
    "performance-test-agent",
    "concurrency-test-agent",
    "qa-agent",
    "ci-editor",
    "execution-editor",
    "ddd-domain-agent",
    "playwright-test-agent",
    "e2e-test-agent",
    "spec-editor",
    "architecture-agent",
    "deployment-agent",
    "testing-agent",
    "implementation-editor",
  ],
  "deployment-agent": [
    "ci-editor",
    "execution-editor",
    "qa-agent",
    "reviewer",
    "performance-test-agent",
    "concurrency-test-agent",
    "test-editor",
    "openapi-agent",
    "db-migration-agent",
    "spec-editor",
    "ddd-domain-agent",
    "ui-design-agent",
    "unit-test-agent",
    "playwright-test-agent",
    "e2e-test-agent",
    "specialized-check-agent",
    "architecture-agent",
    "implementation-agent",
    "testing-agent",
    "implementation-editor",
  ],
  "testing-agent": [
    "test-editor",
    "performance-test-agent",
    "concurrency-test-agent",
    "playwright-test-agent",
    "e2e-test-agent",
    "qa-agent",
    "reviewer",
    "openapi-agent",
    "db-migration-agent",
    "ui-design-agent",
    "unit-test-agent",
    "ddd-domain-agent",
    "ci-editor",
    "execution-editor",
    "spec-editor",
    "architecture-agent",
    "implementation-agent",
    "deployment-agent",
    "specialized-check-agent",
    "implementation-editor",
  ],
  "spec-editor": allRouteAgentRoles,
  "ui-design-agent": allRouteAgentRoles,
  "cli-gui-agent": allRouteAgentRoles,
  "ddd-domain-agent": allRouteAgentRoles,
  "openapi-agent": allRouteAgentRoles,
  "db-migration-agent": allRouteAgentRoles,
  "e2e-test-agent": allRouteAgentRoles,
  "playwright-test-agent": allRouteAgentRoles,
  "unit-test-agent": allRouteAgentRoles,
  "specialized-check-agent": allRouteAgentRoles,
  "performance-test-agent": allRouteAgentRoles,
  "concurrency-test-agent": allRouteAgentRoles,
  "ci-editor": allRouteAgentRoles,
  "execution-editor": allRouteAgentRoles,
  "implementation-editor": allRouteAgentRoles,
  "test-editor": allRouteAgentRoles,
  "qa-agent": allRouteAgentRoles,
  "reviewer": allRouteAgentRoles,
};

export function buildRequestRoute(
  rawRequest: string,
  options: { projectMode?: ProjectMode } = {},
): RequestRouteDecision {
  const request = rawRequest.trim();
  const normalized = request.toLowerCase();
  const projectMode = options.projectMode ?? "litespec";
  const matchedSignals: string[] = [];
  const workTypes = new Set<RequestWorkType>();
  const supportingAgents = new Set<RequestRouteAgentRole>();
  const skills = new Set<string>();

  const match = (signal: string, patterns: Array<string | RegExp>): boolean => {
    const hit = patterns.some((pattern) => typeof pattern === "string" ? normalized.includes(pattern.toLowerCase()) : pattern.test(normalized));
    if (hit) matchedSignals.push(signal);
    return hit;
  };

  const hasRawRequirementSignal = match("raw-requirement", ["需求", "想法", "prd", "还没有 spec", "new requirement", "requirement"]);
  const hasDraftSignal = match("draft-only", ["draft", "草稿", "设计文档", "文档", "整理一下"]);
  const hasActiveChangeSignal = match("active-change", [
    "feature spec",
    "specs/",
    "roadmap",
    "变更",
    "spec package",
    /[a-z]+-\d{3}[-/][a-z0-9-]+/i,
  ]);
  const hasImplementationSignal = match("implementation", ["实现", "开发", "代码", "修复", "bug", "接口实现", "implement", "fix"]);
  const hasTestSignal = match("test", ["测试", "test", "unit", "e2e", "scenario", "api", "contract", "性能", "并发", "concurrency", "performance", "latency"]);
  const hasReviewSignal = match("review", ["评审", "review", "检查", "审查"]);
  const hasAcceptanceSignal = match("acceptance", ["qa", "质量", "验收", "发布", "acceptance", "release", "promote", "gate", "门禁", "ci"]);
  const hasExplicitQaAcceptanceSignal =
    normalized.includes("qa") ||
    normalized.includes("质量") ||
    normalized.includes("验收") ||
    normalized.includes("acceptance");
  const hasArchitectureSignal = match("architecture", [
    "architecture",
    "architect",
    "架构",
    "领域",
    "domain",
    "ddd",
    "边界",
    "bounded context",
    "invariant",
    "不变量",
  ]);
  const hasToolingSignal = match("tooling-configuration", ["agent", "skill", "workflow", "脚本", "cli", "配置", "router", "route-request"]);

  if (hasArchitectureSignal) {
    workTypes.add("architecture");
  }
  if (match("backend", ["backend", "后端", "api", "接口", "database", "db", "migration", "sql", "redis", "go ", "golang"])) {
    workTypes.add("backend");
  }
  if (match("frontend", ["frontend", "前端", "ui", "页面", "console", "react", "next", "可视化", "首页"])) {
    workTypes.add("frontend");
  }
  if (match("ui_prototype", ["prototype", "原型", "pencil", "交互稿"])) {
    workTypes.add("ui_prototype");
  }
  if (hasRawRequirementSignal || hasDraftSignal || hasActiveChangeSignal || match("spec", ["spec", "规格", "规范", "feature spec"])) {
    workTypes.add("spec");
  }
  if (hasTestSignal) {
    workTypes.add("tests");
  }
  if (hasAcceptanceSignal) {
    workTypes.add("tests");
    workTypes.add("ci");
  }
  if (hasToolingSignal) {
    workTypes.add("orchestration");
  }
  if (workTypes.size === 0) {
    workTypes.add("spec");
  }

  for (const workType of workTypes) {
    for (const agent of requestRoutingAgents[workType]) {
      supportingAgents.add(agent);
    }
  }
  if (normalized.includes("unit") || normalized.includes("单元")) supportingAgents.add("unit-test-agent");
  if (normalized.includes("性能") || normalized.includes("performance") || normalized.includes("latency")) supportingAgents.add("performance-test-agent");
  if (normalized.includes("并发") || normalized.includes("concurrency")) supportingAgents.add("concurrency-test-agent");
  if (normalized.includes("api") || normalized.includes("contract") || normalized.includes("接口")) supportingAgents.add("test-editor");
  if (hasAcceptanceSignal || hasExplicitQaAcceptanceSignal) supportingAgents.add("qa-agent");

  const requestKind: RequestKind = hasRawRequirementSignal && !hasActiveChangeSignal
    ? "raw-requirement"
    : hasExplicitQaAcceptanceSignal
        ? "acceptance"
        : hasReviewSignal
          ? "review"
          : hasTestSignal
            ? "test"
            : hasImplementationSignal
              ? "implementation"
              : hasToolingSignal
                ? "tooling-configuration"
                : hasDraftSignal
                  ? "draft-only"
                  : hasActiveChangeSignal
                    ? "active-change"
                    : hasArchitectureSignal
                      ? "review"
                      : "raw-requirement";

  const primaryAgent = primaryAgentForRequest(requestKind, workTypes);
  supportingAgents.delete(primaryAgent);

  if (workTypes.has("frontend")) {
    skills.add(".codex/skills/specos-ui-design/SKILL.md");
  }
  if (workTypes.has("ci")) {
    skills.add(".skills/team-ci-agent/SKILL.md");
  }

  const rules = [...workTypes].flatMap((workType) => requestRoutingRules[workType]);
  const needsDraft = requestKind === "raw-requirement" || requestKind === "draft-only";
  const needsChangePackage = needsDraft || requestKind === "implementation" || requestKind === "test" || requestKind === "acceptance";
  const orderedRoles = [primaryAgent, ...[...supportingAgents].sort()] as RequestRouteAgentRole[];
  const modeReadme = projectMode === "enterprisespec"
    ? "docs/spec-modes/EnterpriseSpec/README.md"
    : projectMode === "goalspec"
      ? "docs/spec-modes/GoalSpec/README.md"
      : "docs/spec-modes/LiteSpec/README.md";
  const promptAssembly = buildHostPromptAssembly(defaultRoutePromptManifest, {
    projectMode,
    manifestPath: ".agents/manifest.yaml",
    primaryAgent,
    supportingAgents: [...supportingAgents],
    overlayManifest: {
      mode: projectMode,
      overrides: routeModeRoleOverrides[projectMode],
    },
  });

  return {
    projectMode,
    requestKind,
    workTypes: [...workTypes],
    primaryAgent,
    supportingAgents: [...supportingAgents],
    rules: [...new Set(rules)],
    skills: [...skills],
    requiredContext: [
      "AGENTS.md",
      ".codex/instructions.md",
      ".agents/manifest.yaml",
      ".specos/manifest.yaml",
      modeReadme,
      "current/",
      ".rules/rule-map.yaml",
      ...[...workTypes].map((workType) => `.rules work_type: ${workType}`),
    ],
    promptAssembly,
    needsDraft,
    needsChangePackage,
    nextStep: nextStepForRequest(requestKind, needsDraft, needsChangePackage),
    confidence: matchedSignals.length >= 3 ? "high" : matchedSignals.length >= 1 ? "medium" : "low",
    matchedSignals: [...new Set(matchedSignals)],
  };
}

export function buildAgentExecutionPlan(
  rawRequest: string,
  options: BuildAgentExecutionPlanOptions = {},
): AgentExecutionPlan {
  const baseRoute = buildRequestRoute(rawRequest, { projectMode: options.projectMode });
  const promptAssembly = options.manifest
    ? buildHostPromptAssembly(options.manifest, {
      projectMode: baseRoute.projectMode,
      manifestPath: options.manifestPath ?? ".agents/manifest.yaml",
      primaryAgent: baseRoute.primaryAgent,
      supportingAgents: baseRoute.supportingAgents,
      overlayManifest: options.overlayManifest,
    })
    : baseRoute.promptAssembly;
  const route: RequestRouteDecision = {
    ...baseRoute,
    promptAssembly,
  };
  const sharedContext = uniqueStrings([
    ...promptAssembly.sharedContext,
    ...route.requiredContext,
    ...route.rules,
  ]);
  const roleMap = new Map(promptAssembly.roles.map((role) => [role.role, role]));
  const primaryTask = buildAgentExecutionTask(
    roleMap.get(route.primaryAgent),
    "primary",
    sharedContext,
    route,
  );
  if (!primaryTask) {
    throw new Error(`Missing prompt assembly for primary agent: ${route.primaryAgent}`);
  }
  const supportingTasks = route.supportingAgents
    .map((role) => buildAgentExecutionTask(roleMap.get(role), "supporting", sharedContext, route))
    .filter((task): task is AgentExecutionTask => task !== undefined);
  const specialistDispatch: AgentExecutionPlan["specialistDispatch"] = supportingTasks.length > 0
    ? "bounded-parallel"
    : "primary-only";
  const recommendedParallelism = {
    suggested: Math.min(Math.max(supportingTasks.length, 1), 4),
    max: Math.min(Math.max(supportingTasks.length, 1), 4),
  };
  const basePlan = {
    request: rawRequest,
    projectMode: route.projectMode,
    route,
    promptAssembly,
    sharedContext,
    primaryTask,
    primaryDispatchPromptEnvelope: buildPrimaryDispatchPromptEnvelope({
      request: rawRequest,
      projectMode: route.projectMode,
      route,
      promptAssembly,
      sharedContext,
      primaryTask,
      supportingTasks,
      orderedRoles: [route.primaryAgent, ...route.supportingAgents],
      specialistDispatch,
      recommendedParallelism,
    }),
    supportingTasks,
    orderedRoles: [route.primaryAgent, ...route.supportingAgents],
    specialistDispatch,
    recommendedParallelism,
  };
  const specialistDispatchPlan = buildSpecialistDispatchPlan(basePlan);

  return {
    ...basePlan,
    specialistDispatchPlan,
  };
}

export function buildValidatedAgentExecutionPlan(
  rawRequest: string,
  options: BuildAgentExecutionPlanOptions = {},
): AgentExecutionPlan {
  const executionPlan = buildAgentExecutionPlan(rawRequest, options);
  const validation = validateAgentExecutionPlan(executionPlan);

  if (!validation.ok) {
    throw new Error(validation.errors.map((error) => `${error.path ?? "executionPlan"} ${error.message}`).join("; "));
  }

  return executionPlan;
}

export function buildValidatedRouteRequestOutput(
  rawRequest: string,
  format: RouteRequestOutputFormat = "full",
  options: BuildAgentExecutionPlanOptions = {},
): {
  executionPlan: AgentExecutionPlan;
  output: RouteRequestFormattedOutput;
} {
  const executionPlan = buildValidatedAgentExecutionPlan(rawRequest, options);
  const output = formatRouteRequestOutput(executionPlan, format);
  const validation = validateRouteRequestOutput(output, format);

  if (!validation.ok) {
    throw new Error(validation.errors.map((error) => `${error.path ?? "route-output"} ${error.message}`).join("; "));
  }

  return {
    executionPlan,
    output,
  };
}

export function formatRouteRequestOutput(
  executionPlan: AgentExecutionPlan,
  format: RouteRequestOutputFormat = "full",
): RouteRequestFormattedOutput {
  if (format === "dispatch-json") {
    return executionPlan.specialistDispatchPlan.tasks.map((task) => task.dispatchPromptEnvelope);
  }

  if (format === "primary-json") {
    return executionPlan.primaryDispatchPromptEnvelope;
  }

  if (format === "execution-plan-json") {
    return executionPlan;
  }

  return {
    ...executionPlan.route,
    promptAssembly: executionPlan.promptAssembly,
    executionPlan,
  };
}

export function buildRouteRequestOutputSchema(
  format: RouteRequestOutputFormat = "full",
): RouteRequestOutputSchema {
  if (format === "dispatch-json") {
    const envelopeSchema = buildDispatchPromptEnvelopeSchema();
    return {
      format,
      artifact: "route-output",
      rootType: "array",
      requiredTopLevel: [],
      itemRequiredTopLevel: envelopeSchema.requiredTopLevel,
    };
  }

  if (format === "primary-json") {
    const envelopeSchema = buildDispatchPromptEnvelopeSchema();
    return {
      format,
      artifact: "route-output",
      rootType: envelopeSchema.rootType,
      requiredTopLevel: envelopeSchema.requiredTopLevel,
    };
  }

  if (format === "execution-plan-json") {
    return buildExecutionPlanOutputSchema();
  }

  return {
    format,
    artifact: "route-output",
    rootType: "object",
    requiredTopLevel: [
      "projectMode",
      "requestKind",
      "workTypes",
      "primaryAgent",
      "supportingAgents",
      "rules",
      "skills",
      "requiredContext",
      "promptAssembly",
      "needsDraft",
      "needsChangePackage",
      "nextStep",
      "confidence",
      "matchedSignals",
      "executionPlan",
    ],
  };
}

export function buildDispatchPromptEnvelopeSchema(): DispatchPromptEnvelopeSchema {
  return {
    artifact: "dispatch-prompt-envelope",
    rootType: "object",
    requiredTopLevel: [
      "role",
      "sharedPromptStack",
      "rolePromptStack",
      "contextPaths",
      "requestedRuntimeSkills",
      "taskBrief",
      "message",
    ],
  };
}

export function buildPrimaryDispatchPromptEnvelopeSchema(): DispatchPromptEnvelopeSchema {
  return buildDispatchPromptEnvelopeSchema();
}

export function buildSpecialistDispatchPromptEnvelopeSchema(): DispatchPromptEnvelopeSchema {
  return buildDispatchPromptEnvelopeSchema();
}

export function buildExecutionPlanOutputSchema(): RouteRequestOutputSchema {
  return {
    format: "execution-plan-json",
    artifact: "execution-plan-output",
    rootType: "object",
    requiredTopLevel: [
      "request",
      "projectMode",
      "route",
      "promptAssembly",
      "sharedContext",
      "primaryTask",
      "primaryDispatchPromptEnvelope",
      "supportingTasks",
      "specialistDispatchPlan",
      "orderedRoles",
      "specialistDispatch",
      "recommendedParallelism",
    ],
  };
}

export function buildHostPromptAssemblySchema(): HostPromptAssemblySchema {
  return {
    artifact: "host-prompt-assembly",
    rootType: "object",
    requiredTopLevel: [
      "projectMode",
      "manifestPath",
      "overlayManifest",
      "sharedContext",
      "loadOrder",
      "roles",
    ],
    roleRequiredTopLevel: [
      "role",
      "sharedRolePrompt",
      "sharedCanonicalPrompt",
      "overlayApplied",
      "contextIncludes",
      "owns",
      "outputs",
      "loadOrder",
    ],
  };
}

export function validateExecutionPlanOutput(value: unknown): ValidationResult {
  return validateAgentExecutionPlan(value);
}

export function validateDispatchPromptEnvelope(value: unknown): ValidationResult {
  return validateDispatchPromptEnvelopeAtPath(value, "dispatchPromptEnvelope");
}

export function validatePrimaryDispatchPromptEnvelope(value: unknown): ValidationResult {
  return validateDispatchPromptEnvelopeAtPath(value, "primary-json");
}

export function validateSpecialistDispatchPromptEnvelope(value: unknown): ValidationResult {
  return validateDispatchPromptEnvelopeAtPath(value, "dispatchPromptEnvelope");
}

function validateDispatchPromptEnvelopeAtPath(value: unknown, path: string): ValidationResult {
  const state: MutableValidation = { errors: [] };
  requirePromptEnvelopeShape(state, value, path);
  return result(state.errors);
}

export function validateHostPromptAssembly(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  requirePromptAssemblyShape(state, value, "promptAssembly");
  return result(state.errors);
}

export function validateAgentExecutionPlan(value: unknown): ValidationResult {
  const plan = asRecord(value);
  if (!plan) {
    return result([makeError("SPECOS_ROUTE_OUTPUT_INVALID", "executionPlan")]);
  }

  const route = asRecord(plan.route);
  if (!route) {
    return result([makeError("SPECOS_ROUTE_OUTPUT_INVALID", "executionPlan.route")]);
  }

  const fullOutput = {
    ...route,
    promptAssembly: plan.promptAssembly,
    executionPlan: value,
  };

  return validateRouteRequestOutput(fullOutput, "full");
}

export function validateRouteRequestOutput(
  value: unknown,
  format: RouteRequestOutputFormat = "full",
): ValidationResult {
  const state: MutableValidation = { errors: [] };

  if (format === "dispatch-json") {
    if (!Array.isArray(value)) {
      state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", "dispatch-json"));
      return result(state.errors);
    }
    value.forEach((item, index) => {
      const validation = validateDispatchPromptEnvelopeAtPath(item, `dispatch-json[${index}]`);
      if (!validation.ok) {
        state.errors.push(...validation.errors);
      }
    });
    return result(state.errors);
  }

  if (format === "primary-json") {
    return validatePrimaryDispatchPromptEnvelope(value);
  }

  if (format === "execution-plan-json") {
    return validateExecutionPlanOutput(value);
  }

  const output = asRecord(value);
  if (!output) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", "full"));
    return result(state.errors);
  }

  requireOneOf(state, output.projectMode, ["litespec", "goalspec", "enterprisespec"], "SPECOS_ROUTE_OUTPUT_INVALID", "projectMode");
  requireOneOf(
    state,
    output.requestKind,
    ["raw-requirement", "draft-only", "active-change", "implementation", "test", "review", "acceptance", "tooling-configuration"],
    "SPECOS_ROUTE_OUTPUT_INVALID",
    "requestKind",
  );
  requireOneOfArray(
    state,
    output.workTypes,
    ["architecture", "backend", "frontend", "ui_prototype", "spec", "tests", "ci", "orchestration"],
    "SPECOS_ROUTE_OUTPUT_INVALID",
    "workTypes",
  );
  requireAgentRole(state, output.primaryAgent, "primaryAgent");
  requireAgentRoleArray(state, output.supportingAgents, "supportingAgents");
  requireStringArrayAllowEmpty(state, output.rules, "SPECOS_ROUTE_OUTPUT_INVALID", "rules");
  requireStringArrayAllowEmpty(state, output.skills, "SPECOS_ROUTE_OUTPUT_INVALID", "skills");
  requireStringArray(state, output.requiredContext, "SPECOS_ROUTE_OUTPUT_INVALID", "requiredContext");
  requireBoolean(state, output, "needsDraft", "SPECOS_ROUTE_OUTPUT_INVALID", "needsDraft");
  requireBoolean(state, output, "needsChangePackage", "SPECOS_ROUTE_OUTPUT_INVALID", "needsChangePackage");
  requireString(state, output, "nextStep", "SPECOS_ROUTE_OUTPUT_INVALID", "nextStep");
  requireOneOf(state, output.confidence, ["high", "medium", "low"], "SPECOS_ROUTE_OUTPUT_INVALID", "confidence");
  requireStringArrayAllowEmpty(state, output.matchedSignals, "SPECOS_ROUTE_OUTPUT_INVALID", "matchedSignals");
  requirePromptAssemblyShape(state, output.promptAssembly, "promptAssembly");
  requireExecutionPlanShape(state, output.executionPlan, "executionPlan");

  return result(state.errors);
}

export function buildSpecialistDispatchPlan(
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
  options: {
    minTasks?: number;
    maxTasks?: number;
  } = {},
): SpecialistDispatchPlan {
  const availableTasks = executionPlan.supportingTasks;
  const maxTasks = clampTaskCount(options.maxTasks ?? executionPlan.recommendedParallelism.max);
  const minTasks = Math.min(clampTaskCount(options.minTasks ?? 2), maxTasks);

  if (availableTasks.length === 0) {
    return {
      primaryRole: executionPlan.primaryTask.role,
      minTasks,
      maxTasks,
      tasks: [],
      deferredRoles: [],
    };
  }

  const scoredTasks = availableTasks
    .map((task, index) => ({
      task,
      index,
      score: specialistTaskScore(task, executionPlan),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const targetCount = Math.min(
    availableTasks.length,
    Math.max(
      availableTasks.length >= minTasks ? minTasks : availableTasks.length,
      Math.min(maxTasks, scoredTasks.length),
    ),
  );
  const selected = scoredTasks.slice(0, Math.min(maxTasks, Math.max(targetCount, 1)));
  const selectedRoles = new Set(selected.map(({ task }) => task.role));

  return {
    primaryRole: executionPlan.primaryTask.role,
    minTasks,
    maxTasks,
    tasks: selected.map(({ task, score }, index) => buildSpecialistDispatchTask(task, executionPlan, score, index + 1)),
    deferredRoles: scoredTasks
      .filter(({ task }) => !selectedRoles.has(task.role))
      .map(({ task }) => task.role),
  };
}

export function buildSpecialistDispatchPromptEnvelope(
  task: SpecialistDispatchTask,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
): SpecialistDispatchPromptEnvelope {
  const promptRole = executionPlan.promptAssembly.roles.find((role) => role.role === task.role);
  const sharedPromptStack = uniqueStrings([
    ...executionPlan.promptAssembly.sharedContext,
    ...executionPlan.route.requiredContext,
  ]);
  const rolePromptStack = promptRole
    ? [
      promptRole.sharedRolePrompt,
      promptRole.sharedCanonicalPrompt,
      ...(promptRole.modeRolePrompt ? [promptRole.modeRolePrompt] : []),
      ...(promptRole.modeCanonicalPrompt ? [promptRole.modeCanonicalPrompt] : []),
    ]
    : [];
  const contextPaths = uniqueStrings([
    ...task.sourceContext,
    ...task.inspectableSurfaces,
  ]);

  return {
    role: task.role,
    sharedPromptStack,
    rolePromptStack,
    contextPaths,
    requestedRuntimeSkills: task.requestedRuntimeSkills,
    taskBrief: {
      reason: task.reason,
      exactQuestion: task.exactQuestion,
      inspectableSurfaces: task.inspectableSurfaces,
      expectedOutput: task.expectedOutput,
      nonGoals: task.nonGoals,
    },
    message: buildSpecialistDispatchMessage(task, executionPlan, rolePromptStack, contextPaths),
  };
}

export function buildPrimaryDispatchPromptEnvelope(
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan" | "primaryDispatchPromptEnvelope">,
): PrimaryDispatchPromptEnvelope {
  const task = executionPlan.primaryTask;
  const rolePromptStack = [
    task.prompt.sharedRolePrompt,
    task.prompt.sharedCanonicalPrompt,
    ...(task.prompt.modeRolePrompt ? [task.prompt.modeRolePrompt] : []),
    ...(task.prompt.modeCanonicalPrompt ? [task.prompt.modeCanonicalPrompt] : []),
  ];
  const contextPaths = uniqueStrings([
    ...executionPlan.promptAssembly.sharedContext,
    ...executionPlan.route.requiredContext,
    ...task.prompt.contextIncludes,
    ...task.prompt.owns,
    ...executionPlan.route.rules,
  ]);
  const inspectableSurfaces = uniqueStrings([
    ...task.prompt.contextIncludes,
    ...task.prompt.owns,
    ...executionPlan.route.rules,
  ]).slice(0, 10);
  const expectedOutput = task.prompt.outputs.length > 0
    ? task.prompt.outputs.slice(0, 4)
    : ["focused execution plan", "bounded delegation plan", "validation notes"];
  const nonGoals = primaryDispatchNonGoals(task.role, executionPlan);
  const exactQuestion = primaryDispatchQuestion(task.role, executionPlan);
  const reason = primaryDispatchReason(task.role, executionPlan);

  return {
    role: task.role,
    sharedPromptStack: uniqueStrings([
      ...executionPlan.promptAssembly.sharedContext,
      ...executionPlan.route.requiredContext,
    ]),
    rolePromptStack,
    contextPaths,
    requestedRuntimeSkills: task.requestedRuntimeSkills,
    taskBrief: {
      reason,
      exactQuestion,
      inspectableSurfaces,
      expectedOutput,
      nonGoals,
    },
    message: [
      `Role: ${task.role}`,
      `Dispatch: primary`,
      `Request: ${executionPlan.request}`,
      "",
      "Reason",
      reason,
      "",
      "Exact Question",
      exactQuestion,
      "",
      "Inspectable Surfaces",
      ...inspectableSurfaces.map((surface) => `- ${surface}`),
      "",
      "Expected Output",
      ...expectedOutput.map((item) => `- ${item}`),
      "",
      "Non-Goals",
      ...nonGoals.map((item) => `- ${item}`),
      "",
      "Prompt Stack",
      ...rolePromptStack.map((item) => `- ${item}`),
      "",
      "Context Paths",
      ...contextPaths.map((item) => `- ${item}`),
      "",
      "Requested Runtime Skills",
      ...(task.requestedRuntimeSkills.length > 0 ? task.requestedRuntimeSkills.map((item) => `- ${item}`) : ["- none"]),
    ].join("\n"),
  };
}

export function buildHostPromptAssembly(
  manifest: AgentRuntimeManifest,
  options: {
    projectMode: ProjectMode;
    primaryAgent: RequestRouteAgentRole;
    supportingAgents?: RequestRouteAgentRole[];
    manifestPath?: string;
    overlayManifest?: AgentModeOverlayManifest;
  },
): HostPromptAssembly {
  const projectMode = options.projectMode;
  const orderedRoles = uniqueAgentRoles([options.primaryAgent, ...(options.supportingAgents ?? []).sort()]);
  const rolePathBase = trimPathSeparators(manifest.calling_convention?.role_path_base ?? ".agents");
  const overlayRoots = manifest.calling_convention?.mode_overlay_roots;
  const roleOverlayRoot = trimPathSeparators(overlayRoots?.role_overlays ?? ".agents/modes");
  const canonicalOverlayRoot = trimPathSeparators(overlayRoots?.canonical_overlays ?? "ai/agents/modes");
  const overlayManifest = manifest.mode_overlays?.[projectMode]?.manifest_overlay ?? `${roleOverlayRoot}/${projectMode}/manifest.overlay.yaml`;
  const sharedContext = [
    "AGENTS.md",
    ".codex/instructions.md",
    options.manifestPath ?? ".agents/manifest.yaml",
    ".specos/manifest.yaml projectMode",
    overlayManifest,
  ];

  return {
    projectMode,
    manifestPath: options.manifestPath ?? ".agents/manifest.yaml",
    overlayManifest,
    sharedContext,
    loadOrder: manifest.calling_convention?.prompt_assembly_order ?? defaultPromptAssemblyOrder,
    roles: orderedRoles.map((role) =>
      buildHostPromptRoleAssembly(
        manifest,
        role,
        projectMode,
        rolePathBase,
        roleOverlayRoot,
        canonicalOverlayRoot,
        options.overlayManifest?.overrides ?? routeModeRoleOverrides[projectMode],
      )),
  };
}

function buildHostPromptRoleAssembly(
  manifest: AgentRuntimeManifest,
  role: RequestRouteAgentRole,
  projectMode: ProjectMode,
  rolePathBase: string,
  roleOverlayRoot: string,
  canonicalOverlayRoot: string,
  overlayOverrides: RequestRouteAgentRole[],
): HostPromptRoleAssembly {
  const roleRecord = manifest.roles?.[role];
  const sharedRolePrompt = joinPosixPath(rolePathBase, roleRecord?.role_prompt ?? `roles/${role}.md`);
  const sharedCanonicalPrompt = roleRecord?.canonical ?? `ai/agents/${role}.md`;
  const overlayApplied = overlayOverrides.includes(role);

  if (overlayApplied) {
    const modeRolePrompt = joinPosixPath(roleOverlayRoot, projectMode, "roles", `${role}.md`);
    const modeCanonicalPrompt = joinPosixPath(canonicalOverlayRoot, projectMode, `${role}.md`);

    return {
      role,
      sharedRolePrompt,
      sharedCanonicalPrompt,
      overlayApplied,
      modeRolePrompt,
      modeCanonicalPrompt,
      skillMode: roleRecord?.skill_mode,
      skills: roleRecord?.skills ?? [],
      contextIncludes: roleRecord?.context_includes ?? [],
      delegatesTo: roleRecord?.delegates_to ?? [],
      owns: roleRecord?.owns ?? [],
      outputs: roleRecord?.outputs ?? [],
      loadOrder: [
        sharedRolePrompt,
        sharedCanonicalPrompt,
        modeRolePrompt,
        modeCanonicalPrompt,
      ],
    };
  }

  return {
    role,
    sharedRolePrompt,
    sharedCanonicalPrompt,
    overlayApplied,
    skillMode: roleRecord?.skill_mode,
    skills: roleRecord?.skills ?? [],
    contextIncludes: roleRecord?.context_includes ?? [],
    delegatesTo: roleRecord?.delegates_to ?? [],
    owns: roleRecord?.owns ?? [],
    outputs: roleRecord?.outputs ?? [],
    loadOrder: [
      sharedRolePrompt,
      sharedCanonicalPrompt,
    ],
  };
}

function buildAgentExecutionTask(
  prompt: HostPromptRoleAssembly | undefined,
  dispatch: "primary" | "supporting",
  sharedContext: string[],
  route: RequestRouteDecision,
): AgentExecutionTask | undefined {
  if (!prompt) {
    return undefined;
  }

  return {
    role: prompt.role,
    dispatch,
    parallelizable: dispatch === "supporting",
    prompt,
    sharedContext,
    requiredContext: uniqueStrings([...sharedContext, ...prompt.contextIncludes]),
    rules: route.rules,
    requestedRuntimeSkills: uniqueStrings([
      ...route.skills,
      ...prompt.skills.map((skill) => skill.path),
    ]),
    nextStep: route.nextStep,
  };
}

function buildSpecialistDispatchTask(
  task: AgentExecutionTask,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
  priority: number,
  ordinal: number,
): SpecialistDispatchTask {
  const dispatchTask: SpecialistDispatchTask = {
    id: `dispatch-${ordinal}-${task.role}`,
    role: task.role,
    priority,
    parallelizable: true,
    reason: specialistDispatchReason(task.role, executionPlan),
    sourceContext: task.sharedContext,
    inspectableSurfaces: uniqueStrings([
      ...task.prompt.contextIncludes,
      ...task.prompt.owns,
      ...executionPlan.route.rules,
    ]).slice(0, 8),
    exactQuestion: specialistDispatchQuestion(task.role, executionPlan),
    expectedOutput: task.prompt.outputs.length > 0
      ? task.prompt.outputs.slice(0, 3)
      : ["concise findings", "preconditions", "recommended action"],
    nonGoals: specialistDispatchNonGoals(task.role),
    requestedRuntimeSkills: task.requestedRuntimeSkills,
    dispatchPromptEnvelope: {
      role: task.role,
      sharedPromptStack: [],
      rolePromptStack: [],
      contextPaths: [],
      requestedRuntimeSkills: task.requestedRuntimeSkills,
      taskBrief: {
        reason: "",
        exactQuestion: "",
        inspectableSurfaces: [],
        expectedOutput: [],
        nonGoals: [],
      },
      message: "",
    },
  };

  dispatchTask.dispatchPromptEnvelope = buildSpecialistDispatchPromptEnvelope(dispatchTask, executionPlan);
  return dispatchTask;
}

function specialistTaskScore(
  task: AgentExecutionTask,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
): number {
  const request = executionPlan.request.toLowerCase();
  const role = task.role;
  const primaryRole = executionPlan.primaryTask.role;
  let score = 0;

  const priorityOrder = primaryRoleDispatchPriority[primaryRole] ?? allRouteAgentRoles;
  const priorityIndex = priorityOrder.indexOf(role);
  score += priorityIndex === -1 ? 0 : Math.max(0, 80 - priorityIndex * 4);

  for (const workType of executionPlan.route.workTypes) {
    score += roleWorkTypeWeight(role, workType);
  }

  for (const keyword of specialistRoleKeywords[role] ?? []) {
    if (request.includes(keyword)) {
      score += 25;
    }
  }

  if (executionPlan.route.requestKind === "acceptance" && (role === "qa-agent" || role === "reviewer")) {
    score += 30;
  }
  if (executionPlan.route.requestKind === "review" && role === "reviewer") {
    score += 30;
  }
  if (executionPlan.route.requestKind === "raw-requirement" && role === "spec-editor") {
    score += 20;
  }

  return score;
}

function roleWorkTypeWeight(role: RequestRouteAgentRole, workType: RequestWorkType): number {
  const roleWeights: Partial<Record<RequestRouteAgentRole, Partial<Record<RequestWorkType, number>>>> = {
    "ddd-domain-agent": { architecture: 24, spec: 18, backend: 10 },
    "openapi-agent": { backend: 26, architecture: 16, tests: 8 },
    "db-migration-agent": { backend: 26, architecture: 16, tests: 8 },
    "ui-design-agent": { frontend: 28, ui_prototype: 22, architecture: 8 },
    "test-editor": { tests: 22, spec: 16, architecture: 10, ci: 8 },
    "performance-test-agent": { tests: 24, backend: 14, ci: 10 },
    "concurrency-test-agent": { tests: 24, backend: 14, ci: 10 },
    "ci-editor": { ci: 26, orchestration: 18, tests: 10 },
    "execution-editor": { orchestration: 26, ci: 14 },
    "qa-agent": { tests: 20, ci: 18, orchestration: 10 },
    "reviewer": { architecture: 16, tests: 14, ci: 14, orchestration: 12, spec: 10 },
    "unit-test-agent": { backend: 18, tests: 18 },
    "playwright-test-agent": { frontend: 18, tests: 20, ui_prototype: 8 },
    "e2e-test-agent": { tests: 18, frontend: 8, backend: 8 },
    "spec-editor": { spec: 24, architecture: 14 },
  };

  return roleWeights[role]?.[workType] ?? 0;
}

function specialistDispatchReason(
  role: RequestRouteAgentRole,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
): string {
  const reasons: Partial<Record<RequestRouteAgentRole, string>> = {
    "ddd-domain-agent": "Clarify domain boundaries, invariants, and model-level risk before broader implementation or testing decisions.",
    "openapi-agent": "Narrow contract and error-semantics changes early so downstream implementation and tests stay aligned.",
    "db-migration-agent": "Surface schema, rollout, rollback, and compatibility risks before code and release work diverge.",
    "ui-design-agent": "Lock user-facing states, workflow boundaries, and interaction assumptions before implementation fans out.",
    "test-editor": "Define independent verification scope and evidence gaps before execution-specific tests are dispatched.",
    "performance-test-agent": "Identify latency and throughput risk where feature behavior may pass functionally but still fail under load.",
    "concurrency-test-agent": "Identify race, retry, idempotency, and final-state invariant risk that ordinary tests can miss.",
    "ci-editor": "Keep release gates and validation commands aligned with the current change and evidence model.",
    "execution-editor": "Keep workflow wiring and local automation aligned with the selected delivery path.",
    "qa-agent": "Provide final acceptance framing once verification evidence exists.",
    "reviewer": "Provide cross-rule risk review and reject local false positives before merge or release claims.",
  };

  return reasons[role] ?? `Provide bounded specialist input for ${executionPlan.primaryTask.role}.`;
}

function specialistDispatchQuestion(
  role: RequestRouteAgentRole,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
): string {
  const request = executionPlan.request.trim();
  const questions: Partial<Record<RequestRouteAgentRole, string>> = {
    "ddd-domain-agent": `For "${request}", what domain boundaries, invariants, and entity/value-object responsibilities are most likely to cause design drift?`,
    "openapi-agent": `For "${request}", what request/response contract, error semantics, and compatibility constraints must be locked before implementation proceeds?`,
    "db-migration-agent": `For "${request}", what schema changes, migration order, backfill concerns, and rollback constraints must be handled explicitly?`,
    "ui-design-agent": `For "${request}", what screen states, operator workflows, and responsive behaviors must be specified to avoid UI ambiguity?`,
    "test-editor": `For "${request}", what independent verification matrix, scenario split, and evidence gaps should be defined first?`,
    "performance-test-agent": `For "${request}", what SLO-sensitive paths, baseline assumptions, and minimal load scenarios should be tested first?`,
    "concurrency-test-agent": `For "${request}", what concurrent actors, idempotency constraints, and final-state invariants should be tested first?`,
    "ci-editor": `For "${request}", what gate checks, command sequence, and release evidence requirements must be updated?`,
    "execution-editor": `For "${request}", what workflow or script wiring must change so the delivery path stays reproducible?`,
    "qa-agent": `For "${request}", what acceptance blockers, missing evidence, and waiver decisions remain before promotion?`,
    "reviewer": `For "${request}", what cross-rule risks, regressions, or missing neighboring updates remain after local implementation decisions?`,
    "unit-test-agent": `For "${request}", what implementation-coupled unit coverage should be added to protect local behavior changes?`,
    "playwright-test-agent": `For "${request}", what browser-visible flows and UI state transitions need deterministic verification?`,
    "e2e-test-agent": `For "${request}", what user or operator journeys need end-to-end coverage across system boundaries?`,
    "spec-editor": `For "${request}", what design, roadmap, or feature-spec wording still needs refinement before downstream work is safe?`,
  };

  return questions[role] ?? `For "${request}", what bounded specialist findings should ${role} return to support ${executionPlan.primaryTask.role}?`;
}

function specialistDispatchNonGoals(role: RequestRouteAgentRole): string[] {
  const defaults: Partial<Record<RequestRouteAgentRole, string[]>> = {
    "ddd-domain-agent": ["Do not redesign unrelated bounded contexts.", "Do not rewrite API or migration details unless domain changes require it."],
    "openapi-agent": ["Do not invent fields not justified by the spec or request.", "Do not drift into full backend implementation."],
    "db-migration-agent": ["Do not assume destructive schema changes are safe.", "Do not redesign unrelated storage surfaces."],
    "ui-design-agent": ["Do not broaden into a full product redesign.", "Do not rewrite backend semantics."],
    "test-editor": ["Do not replace implementation-coupled unit coverage ownership.", "Do not treat missing evidence as a code fix plan."],
    "performance-test-agent": ["Do not claim production capacity from ad hoc local runs.", "Do not substitute raw load-tool output for normalized findings."],
    "concurrency-test-agent": ["Do not stop at response-code counts without final-state checks.", "Do not treat flaky concurrent behavior as acceptable by default."],
    "ci-editor": ["Do not redesign the full CI surface.", "Do not add unrelated release ceremony."],
    "execution-editor": ["Do not rewrite unrelated workflows.", "Do not broaden into role or spec redesign."],
    "qa-agent": ["Do not own implementation decisions.", "Do not waive missing evidence without stating the blocker."],
    "reviewer": ["Do not duplicate every local finding from other specialists.", "Do not expand beyond rule and evidence impact."],
  };

  return defaults[role] ?? ["Do not broaden beyond the assigned bounded surface."];
}

function primaryDispatchReason(
  role: RequestRouteAgentRole,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan" | "primaryDispatchPromptEnvelope">,
): string {
  const reasons: Partial<Record<RequestRouteAgentRole, string>> = {
    "architecture-agent": "Own the cross-surface design judgment and decide which bounded specialist findings materially affect the system plan.",
    "implementation-agent": "Own the concrete implementation path and keep code changes aligned with accepted spec and design boundaries.",
    "deployment-agent": "Own release readiness, validation order, and delivery evidence sequencing.",
    "testing-agent": "Own independent verification strategy and decide where specialist evidence is required before acceptance.",
  };

  return reasons[role] ?? `Own the main delivery track for "${executionPlan.request}".`;
}

function primaryDispatchQuestion(
  role: RequestRouteAgentRole,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan" | "primaryDispatchPromptEnvelope">,
): string {
  const request = executionPlan.request.trim();
  const questions: Partial<Record<RequestRouteAgentRole, string>> = {
    "architecture-agent": `For "${request}", what is the smallest correct cross-surface plan, and which specialist findings actually change the architecture decision?`,
    "implementation-agent": `For "${request}", what is the narrowest implementation plan that can be executed safely end to end?`,
    "deployment-agent": `For "${request}", what validation and release sequence is required before claiming deployment readiness?`,
    "testing-agent": `For "${request}", what independent verification plan is required, and which specialist test tracks must run first?`,
  };

  return questions[role] ?? `For "${request}", what primary-agent execution plan should ${role} lead?`;
}

function primaryDispatchNonGoals(
  role: RequestRouteAgentRole,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan" | "primaryDispatchPromptEnvelope">,
): string[] {
  const defaults: Partial<Record<RequestRouteAgentRole, string[]>> = {
    "architecture-agent": [
      "Do not expand into full implementation details before the cross-surface plan is stable.",
      "Do not forward every specialist concern without filtering false positives and duplicates.",
    ],
    "implementation-agent": [
      "Do not redesign unrelated architecture or product scope.",
      "Do not absorb independent verification ownership that belongs to testing specialists.",
    ],
    "deployment-agent": [
      "Do not broaden into unrelated feature implementation.",
      "Do not claim release readiness without explicit gate evidence.",
    ],
    "testing-agent": [
      "Do not rewrite implementation details unless they directly block independent verification.",
      "Do not accept missing P0/P1 evidence as complete by default.",
    ],
  };

  return defaults[role] ?? [
    `Do not broaden beyond the primary responsibility of ${role}.`,
    `Do not ignore bounded specialist input when it materially changes "${executionPlan.request}".`,
  ];
}

function buildSpecialistDispatchMessage(
  task: SpecialistDispatchTask,
  executionPlan: Omit<AgentExecutionPlan, "specialistDispatchPlan">,
  rolePromptStack: string[],
  contextPaths: string[],
): string {
  return [
    `Role: ${task.role}`,
    `Primary Role: ${executionPlan.primaryTask.role}`,
    `Request: ${executionPlan.request}`,
    "",
    "Reason",
    task.reason,
    "",
    "Exact Question",
    task.exactQuestion,
    "",
    "Inspectable Surfaces",
    ...task.inspectableSurfaces.map((surface) => `- ${surface}`),
    "",
    "Expected Output",
    ...task.expectedOutput.map((item) => `- ${item}`),
    "",
    "Non-Goals",
    ...task.nonGoals.map((item) => `- ${item}`),
    "",
    "Prompt Stack",
    ...rolePromptStack.map((item) => `- ${item}`),
    "",
    "Context Paths",
    ...contextPaths.map((item) => `- ${item}`),
    "",
    "Requested Runtime Skills",
    ...(task.requestedRuntimeSkills.length > 0 ? task.requestedRuntimeSkills.map((item) => `- ${item}`) : ["- none"]),
  ].join("\n");
}

function requirePromptEnvelopeShape(state: MutableValidation, value: unknown, path: string): void {
  const envelope = asRecord(value);
  if (!envelope) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", path));
    return;
  }

  requireAgentRole(state, envelope.role, `${path}.role`);
  requireStringArray(state, envelope.sharedPromptStack, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.sharedPromptStack`);
  requireStringArray(state, envelope.rolePromptStack, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.rolePromptStack`);
  requireStringArray(state, envelope.contextPaths, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.contextPaths`);
  requireStringArrayAllowEmpty(state, envelope.requestedRuntimeSkills, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.requestedRuntimeSkills`);
  requireString(state, envelope, "message", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.message`);

  const taskBrief = asRecord(envelope.taskBrief);
  if (!taskBrief) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief`));
    return;
  }
  requireString(state, taskBrief, "reason", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief.reason`);
  requireString(state, taskBrief, "exactQuestion", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief.exactQuestion`);
  requireStringArray(state, taskBrief.inspectableSurfaces, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief.inspectableSurfaces`);
  requireStringArray(state, taskBrief.expectedOutput, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief.expectedOutput`);
  requireStringArray(state, taskBrief.nonGoals, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.taskBrief.nonGoals`);
}

function requirePromptAssemblyShape(state: MutableValidation, value: unknown, path: string): void {
  const assembly = asRecord(value);
  if (!assembly) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", path));
    return;
  }

  requireOneOf(state, assembly.projectMode, ["litespec", "goalspec", "enterprisespec"], "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.projectMode`);
  requireString(state, assembly, "manifestPath", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.manifestPath`);
  requireString(state, assembly, "overlayManifest", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.overlayManifest`);
  requireStringArray(state, assembly.sharedContext, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.sharedContext`);
  requireStringArray(state, assembly.loadOrder, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.loadOrder`);
  if (!Array.isArray(assembly.roles) || assembly.roles.length === 0) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.roles`));
    return;
  }

  assembly.roles.forEach((role, index) => {
    const rolePath = `${path}.roles[${index}]`;
    const roleRecord = asRecord(role);
    if (!roleRecord) {
      state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", rolePath));
      return;
    }
    requireAgentRole(state, roleRecord.role, `${rolePath}.role`);
    requireString(state, roleRecord, "sharedRolePrompt", "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.sharedRolePrompt`);
    requireString(state, roleRecord, "sharedCanonicalPrompt", "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.sharedCanonicalPrompt`);
    requireBoolean(state, roleRecord, "overlayApplied", "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.overlayApplied`);
    requireStringArrayAllowEmpty(state, roleRecord.contextIncludes, "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.contextIncludes`);
    requireStringArrayAllowEmpty(state, roleRecord.owns, "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.owns`);
    requireStringArrayAllowEmpty(state, roleRecord.outputs, "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.outputs`);
    requireStringArray(state, roleRecord.loadOrder, "SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.loadOrder`);
    if (roleRecord.delegatesTo !== undefined) {
      requireAgentRoleArray(state, roleRecord.delegatesTo, `${rolePath}.delegatesTo`);
    }
    if (roleRecord.skills !== undefined && !Array.isArray(roleRecord.skills)) {
      state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${rolePath}.skills`));
    }
  });
}

function requireExecutionPlanShape(state: MutableValidation, value: unknown, path: string): void {
  const plan = asRecord(value);
  if (!plan) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", path));
    return;
  }

  requireString(state, plan, "request", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.request`);
  requireOneOf(state, plan.projectMode, ["litespec", "goalspec", "enterprisespec"], "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.projectMode`);
  requireStringArray(state, plan.sharedContext, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.sharedContext`);
  requireOneOf(state, plan.specialistDispatch, ["primary-only", "bounded-parallel"], "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.specialistDispatch`);
  requirePromptEnvelopeShape(state, plan.primaryDispatchPromptEnvelope, `${path}.primaryDispatchPromptEnvelope`);

  const primaryTask = asRecord(plan.primaryTask);
  if (!primaryTask) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.primaryTask`));
  } else {
    requireAgentRole(state, primaryTask.role, `${path}.primaryTask.role`);
    requireOneOf(state, primaryTask.dispatch, ["primary", "supporting"], "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.primaryTask.dispatch`);
    requireBoolean(state, primaryTask, "parallelizable", "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.primaryTask.parallelizable`);
    requireStringArray(state, primaryTask.requiredContext, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.primaryTask.requiredContext`);
    requireStringArrayAllowEmpty(state, primaryTask.requestedRuntimeSkills, "SPECOS_ROUTE_OUTPUT_INVALID", `${path}.primaryTask.requestedRuntimeSkills`);
  }

  if (!Array.isArray(plan.supportingTasks)) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.supportingTasks`));
  }

  const dispatchPlan = asRecord(plan.specialistDispatchPlan);
  if (!dispatchPlan) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.specialistDispatchPlan`));
    return;
  }
  requireAgentRole(state, dispatchPlan.primaryRole, `${path}.specialistDispatchPlan.primaryRole`);
  if (typeof dispatchPlan.maxTasks !== "number") {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.specialistDispatchPlan.maxTasks`));
  }
  if (typeof dispatchPlan.minTasks !== "number") {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.specialistDispatchPlan.minTasks`));
  }
  if (!Array.isArray(dispatchPlan.tasks)) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", `${path}.specialistDispatchPlan.tasks`));
  } else {
    dispatchPlan.tasks.forEach((task, index) => {
      const taskPath = `${path}.specialistDispatchPlan.tasks[${index}]`;
      const taskRecord = asRecord(task);
      if (!taskRecord) {
        state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", taskPath));
        return;
      }
      requireAgentRole(state, taskRecord.role, `${taskPath}.role`);
      requireString(state, taskRecord, "id", "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.id`);
      requireString(state, taskRecord, "reason", "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.reason`);
      requireString(state, taskRecord, "exactQuestion", "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.exactQuestion`);
      requireStringArray(state, taskRecord.inspectableSurfaces, "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.inspectableSurfaces`);
      requireStringArray(state, taskRecord.expectedOutput, "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.expectedOutput`);
      requireStringArray(state, taskRecord.nonGoals, "SPECOS_ROUTE_OUTPUT_INVALID", `${taskPath}.nonGoals`);
      requirePromptEnvelopeShape(state, taskRecord.dispatchPromptEnvelope, `${taskPath}.dispatchPromptEnvelope`);
    });
  }
  requireAgentRoleArray(state, dispatchPlan.deferredRoles ?? [], `${path}.specialistDispatchPlan.deferredRoles`);
}

function requireAgentRole(state: MutableValidation, value: unknown, path: string): void {
  requireOneOf(
    state,
    value,
    [
      "architecture-agent",
      "implementation-agent",
      "deployment-agent",
      "testing-agent",
      "spec-editor",
      "ui-design-agent",
      "ddd-domain-agent",
      "openapi-agent",
      "db-migration-agent",
      "e2e-test-agent",
      "playwright-test-agent",
      "unit-test-agent",
      "specialized-check-agent",
      "performance-test-agent",
      "concurrency-test-agent",
      "ci-editor",
      "execution-editor",
      "implementation-editor",
      "test-editor",
      "qa-agent",
      "reviewer",
    ],
    "SPECOS_ROUTE_OUTPUT_INVALID",
    path,
  );
}

function requireAgentRoleArray(state: MutableValidation, value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_ROUTE_OUTPUT_INVALID", path));
    return;
  }

  value.forEach((item, index) => requireAgentRole(state, item, `${path}[${index}]`));
}

function uniqueAgentRoles(roles: RequestRouteAgentRole[]): RequestRouteAgentRole[] {
  return [...new Set(roles)];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function clampTaskCount(value: number): number {
  return Math.max(1, Math.min(4, value));
}

function trimPathSeparators(path: string): string {
  return path.replace(/\/+$/g, "");
}

function joinPosixPath(...segments: string[]): string {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment, index) => index === 0 ? segment.replace(/\/+$/g, "") : segment.replace(/^\/+|\/+$/g, ""))
    .join("/");
}

function primaryAgentForRequest(kind: RequestKind, workTypes: Set<RequestWorkType>): RequestRouteAgentRole {
  if (workTypes.has("architecture")) return "architecture-agent";
  if (kind === "test") return "testing-agent";
  if (kind === "acceptance") return "testing-agent";
  if (kind === "implementation") return "implementation-agent";
  if (kind === "tooling-configuration") return workTypes.has("ci") ? "deployment-agent" : "architecture-agent";
  if (workTypes.has("ci")) return "deployment-agent";
  if (kind === "review") return "architecture-agent";
  if (workTypes.has("frontend") || workTypes.has("backend")) return "implementation-agent";
  if (kind === "raw-requirement" || kind === "draft-only" || kind === "active-change") return "architecture-agent";
  return "architecture-agent";
}

function nextStepForRequest(kind: RequestKind, needsDraft: boolean, needsChangePackage: boolean): string {
  if (needsDraft) {
    return "Create or update spec-draft/<stable-id>.md with raw request, assumptions, and open questions.";
  }
  if (needsChangePackage) {
    return "Attach the request to design/, specs/roadmap.md, and specs/<SPEC-ID>-<slug>/spec.md before implementation, testing, or release gates.";
  }
  if (kind === "review") {
    return "Run the reviewer role against the active change, rules, tests, and validation evidence.";
  }
  return "Load the primary agent context from .agents/manifest.yaml and execute the bounded task.";
}

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
  if (manifest?.projectMode !== undefined) {
    requireOneOf(
      state,
      manifest.projectMode,
      ["litespec", "goalspec", "enterprisespec"],
      "SPECOS_MANIFEST_INVALID",
      "projectMode",
    );
  }
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
  const endpointTargets = api.map((contract) => `${contract.method.toUpperCase()} ${contract.path}`);
  const scenarioTargets = branches.map((branch) => `${spec.title} ${branch} scenario`);

  return {
    standardVersion: productionTestStandardVersion,
    qualityProfile: api.length > 0 && (spec.ui?.length ?? 0) > 0 ? "fullstack-flow" : api.length > 0 ? "backend-api" : "frontend-ui",
    riskTier: "P0",
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
    standardRequirements: buildDefaultStandardRequirements(endpointTargets, scenarioTargets),
    flakePolicy: {
      allowedRetries: 1,
      quarantineAllowed: false,
      classificationRequired: true,
    },
    dataPolicy: {
      externalDependencyMode: "stubbed",
      piiAllowed: false,
      secretsAllowed: false,
    },
    securityPolicy: {
      baseline: "owasp-api-top-10-2023",
      requiredChecks: [
        "broken-object-level-authorization",
        "broken-authentication",
        "broken-object-property-level-authorization",
        "unrestricted-resource-consumption",
      ],
    },
  };
}

function buildDefaultStandardRequirements(
  endpointTargets: string[],
  scenarioTargets: string[],
): TestPlanStandardRequirement[] {
  return [
    {
      id: "std.p0.api.contract",
      layer: "api",
      appliesTo: endpointTargets,
      requiredFor: ["P0", "P1"],
      ownerAgent: "test-editor",
      requiredEvidence: ["trace"],
      gateImpact: "blocking",
    },
    {
      id: "std.p0.scenario.e2e",
      layer: "scenario",
      appliesTo: scenarioTargets,
      requiredFor: ["P0", "P1"],
      ownerAgent: "playwright-test-agent",
      requiredEvidence: ["trace", "screenshot"],
      gateImpact: "blocking",
    },
    {
      id: "std.p1.observability",
      layer: "observability",
      appliesTo: [...endpointTargets, ...scenarioTargets],
      requiredFor: ["P0", "P1"],
      ownerAgent: "test-editor",
      requiredEvidence: ["trace", "log"],
      gateImpact: "blocking",
    },
  ];
}

function inferFeatureSpecDirectory(specPath: string | undefined): string | undefined {
  if (!specPath) {
    return undefined;
  }

  const normalized = specPath.replace(/\\/g, "/");
  const match = normalized.match(/(?:^|\/)specs\/([^/]+)\/spec\.md$/);
  return match?.[1];
}

function buildFallbackFeatureSpecDirectory(specId: string, changeId: string): string {
  if (/^[A-Z]+-\d{3}$/u.test(changeId)) {
    return `${changeId}-${specId}`;
  }
  return changeId;
}

export function buildSpecChangeTestSchedule(
  plan: SpecosTestPlan,
  options: { changeId: string; executionMode?: TestScheduleExecutionMode; specPath?: string },
): SpecosTestSchedule {
  const endpointTargets = plan.endpoints.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`);
  const scenarioNames = plan.scenarios.map((scenario) => scenario.name);
  const executionMode = options.executionMode ?? "parallel";
  const specDirectory = inferFeatureSpecDirectory(options.specPath) ?? buildFallbackFeatureSpecDirectory(plan.specId, options.changeId);
  const specFile = `specs/${specDirectory}/spec.md`;
  const implementationDir = `implementation/${specDirectory}`;
  const reviewDir = `reviews/${specDirectory}`;

  return {
    specId: plan.specId,
    specVersion: plan.specVersion,
    featureName: plan.featureName,
    changeId: options.changeId,
    executionMode,
    tracks: [
      {
        id: "execution",
        agentRole: "execution-editor",
        isolation: "implementation-only",
        allowedInputs: [
          specFile,
          `${reviewDir}/architecture-review.md`,
          `${reviewDir}/design-review.md`,
          "design/",
          "specs/roadmap.md",
        ],
        forbiddenInputs: ["tests/results/", "tests/bruno/", "tests/scenarios/", "tests/e2e/", "tests/playwright/"],
      },
      {
        id: "testing",
        agentRole: "test-editor",
        isolation: "spec-and-contract-only",
        allowedInputs: [
          specFile,
          `${implementationDir}/openapi.yaml`,
          `tests/plans/${plan.specId}.test-plan.json`,
          "design/",
          "specs/roadmap.md",
        ],
        forbiddenInputs: ["implementation report", "source implementation notes"],
      },
    ],
    tasks: [
      {
        id: `implement-${plan.specId}`,
        trackId: "execution",
        agentRole: "execution-editor",
        type: "implementation",
        status: "ready",
        inputs: [specFile, "design/", "specs/roadmap.md"],
        outputs: [`${implementationDir}/implementation-report.md`, `tests/unit/${plan.specId}/`],
        dependsOn: ["architecture_reviewed", "design_reviewed"],
        traceability: { scenarios: scenarioNames, endpoints: endpointTargets },
      },
      {
        id: `api-tests-${plan.specId}`,
        trackId: "testing",
        agentRole: "test-editor",
        type: "api-test",
        status: "ready",
        inputs: [
          `tests/plans/${plan.specId}.test-plan.json`,
          `${implementationDir}/openapi.yaml`,
        ],
        outputs: [`tests/bruno/${plan.specId}/`, `tests/results/${plan.specId}.*.json`],
        dependsOn: executionMode === "parallel" ? ["test_plan_ready"] : [`implement-${plan.specId}`],
        traceability: { scenarios: scenarioNames, endpoints: endpointTargets },
      },
      ...plan.scenarios.map((scenario) => ({
        id: `ui-gap-${scenario.name}`,
        trackId: "testing" as const,
        agentRole: "playwright-test-agent" as const,
        type: "ui-test-gap" as const,
        status: "blocked" as const,
        reason: "UI execution is scheduled as a gap until Playwright assets and selectors are available.",
        inputs: [`tests/plans/${plan.specId}.test-plan.json`],
        outputs: [`tests/scenarios/${plan.specId}/ui-gaps.md`],
        dependsOn: ["test_plan_ready"],
        traceability: { scenarios: [scenario.name], endpoints: endpointTargets },
      })),
    ],
    gates: [
      "architecture_reviewed",
      "design_reviewed",
      "implementation_done",
      "api_tests_passed",
      "test_gaps_recorded",
      "reviewed",
      "promoted",
      "archived",
    ],
  };
}

export function buildBlockedApiScenarioResult(
  plan: SpecosTestPlan,
  schedule: SpecosTestSchedule,
  options: { reason: string; runId?: string; timestamp?: string },
): ScenarioResult {
  const runId = options.runId ?? `run-api-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const timestamp = options.timestamp ?? new Date().toISOString();
  const items = plan.endpoints.map((endpoint) => ({
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    testType: "api" as const,
    target: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
    flowName: plan.flows[0]?.name,
    status: "warning" as const,
    durationMs: 0,
    summary: options.reason,
    requirementId: "std.p0.api.contract",
    ownerAgent: "test-editor" as const,
    evidenceQuality: "partial" as const,
    attempts: 1,
    flakeClassification: "not-flaky" as const,
    gateImpact: endpoint.priority === "P2" ? "warning" as const : "blocking" as const,
    artifactRefs: [{ type: "trace" as const, path: runId }],
    endpoint: {
      name: endpoint.name,
      method: endpoint.method.toUpperCase(),
      path: endpoint.path,
      coverage: endpoint.branches,
      relatedRule: endpoint.relatedRule,
      failureReason: options.reason,
    },
    evidence: {
      traceId: runId,
      note: `API execution blocked for change ${schedule.changeId}`,
    },
  }));

  return {
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    standardVersion: plan.standardVersion,
    qualityProfile: plan.qualityProfile,
    featureName: plan.featureName,
    workflowId: schedule.changeId,
    status: "warning",
    releaseDecision: "blocked",
    startedAt: timestamp,
    endedAt: timestamp,
    blockers: [options.reason],
    highRiskScenarios: plan.scenarios.map((scenario) => scenario.name),
    coverageGaps: plan.endpoints.map((endpoint) => `${endpoint.name} API execution blocked`),
    summary: {
      apiPassRate: 0,
      scenarioPassRate: 0,
      totalEndpoints: plan.endpoints.length,
      totalScenarios: plan.scenarios.length,
    },
    flowResults: buildBlockedApiFlowResults(plan, options.reason),
    items,
  };
}

export function buildExecutedApiScenarioResult(
  plan: SpecosTestPlan,
  schedule: SpecosTestSchedule,
  execution: {
    exitCode: number;
    stdout: string;
    stderr: string;
    command: string;
    runId?: string;
    timestamp?: string;
    durationMs?: number;
  },
): ScenarioResult {
  const runId = execution.runId ?? `run-api-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const timestamp = execution.timestamp ?? new Date().toISOString();
  const passed = execution.exitCode === 0;
  const summary = passed ? "API command completed successfully" : `API command failed with exit code ${execution.exitCode}`;
  const itemStatus: "pass" | "warning" = passed ? "pass" : "warning";
  const items = plan.endpoints.map((endpoint) => ({
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    testType: "api" as const,
    target: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
    flowName: plan.flows[0]?.name,
    status: itemStatus,
    durationMs: execution.durationMs ?? 0,
    summary,
    requirementId: "std.p0.api.contract",
    ownerAgent: "test-editor" as const,
    evidenceQuality: passed ? "complete" as const : "partial" as const,
    attempts: 1,
    flakeClassification: "not-flaky" as const,
    gateImpact: endpoint.priority === "P2" ? "warning" as const : "blocking" as const,
    artifactRefs: [{ type: "trace" as const, path: runId }],
    endpoint: {
      name: endpoint.name,
      method: endpoint.method.toUpperCase(),
      path: endpoint.path,
      coverage: endpoint.branches,
      relatedRule: endpoint.relatedRule,
      failureReason: passed ? undefined : execution.stderr || execution.stdout || summary,
    },
    evidence: {
      traceId: runId,
      command: execution.command,
      stdout: execution.stdout,
      stderr: execution.stderr,
      note: `API command executed for change ${schedule.changeId}`,
    },
  }));

  return {
    runId,
    specId: plan.specId,
    specVersion: plan.specVersion,
    standardVersion: plan.standardVersion,
    qualityProfile: plan.qualityProfile,
    featureName: plan.featureName,
    workflowId: schedule.changeId,
    status: passed ? "pass" : "warning",
    releaseDecision: passed ? "ready" : "blocked",
    startedAt: timestamp,
    endedAt: timestamp,
    blockers: passed ? [] : [summary],
    highRiskScenarios: passed ? [] : plan.scenarios.map((scenario) => scenario.name),
    coverageGaps: passed ? [] : plan.endpoints.map((endpoint) => `${endpoint.name} API command failed`),
    summary: {
      apiPassRate: passed ? 1 : 0,
      scenarioPassRate: 0,
      totalEndpoints: plan.endpoints.length,
      totalScenarios: plan.scenarios.length,
    },
    flowResults: buildExecutedApiFlowResults(plan, passed, summary),
    items,
  };
}

export function buildBrunoCollectionAssets(plan: SpecosTestPlan): GeneratedTextAsset[] {
  const collection = {
    version: "1",
    name: plan.specId,
    type: "collection",
    ignore: ["node_modules", ".git"],
  };
  const readme = [
    `# ${plan.featureName} Bruno API Tests`,
    "",
    `Spec id: \`${plan.specId}\``,
    `Spec version: \`${plan.specVersion}\``,
    "",
    "Generated from `tests/plans/` for the `test-editor` API track.",
    "",
    "## Endpoints",
    "",
    ...plan.endpoints.map((endpoint) => `- ${endpoint.method.toUpperCase()} ${endpoint.path} - ${endpoint.name}`),
    "",
  ].join("\n");

  const requestAssets = plan.endpoints.map((endpoint, index) => ({
    path: `${slugifyFileName(endpoint.name)}.bru`,
    content: buildBrunoRequest(endpoint, index + 1),
  }));

  return [
    { path: "bruno.json", content: `${JSON.stringify(collection, null, 2)}\n` },
    { path: "README.md", content: readme },
    ...requestAssets,
  ];
}

export function buildTestGateReport(
  plan: SpecosTestPlan,
  results: ScenarioResult[],
  options: { changeId?: string } = {},
): TestGateReport {
  const gates = plan.releaseGates?.length
    ? plan.releaseGates
    : [
        {
          id: "default-p0-verification",
          type: "change-verification" as const,
          requiredTestTypes: ["api", "scenario"] as TestType[],
          blocking: true,
          evidenceRequired: ["trace"] as ArtifactRef["type"][],
        },
      ];
  const scopedResults = results.filter((result) => {
    const changeId = options.changeId ?? plan.changeId;
    if (result.specId !== plan.specId || result.specVersion !== plan.specVersion) return false;
    if (!changeId) return true;
    return result.changeId === changeId || result.workflowId === changeId || result.items.some((item) => item.changeId === changeId);
  });
  const items = scopedResults.flatMap((result) => result.items);
  const passedGates: string[] = [];
  const failedGates: string[] = [];
  const missingEvidence: string[] = [];
  const blockers: string[] = [];
  const standardCompliance: TestGateStandardCompliance[] = [];

  for (const requirement of plan.standardRequirements ?? []) {
    const matchingItems = items.filter((item) => {
      const scenarioName = (item as ResultItem & { scenarioName?: string }).scenarioName;
      return (
        requirementMatchesTestType(requirement.layer, item.testType) &&
        item.requirementId === requirement.id ||
        (requirementMatchesTestType(requirement.layer, item.testType) &&
          (requirement.appliesTo.includes(item.target) ||
            (scenarioName ? requirement.appliesTo.includes(scenarioName) : false)))
      );
    });

    if (matchingItems.length === 0) {
      missingEvidence.push(`${requirement.id} missing normalized evidence`);
      standardCompliance.push({
        requirementId: requirement.id,
        status: "missing",
        riskTier: requirement.requiredFor[0] ?? plan.riskTier ?? "P2",
        ownerAgent: requirement.ownerAgent,
        gateImpact: requirement.gateImpact,
        evidence: [],
        summary: `${requirement.id} missing normalized evidence`,
      });
      continue;
    }

    for (const item of matchingItems) {
      const evidence = item.artifactRefs?.map((ref) => ref.type) ?? [];
      const hasRequiredEvidence = requirement.requiredEvidence.every((type) => evidence.includes(type));
      const failed = item.status !== "pass";
      if (failed) {
        blockers.push(`${requirement.id} failed: ${item.summary}`);
      } else if (!hasRequiredEvidence) {
        missingEvidence.push(`${requirement.id} missing ${requirement.requiredEvidence.join(", ")} evidence`);
      }
      standardCompliance.push({
        requirementId: requirement.id,
        status: failed ? "failed" : hasRequiredEvidence ? "passed" : "missing",
        riskTier: requirement.requiredFor[0] ?? plan.riskTier ?? "P2",
        ownerAgent: item.ownerAgent ?? requirement.ownerAgent,
        gateImpact: item.gateImpact ?? requirement.gateImpact,
        evidence,
        summary: hasRequiredEvidence ? item.summary : `${item.summary}; missing required standard evidence`,
      });
    }
  }

  for (const gate of gates) {
    let gateFailed = false;
    const riskTier = gate.blocking ? "P0" : "P2";

    for (const testType of gate.requiredTestTypes) {
      const matchingItems = items.filter((item) => item.testType === testType);
      if (matchingItems.length === 0) {
        missingEvidence.push(`${gate.id} missing ${testType} result`);
        standardCompliance.push({
          requirementId: `gate.${gate.id}.${testType}`,
          status: "missing",
          riskTier,
          ownerAgent: ownerAgentForTestType(testType),
          gateImpact: gate.blocking ? "blocking" : "warning",
          evidence: [],
          summary: `${gate.id} missing ${testType} result`,
        });
        gateFailed = gate.blocking || gateFailed;
        continue;
      }

      for (const item of matchingItems) {
        if (item.status !== "pass" && (gate.blocking || item.gateImpact === "blocking")) {
          blockers.push(`${gate.id} ${testType} failed: ${item.summary}`);
          standardCompliance.push({
            requirementId: item.requirementId ?? `gate.${gate.id}.${testType}`,
            status: "failed",
            riskTier,
            ownerAgent: item.ownerAgent ?? ownerAgentForTestType(testType),
            gateImpact: item.gateImpact ?? (gate.blocking ? "blocking" : "warning"),
            evidence: item.artifactRefs?.map((ref) => ref.type) ?? [],
            summary: item.summary,
          });
          gateFailed = true;
        } else {
          standardCompliance.push({
            requirementId: item.requirementId ?? `gate.${gate.id}.${testType}`,
            status: "passed",
            riskTier,
            ownerAgent: item.ownerAgent ?? ownerAgentForTestType(testType),
            gateImpact: item.gateImpact ?? (gate.blocking ? "blocking" : "warning"),
            evidence: item.artifactRefs?.map((ref) => ref.type) ?? [],
            summary: item.summary,
          });
        }
      }
    }

    if (gate.evidenceRequired.length > 0) {
      for (const evidenceType of gate.evidenceRequired) {
        const hasEvidence = items.some((item) => item.artifactRefs?.some((ref) => ref.type === evidenceType));
        if (!hasEvidence) {
          missingEvidence.push(`${gate.id} missing ${evidenceType} evidence`);
          gateFailed = gate.blocking || gateFailed;
        }
      }
    }

    if (gateFailed) {
      failedGates.push(gate.id);
    } else {
      passedGates.push(gate.id);
    }
  }

  const sourceIsDraft = plan.source === "draft";
  const hasBlockingStandardGap = standardCompliance.some(
    (item) =>
      (item.riskTier === "P0" || item.riskTier === "P1") &&
      item.gateImpact === "blocking" &&
      (item.status === "failed" || item.status === "missing"),
  );
  if (hasBlockingStandardGap && !failedGates.includes("production-standard")) {
    failedGates.push("production-standard");
  }
  return {
    specId: plan.specId,
    specVersion: plan.specVersion,
    changeId: options.changeId ?? plan.changeId,
    decision: sourceIsDraft ? "draft-only" : failedGates.length > 0 || hasBlockingStandardGap ? "blocked" : "ready",
    requiredGates: gates.map((gate) => ({
      id: gate.id,
      type: gate.type,
      requiredTestTypes: [...gate.requiredTestTypes],
      blocking: gate.blocking,
    })),
    passedGates,
    failedGates,
    missingEvidence,
    blockers,
    runIds: [...new Set(scopedResults.map((result) => result.runId))],
    standardCompliance,
    riskSummary: buildRiskSummary(standardCompliance),
    agentEvidenceSummary: buildAgentEvidenceSummary(standardCompliance),
  };
}

function requirementMatchesTestType(layer: TestLayer, testType: TestType): boolean {
  if (layer === "e2e") return testType === "scenario";
  if (layer === "observability") return true;
  if (layer === "latency") return testType === "performance" || testType === "latency";
  if (layer === "security" || layer === "compatibility") return testType === "api" || testType === layer;
  return layer === testType;
}

function ownerAgentForTestType(testType: TestType): TestOwnerAgent {
  switch (testType) {
    case "api":
    case "security":
    case "compatibility":
      return "test-editor";
    case "scenario":
      return "playwright-test-agent";
    case "unit":
      return "unit-test-agent";
    case "performance":
    case "latency":
      return "performance-test-agent";
    case "concurrency":
      return "concurrency-test-agent";
    case "migration":
    case "specialized":
      return "specialized-check-agent";
  }
}

function buildRiskSummary(
  compliance: TestGateStandardCompliance[],
): Record<Priority, { passed: number; failed: number; missing: number; waived: number; blocked: number }> {
  const summary = {
    P0: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
    P1: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
    P2: { passed: 0, failed: 0, missing: 0, waived: 0, blocked: 0 },
  };

  for (const item of compliance) {
    summary[item.riskTier][item.status] += 1;
    if (item.gateImpact === "blocking" && (item.status === "failed" || item.status === "missing")) {
      summary[item.riskTier].blocked += 1;
    }
  }

  return summary;
}

function buildAgentEvidenceSummary(compliance: TestGateStandardCompliance[]): TestGateAgentEvidenceSummary[] {
  const byAgent = new Map<TestOwnerAgent, TestGateAgentEvidenceSummary>();

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

export function validateTestPlan(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const plan = asRecord(value);
  const hasProductionStandard = plan?.standardVersion === productionTestStandardVersion;

  if (plan?.standardVersion !== undefined) {
    requireOneOf(
      state,
      plan.standardVersion,
      [productionTestStandardVersion],
      "SPECOS_TEST_PLAN_INVALID",
      "standardVersion",
    );
  }
  if (plan?.qualityProfile !== undefined) {
    requireQualityProfile(state, plan.qualityProfile, "SPECOS_TEST_PLAN_INVALID", "qualityProfile");
  }
  if (plan?.riskTier !== undefined) {
    requireOneOf(state, plan.riskTier, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", "riskTier");
  }

  requireString(state, plan, "specId", "SPECOS_TEST_PLAN_INVALID", "specId");
  requireString(state, plan, "specVersion", "SPECOS_TEST_PLAN_INVALID", "specVersion");
  if (plan?.changeId !== undefined) {
    requireString(state, plan, "changeId", "SPECOS_TEST_PLAN_INVALID", "changeId");
  }
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

  if (plan?.performanceTargets !== undefined) {
    requirePerformanceTargets(state, plan.performanceTargets);
  }
  if (plan?.concurrencyInvariants !== undefined) {
    requireConcurrencyInvariants(state, plan.concurrencyInvariants);
  }
  if (plan?.releaseGates !== undefined) {
    requireReleaseGates(state, plan.releaseGates);
  }
  if (plan?.standardRequirements !== undefined) {
    requireStandardRequirements(state, plan.standardRequirements);
  }
  if (plan?.flakePolicy !== undefined) {
    requireFlakePolicy(state, plan.flakePolicy);
  }
  if (plan?.dataPolicy !== undefined) {
    requireDataPolicy(state, plan.dataPolicy);
  }
  if (plan?.securityPolicy !== undefined) {
    requireSecurityPolicy(state, plan.securityPolicy);
  }
  if (hasProductionStandard) {
    requireQualityProfile(state, plan?.qualityProfile, "SPECOS_TEST_PLAN_INVALID", "qualityProfile");
    requireOneOf(state, plan?.riskTier, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", "riskTier");
    if (!Array.isArray(plan?.standardRequirements) || plan.standardRequirements.length === 0) {
      state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "standardRequirements"));
    }
    if (!asRecord(plan?.flakePolicy)) {
      state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "flakePolicy"));
    }
    if (!asRecord(plan?.dataPolicy)) {
      state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "dataPolicy"));
    }
    if (!asRecord(plan?.securityPolicy)) {
      state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "securityPolicy"));
    }
  }

  requirePlanBranches(state, plan);

  return result(state.errors);
}

export function validateTestSchedule(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const schedule = asRecord(value);

  requireString(state, schedule, "specId", "SPECOS_TEST_SCHEDULE_INVALID", "specId");
  requireString(state, schedule, "specVersion", "SPECOS_TEST_SCHEDULE_INVALID", "specVersion");
  requireString(state, schedule, "featureName", "SPECOS_TEST_SCHEDULE_INVALID", "featureName");
  requireString(state, schedule, "changeId", "SPECOS_TEST_SCHEDULE_INVALID", "changeId");
  requireOneOf(
    state,
    schedule?.executionMode,
    ["parallel", "test-after-execution"],
    "SPECOS_TEST_SCHEDULE_INVALID",
    "executionMode",
  );
  requireTestScheduleTracks(state, schedule?.tracks);
  requireTestScheduleTasks(state, schedule?.tasks);
  requireStringArray(state, schedule?.gates, "SPECOS_TEST_SCHEDULE_INVALID", "gates");
  requireScheduleSeparation(state, schedule);

  return result(state.errors);
}

export function validateScenarioResult(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const scenario = asRecord(value);
  const hasProductionStandard = scenario?.standardVersion === productionTestStandardVersion;

  requireString(state, scenario, "runId", "SPECOS_SCENARIO_RESULT_INVALID", "runId");
  requireString(state, scenario, "specId", "SPECOS_SCENARIO_RESULT_INVALID", "specId");
  requireString(state, scenario, "specVersion", "SPECOS_SCENARIO_RESULT_INVALID", "specVersion");
  if (scenario?.standardVersion !== undefined) {
    requireOneOf(
      state,
      scenario.standardVersion,
      [productionTestStandardVersion],
      "SPECOS_SCENARIO_RESULT_INVALID",
      "standardVersion",
    );
  }
  if (scenario?.qualityProfile !== undefined) {
    requireQualityProfile(state, scenario.qualityProfile, "SPECOS_SCENARIO_RESULT_INVALID", "qualityProfile");
  }
  if (scenario?.changeId !== undefined) {
    requireString(state, scenario, "changeId", "SPECOS_SCENARIO_RESULT_INVALID", "changeId");
  }
  requireString(state, scenario, "featureName", "SPECOS_SCENARIO_RESULT_INVALID", "featureName");
  if (scenario?.runner !== undefined) {
    requireRunnerMetadata(state, scenario.runner);
  }
  if (scenario?.environment !== undefined && typeof scenario.environment !== "string") {
    requireEnvironmentMetadata(state, scenario.environment);
  }
  if (scenario?.commitSha !== undefined) {
    requireString(state, scenario, "commitSha", "SPECOS_SCENARIO_RESULT_INVALID", "commitSha");
  }
  if (scenario?.baselineRunId !== undefined) {
    requireString(state, scenario, "baselineRunId", "SPECOS_SCENARIO_RESULT_INVALID", "baselineRunId");
  }
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
  requireResultItemArray(state, scenario?.items, { requireProductionEvidence: hasProductionStandard });

  return result(state.errors);
}

export function validateBundle(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const bundle = asRecord(value);

  requireString(state, bundle, "id", "SPECOS_BUNDLE_INVALID", "id");
  requireString(state, bundle, "name", "SPECOS_BUNDLE_INVALID", "name");
  requireString(state, bundle, "version", "SPECOS_BUNDLE_INVALID", "version");
  requireString(state, bundle, "specosVersion", "SPECOS_BUNDLE_INVALID", "specosVersion");
  requireOneOfArray(
    state,
    bundle?.projectTypes,
    ["backend", "frontend", "mixed", "fullstack", "spec-only"],
    "SPECOS_BUNDLE_INVALID",
    "projectTypes",
  );

  if (!Array.isArray(bundle?.installs) || bundle.installs.length === 0) {
    state.errors.push(makeError("SPECOS_BUNDLE_INVALID", "installs"));
  } else {
    bundle.installs.forEach((install, index) => {
      const path = `installs[${index}]`;
      requireString(state, install, "target", "SPECOS_BUNDLE_INVALID", `${path}.target`);
      requireString(state, install, "from", "SPECOS_BUNDLE_INVALID", `${path}.from`);

      if (isNonEmptyString(install?.target) && !isSafeRelativePath(install.target)) {
        state.errors.push(makeError("SPECOS_BUNDLE_INVALID", `${path}.target`));
      }

      if (isNonEmptyString(install?.from)) {
        if (!isSafeRelativePath(install.from) || !install.from.startsWith("files/")) {
          state.errors.push(makeError("SPECOS_BUNDLE_INVALID", `${path}.from`));
        }
      }
    });
  }

  requireString(state, bundle?.workflow, "default", "SPECOS_BUNDLE_INVALID", "workflow.default");
  requireStringArray(state, bundle?.workflow?.available, "SPECOS_BUNDLE_INVALID", "workflow.available");
  requireString(state, bundle?.entrypoints, "draftTemplate", "SPECOS_BUNDLE_INVALID", "entrypoints.draftTemplate");
  requireString(state, bundle?.entrypoints, "designTemplate", "SPECOS_BUNDLE_INVALID", "entrypoints.designTemplate");
  requireString(state, bundle?.entrypoints, "specTemplate", "SPECOS_BUNDLE_INVALID", "entrypoints.specTemplate");
  requireString(state, bundle?.entrypoints, "workflowId", "SPECOS_BUNDLE_INVALID", "entrypoints.workflowId");
  requireBoolean(state, bundle?.capabilities, "refineSpec", "SPECOS_BUNDLE_INVALID", "capabilities.refineSpec");
  requireBoolean(state, bundle?.capabilities, "generateTestPlan", "SPECOS_BUNDLE_INVALID", "capabilities.generateTestPlan");
  requireBoolean(state, bundle?.capabilities, "runApiTests", "SPECOS_BUNDLE_INVALID", "capabilities.runApiTests");
  requireBoolean(state, bundle?.capabilities, "runUiTests", "SPECOS_BUNDLE_INVALID", "capabilities.runUiTests");
  requireBoolean(
    state,
    bundle?.capabilities,
    "normalizeResults",
    "SPECOS_BUNDLE_INVALID",
    "capabilities.normalizeResults",
  );

  if (Array.isArray(bundle?.workflow?.available)) {
    const available = new Set(bundle.workflow.available);
    if (isNonEmptyString(bundle?.workflow?.default) && !available.has(bundle.workflow.default)) {
      state.errors.push(makeError("SPECOS_BUNDLE_INVALID", "workflow.default"));
    }
    if (isNonEmptyString(bundle?.entrypoints?.workflowId) && !available.has(bundle.entrypoints.workflowId)) {
      state.errors.push(makeError("SPECOS_BUNDLE_INVALID", "entrypoints.workflowId"));
    }
  }

  return result(state.errors);
}

export function validateWorkflow(value: unknown): ValidationResult {
  const state: MutableValidation = { errors: [] };
  const workflow = asRecord(value);

  requireString(state, workflow, "id", "SPECOS_WORKFLOW_INVALID", "id");
  requireString(state, workflow, "name", "SPECOS_WORKFLOW_INVALID", "name");

  if (!Array.isArray(workflow?.steps) || workflow.steps.length === 0) {
    state.errors.push(makeError("SPECOS_WORKFLOW_INVALID", "steps"));
  } else {
    workflow.steps.forEach((step, index) => {
      const path = `steps[${index}]`;
      requireString(state, step, "id", "SPECOS_WORKFLOW_INVALID", `${path}.id`);
      requireString(state, step, "run", "SPECOS_WORKFLOW_INVALID", `${path}.run`);
    });
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

function requireOptionalNumber(
  state: MutableValidation,
  object: Record<string, any> | undefined,
  key: string,
  code: SpecosErrorCode,
  path: string,
): void {
  if (object?.[key] !== undefined && (typeof object[key] !== "number" || !Number.isFinite(object[key]))) {
    state.errors.push(makeError(code, path));
  }
}

function requireBoolean(
  state: MutableValidation,
  object: Record<string, any> | undefined,
  key: string,
  code: SpecosErrorCode,
  path: string,
): void {
  if (typeof object?.[key] !== "boolean") {
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

function requireOneOfArray(
  state: MutableValidation,
  value: unknown,
  allowed: string[],
  code: SpecosErrorCode,
  path: string,
): void {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !allowed.includes(item))) {
    state.errors.push(makeError(code, path));
  }
}

function requireTestTypeArray(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  requireOneOfArray(
    state,
    value,
    [
      "api",
      "scenario",
      "unit",
      "specialized",
      "performance",
      "latency",
      "concurrency",
      "security",
      "migration",
      "compatibility",
    ],
    code,
    path,
  );
}

function requireArtifactRefTypeArray(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  requireOneOfArray(
    state,
    value,
    ["trace", "log", "screenshot", "video", "raw-report", "gate-report"],
    code,
    path,
  );
}

function requireQualityProfile(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  requireOneOf(
    state,
    value,
    ["backend-api", "frontend-ui", "fullstack-flow", "data-migration", "agent-workflow"],
    code,
    path,
  );
}

function requireOwnerAgent(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  requireOneOf(
    state,
    value,
    [
      "test-editor",
      "unit-test-agent",
      "playwright-test-agent",
      "e2e-test-agent",
      "performance-test-agent",
      "concurrency-test-agent",
      "specialized-check-agent",
      "ci-editor",
    ],
    code,
    path,
  );
}

function requireSloForCode(
  state: MutableValidation,
  value: unknown,
  code: SpecosErrorCode,
  path: string,
): void {
  const slo = asRecord(value);
  if (!slo) {
    state.errors.push(makeError(code, path));
    return;
  }
  requireOptionalNumber(state, slo, "p95Ms", code, `${path}.p95Ms`);
  requireOptionalNumber(state, slo, "p99Ms", code, `${path}.p99Ms`);
  requireOptionalNumber(state, slo, "errorRate", code, `${path}.errorRate`);
  if (slo.p95Ms === undefined && slo.p99Ms === undefined && slo.errorRate === undefined) {
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

function isSafeRelativePath(path: string): boolean {
  if (!isNonEmptyString(path)) return false;
  const normalized = path.replaceAll("\\", "/");
  if (isAbsolute(normalized)) return false;
  if (/^[a-zA-Z]:\//.test(normalized)) return false;
  return !normalized.split("/").includes("..");
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

function requirePerformanceTargets(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "performanceTargets"));
    return;
  }
  value.forEach((target, index) => {
    const path = `performanceTargets[${index}]`;
    requireString(state, target, "endpoint", "SPECOS_TEST_PLAN_INVALID", `${path}.endpoint`);
    requireOneOf(state, target?.priority, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", `${path}.priority`);
    requireSloForCode(state, target?.slo, "SPECOS_TEST_PLAN_INVALID", `${path}.slo`);
    requireOneOf(
      state,
      target?.gateImpact,
      ["blocking", "warning", "informational"],
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.gateImpact`,
    );
  });
}

function requireConcurrencyInvariants(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "concurrencyInvariants"));
    return;
  }
  value.forEach((invariant, index) => {
    const path = `concurrencyInvariants[${index}]`;
    requireString(state, invariant, "scenario", "SPECOS_TEST_PLAN_INVALID", `${path}.scenario`);
    requireString(state, invariant, "invariant", "SPECOS_TEST_PLAN_INVALID", `${path}.invariant`);
    requireString(state, invariant, "actorProfile", "SPECOS_TEST_PLAN_INVALID", `${path}.actorProfile`);
    requireString(state, invariant, "expectedFinalState", "SPECOS_TEST_PLAN_INVALID", `${path}.expectedFinalState`);
    requireOneOf(
      state,
      invariant?.gateImpact,
      ["blocking", "warning", "informational"],
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.gateImpact`,
    );
  });
}

function requireReleaseGates(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "releaseGates"));
    return;
  }
  value.forEach((gate, index) => {
    const path = `releaseGates[${index}]`;
    requireString(state, gate, "id", "SPECOS_TEST_PLAN_INVALID", `${path}.id`);
    requireOneOf(
      state,
      gate?.type,
      ["pr-fast", "change-verification", "release", "promote"],
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.type`,
    );
    requireTestTypeArray(state, gate?.requiredTestTypes, "SPECOS_TEST_PLAN_INVALID", `${path}.requiredTestTypes`);
    requireBoolean(state, gate, "blocking", "SPECOS_TEST_PLAN_INVALID", `${path}.blocking`);
    requireArtifactRefTypeArray(state, gate?.evidenceRequired, "SPECOS_TEST_PLAN_INVALID", `${path}.evidenceRequired`);
  });
}

function requireStandardRequirements(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "standardRequirements"));
    return;
  }
  value.forEach((requirement, index) => {
    const path = `standardRequirements[${index}]`;
    requireString(state, requirement, "id", "SPECOS_TEST_PLAN_INVALID", `${path}.id`);
    requireOneOf(
      state,
      requirement?.layer,
      [
        "unit",
        "api",
        "scenario",
        "e2e",
        "performance",
        "latency",
        "concurrency",
        "security",
        "migration",
        "compatibility",
        "observability",
      ],
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.layer`,
    );
    requireStringArray(state, requirement?.appliesTo, "SPECOS_TEST_PLAN_INVALID", `${path}.appliesTo`);
    requireOneOfArray(state, requirement?.requiredFor, ["P0", "P1", "P2"], "SPECOS_TEST_PLAN_INVALID", `${path}.requiredFor`);
    requireOwnerAgent(state, requirement?.ownerAgent, "SPECOS_TEST_PLAN_INVALID", `${path}.ownerAgent`);
    requireArtifactRefTypeArray(
      state,
      requirement?.requiredEvidence,
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.requiredEvidence`,
    );
    requireOneOf(
      state,
      requirement?.gateImpact,
      ["blocking", "warning", "informational"],
      "SPECOS_TEST_PLAN_INVALID",
      `${path}.gateImpact`,
    );
  });
}

function requireFlakePolicy(state: MutableValidation, value: unknown): void {
  const policy = asRecord(value);
  if (!policy) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "flakePolicy"));
    return;
  }
  requireNumber(state, policy, "allowedRetries", "SPECOS_TEST_PLAN_INVALID", "flakePolicy.allowedRetries");
  requireBoolean(state, policy, "quarantineAllowed", "SPECOS_TEST_PLAN_INVALID", "flakePolicy.quarantineAllowed");
  requireBoolean(
    state,
    policy,
    "classificationRequired",
    "SPECOS_TEST_PLAN_INVALID",
    "flakePolicy.classificationRequired",
  );
}

function requireDataPolicy(state: MutableValidation, value: unknown): void {
  const policy = asRecord(value);
  if (!policy) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "dataPolicy"));
    return;
  }
  if (policy.seedCommand !== undefined) {
    requireString(state, policy, "seedCommand", "SPECOS_TEST_PLAN_INVALID", "dataPolicy.seedCommand");
  }
  if (policy.cleanupCommand !== undefined) {
    requireString(state, policy, "cleanupCommand", "SPECOS_TEST_PLAN_INVALID", "dataPolicy.cleanupCommand");
  }
  requireOneOf(
    state,
    policy.externalDependencyMode,
    ["live", "stubbed", "mocked"],
    "SPECOS_TEST_PLAN_INVALID",
    "dataPolicy.externalDependencyMode",
  );
  requireBoolean(state, policy, "piiAllowed", "SPECOS_TEST_PLAN_INVALID", "dataPolicy.piiAllowed");
  requireBoolean(state, policy, "secretsAllowed", "SPECOS_TEST_PLAN_INVALID", "dataPolicy.secretsAllowed");
}

function requireSecurityPolicy(state: MutableValidation, value: unknown): void {
  const policy = asRecord(value);
  if (!policy) {
    state.errors.push(makeError("SPECOS_TEST_PLAN_INVALID", "securityPolicy"));
    return;
  }
  requireOneOf(
    state,
    policy.baseline,
    ["owasp-api-top-10-2023"],
    "SPECOS_TEST_PLAN_INVALID",
    "securityPolicy.baseline",
  );
  requireStringArray(state, policy.requiredChecks, "SPECOS_TEST_PLAN_INVALID", "securityPolicy.requiredChecks");
}

function requireTestScheduleTracks(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_SCHEDULE_INVALID", "tracks"));
    return;
  }

  value.forEach((track, index) => {
    const path = `tracks[${index}]`;
    requireOneOf(state, track?.id, ["execution", "testing"], "SPECOS_TEST_SCHEDULE_INVALID", `${path}.id`);
    requireOneOf(
      state,
      track?.agentRole,
      ["execution-editor", "test-editor"],
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.agentRole`,
    );
    requireOneOf(
      state,
      track?.isolation,
      ["implementation-only", "spec-and-contract-only"],
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.isolation`,
    );
    requireStringArray(state, track?.allowedInputs, "SPECOS_TEST_SCHEDULE_INVALID", `${path}.allowedInputs`);
    requireStringArray(state, track?.forbiddenInputs, "SPECOS_TEST_SCHEDULE_INVALID", `${path}.forbiddenInputs`);
  });
}

function requireTestScheduleTasks(state: MutableValidation, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    state.errors.push(makeError("SPECOS_TEST_SCHEDULE_INVALID", "tasks"));
    return;
  }

  value.forEach((task, index) => {
    const path = `tasks[${index}]`;
    requireString(state, task, "id", "SPECOS_TEST_SCHEDULE_INVALID", `${path}.id`);
    requireOneOf(state, task?.trackId, ["execution", "testing"], "SPECOS_TEST_SCHEDULE_INVALID", `${path}.trackId`);
    requireOneOf(
      state,
      task?.agentRole,
      ["execution-editor", "test-editor", "playwright-test-agent"],
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.agentRole`,
    );
    requireOneOf(
      state,
      task?.type,
      ["implementation", "api-test", "ui-test-gap"],
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.type`,
    );
    requireOneOf(state, task?.status, ["ready", "blocked"], "SPECOS_TEST_SCHEDULE_INVALID", `${path}.status`);
    requireStringArray(state, task?.inputs, "SPECOS_TEST_SCHEDULE_INVALID", `${path}.inputs`);
    requireStringArray(state, task?.outputs, "SPECOS_TEST_SCHEDULE_INVALID", `${path}.outputs`);
    requireStringArrayAllowEmpty(state, task?.dependsOn, "SPECOS_TEST_SCHEDULE_INVALID", `${path}.dependsOn`);
    requireStringArray(
      state,
      task?.traceability?.scenarios,
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.traceability.scenarios`,
    );
    requireStringArray(
      state,
      task?.traceability?.endpoints,
      "SPECOS_TEST_SCHEDULE_INVALID",
      `${path}.traceability.endpoints`,
    );
    if (task?.status === "blocked") {
      requireString(state, task, "reason", "SPECOS_TEST_SCHEDULE_INVALID", `${path}.reason`);
    }
  });
}

function buildBlockedApiFlowResults(plan: SpecosTestPlan, reason: string): FlowResult[] {
  return plan.flows.map((flow) => ({
    name: flow.name,
    status: "warning",
    stages: flow.stages.map((stage) => ({
      name: stage.name,
      status: "warning",
      scenarios: stage.scenarioNames.map((scenarioName) => {
        const scenario = plan.scenarios.find((item) => item.name === scenarioName);
        return {
          name: scenarioName,
          status: "pending",
          relatedEndpointTargets: plan.endpoints.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`),
          steps: (scenario?.steps ?? stage.stepNames).map((stepName) => ({
            name: stepName,
            status: "pending",
          })),
        };
      }),
      endpoints: plan.endpoints.map((endpoint) => ({
        target: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
        name: endpoint.name,
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
        status: "warning",
        relatedRule: endpoint.relatedRule,
        summary: reason,
      })),
    })),
  }));
}

function buildExecutedApiFlowResults(plan: SpecosTestPlan, passed: boolean, summary: string): FlowResult[] {
  const apiStatus = passed ? "pass" : "warning";
  return plan.flows.map((flow) => ({
    name: flow.name,
    status: apiStatus,
    stages: flow.stages.map((stage) => ({
      name: stage.name,
      status: apiStatus,
      scenarios: stage.scenarioNames.map((scenarioName) => {
        const scenario = plan.scenarios.find((item) => item.name === scenarioName);
        return {
          name: scenarioName,
          status: "pending",
          relatedEndpointTargets: plan.endpoints.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`),
          steps: (scenario?.steps ?? stage.stepNames).map((stepName) => ({
            name: stepName,
            status: "pending",
          })),
        };
      }),
      endpoints: plan.endpoints.map((endpoint) => ({
        target: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
        name: endpoint.name,
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
        status: apiStatus,
        relatedRule: endpoint.relatedRule,
        summary,
      })),
    })),
  }));
}

function buildBrunoRequest(endpoint: TestPlanEndpoint, sequence: number): string {
  const method = endpoint.method.toLowerCase();
  const body =
    method === "get" || method === "delete"
      ? ""
      : [
          "",
          "body:json {",
          "  {",
          '    "example": "replace with spec-derived request body"',
          "  }",
          "}",
        ].join("\n");

  return [
    "meta {",
    `  name: ${endpoint.name}`,
    "  type: http",
    `  seq: ${sequence}`,
    "}",
    "",
    `${method} {`,
    `  url: {{baseUrl}}${endpoint.path}`,
    method === "get" || method === "delete" ? "  body: none" : "  body: json",
    "  auth: inherit",
    "}",
    "",
    "headers {",
    "  Content-Type: application/json",
    "}",
    body,
    "",
    "tests {",
    `  // Branches: ${endpoint.branches.join(", ")}`,
    `  // Expected: ${endpoint.expectedResults.join("; ")}`,
    `  // Related rule: ${endpoint.relatedRule}`,
    "}",
    "",
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n");
}

function slugifyFileName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "request";
}

function requireScheduleSeparation(state: MutableValidation, schedule: Record<string, any> | undefined): void {
  if (!Array.isArray(schedule?.tracks)) return;
  const trackIds = new Set(schedule.tracks.map((track: Record<string, any>) => track?.id));
  if (!trackIds.has("execution") || !trackIds.has("testing")) {
    state.errors.push(makeError("SPECOS_TEST_SCHEDULE_INVALID", "tracks"));
  }

  if (!Array.isArray(schedule?.tasks)) return;
  schedule.tasks.forEach((task: Record<string, any>, index: number) => {
    const outputs = Array.isArray(task?.outputs) ? task.outputs : [];
    const executionTaskWritesIndependentTests =
      task?.trackId === "execution" &&
      outputs.some((output) => {
        const normalized = String(output);
        return (
          normalized.startsWith("tests/bruno/") ||
          normalized.startsWith("tests/scenarios/") ||
          normalized.startsWith("tests/e2e/") ||
          normalized.startsWith("tests/playwright/") ||
          normalized.startsWith("tests/results/")
        );
      });
    const testingTaskWritesImplementation =
      task?.trackId === "testing" &&
      outputs.some((output) => {
        const normalized = String(output);
        return normalized.startsWith("src/") || normalized.startsWith("app/") || normalized.startsWith("packages/");
      });

    if (executionTaskWritesIndependentTests || testingTaskWritesImplementation) {
      state.errors.push(makeError("SPECOS_TEST_SCHEDULE_INVALID", `tasks[${index}].outputs`));
    }
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

function requireResultItemArray(
  state: MutableValidation,
  value: unknown,
  options: { requireProductionEvidence?: boolean } = {},
): void {
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
      [
        "api",
        "scenario",
        "unit",
        "specialized",
        "performance",
        "latency",
        "concurrency",
        "security",
        "migration",
        "compatibility",
      ],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${path}.testType`,
    );
    if (item?.changeId !== undefined) {
      requireString(state, item, "changeId", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.changeId`);
    }
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
    if (item?.requirementId !== undefined) {
      requireString(state, item, "requirementId", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.requirementId`);
    }
    if (item?.ownerAgent !== undefined) {
      requireOwnerAgent(state, item.ownerAgent, "SPECOS_SCENARIO_RESULT_INVALID", `${path}.ownerAgent`);
    }
    if (item?.evidenceQuality !== undefined) {
      requireOneOf(
        state,
        item.evidenceQuality,
        ["complete", "partial", "missing", "invalid"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${path}.evidenceQuality`,
      );
    }
    if (item?.attempts !== undefined) {
      requireNumber(state, item, "attempts", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.attempts`);
    }
    if (item?.flakeClassification !== undefined) {
      requireOneOf(
        state,
        item.flakeClassification,
        ["not-flaky", "suspected-flaky", "confirmed-flaky", "quarantined"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${path}.flakeClassification`,
      );
    }
    if (item?.gateImpact !== undefined) {
      requireOneOf(
        state,
        item.gateImpact,
        ["blocking", "warning", "informational"],
        "SPECOS_SCENARIO_RESULT_INVALID",
        `${path}.gateImpact`,
      );
    }
    if (item?.slo !== undefined) {
      requireSlo(state, item.slo, `${path}.slo`);
    }
    if (item?.metrics !== undefined) {
      requireMetrics(state, item.metrics, `${path}.metrics`);
    }
    if (item?.artifactRefs !== undefined) {
      requireArtifactRefs(state, item.artifactRefs, `${path}.artifactRefs`);
    }
    if (item?.concurrencyProfile !== undefined) {
      requireConcurrencyProfile(state, item.concurrencyProfile, `${path}.concurrencyProfile`);
    }
    if (options.requireProductionEvidence && (item?.gateImpact === "blocking" || item?.status === "fail")) {
      requireString(state, item, "requirementId", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.requirementId`);
      requireOwnerAgent(state, item?.ownerAgent, "SPECOS_SCENARIO_RESULT_INVALID", `${path}.ownerAgent`);
      if (!Array.isArray(item?.artifactRefs) || item.artifactRefs.length === 0) {
        state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", `${path}.artifactRefs`));
      }
    }
  });
}

function requireRunnerMetadata(state: MutableValidation, value: unknown): void {
  const runner = asRecord(value);
  requireString(state, runner, "name", "SPECOS_SCENARIO_RESULT_INVALID", "runner.name");
  requireString(state, runner, "command", "SPECOS_SCENARIO_RESULT_INVALID", "runner.command");
  requireNumber(state, runner, "exitCode", "SPECOS_SCENARIO_RESULT_INVALID", "runner.exitCode");
}

function requireEnvironmentMetadata(state: MutableValidation, value: unknown): void {
  const environment = asRecord(value);
  requireString(state, environment, "id", "SPECOS_SCENARIO_RESULT_INVALID", "environment.id");
  if (environment?.fixtureVersion !== undefined) {
    requireString(state, environment, "fixtureVersion", "SPECOS_SCENARIO_RESULT_INVALID", "environment.fixtureVersion");
  }
  if (environment?.seedCommand !== undefined) {
    requireString(state, environment, "seedCommand", "SPECOS_SCENARIO_RESULT_INVALID", "environment.seedCommand");
  }
  if (environment?.cleanupCommand !== undefined) {
    requireString(state, environment, "cleanupCommand", "SPECOS_SCENARIO_RESULT_INVALID", "environment.cleanupCommand");
  }
  if (environment?.externalDependencyMode !== undefined) {
    requireOneOf(
      state,
      environment.externalDependencyMode,
      ["live", "stubbed", "mocked"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      "environment.externalDependencyMode",
    );
  }
}

function requireSlo(state: MutableValidation, value: unknown, path: string): void {
  const slo = asRecord(value);
  if (!slo) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", path));
    return;
  }
  requireOptionalNumber(state, slo, "p95Ms", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.p95Ms`);
  requireOptionalNumber(state, slo, "p99Ms", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.p99Ms`);
  requireOptionalNumber(state, slo, "errorRate", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.errorRate`);
}

function requireMetrics(state: MutableValidation, value: unknown, path: string): void {
  const metrics = asRecord(value);
  if (!metrics) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", path));
    return;
  }
  requireOptionalNumber(state, metrics, "p50Ms", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.p50Ms`);
  requireOptionalNumber(state, metrics, "p95Ms", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.p95Ms`);
  requireOptionalNumber(state, metrics, "p99Ms", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.p99Ms`);
  requireOptionalNumber(state, metrics, "requestRate", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.requestRate`);
  requireOptionalNumber(state, metrics, "errorRate", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.errorRate`);
}

function requireArtifactRefs(state: MutableValidation, value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    state.errors.push(makeError("SPECOS_SCENARIO_RESULT_INVALID", path));
    return;
  }
  value.forEach((ref, index) => {
    const refPath = `${path}[${index}]`;
    requireOneOf(
      state,
      ref?.type,
      ["trace", "log", "screenshot", "video", "raw-report", "gate-report"],
      "SPECOS_SCENARIO_RESULT_INVALID",
      `${refPath}.type`,
    );
    requireString(state, ref, "path", "SPECOS_SCENARIO_RESULT_INVALID", `${refPath}.path`);
  });
}

function requireConcurrencyProfile(state: MutableValidation, value: unknown, path: string): void {
  const profile = asRecord(value);
  requireNumber(state, profile, "actors", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.actors`);
  requireNumber(state, profile, "requests", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.requests`);
  requireString(state, profile, "invariant", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.invariant`);
  requireString(state, profile, "expectedFinalState", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.expectedFinalState`);
  if (profile?.observedFinalState !== undefined) {
    requireString(state, profile, "observedFinalState", "SPECOS_SCENARIO_RESULT_INVALID", `${path}.observedFinalState`);
  }
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
