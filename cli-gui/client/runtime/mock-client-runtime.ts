import { WebPlatformAdapter } from "../lib/platform";
import type {
  CliProfileCapabilities,
  CliProfileV2,
  EngineReadinessResponse,
  SessionWithCompatibilityStatus,
  StateResponse,
  TranscriptEvent,
  TranscriptPage,
  WorkspaceV2
} from "../../shared/types";
import type { ModelDeploymentSummary } from "../../shared/model-deployment";
import type { ModelProviderSummary } from "../../shared/model-provider";
import type { ExecutionSnapshot } from "../../shared/execution-attempt";
import type { PriorityModelRoute, ResolvedRoute } from "../../shared/model-route";
import type { TurnStatus } from "../../shared/websocket";
import {
  MockClientRuntime,
  type EnginePort,
  type EventPort,
  type ExecutionPort,
  type RoutingPort,
  type RuntimePortSet,
  type SessionPort,
  type TerminalPort,
  type WorkspacePort
} from "./client-runtime";

const FIXED_TIME = "2026-07-29T00:00:00.000Z";
const WORKSPACE_ID = "mock-workspace";
const PROFILE_ID = "mock-profile";
const PROVIDER_ID = "mock-provider";
const DEPLOYMENT_ID = "mock-deployment";
const ROUTE_ID = "mock-route";

export type MockRuntimeScenarioName =
  | "streaming-text"
  | "tools"
  | "files"
  | "approvals"
  | "failures"
  | "offline"
  | "reconnect"
  | "native-session-expired";

export type MockTranscriptFrame =
  | { type: "turn-delta"; turnId: string; delta: string }
  | { type: "transcript-event"; event: TranscriptEvent }
  | { type: "turn-status"; turnId: string; status: TurnStatus }
  | { type: "error"; message: string }
  | { type: "close" };

export interface MockRuntimeScenario {
  name: MockRuntimeScenarioName;
  sessionId: string;
  persistedEvents: readonly TranscriptEvent[];
  liveFrames: readonly MockTranscriptFrame[];
}

function transcriptEvent(
  sessionId: string,
  sequence: number,
  kind: TranscriptEvent["kind"],
  raw: string,
  metadata?: TranscriptEvent["metadata"]
): TranscriptEvent {
  return {
    id: `${sessionId}-event-${sequence}`,
    sessionId,
    sequence,
    occurredAt: FIXED_TIME,
    kind,
    source: "profile-adapter",
    raw,
    rawBytes: new TextEncoder().encode(raw).byteLength,
    truncated: false,
    metadata
  };
}

const streamingEvent = transcriptEvent(
  "mock-streaming-text",
  1,
  "assistant_message",
  "Hello!",
  { turnId: "turn-streaming" }
);
const reconnectFirstEvent = transcriptEvent("mock-reconnect", 1, "assistant_message", "First persisted response.", { turnId: "turn-reconnect-1" });
const reconnectSecondEvent = transcriptEvent("mock-reconnect", 2, "assistant_message", "Recovered response.", { turnId: "turn-reconnect-2" });
const failureEvent = transcriptEvent("mock-failures", 1, "error", "The agent turn failed.", { turnId: "turn-failures", code: "ENGINE_TRANSPORT_UNAVAILABLE" });
const nativeSessionExpiredEvent = transcriptEvent("mock-native-session-expired", 1, "error", "The native agent session expired.", { turnId: "turn-native-expired", code: "ENGINE_NATIVE_SESSION_EXPIRED" });

export const MOCK_RUNTIME_SCENARIOS: Readonly<Record<MockRuntimeScenarioName, MockRuntimeScenario>> = {
  "streaming-text": {
    name: "streaming-text",
    sessionId: "mock-streaming-text",
    persistedEvents: [streamingEvent],
    liveFrames: [
      { type: "turn-delta", turnId: "turn-streaming", delta: "Hel" },
      { type: "turn-delta", turnId: "turn-streaming", delta: "lo!" },
      { type: "transcript-event", event: streamingEvent },
      { type: "turn-status", turnId: "turn-streaming", status: "completed" }
    ]
  },
  tools: {
    name: "tools",
    sessionId: "mock-tools",
    persistedEvents: [transcriptEvent("mock-tools", 1, "tool_activity", "Read README.md", { turnId: "turn-tools", tool: "read_file" })],
    liveFrames: []
  },
  files: {
    name: "files",
    sessionId: "mock-files",
    persistedEvents: [transcriptEvent("mock-files", 1, "file_change", "Updated client/runtime.ts", { turnId: "turn-files", path: "client/runtime.ts" })],
    liveFrames: []
  },
  approvals: {
    name: "approvals",
    sessionId: "mock-approvals",
    persistedEvents: [
      transcriptEvent("mock-approvals", 1, "approval_request", "Allow command execution?", { turnId: "turn-approvals", approvalId: "approval-1", tool: "shell" }),
      transcriptEvent("mock-approvals", 2, "approval_response", "Allowed", { turnId: "turn-approvals", approvalId: "approval-1", decision: "allow" })
    ],
    liveFrames: []
  },
  failures: {
    name: "failures",
    sessionId: "mock-failures",
    persistedEvents: [failureEvent],
    liveFrames: [
      { type: "transcript-event", event: failureEvent },
      { type: "turn-status", turnId: "turn-failures", status: "failed" }
    ]
  },
  offline: {
    name: "offline",
    sessionId: "mock-offline",
    persistedEvents: [transcriptEvent("mock-offline", 1, "assistant_message", "Cached response.", { turnId: "turn-offline" })],
    liveFrames: [{ type: "error", message: "Client runtime is offline." }, { type: "close" }]
  },
  reconnect: {
    name: "reconnect",
    sessionId: "mock-reconnect",
    persistedEvents: [reconnectFirstEvent, reconnectSecondEvent],
    liveFrames: []
  },
  "native-session-expired": {
    name: "native-session-expired",
    sessionId: "mock-native-session-expired",
    persistedEvents: [nativeSessionExpiredEvent],
    liveFrames: [
      { type: "transcript-event", event: nativeSessionExpiredEvent },
      { type: "turn-status", turnId: "turn-native-expired", status: "failed" }
    ]
  }
};

const capabilities: CliProfileCapabilities = {
  adapterId: "codex",
  detectedVersion: "0.1.0-mock",
  compatibility: "supported",
  permissions: [],
  modes: [],
  models: [{ id: "gpt-5.6", labelKey: "model.gpt56", requiresRestart: false }],
  supportsComposer: true,
  supportsStructuredRecognition: true,
  supportsHeadlessTurns: true,
  supportsResume: true,
  supportsApproval: true,
  supportsPromptEnhancement: true,
  guiMode: "full"
};

const mockProvider = (): ModelProviderSummary => ({
  id: PROVIDER_ID,
  name: "Mock Provider",
  protocol: "openai-compatible",
  baseUrl: "https://provider.example/v1",
  models: ["mock-model"],
  supportedEngineIds: ["codex"],
  enabled: true,
  configured: true,
  credentialStatus: "configured",
  hasCredential: true,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
});

const mockDeployment = (): ModelDeploymentSummary => ({
  id: DEPLOYMENT_ID,
  name: "Mock primary deployment",
  providerId: PROVIDER_ID,
  providerName: "Mock Provider",
  providerProtocol: "openai-compatible",
  providerEnabled: true,
  profileId: PROFILE_ID,
  profileName: "Mock Codex",
  modelId: "mock-model",
  enabled: true,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
  credentialStatus: "configured",
  capability: { source: "configured", observedAt: FIXED_TIME, modelPresent: true, nativeSession: true, toolCalling: true, codeEditing: true },
  eligibility: "eligible",
  exclusionCodes: []
});

const mockRoute = (): PriorityModelRoute => ({
  id: ROUTE_ID,
  name: "Mock priority route",
  enabled: true,
  candidateDeploymentIds: [DEPLOYMENT_ID],
  automaticTechnicalFallback: true,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME
});

function resolvedMockRoute(fixedDeploymentId?: string): ResolvedRoute {
  return {
    kind: "route",
    routeId: ROUTE_ID,
    resolvedAt: FIXED_TIME,
    sourceTrace: [{ field: "routeId", source: "project", value: ROUTE_ID }, ...(fixedDeploymentId ? [{ field: "fixedDeploymentId", source: "run" as const, value: fixedDeploymentId }] : [])],
    candidates: [{ deploymentId: DEPLOYMENT_ID, position: 1, eligible: true, exclusionCodes: [] }],
    executableCandidates: [{ deploymentId: DEPLOYMENT_ID, position: 1, eligible: true, exclusionCodes: [] }],
    selectedDeploymentId: fixedDeploymentId ?? DEPLOYMENT_ID,
    ...(fixedDeploymentId ? { fixedDeploymentId } : {}),
    canSend: true
  };
}

function fixtureSession(scenario: MockRuntimeScenario): SessionWithCompatibilityStatus {
  const nativeExpired = scenario.name === "native-session-expired";
  return {
    id: scenario.sessionId,
    workspaceId: WORKSPACE_ID,
    profileId: PROFILE_ID,
    name: `Mock ${scenario.name}`,
    interactionMode: "chat",
    runtimeStatus: nativeExpired ? "error" : "running",
    status: nativeExpired ? "error" : "running",
    organizationStatus: "active",
    pinned: false,
    manualOrder: 0,
    launchConfig: { permission: null, mode: null, model: "gpt-5.6" },
    chatContext: { activeModel: "gpt-5.6", resumeToken: `resume-${scenario.sessionId}` },
    backendId: "codex",
    backendSessionRef: { backendId: "codex", nativeSessionId: `native-${scenario.sessionId}`, transport: "json-stream" },
    createdAt: FIXED_TIME,
    lastActiveAt: FIXED_TIME,
    revision: 1,
    ...(nativeExpired ? { error: { code: "ENGINE_NATIVE_SESSION_EXPIRED", message: "The native agent session expired.", occurredAt: FIXED_TIME } } : {})
  };
}

function page(events: readonly TranscriptEvent[], afterSequence = 0, limit = 200): TranscriptPage {
  const visible = events.filter((event) => event.sequence > afterSequence).slice(0, limit);
  const nextAfterSequence = visible.at(-1)?.sequence ?? afterSequence;
  return {
    events: visible.map((event) => ({ ...event, metadata: event.metadata ? { ...event.metadata } : undefined })),
    hasMore: events.some((event) => event.sequence > nextAfterSequence),
    nextAfterSequence,
    visibleStartSequence: events[0]?.sequence ?? 0,
    retentionTruncated: false
  };
}

export interface MockClientRuntimeFixture {
  runtime: MockClientRuntime;
  ports: RuntimePortSet;
  scenarios: typeof MOCK_RUNTIME_SCENARIOS;
  reset(): void;
}

export function createMockClientRuntimeFixture(): MockClientRuntimeFixture {
  const workspace: WorkspaceV2 & { kind: "local-folder" } = {
    id: WORKSPACE_ID,
    name: "Mock Workspace",
    path: "/mock/workspace",
    kind: "local-folder",
    createdAt: FIXED_TIME,
    lastOpenedAt: FIXED_TIME
  };
  const profile: CliProfileV2 = {
    id: PROFILE_ID,
    name: "Mock Codex",
    command: "codex",
    args: [],
    adapterId: "codex",
    createdAt: FIXED_TIME
  };
  const initialSessions = Object.values(MOCK_RUNTIME_SCENARIOS).map(fixtureSession);
  let sessions = initialSessions.map((session) => ({ ...session }));
  let workspaces = [{ ...workspace }];
  let profiles = [{ ...profile }];
  const initialProviders = [mockProvider()];
  const initialDeployments = [mockDeployment()];
  const initialRoutes = [mockRoute()];
  let providers: ModelProviderSummary[] = initialProviders.map((provider) => ({ ...provider, models: [...provider.models], supportedEngineIds: [...(provider.supportedEngineIds ?? [])] }));
  let deployments = initialDeployments.map((deployment) => ({ ...deployment, capability: { ...deployment.capability }, exclusionCodes: [...deployment.exclusionCodes] }));
  let routes = initialRoutes.map((route) => ({ ...route, candidateDeploymentIds: [...route.candidateDeploymentIds] }));
  let executionSnapshots: ExecutionSnapshot[] = [];
  const eventsBySession = new Map(Object.values(MOCK_RUNTIME_SCENARIOS).map((scenario) => [scenario.sessionId, [...scenario.persistedEvents]]));
  const subscriptionAttempts = new Map<string, number>();

  const state = async (): Promise<StateResponse> => ({
    workspaces: workspaces.map((item) => ({ ...item })),
    profiles: profiles.map((item) => ({ ...item })),
    sessions: sessions.map((item) => ({ ...item })),
    readonly: false,
    maxRunningSessions: 8
  });

  const updateSession = (id: string, update: (session: SessionWithCompatibilityStatus) => SessionWithCompatibilityStatus) => {
    const current = sessions.find((session) => session.id === id);
    if (!current) throw new Error(`Unknown mock session: ${id}`);
    const next = update({ ...current });
    sessions = sessions.map((session) => session.id === id ? next : session);
    return { ...next };
  };

  const engines: EnginePort = {
    engineReadiness: async (): Promise<EngineReadinessResponse> => ({
      engines: [{ engineId: "codex", profileId: PROFILE_ID, installation: "available", authentication: "ready", compatibility: "supported", version: "0.1.0-mock", selectedTransport: "json-stream", capabilities }],
      probedAt: FIXED_TIME
    }),
    profileCapabilities: async () => ({ ...capabilities, models: [...capabilities.models] }),
    profileModels: async () => ({ models: [{ id: "gpt-5.6", source: "builtin" }] }),
    syncProfileModels: async () => ({ models: [{ id: "gpt-5.6", source: "builtin" }], synced: ["gpt-5.6"] }),
    syncModels: async () => ({ models: [{ id: "gpt-5.6", source: "synced" }], synced: ["gpt-5.6"] }),
    addProfileModel: async (_id, model) => ({ models: [{ id: "gpt-5.6", source: "builtin" }, { id: model, source: "custom" }] }),
    removeProfileModel: async () => ({ models: [{ id: "gpt-5.6", source: "builtin" }] }),
    createProfile: async (input) => {
      const created: CliProfileV2 = { id: `mock-profile-${profiles.length + 1}`, name: input.name, command: input.command, args: [...input.args], adapterId: input.adapterId === "claude-code" ? "claude-code" : "generic", createdAt: FIXED_TIME };
      profiles = [...profiles, created];
      return { ...created };
    },
    deleteProfile: async (id) => { profiles = profiles.filter((item) => item.id !== id); },
    enhancePrompt: async (input) => ({ content: input.content, truncated: false })
  };

  const sessionsPort: SessionPort = {
    state,
    createSession: async (input) => {
      const id = `mock-session-${sessions.length + 1}`;
      const created = fixtureSession({ name: "streaming-text", sessionId: id, persistedEvents: [], liveFrames: [] });
      const next = { ...created, name: input.name, workspaceId: input.workspaceId, profileId: input.profileId, interactionMode: input.interactionMode ?? "chat", runtimeStatus: input.start === false ? "stopped" : "running", status: input.start === false ? "stopped" : "running", launchConfig: { permission: input.launchConfig?.permission ?? null, mode: input.launchConfig?.mode ?? null, model: input.launchConfig?.model ?? null }, ...(input.providerId ? { providerId: input.providerId } : {}), ...(input.modelRouteId ? { modelRouteId: input.modelRouteId } : {}) } satisfies SessionWithCompatibilityStatus;
      sessions = [...sessions, next];
      eventsBySession.set(id, []);
      return { ...next };
    },
    startSession: async (id) => updateSession(id, (session) => ({ ...session, runtimeStatus: "running", status: "running", revision: session.revision + 1 })),
    stopSession: async (id) => updateSession(id, (session) => ({ ...session, runtimeStatus: "stopped", status: "stopped", revision: session.revision + 1 })),
    renameSession: async (id, name) => updateSession(id, (session) => ({ ...session, name, revision: session.revision + 1 })),
    updateLaunchConfig: async (id, launchConfig) => updateSession(id, (session) => ({ ...session, launchConfig: { ...session.launchConfig, ...launchConfig }, revision: session.revision + 1 })),
    pinSession: async (id, pinned) => updateSession(id, (session) => ({ ...session, pinned, revision: session.revision + 1 })),
    archiveSession: async (id) => updateSession(id, (session) => ({ ...session, organizationStatus: "archived", archivedAt: FIXED_TIME, revision: session.revision + 1 })),
    completeSession: async (id) => updateSession(id, (session) => ({ ...session, organizationStatus: "completed", completedAt: FIXED_TIME, revision: session.revision + 1 })),
    restoreSession: async (id) => updateSession(id, (session) => ({ ...session, organizationStatus: "active", archivedAt: undefined, completedAt: undefined, revision: session.revision + 1 })),
    forkSession: async (id) => {
      const parent = sessions.find((session) => session.id === id);
      if (!parent) throw new Error(`Unknown mock session: ${id}`);
      const fork = { ...parent, id: `${id}-fork`, name: `${parent.name} fork`, parentSessionId: id, revision: 1 };
      sessions = [...sessions, fork];
      return { session: { ...fork } };
    },
    reorderSessions: async (orderedSessionIds) => orderedSessionIds.map((id, index) => updateSession(id, (session) => ({ ...session, manualOrder: index, revision: session.revision + 1 }))),
    sendMessage: async (id, input) => {
      const existing = (eventsBySession.get(id) ?? []).find((event) => event.clientMessageId === input.clientMessageId);
      if (existing) return { event: { ...existing }, runtimeStatus: "running", duplicate: true, turnId: `turn-${input.clientMessageId}` };
      const current = eventsBySession.get(id) ?? [];
      const event = { ...transcriptEvent(id, (current.at(-1)?.sequence ?? 0) + 1, "user_message", input.content, { turnId: `turn-${input.clientMessageId}` }), clientMessageId: input.clientMessageId };
      eventsBySession.set(id, [...current, event]);
      return { event: { ...event }, runtimeStatus: "running", duplicate: false, turnId: `turn-${input.clientMessageId}` };
    },
    cancelTurn: async (_id, turnId) => ({ turnId }),
    respondApproval: async (_id, approvalId, decision) => ({ approvalId, decision }),
    updateActiveModel: async (id, activeModel) => updateSession(id, (session) => ({ ...session, chatContext: { ...session.chatContext, activeModel }, revision: session.revision + 1 })),
    updateSessionRoute: async (id, modelRouteId) => updateSession(id, (session) => ({ ...session, ...(modelRouteId ? { modelRouteId } : { modelRouteId: undefined }), revision: session.revision + 1 })),
    deleteSession: async (id) => { sessions = sessions.filter((item) => item.id !== id); eventsBySession.delete(id); },
    switchView: async (id, view) => updateSession(id, (session) => ({ ...session, activeView: view, inputOwner: view, revision: session.revision + 1 }))
  };

  const events: EventPort = {
    transcript: async (id, afterSequence = 0, limit = 200) => page(eventsBySession.get(id) ?? [], afterSequence, limit),
    subscribe: (sessionId, afterSequence, handlers) => {
      const scenario = Object.values(MOCK_RUNTIME_SCENARIOS).find((item) => item.sessionId === sessionId);
      const attempt = (subscriptionAttempts.get(sessionId) ?? 0) + 1;
      subscriptionAttempts.set(sessionId, attempt);
      let active = true;
      const emit = (frame: MockTranscriptFrame) => {
        if (!active) return;
        if (frame.type === "turn-delta") handlers.onTurnDelta?.(frame.turnId, frame.delta);
        else if (frame.type === "transcript-event" && frame.event.sequence > afterSequence) handlers.onEvent?.({ ...frame.event });
        else if (frame.type === "turn-status") handlers.onTurnStatus?.(frame.turnId, frame.status);
        else if (frame.type === "error") handlers.onError?.(frame.message);
        else if (frame.type === "close") handlers.onClose?.();
      };

      handlers.onOpen?.();
      const persisted = eventsBySession.get(sessionId) ?? [];
      handlers.onReady?.(afterSequence, persisted.at(-1)?.sequence ?? 0);

      if (scenario?.name === "reconnect") {
        if (attempt === 1 && afterSequence === 0) {
          handlers.onEvent?.({ ...reconnectFirstEvent });
          handlers.onClose?.();
        } else {
          persisted.filter((event) => event.sequence > afterSequence).forEach((event) => handlers.onEvent?.({ ...event }));
        }
      } else if (scenario) {
        const frames = scenario.liveFrames.length > 0
          ? scenario.liveFrames
          : scenario.persistedEvents.map((event) => ({ type: "transcript-event", event }) as const);
        frames.forEach(emit);
      }

      return () => { active = false; };
    }
  };

  const terminal: TerminalPort = {
    subscribe: (_sessionId, handlers) => {
      handlers.onOpen?.();
      handlers.onOutput?.("mock terminal ready\n");
      handlers.onStatus?.("running");
      return { sendInput: () => undefined, resize: () => undefined, close: () => handlers.onClose?.() };
    }
  };

  const workspacePort: WorkspacePort = {
    createWorkspace: async (input) => {
      const created = { id: `mock-workspace-${workspaces.length + 1}`, name: input.name, path: input.path, kind: "local-folder" as const, createdAt: FIXED_TIME };
      workspaces = [...workspaces, created];
      return { ...created };
    },
    workspaceFiles: async (_workspaceId, path = "") => ({ path, entries: [{ name: "README.md", path: "README.md", type: "file", size: 42, gitStatus: "modified" }], omittedCount: 0, visibilitySource: "git" }),
    filePreview: async (_workspaceId, path) => ({ path, kind: "text", size: 14, encoding: "utf-8", content: "# Mock fixture\n", truncated: false, shownBytes: 14 }),
    languageSummary: async () => ({ entries: [{ language: "TypeScript", files: 1, bytes: 42, share: 1 }], partial: false, visibilitySource: "git" }),
    gitStatus: async () => ({ repository: true, branch: "fixture", clean: false, entries: [{ path: "README.md", staged: "unmodified", unstaged: "modified", conflicted: false }], truncated: false }),
    gitDiff: async (_workspaceId, scope = "unstaged") => ({ scope, files: [{ oldPath: "README.md", newPath: "README.md", status: "modified", hunks: [{ header: "@@ -1 +1 @@", lines: [{ kind: "deletion", text: "old", oldLine: 1 }, { kind: "addition", text: "new", newLine: 1 }] }] }], truncated: false, originalBytes: 8, shownLines: 2 }),
    pickWorkspace: async () => ({ cancelled: false, workspace: { ...workspace } }),
    deleteWorkspace: async (id) => { workspaces = workspaces.filter((item) => item.id !== id); },
    skills: async () => ({ skills: [{ id: "codex:mock-skill", name: "Mock skill", description: "Deterministic fixture skill", source: "codex", scope: "system", path: "~/.codex/skills/mock-skill" }] }),
    skillContent: async () => ({ content: "# Mock skill", truncated: false })
  };

  const routing: RoutingPort = {
    providers: async () => ({ providers: providers.map((provider) => ({ ...provider, models: [...provider.models], supportedEngineIds: [...(provider.supportedEngineIds ?? [])] })) }),
    createProvider: async (input) => {
      const provider: ModelProviderSummary = {
        ...mockProvider(),
        id: input.id,
        name: input.name,
        protocol: input.protocol as ModelProviderSummary["protocol"],
        baseUrl: input.baseUrl,
        models: [...(input.models ?? [])],
        supportedEngineIds: [...(input.supportedEngineIds ?? [])],
        configured: false,
        credentialStatus: "missing",
        hasCredential: false
      };
      providers = [...providers, provider];
      return { providers: providers.map((item) => ({ ...item, models: [...item.models], supportedEngineIds: [...(item.supportedEngineIds ?? [])] })) };
    },
    updateProvider: async (id, input) => {
      providers = providers.map((provider) => provider.id === id ? {
        ...provider,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.protocol !== undefined ? { protocol: input.protocol as ModelProviderSummary["protocol"] } : {}),
        ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
        ...(input.models ? { models: [...input.models] } : {}),
        ...(input.supportedEngineIds ? { supportedEngineIds: [...input.supportedEngineIds] } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {})
      } : provider);
      return { providers: providers.map((item) => ({ ...item, models: [...item.models], supportedEngineIds: [...(item.supportedEngineIds ?? [])] })) };
    },
    deleteProvider: async (id) => { providers = providers.filter((provider) => provider.id !== id); },
    setProviderCredential: async (id) => {
      providers = providers.map((provider) => provider.id === id ? { ...provider, configured: true, credentialStatus: "configured", hasCredential: true } : provider);
      return { providerId: id, credentialStatus: "configured" };
    },
    deleteProviderCredential: async (id) => {
      providers = providers.map((provider) => provider.id === id ? { ...provider, configured: false, credentialStatus: "missing", hasCredential: false } : provider);
      return { providerId: id, credentialStatus: "missing" };
    },
    modelDeployments: async () => ({ deployments: deployments.map((deployment) => ({ ...deployment, capability: { ...deployment.capability }, exclusionCodes: [...deployment.exclusionCodes] })) }),
    createModelDeployment: async (input) => {
      const provider = providers.find((item) => item.id === input.providerId);
      const profile = profiles.find((item) => item.id === input.profileId);
      const deployment: ModelDeploymentSummary = {
        ...mockDeployment(),
        ...input,
        providerName: provider?.name,
        providerProtocol: provider?.protocol,
        providerEnabled: provider?.enabled,
        profileName: profile?.name,
        credentialStatus: provider?.credentialStatus ?? "missing",
        eligibility: "unknown",
        exclusionCodes: []
      };
      deployments = [...deployments, deployment];
      return { deployment, deployments: deployments.map((item) => ({ ...item, capability: { ...item.capability }, exclusionCodes: [...item.exclusionCodes] })) };
    },
    updateModelDeployment: async (id, input) => {
      deployments = deployments.map((deployment) => deployment.id === id ? { ...deployment, ...input } : deployment);
      return { deployment: deployments.find((deployment) => deployment.id === id), deployments: deployments.map((item) => ({ ...item, capability: { ...item.capability }, exclusionCodes: [...item.exclusionCodes] })) };
    },
    deleteModelDeployment: async (id) => { deployments = deployments.filter((deployment) => deployment.id !== id); },
    modelRoutes: async () => ({ routes: routes.map((route) => ({ ...route, candidateDeploymentIds: [...route.candidateDeploymentIds] })) }),
    createModelRoute: async (input) => {
      routes = [...routes, { ...input, createdAt: FIXED_TIME, updatedAt: FIXED_TIME }];
      return { routes: routes.map((route) => ({ ...route, candidateDeploymentIds: [...route.candidateDeploymentIds] })) };
    },
    updateModelRoute: async (id, input) => {
      routes = routes.map((route) => route.id === id ? { ...route, ...input, ...(input.candidateDeploymentIds ? { candidateDeploymentIds: [...input.candidateDeploymentIds] } : {}) } : route);
      return { routes: routes.map((route) => ({ ...route, candidateDeploymentIds: [...route.candidateDeploymentIds] })) };
    },
    deleteModelRoute: async (id) => { routes = routes.filter((route) => route.id !== id); },
    previewModelRoute: async (input) => ({ resolvedRoute: resolvedMockRoute(input.fixedDeploymentId), deployments: deployments.map((deployment) => ({ ...deployment, capability: { ...deployment.capability }, exclusionCodes: [...deployment.exclusionCodes] })) }),
    resolveSessionModelRoute: async (_id, fixedDeploymentId) => ({ resolvedRoute: resolvedMockRoute(fixedDeploymentId) })
  };

  const execution: ExecutionPort = {
    executionTasks: async (sessionId) => ({ tasks: executionSnapshots.filter((snapshot) => snapshot.task.sessionId === sessionId).map((snapshot) => structuredClone(snapshot)) }),
    executionTask: async (taskId) => {
      const snapshot = executionSnapshots.find((item) => item.task.id === taskId);
      if (!snapshot) throw new Error(`Unknown mock execution task: ${taskId}`);
      return structuredClone(snapshot);
    },
    confirmExecutionRetry: async (taskId) => {
      const snapshot = executionSnapshots.find((item) => item.task.id === taskId);
      if (!snapshot) throw new Error(`Unknown mock execution task: ${taskId}`);
      return structuredClone(snapshot);
    },
    cancelExecution: async (taskId) => {
      const snapshot = executionSnapshots.find((item) => item.task.id === taskId);
      if (!snapshot) throw new Error(`Unknown mock execution task: ${taskId}`);
      return structuredClone(snapshot);
    }
  };

  const ports: RuntimePortSet = {
    engines,
    sessions: sessionsPort,
    events,
    terminal,
    workspace: workspacePort,
    routing,
    execution,
    platform: new WebPlatformAdapter()
  };
  const runtime = new MockClientRuntime(ports);

  return {
    runtime,
    ports,
    scenarios: MOCK_RUNTIME_SCENARIOS,
    reset() {
      sessions = initialSessions.map((session) => ({ ...session }));
      workspaces = [{ ...workspace }];
      profiles = [{ ...profile }];
      providers = initialProviders.map((provider) => ({ ...provider, models: [...provider.models], supportedEngineIds: [...(provider.supportedEngineIds ?? [])] }));
      deployments = initialDeployments.map((deployment) => ({ ...deployment, capability: { ...deployment.capability }, exclusionCodes: [...deployment.exclusionCodes] }));
      routes = initialRoutes.map((route) => ({ ...route, candidateDeploymentIds: [...route.candidateDeploymentIds] }));
      executionSnapshots = [];
      subscriptionAttempts.clear();
      Object.values(MOCK_RUNTIME_SCENARIOS).forEach((scenario) => eventsBySession.set(scenario.sessionId, [...scenario.persistedEvents]));
    }
  };
}
