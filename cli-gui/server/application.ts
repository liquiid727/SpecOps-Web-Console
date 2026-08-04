import type http from "node:http";
import path from "node:path";
import { createHash } from "node:crypto";
import { WebSocket } from "ws";
import type {
  AgentInput,
  AppStateV3,
  CapabilityDetectionResult,
  CliProfileCapabilities,
  EngineReadiness,
  FilePreview,
  FileTreeEntry,
  FileTreePage,
  LanguageSummaryResponse,
  SessionV3,
  TranscriptEvent,
  TranscriptPage,
  WorkspaceV3
} from "../shared/types.js";
import type { ModelProviderConfig, ModelProviderSummary, SecretRef, SecretStatus } from "../shared/model-provider.js";
import type { ModelDeploymentConfig, ModelDeploymentSummary } from "../shared/model-deployment.js";
import type { PriorityModelRoute, ResolvedRoute, WorkspaceModelRouteBinding } from "../shared/model-route.js";
import type { ExecutionAttempt, ExecutionTask } from "../shared/execution-attempt.js";
import type { CliAdapterId } from "../shared/state.js";
import { ApiHttpError, sendJson } from "./api-errors.js";
import { commandPreview, requireArgs, requireText } from "./domain.js";
import { createRuntimeOrchestrator } from "./orchestrator.js";
import { classifyAgentTurnFailure } from "./agent-backends.js";
import { UnsupportedCliOptionError, mapDetectionFailureToDowngradeReason } from "./profile-adapters.js";
import { builtinModelIds, mergeModelSources, readConfiguredModels } from "./model-catalog.js";
import { ENHANCE_INPUT_LIMIT, EnhanceExecutionError, buildEnhancePrompt, runEnhance } from "./prompt-enhance.js";
import { listSkills, readSkillContent, type SkillScanOptions } from "./skills.js";
import { discoverTerminalResumeToken } from "./terminal-resume.js";
import { toEngineReadiness } from "./engine-readiness.js";
import type { Application, ApplicationDependencies, PersistentTurnHandlers } from "./ports.js";
import { createEnvironmentSecretStore, SecretStoreError } from "./secret-store.js";
import { summarizeDeployment, validateDeploymentInput, providerProtocolMatchesAdapter } from "./deployment-registry.js";
import { resolveModelRoute } from "./model-route-resolver.js";
import { RouteExecutionCoordinator, RouteExecutionError } from "./route-execution-coordinator.js";
import type { AttemptRunResult, RouteExecutionCandidate } from "./route-execution-coordinator.js";

const MAX_FILE_DEPTH = 32;
const MAX_FILE_PAGE = 500;
const MAX_LANGUAGE_FILES = 10_000;
const MAX_LANGUAGE_BYTES = 250 * 1024 * 1024;
const MAX_LANGUAGE_MS = 2_000;
const MAX_PREVIEW_BYTES = 1 * 1024 * 1024;
const MAX_TRANSCRIPT_RESPONSE_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_PENDING = 512;
const MAX_EVENT_PENDING_BYTES = 1 * 1024 * 1024;
const MAX_EVENT_BUFFERED_BYTES = 1 * 1024 * 1024;
const DEFAULT_MAX_RUNNING_SESSIONS = 8;
const MIN_MAX_RUNNING_SESSIONS = 4;
const MODEL_AUTO_SYNC_TTL_MS = 5 * 60 * 1000;

/** launchConfig 选项 → 常驻运行时参数："default"/空 → null（与 argv 路径 appendOption 跳过语义同源） */
function normalizeOption(value: string | null | undefined): string | null {
  return value && value !== "default" ? value : null;
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isProviderProtocol(value: unknown): value is ModelProviderConfig["protocol"] {
  return value === "openai-compatible" || value === "anthropic-compatible";
}

function validProviderUrl(value: unknown): value is string {
  if (!nonEmptyText(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname));
  } catch {
    return false;
  }
}

function validateRouteCandidates(value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8 || value.some((candidate) => !nonEmptyText(candidate)) || new Set(value).size !== value.length) {
    throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "A route must contain between 1 and 8 unique deployment ids.", { field: "candidateDeploymentIds" });
  }
}

function validateRouteInput(value: unknown): asserts value is { id: string; name: string; candidateDeploymentIds: string[]; enabled?: boolean; automaticTechnicalFallback?: boolean } {
  if (!value || typeof value !== "object") throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "Route must be an object.");
  const input = value as Record<string, unknown>;
  if (!nonEmptyText(input.id) || !nonEmptyText(input.name)) throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "Route id and name are required.");
  validateRouteCandidates(input.candidateDeploymentIds);
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "enabled must be a boolean.", { field: "enabled" });
  if (input.automaticTechnicalFallback !== undefined && typeof input.automaticTechnicalFallback !== "boolean") throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "automaticTechnicalFallback must be a boolean.", { field: "automaticTechnicalFallback" });
}

function sameStringList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

type EventSubscriber = { client: WebSocket; ready: boolean; pending: TranscriptEvent[]; pendingBytes: number };

export async function createApplication(dependencies: ApplicationDependencies): Promise<Application> {
  const state = await dependencies.stateRepository.load();
  state.providers ??= [];
  state.modelDeployments ??= [];
  state.modelRoutes ??= [];
  state.workspaceModelRouteBindings ??= [];
  const secretStore = dependencies.secretStore ?? createEnvironmentSecretStore(dependencies.policy.processEnvironment);
  const executionRepository = dependencies.executionRepository;
  const routeExecutionCoordinator = executionRepository ? new RouteExecutionCoordinator(executionRepository, () => dependencies.clock.now()) : undefined;
  const modelAutoSyncAt = new Map<string, number>();
  const modelAutoSyncPending = new Map<string, Promise<void>>();
  const configuredDefaultModelByProfile = new Map<string, string | undefined>();
  const nowMilliseconds = () => {
    const parsed = Date.parse(dependencies.clock.now());
    return Number.isFinite(parsed) ? parsed : Date.now();
  };
  // 全局并发上限（决策 D-6，runtime-orchestrator-spec §3.3）：默认 8、配置下限 4，非法值回落默认并告警
  const maxRunningSessions = resolveMaxRunningSessions(dependencies.policy.processEnvironment.SPECOS_MAX_RUNNING_SESSIONS, dependencies.logger);
  // terminal 原生 resume：记录本次 spawn 时刻（token 归因窗口起点）与本次启动使用的 token（失败兜底清除）
  const terminalSpawnAt = new Map<string, number>();
  const terminalResumeAttempt = new Map<string, string>();
  const discoverResumeToken = dependencies.terminalResumeDiscovery ?? discoverTerminalResumeToken;
  // 执行控制层：PTY Worker 生命周期由 orchestrator 承担；transcript 写入与 state 持久化经回调留在本层（runtime-orchestrator-spec §2.2）
  const orchestrator = createRuntimeOrchestrator({
    ptyRuntime: dependencies.ptyRuntime,
    clock: dependencies.clock,
    logger: dependencies.logger,
    turnTimeoutMs: parsePositiveInteger(dependencies.policy.processEnvironment.SPECOS_TURN_TIMEOUT_MS),
    approvalTimeoutMs: parsePositiveInteger(dependencies.policy.processEnvironment.SPECOS_APPROVAL_TIMEOUT_MS),
    callbacks: {
      async appendEvent(sessionId, input) {
        const session = getSession(sessionId);
        if (!session) return undefined;
        return appendEvent(session, input);
      },
      async onRuntimeStatus(sessionId, status, extra) {
        const session = getSession(sessionId);
        if (!session) return;
        if (status === "starting") {
          session.runtimeStatus = "starting";
          session.error = undefined;
          session.revision += 1;
          await dependencies.stateRepository.save(state);
        } else if (status === "running") {
          // 轮次成功后 Orchestrator 上报 resumeToken，写入 chatContext（domain-spec §2.1；保持 I-3：terminal 不写）
          if (extra?.resumeToken && session.interactionMode === "chat") {
            session.chatContext = { ...session.chatContext, resumeToken: extra.resumeToken };
            const profile = state.profiles.find((item) => item.id === session.profileId);
            const backendId = session.backendId ?? (profile ? backendIdForAdapter(profile.adapterId) : "unknown");
            session.backendId = backendId;
            session.backendSessionRef = {
              backendId,
              nativeSessionId: extra.resumeToken,
              transport: session.backendSessionRef?.transport ?? "json-stream"
            };
          }
          session.runtimeStatus = "running";
          session.lastActiveAt = dependencies.clock.now();
          session.revision += 1;
          await dependencies.stateRepository.save(state);
          publishSessionUpdate(session);
        } else if (status === "stopped") {
          session.runtimeStatus = "stopped";
          session.exitCode = extra?.exitCode;
          session.lastActiveAt = dependencies.clock.now();
          session.revision += 1;
          await captureTerminalResumeToken(session);
          await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session stopped.", metadata: { status: "stopped", exitCode: extra?.exitCode ?? -1 } });
          await dependencies.stateRepository.save(state);
          publishSessionUpdate(session);
        } else if (status === "error") {
          session.runtimeStatus = "error";
          session.error = { code: "SESSION_START_FAILED", message: extra?.errorMessage ?? "Failed to start the session.", occurredAt: dependencies.clock.now() };
          session.revision += 1;
          await clearFailedTerminalResume(session);
          await dependencies.stateRepository.save(state);
          await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: session.error.message, metadata: { code: "SESSION_START_FAILED" } });
          publishSessionUpdate(session);
        }
      },
      onActivity(sessionId) {
        touchSession(sessionId);
      },
      hasSession(sessionId) {
        return Boolean(getSession(sessionId));
      },
      onTurnStatus(sessionId, turnId, status) {
        // 实时提示帧：不承载内容、断线不补发（api-spec §4.2）
        publishToSubscriber(sessionId, { type: "turn-status", turnId, status });
      },
      onTurnDelta(sessionId, turnId, delta) {
        // 流式增量帧：同 turn-status 临时帧语义，不落 transcript（streaming-spec FR-1）
        publishToSubscriber(sessionId, { type: "turn-delta", turnId, delta });
      }
    }
  });
  const sessionMutationLocks = new Map<string, Promise<void>>();
  const eventSubscribers = new Map<string, Set<EventSubscriber>>();
  const pendingTouches = new Set<string>();
  const pickerIntentTtlMs = dependencies.policy.pickerIntentTtlMs ?? 60_000;
  let pickerIntent = dependencies.idGenerator.create("picker-intent");
  let pickerIntentExpiresAt = Date.now() + pickerIntentTtlMs;
  let pickerInFlight = false;
  let closing = false;
  let closePromise: Promise<void> | undefined;
  let activeOperations = 0;
  const idleWaiters = new Set<() => void>();

  const beginOperation = () => {
    if (closing) throw new Error("application is shutting down");
    activeOperations += 1;
  };
  const endOperation = () => {
    activeOperations -= 1;
    if (activeOperations === 0) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters.clear();
    }
  };
  const waitForIdle = () => activeOperations === 0 ? Promise.resolve() : new Promise<void>((resolve) => idleWaiters.add(resolve));

  function renewPickerIntent() {
    pickerIntent = dependencies.idGenerator.create("picker-intent");
    pickerIntentExpiresAt = Date.now() + pickerIntentTtlMs;
  }

  const getSession = (id: string) => state.sessions.find((session) => session.id === id);
  const serializeSession = (session: SessionV3) => ({ ...session, status: session.runtimeStatus });
  const serializeState = () => {
    if (Date.now() >= pickerIntentExpiresAt) renewPickerIntent();
    return {
      ...state,
      sessions: state.sessions.map(serializeSession),
      readonly: dependencies.policy.readonly,
      maxRunningSessions,
      csrfCapability: dependencies.policy.csrfCapability,
      pickerIntentToken: pickerIntent
    };
  };
  const requireSession = (id: string) => {
    const session = getSession(id);
    if (!session) throw new ApiHttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    return session;
  };
  const nextManualOrder = () => Math.max(0, ...state.sessions.map((session) => session.manualOrder ?? 0)) + 1000;

  function publishToSubscriber(sessionId: string, frame: unknown) {
    const encoded = JSON.stringify(frame);
    const subscribers = eventSubscribers.get(sessionId);
    for (const subscriber of subscribers ?? []) {
      if (subscriber.client.readyState !== WebSocket.OPEN) continue;
      if (subscriber.client.bufferedAmount > MAX_EVENT_BUFFERED_BYTES) {
        subscribers?.delete(subscriber);
        subscriber.client.close(1013, "event subscriber is behind");
        continue;
      }
      subscriber.client.send(encoded);
    }
  }

  function publishTranscript(event: TranscriptEvent) {
    const subscribers = eventSubscribers.get(event.sessionId);
    const encoded = JSON.stringify({ type: "transcript-event", event });
    const encodedBytes = Buffer.byteLength(encoded, "utf8");
    for (const subscriber of subscribers ?? []) {
      if (!subscriber.ready) {
        if (subscriber.pending.length >= MAX_EVENT_PENDING || subscriber.pendingBytes + encodedBytes > MAX_EVENT_PENDING_BYTES) {
          subscribers?.delete(subscriber);
          subscriber.client.close(1013, "transcript replay is behind");
          continue;
        }
        subscriber.pending.push(event);
        subscriber.pendingBytes += encodedBytes;
      } else if (subscriber.client.readyState === WebSocket.OPEN) {
        if (subscriber.client.bufferedAmount > MAX_EVENT_BUFFERED_BYTES) {
          subscribers?.delete(subscriber);
          subscriber.client.close(1013, "transcript subscriber is behind");
          continue;
        }
        subscriber.client.send(encoded);
      }
    }
  }

  function publishSessionUpdate(session: SessionV3) {
    publishToSubscriber(session.id, { type: "session-updated", session: serializeSession(session) });
  }

  function retentionFloor(sessionId: string) {
    const boundaries = state.sessions.filter((candidate) => candidate.parentSessionId === sessionId && candidate.forkSequence !== undefined).map((candidate) => candidate.forkSequence!);
    return boundaries.length ? Math.min(...boundaries) : undefined;
  }

  async function appendEvent(session: SessionV3, input: Omit<Parameters<ApplicationDependencies["transcriptRepository"]["append"]>[0], "sessionId" | "sequenceOffset">) {
    try {
      const event = await dependencies.transcriptRepository.append({
        ...input,
        sessionId: session.id,
        sequenceOffset: session.parentSessionId ? session.forkSequence ?? 0 : undefined,
        retentionFloorSequence: retentionFloor(session.id)
      });
      publishTranscript(event);
      return event;
    } catch (error) {
      dependencies.logger.warn("Transcript append failed", { sessionId: session.id, error: String(error) });
      publishToSubscriber(session.id, { type: "recording-warning", code: "TRANSCRIPT_WRITE_FAILED" });
      return undefined;
    }
  }

  function touchSession(id: string) {
    if (closing || pendingTouches.has(id)) return;
    const session = getSession(id);
    if (!session) return;
    session.lastActiveAt = dependencies.clock.now();
    pendingTouches.add(id);
    setTimeout(() => {
      pendingTouches.delete(id);
      if (!closing) void dependencies.stateRepository.save(state).catch((error) => dependencies.logger.warn("Activity persistence failed", { error: String(error) }));
    }, 200);
  }

  async function withSessionMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = sessionMutationLocks.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const chain = previous.catch(() => undefined).then(() => gate);
    sessionMutationLocks.set(sessionId, chain);
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (sessionMutationLocks.get(sessionId) === chain) sessionMutationLocks.delete(sessionId);
    }
  }

  const readProfileConfiguredModels = async (profile: AppStateV3["profiles"][number]) => dependencies.modelSyncReader
    ? { models: await dependencies.modelSyncReader(profile) }
    : await readConfiguredModels(profile.adapterId);

  async function maybeAutoSync(profile: AppStateV3["profiles"][number]) {
    const now = nowMilliseconds();
    const lastSync = modelAutoSyncAt.get(profile.id);
    if (lastSync !== undefined && now - lastSync < MODEL_AUTO_SYNC_TTL_MS) return;
    if (profile.adapterId === "generic") {
      modelAutoSyncAt.set(profile.id, now);
      return;
    }
    const pending = modelAutoSyncPending.get(profile.id);
    if (pending) return pending;

    const operation = (async () => {
      // Mark before the read so concurrent capability requests share one bounded attempt.
      modelAutoSyncAt.set(profile.id, now);
      try {
        const snapshot = await readProfileConfiguredModels(profile);
        if (!snapshot) {
          dependencies.logger.warn("Automatic model sync skipped", { profileId: profile.id, adapterId: profile.adapterId, reason: "configuration-unavailable" });
          return;
        }
        const previous = profile.syncedModels ?? [];
        if (!sameStringList(previous, snapshot.models)) {
          profile.syncedModels = snapshot.models;
          await dependencies.stateRepository.save(state);
        }
        if (snapshot.defaultModel && snapshot.defaultModel !== "default") configuredDefaultModelByProfile.set(profile.id, snapshot.defaultModel);
        else configuredDefaultModelByProfile.delete(profile.id);
      } catch (error) {
        dependencies.logger.warn("Automatic model sync failed", { profileId: profile.id, adapterId: profile.adapterId, error: String(error) });
      }
    })();
    modelAutoSyncPending.set(profile.id, operation);
    try {
      await operation;
    } finally {
      if (modelAutoSyncPending.get(profile.id) === operation) modelAutoSyncPending.delete(profile.id);
    }
  }

  function providerModelIds(profile: AppStateV3["profiles"][number]) {
    return [...new Set((state.providers ?? [])
      .filter((provider) => provider.enabled !== false && providerProtocolMatchesAdapter(provider.protocol, profile.adapterId))
      .flatMap((provider) => provider.models))];
  }

  function decorateCapabilities(profile: AppStateV3["profiles"][number], capabilities: CapabilityDetectionResult): CapabilityDetectionResult {
    const defaultModel = configuredDefaultModelByProfile.get(profile.id) ?? capabilities.defaultModel;
    const knownModels = new Set([
      ...capabilities.models.map((model) => model.id),
      ...builtinModelIds(profile.adapterId, capabilities.detectedVersion)
    ]);
    const seenProviderModels = new Set<string>();
    const modelGroups = (state.providers ?? [])
      .filter((provider) => provider.enabled !== false && providerProtocolMatchesAdapter(provider.protocol, profile.adapterId))
      .map((provider) => ({
        providerId: provider.id,
        providerName: provider.name,
        models: [...new Set(provider.models)].filter((id) => !knownModels.has(id) && !seenProviderModels.has(id)).map((id) => {
          seenProviderModels.add(id);
          return { id, labelKey: `provider.model.${id}`, requiresRestart: true };
        })
      }))
      .filter((group) => group.models.length);
    const providerModels = modelGroups.flatMap((group) => group.models);
    const next = providerModels.length || modelGroups.length ? { ...capabilities, models: [...capabilities.models, ...providerModels], modelGroups } : capabilities;
    return defaultModel && defaultModel !== "default" && next.models.some((model) => model.id === defaultModel)
      ? { ...next, defaultModel }
      : next;
  }

  async function resolveCapabilities(profile: SessionV3["profileId"] extends string ? AppStateV3["profiles"][number] : never): Promise<CapabilityDetectionResult> {
    await maybeAutoSync(profile);
    const adapter = profile.adapterId;
    if (dependencies.agentBackends) return decorateCapabilities(profile, await dependencies.agentBackends.probe(profile));
    if (dependencies.profileAdapters.capabilities) return decorateCapabilities(profile, await dependencies.profileAdapters.capabilities(profile));
    return decorateCapabilities(profile, { adapterId: adapter, compatibility: adapter === "generic" ? "supported" : "unknown-version", permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: false, supportsHeadlessTurns: false, supportsResume: false, supportsApproval: false, supportsPromptEnhancement: false, guiMode: "unsupported" as const });
  }

  const requireProfile = (id: string) => {
    const profile = state.profiles.find((item) => item.id === id);
    if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    return profile;
  };

  function normalizedSecretRef(provider: ModelProviderConfig): SecretRef | undefined {
    const value = provider.credentialRef;
    if (!value) return undefined;
    if (value.startsWith("env:") || value.startsWith("keychain:")) return value as SecretRef;
    return /^[A-Z][A-Z0-9_]*$/.test(value) ? `env:${value}` as SecretRef : undefined;
  }

  async function providerStatus(provider: ModelProviderConfig): Promise<SecretStatus> {
    const ref = normalizedSecretRef(provider);
    if (!ref) return "missing";
    return secretStore.status(ref);
  }

  async function providerSummary(provider: ModelProviderConfig): Promise<ModelProviderSummary> {
    const credentialStatus = await providerStatus(provider);
    return {
      id: provider.id,
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      models: [...provider.models],
      supportedEngineIds: [...(provider.supportedEngineIds ?? [])],
      enabled: provider.enabled !== false,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      configured: credentialStatus === "configured" || credentialStatus === "legacy-environment",
      credentialStatus,
      hasCredential: credentialStatus === "configured" || credentialStatus === "legacy-environment"
    };
  }

  function requireProvider(id: string) {
    const provider = state.providers!.find((item) => item.id === id);
    if (!provider) throw new ApiHttpError(404, "PROVIDER_NOT_FOUND", "Provider not found.");
    return provider;
  }

  function validateProvider(value: unknown, partial = false) {
    if (!value || typeof value !== "object") throw new ApiHttpError(400, "VALIDATION_FAILED", "Provider must be an object.", { field: "provider" });
    const input = value as Record<string, unknown>;
    if (!partial && (!nonEmptyText(input.id))) throw new ApiHttpError(400, "VALIDATION_FAILED", "id is required.", { field: "id" });
    if (!partial && (!nonEmptyText(input.name))) throw new ApiHttpError(400, "VALIDATION_FAILED", "name is required.", { field: "name" });
    if (!partial && !isProviderProtocol(input.protocol)) throw new ApiHttpError(400, "VALIDATION_FAILED", "protocol is invalid.", { field: "protocol" });
    if (!partial && !nonEmptyText(input.baseUrl)) throw new ApiHttpError(400, "VALIDATION_FAILED", "baseUrl is required.", { field: "baseUrl" });
    if (input.protocol !== undefined && !isProviderProtocol(input.protocol)) throw new ApiHttpError(400, "VALIDATION_FAILED", "protocol is invalid.", { field: "protocol" });
    if (input.baseUrl !== undefined && !validProviderUrl(input.baseUrl)) throw new ApiHttpError(400, "PROVIDER_ENDPOINT_INVALID", "Provider endpoint must use HTTPS or localhost HTTP.", { field: "baseUrl" });
    if (input.credentialRef !== undefined && (typeof input.credentialRef !== "string" || !(/^(?:env:)?[A-Z][A-Z0-9_]*$/.test(input.credentialRef) && !input.credentialRef.startsWith("keychain:")))) throw new ApiHttpError(400, "VALIDATION_FAILED", "credentialRef must be a SecretRef or environment variable name.", { field: "credentialRef" });
    if (input.models !== undefined && (!Array.isArray(input.models) || input.models.some((item) => typeof item !== "string"))) throw new ApiHttpError(400, "VALIDATION_FAILED", "models must be a string array.", { field: "models" });
    if (input.supportedEngineIds !== undefined && (!Array.isArray(input.supportedEngineIds) || input.supportedEngineIds.some((item) => typeof item !== "string"))) throw new ApiHttpError(400, "VALIDATION_FAILED", "supportedEngineIds must be a string array.", { field: "supportedEngineIds" });
    if (input.enabled !== undefined && typeof input.enabled !== "boolean") throw new ApiHttpError(400, "VALIDATION_FAILED", "enabled must be a boolean.", { field: "enabled" });
  }

  async function deploymentSummaries(): Promise<ModelDeploymentSummary[]> {
    const deployments = state.modelDeployments ?? [];
    const summaries: ModelDeploymentSummary[] = [];
    for (const deployment of deployments) {
      const provider = state.providers?.find((item) => item.id === deployment.providerId);
      const profile = state.profiles.find((item) => item.id === deployment.profileId);
      const credentials = provider ? await providerStatus(provider) : "missing" as const;
      let capabilities: CliProfileCapabilities | undefined;
      let models: { id: string }[] | undefined;
      if (profile) {
        capabilities = await resolveCapabilities(profile).catch(() => undefined);
        models = capabilities?.models ?? (profile.syncedModels ?? []).map((id) => ({ id }));
      }
      summaries.push(summarizeDeployment({ deployment, provider, providerStatus: credentials, profile, capabilities, models, now: dependencies.clock.now() }));
    }
    return summaries;
  }

  function requireDeployment(id: string) {
    const deployment = state.modelDeployments!.find((item) => item.id === id);
    if (!deployment) throw new ApiHttpError(404, "MODEL_DEPLOYMENT_NOT_FOUND", "Model deployment not found.");
    return deployment;
  }

  async function resolveSessionRoute(session: SessionV3, fixedDeploymentId?: string): Promise<ResolvedRoute> {
    const workspaceBinding = state.workspaceModelRouteBindings?.find((binding) => binding.workspaceId === session.workspaceId);
    const resolved = resolveModelRoute({
      routes: state.modelRoutes ?? [],
      deployments: await deploymentSummaries(),
      now: dependencies.clock.now(),
      globalRouteId: state.globalModelRouteId,
      projectRouteId: workspaceBinding?.routeId,
      sessionRouteId: session.modelRouteId,
      ...(fixedDeploymentId ? { routeOverride: { fixedDeploymentId } } : {}),
      legacy: { profileId: session.profileId, modelId: session.chatContext?.activeModel ?? session.launchConfig.model, source: session.chatContext?.activeModel ? "active-model" : session.launchConfig.model ? "launch-config" : "profile-default" }
    });
    return resolved;
  }

  function requireBoundRoute(value: unknown): string {
    if (!nonEmptyText(value)) throw new ApiHttpError(400, "ROUTE_BINDING_INVALID", "routeId must be a non-empty string.", { field: "routeId" });
    const route = state.modelRoutes!.find((candidate) => candidate.id === value);
    if (!route || !route.enabled || route.archivedAt) throw new ApiHttpError(400, "ROUTE_BINDING_INVALID", "The selected route is not active.", { routeId: value });
    return value;
  }

  async function providerLaunchFor(providerId: string | undefined, profile: AppStateV3["profiles"][number]) {
    if (!providerId) return { args: [] as string[], env: {} as Record<string, string> };
    const provider = requireProvider(providerId);
    if (!providerProtocolMatchesAdapter(provider.protocol, profile.adapterId)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Provider protocol does not match the selected CLI profile.", { field: "providerId" });
    const ref = normalizedSecretRef(provider);
    const envName = ref?.startsWith("env:") ? ref.slice(4) : undefined;
    if (!ref) throw new ApiHttpError(400, "PROVIDER_CREDENTIAL_MISSING", `Provider credential is missing${envName ? ` (${envName})` : ""}.`, { providerId: provider.id });
    let secret: string;
    try { secret = await secretStore.resolve(ref); }
    catch (error) {
      if (error instanceof SecretStoreError) {
        const code = error.code === "SECRET_STORE_UNAVAILABLE" ? "SECRET_STORE_UNAVAILABLE" : "PROVIDER_CREDENTIAL_MISSING";
        const message = code === "PROVIDER_CREDENTIAL_MISSING" && envName ? `Provider credential ${envName} is missing.` : error.message;
        throw new ApiHttpError(400, code, message, { providerId: provider.id });
      }
      throw error;
    }
    if (provider.protocol === "anthropic-compatible") return { args: [] as string[], env: { ANTHROPIC_BASE_URL: provider.baseUrl, ANTHROPIC_AUTH_TOKEN: secret } };
    const envKey = `SPECOS_PROVIDER_${provider.id.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}_KEY`;
    return {
      args: ["-c", `model_provider=${provider.id}`, "-c", `model_providers.${provider.id}.base_url=${provider.baseUrl}`, "-c", `model_providers.${provider.id}.api_key_env=${envKey}`],
      env: { [envKey]: secret }
    };
  }

  async function providerLaunch(session: SessionV3, profile: AppStateV3["profiles"][number]) {
    return providerLaunchFor(session.providerId, profile);
  }

  async function routeForSession(session: SessionV3, fixedDeploymentId?: string) {
    const resolved = await resolveSessionRoute(session, fixedDeploymentId);
    if (fixedDeploymentId && resolved.kind !== "route") {
      throw new ApiHttpError(409, "ROUTE_FIXED_DEPLOYMENT_UNAVAILABLE", "A fixed deployment requires an active model route.", { fixedDeploymentId });
    }
    if (!resolved.canSend) {
      throw new ApiHttpError(409, resolved.errorCode ?? "ROUTE_NO_CANDIDATE", "The selected model route has no executable deployment.", { routeId: resolved.routeId, fixedDeploymentId: resolved.fixedDeploymentId });
    }
    const deployment = resolved.selectedDeploymentId ? requireDeployment(resolved.selectedDeploymentId) : undefined;
    if (deployment && deployment.profileId !== session.profileId) {
      throw new ApiHttpError(409, "ROUTE_UNSUPPORTED_ENGINE", "The selected deployment uses a different Agent Engine than this session.", { deploymentId: deployment.id, profileId: deployment.profileId, sessionProfileId: session.profileId });
    }
    return { resolved, deployment };
  }

  /** 三层模型来源合并 + source 标注（console-gaps SPEC §2.4）：builtin 仅在探测 supported 时参与，同步/导入条目始终展示 */
  async function mergedProfileModels(profile: AppStateV3["profiles"][number]) {
    const capabilities = await resolveCapabilities(profile);
    const builtin = capabilities.compatibility === "supported" ? builtinModelIds(profile.adapterId, capabilities.detectedVersion) : [];
    return mergeModelSources(builtin, [...(profile.syncedModels ?? []), ...providerModelIds(profile)], profile.customModels ?? []);
  }

  /** 执行 CLI 命令发现模型并写入 synced 层（issue-053）：adapter 无 discoverModels 时保持原列表 */
  async function syncModels(profileId: string) {
    const profile = requireProfile(profileId);
    if (dependencies.profileAdapters.discoverModels) profile.syncedModels = await dependencies.profileAdapters.discoverModels(profile);
    await dependencies.stateRepository.save(state);
    modelAutoSyncAt.set(profile.id, nowMilliseconds());
    return { models: await mergedProfileModels(profile), synced: profile.syncedModels ?? [] };
  }

  async function resolveLaunch(profile: AppStateV3["profiles"][number], config: SessionV3["launchConfig"], resumeToken?: string) {
    try {
      if (dependencies.profileAdapters.resolveLaunch) {
        await maybeAutoSync(profile);
        const launch = await dependencies.profileAdapters.resolveLaunch(profile, resumeToken ? { ...config, resumeToken } : config);
        return { ...launch, capabilities: decorateCapabilities(profile, launch.capabilities) };
      }
      const capabilities = await resolveCapabilities(profile);
      if (config.permission || config.mode || config.model) throw new UnsupportedCliOptionError(config.permission ?? config.mode ?? config.model ?? "option");
      return { command: profile.command, args: [...profile.args], capabilities };
    } catch (error) {
      if (error instanceof UnsupportedCliOptionError || (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "CLI_OPTION_UNSUPPORTED")) {
        throw new ApiHttpError(400, "CLI_OPTION_UNSUPPORTED", "The selected CLI option is not supported.", { option: error instanceof UnsupportedCliOptionError ? error.option : undefined });
      }
      throw error;
    }
  }

  /** terminal 会话退出后归因捕获 CLI 原生会话 id（best-effort，失败静默）；仅用户下次点「恢复」时才会用它 resume */
  async function captureTerminalResumeToken(session: SessionV3) {
    const spawnedAt = terminalSpawnAt.get(session.id);
    terminalSpawnAt.delete(session.id);
    terminalResumeAttempt.delete(session.id);
    if (spawnedAt === undefined || session.interactionMode !== "terminal") return;
    const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
    const profile = state.profiles.find((item) => item.id === session.profileId);
    if (!workspace || !profile) return;
    const token = await discoverResumeToken({ adapterId: profile.adapterId, cwd: workspace.path, sinceMs: spawnedAt, env: dependencies.policy.processEnvironment });
    if (token) {
      session.terminalContext = { ...session.terminalContext, resumeToken: token };
      const backendId = session.backendId ?? backendIdForAdapter(profile.adapterId);
      session.backendId = backendId;
      session.backendSessionRef = { backendId, nativeSessionId: token, transport: "pty" };
    }
  }

  /** 以 resume 启动失败（token 过期/被清理）时清除凭据，下次恢复回到全新启动 */
  async function clearFailedTerminalResume(session: SessionV3) {
    const attempted = terminalResumeAttempt.get(session.id);
    terminalSpawnAt.delete(session.id);
    terminalResumeAttempt.delete(session.id);
    if (!attempted || session.terminalContext?.resumeToken !== attempted) return;
    session.terminalContext = { ...session.terminalContext, resumeToken: undefined };
    await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Native resume failed; the next start launches a fresh CLI session.", metadata: { resume: "cleared" } });
  }

  async function startSession(sessionId: string, confirmed: boolean, cols = 100, rows = 30, fixedDeploymentId?: string): Promise<SessionV3 | undefined> {
    if (dependencies.policy.readonly) throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables local process startup.");
    if (!confirmed) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
    const chatSession = getSession(sessionId);
    // D-6 并发检查：计数口径 runtimeStatus ∈ {starting, running}（terminal 与 chat 合并）；已运行会话的幂等 start 不受限，不排队
    if (chatSession && chatSession.runtimeStatus !== "starting" && chatSession.runtimeStatus !== "running") {
      const running = state.sessions.filter((item) => item.runtimeStatus === "starting" || item.runtimeStatus === "running").length;
      if (running >= maxRunningSessions) throw new ApiHttpError(429, "SESSION_CONCURRENCY_LIMIT", "Running session limit reached.", { running, limit: maxRunningSessions });
    }
    if (chatSession?.interactionMode === "chat") {
      // chat 会话 start 不 spawn PTY（api-spec §2.6）：校验后标记 running，Worker 由首轮 submitTurn 隐式创建
      const workspace = state.workspaces.find((item) => item.id === chatSession.workspaceId);
      const profile = state.profiles.find((item) => item.id === chatSession.profileId);
      if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
      if (chatSession.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
      const { deployment } = await routeForSession(chatSession, fixedDeploymentId);
      await resolveLaunch(profile, { ...chatSession.launchConfig, ...(deployment ? { model: deployment.modelId } : {}) });
      await providerLaunchFor(deployment?.providerId ?? chatSession.providerId, profile);
      if (chatSession.runtimeStatus !== "running") {
        chatSession.runtimeStatus = "running";
        chatSession.error = undefined;
        chatSession.lastActiveAt = dependencies.clock.now();
        chatSession.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(chatSession);
      }
      return getSession(sessionId);
    }
    // prepare 在 orchestrator 启动锁内执行且最多一次；这里保留全部会话/配置校验语义
    await orchestrator.start(sessionId, async () => {
      const session = requireSession(sessionId);
      const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
      const profile = state.profiles.find((item) => item.id === session.profileId);
      if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
      if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before it can start.");
      // 存在已捕获的 token 时以 CLI 原生 resume 启动（codex resume <id> / claude --resume <id>），续上上一次交互上下文
      const resumeToken = session.terminalContext?.resumeToken;
      const { deployment } = await routeForSession(session, fixedDeploymentId);
      const launch = await resolveLaunch(profile, { ...session.launchConfig, ...(deployment ? { model: deployment.modelId } : {}) }, resumeToken);
      const provider = await providerLaunchFor(deployment?.providerId ?? session.providerId, profile);
      if (resumeToken) terminalResumeAttempt.set(sessionId, resumeToken);
      else terminalResumeAttempt.delete(sessionId);
      // 归因窗口留 2s 宽容：避免 CLI 建档时间略早于本处记录时刻而漏捕
      terminalSpawnAt.set(sessionId, Date.parse(dependencies.clock.now()) - 2_000);
      return { command: launch.command, args: [...launch.args, ...provider.args], cwd: workspace.path, env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...provider.env } };
    }, { cols, rows });
    return getSession(sessionId);
  }

  async function stopSession(sessionId: string) {
    const hadRuntime = await orchestrator.stop(sessionId);
    // chat 常驻进程随会话 stop 释放（streaming-spec FR-6）
    dependencies.persistentChatRuntime?.release(sessionId);
    const session = getSession(sessionId);
    if (!hadRuntime && (!session || session.runtimeStatus === "stopped")) return session;
    if (session) {
      session.runtimeStatus = "stopped";
      session.lastActiveAt = dependencies.clock.now();
      session.revision += 1;
      // 用户主动 stop 不经过 onRuntimeStatus("stopped")（orchestrator 先删 worker），在此同样归因捕获 resume token
      await captureTerminalResumeToken(session);
      await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: "Session stopped by user.", metadata: { status: "stopped" } });
      await dependencies.stateRepository.save(state);
      publishSessionUpdate(session);
    }
    return session;
  }

  async function validateWorkspacePath(input: string, excludeId?: string, allowExisting = false) {
    if (input.includes("\0")) throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path is invalid.");
    const resolved = path.resolve(input);
    const stat = await dependencies.filesystem.stat(resolved).catch(() => undefined);
    if (!stat?.isDirectory()) throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.");
    await dependencies.filesystem.access(resolved).catch((error) => {
      throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path must be an existing accessible directory.", undefined, { cause: error });
    });
    const canonical = await dependencies.filesystem.realpath(resolved).catch((error) => {
      throw new ApiHttpError(400, "WORKSPACE_PATH_INVALID", "Workspace path could not be canonicalized.", undefined, { cause: error });
    });
    if (!allowExisting && state.workspaces.some((workspace) => workspace.id !== excludeId && workspace.path === canonical)) throw new ApiHttpError(409, "WORKSPACE_DUPLICATE", "Workspace is already registered.");
    return canonical;
  }

  async function getWorkspace(id: string) {
    const workspace = state.workspaces.find((item) => item.id === id);
    if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
    return workspace;
  }

  async function workspaceTarget(workspaceId: string, relativeInput = "") {
    const workspace = await getWorkspace(workspaceId);
    if (relativeInput.includes("\0") || path.isAbsolute(relativeInput) || /^[A-Za-z]:[\\/]/.test(relativeInput) || relativeInput.startsWith("\\")) {
      throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    }
    const root = await dependencies.filesystem.realpath(workspace.path);
    const normalizedInput = relativeInput.replaceAll("\\", "/");
    const normalized = path.posix.normalize(normalizedInput || ".");
    const segments = normalized.split("/");
    if (segments.includes("..") || segments.includes(".git")) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    const target = path.resolve(root, normalized === "." ? "." : normalized);
    const realTarget = await dependencies.filesystem.realpath(target).catch((error) => {
      throw new ApiHttpError(404, "FILE_NOT_FOUND", "File not found.", undefined, { cause: error });
    });
    const containment = path.relative(root, realTarget);
    if (containment.startsWith("..") || path.isAbsolute(containment)) throw new ApiHttpError(400, "WORKSPACE_PATH_ESCAPE", "Path is outside the workspace.");
    return { workspace, root, target: realTarget, relative: containment === "" ? "" : containment.replaceAll(path.sep, "/") };
  }

  async function listWorkspaceFiles(workspaceId: string, requestedPath: string, cursor: string | undefined, requestedLimit: number | undefined): Promise<FileTreePage> {
    const { target, relative, root } = await workspaceTarget(workspaceId, requestedPath);
    if (!(await dependencies.filesystem.stat(target)).isDirectory()) throw new ApiHttpError(400, "VALIDATION_FAILED", "File listing path must be a directory.");
    if (requestedLimit !== undefined && (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page limit is invalid.");
    if (cursor !== undefined && !/^\d+$/.test(cursor)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page cursor is invalid.");
    const limit = Math.max(1, Math.min(requestedLimit ?? MAX_FILE_PAGE, MAX_FILE_PAGE));
    const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
    if (!Number.isSafeInteger(offset)) throw new ApiHttpError(400, "VALIDATION_FAILED", "File page cursor is invalid.");
    const gitFiles = dependencies.gitInspector.listVisibleFiles ? await dependencies.gitInspector.listVisibleFiles(root).catch(() => undefined) : undefined;
    if (gitFiles) {
      const prefix = relative ? `${relative.replace(/\/$/, "")}/` : "";
      const children = new Map<string, FileTreeEntry>();
      for (const filePath of gitFiles) {
        if (!isSafeRelativePath(filePath) || !filePath.startsWith(prefix) || filePath.split("/").length > MAX_FILE_DEPTH) continue;
        const rest = filePath.slice(prefix.length);
        if (!rest) continue;
        const [name, ...tail] = rest.split("/");
        const childPath = path.posix.join(relative, name);
        children.set(childPath, { name, path: childPath, type: tail.length ? "directory" : "file" });
      }
      const entries = [...children.values()].sort(compareFileEntries);
      return { path: relative, entries: entries.slice(offset, offset + limit), nextCursor: offset + limit < entries.length ? String(offset + limit) : undefined, omittedCount: Math.max(0, entries.length - offset - limit), visibilitySource: "git" };
    }

    const entries: FileTreeEntry[] = [];
    for (const entry of await dependencies.filesystem.readdir(target)) {
      if (entry.name === ".git" || isExcluded(entry.name) || entry.isSymlink) continue;
      const entryPath = path.posix.join(relative, entry.name);
      const stat = await dependencies.filesystem.stat(path.join(target, entry.name)).catch(() => undefined);
      entries.push({ name: entry.name, path: entryPath, type: entry.type, size: stat?.size });
    }
    entries.sort(compareFileEntries);
    return { path: relative, entries: entries.slice(offset, offset + limit), nextCursor: offset + limit < entries.length ? String(offset + limit) : undefined, omittedCount: Math.max(0, entries.length - offset - limit), visibilitySource: "fallback-exclusions" };
  }

  async function previewWorkspaceFile(workspaceId: string, requestedPath: string): Promise<FilePreview> {
    const { target, relative } = await workspaceTarget(workspaceId, requestedPath);
    const stat = await dependencies.filesystem.stat(target);
    if (stat.isDirectory()) throw new ApiHttpError(400, "VALIDATION_FAILED", "Preview path must be a file.");
    const bounded = dependencies.filesystem.readFileBounded ? await dependencies.filesystem.readFileBounded(target, MAX_PREVIEW_BYTES) : { buffer: await dependencies.filesystem.readFile(target), size: stat.size ?? 0 };
    const buffer = bounded.buffer.subarray(0, MAX_PREVIEW_BYTES);
    const size = bounded.size || buffer.length;
    if (buffer.includes(0)) return { path: relative, kind: "binary", size, truncated: false, shownBytes: 0 };
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      return { path: relative, kind: "binary", size, truncated: false, shownBytes: 0 };
    }
    return { path: relative, kind: size > MAX_PREVIEW_BYTES ? "oversized" : "text", size, encoding: "utf-8", content, truncated: size > MAX_PREVIEW_BYTES, shownBytes: buffer.length };
  }

  async function visibleFilePaths(workspaceId: string) {
    const { root } = await workspaceTarget(workspaceId);
    const gitFiles = dependencies.gitInspector.listVisibleFiles ? await dependencies.gitInspector.listVisibleFiles(root).catch(() => undefined) : undefined;
    if (gitFiles) {
      const safePaths = gitFiles.filter((filePath) => isSafeRelativePath(filePath) && filePath.split("/").length <= MAX_FILE_DEPTH);
      return { root, paths: safePaths.slice(0, MAX_LANGUAGE_FILES), truncated: safePaths.length > MAX_LANGUAGE_FILES, visibilitySource: "git" as const };
    }
    const paths: string[] = [];
    let visitedFiles = 0;
    let truncated = false;
    async function visit(directory: string, relative: string, depth: number) {
      if (depth > MAX_FILE_DEPTH || paths.length >= MAX_LANGUAGE_FILES) {
        if (paths.length >= MAX_LANGUAGE_FILES) truncated = true;
        return;
      }
      for (const entry of await dependencies.filesystem.readdir(directory)) {
        if (entry.name === ".git" || isExcluded(entry.name) || entry.isSymlink) continue;
        const nextRelative = path.posix.join(relative, entry.name);
        const nextTarget = path.join(directory, entry.name);
        if (entry.type === "directory") await visit(nextTarget, nextRelative, depth + 1);
        else {
          visitedFiles += 1;
          if (visitedFiles <= MAX_LANGUAGE_FILES) paths.push(nextRelative);
          else truncated = true;
        }
        if (paths.length >= MAX_LANGUAGE_FILES) {
          truncated = true;
          return;
        }
      }
    }
    await visit(root, "", 0);
    return { root, paths, truncated, visibilitySource: "fallback-exclusions" as const };
  }

  async function summarizeWorkspaceLanguages(workspaceId: string): Promise<LanguageSummaryResponse> {
    const startedAt = Date.now();
    const { root, paths, truncated, visibilitySource } = await visibleFilePaths(workspaceId);
    const totals = new Map<string, { files: number; bytes: number }>();
    let totalBytes = 0;
    let partialReason: LanguageSummaryResponse["partialReason"];
    for (const filePath of paths) {
      if (Date.now() - startedAt > MAX_LANGUAGE_MS) { partialReason = "time-limit"; break; }
      const language = languageForPath(filePath);
      if (!language) continue;
      const stat = await dependencies.filesystem.stat(path.join(root, filePath)).catch(() => undefined);
      const bytes = stat?.size ?? 0;
      if (totalBytes + bytes > MAX_LANGUAGE_BYTES) { partialReason = "byte-limit"; break; }
      const current = totals.get(language) ?? { files: 0, bytes: 0 };
      current.files += 1;
      current.bytes += bytes;
      totals.set(language, current);
      totalBytes += bytes;
    }
    const entries = [...totals.entries()].map(([language, item]) => ({ language, files: item.files, bytes: item.bytes, share: totalBytes ? item.bytes / totalBytes : 0 }));
    return { entries, partial: Boolean(partialReason) || truncated, partialReason: partialReason ?? (truncated ? "file-limit" : undefined), visibilitySource };
  }

  async function readOwnTranscript(sessionId: string) {
    const events: TranscriptEvent[] = [];
    let afterSequence = 0;
    for (let pageCount = 0; pageCount < 100; pageCount += 1) {
      const page = await dependencies.transcriptRepository.list(sessionId, { afterSequence, limit: 200 });
      events.push(...page.events);
      if (!page.hasMore || page.nextAfterSequence <= afterSequence) break;
      afterSequence = page.nextAfterSequence;
    }
    return events;
  }

  async function visibleTranscript(sessionId: string): Promise<{ events: TranscriptEvent[]; retentionTruncated: boolean }> {
    const session = requireSession(sessionId);
    let prefix: TranscriptEvent[] = [];
    let retentionTruncated = false;
    if (session.parentSessionId && session.forkSequence !== undefined) {
      const parent = await visibleTranscript(session.parentSessionId);
      prefix = parent.events.filter((event) => event.sequence <= session.forkSequence!);
      retentionTruncated = parent.retentionTruncated;
    }
    const own = await readOwnTranscript(sessionId);
    return { events: [...prefix, ...own].sort((a, b) => a.sequence - b.sequence), retentionTruncated: retentionTruncated || own.some((event) => event.kind === "retention_marker") };
  }

  async function visibleTranscriptPage(sessionId: string, afterSequence: number, limit: number) {
    const visible = await visibleTranscript(sessionId);
    const matching = visible.events.filter((event) => event.sequence > afterSequence);
    const events: TranscriptEvent[] = [];
    const boundedLimit = Math.max(1, Math.min(limit, 200));
    let serializedBytes = 2;
    for (const event of matching.slice(0, boundedLimit)) {
      const eventBytes = Buffer.byteLength(JSON.stringify(event), "utf8") + (events.length ? 1 : 0);
      if (events.length > 0 && serializedBytes + eventBytes > MAX_TRANSCRIPT_RESPONSE_BYTES) break;
      events.push(event);
      serializedBytes += eventBytes;
    }
    return {
      events,
      hasMore: matching.length > events.length,
      nextAfterSequence: events.at(-1)?.sequence ?? afterSequence,
      visibleStartSequence: visible.events[0]?.sequence ?? 1,
      retentionTruncated: visible.retentionTruncated
    } satisfies TranscriptPage;
  }

  async function latestVisibleTranscript(sessionId: string) {
    return (await visibleTranscript(sessionId)).events.at(-1);
  }

  async function forkDepth(session: SessionV3) {
    let depth = 0;
    const visited = new Set<string>();
    let current: SessionV3 | undefined = session;
    while (current?.parentSessionId) {
      if (visited.has(current.id)) throw new ApiHttpError(500, "INTERNAL_ERROR", "Session fork lineage is cyclic.");
      visited.add(current.id);
      depth += 1;
      current = getSession(current.parentSessionId);
      if (!current) throw new ApiHttpError(409, "VALIDATION_FAILED", "Session fork parent is unavailable.");
    }
    return depth;
  }

  async function materializeTranscript(sessionId: string, events: TranscriptEvent[]) {
    let sequence = 0;
    for (const event of events) {
      const copied = await dependencies.transcriptRepository.append({
        sessionId,
        occurredAt: event.occurredAt,
        kind: event.kind,
        source: event.source,
        raw: event.raw,
        metadata: event.metadata,
        component: event.component,
        clientMessageId: event.clientMessageId,
        sequenceOffset: sequence
      });
      sequence = copied.sequence;
    }
  }

  async function findMessage(sessionId: string, clientMessageId: string) {
    if (dependencies.transcriptRepository.findByClientMessageId) return dependencies.transcriptRepository.findByClientMessageId(sessionId, clientMessageId);
    return (await readOwnTranscript(sessionId)).find((event) => event.clientMessageId === clientMessageId);
  }

  async function startRoutedExecution(session: SessionV3, content: string, clientMessageId: string, userEvent: TranscriptEvent, resolvedRoute: ResolvedRoute) {
    if (!executionRepository || !routeExecutionCoordinator || resolvedRoute.kind !== "route" || !resolvedRoute.routeId) return undefined;
    const route = state.modelRoutes!.find((candidate) => candidate.id === resolvedRoute.routeId);
    if (!route) throw new ApiHttpError(409, "ROUTE_NO_CANDIDATE", "The selected model route no longer exists.");
    const summaries = await deploymentSummaries();
    const summaryById = new Map(summaries.map((deployment) => [deployment.id, deployment]));
    const candidates: RouteExecutionCandidate[] = resolvedRoute.executableCandidates.flatMap((candidate) => {
      const deployment = summaryById.get(candidate.deploymentId);
      if (!deployment || !deployment.providerName || !deployment.profileName || !deployment.providerId || !deployment.profileId) return [];
      return [{ deployment: { deploymentId: deployment.id, deploymentName: deployment.name, providerId: deployment.providerId, providerName: deployment.providerName, profileId: deployment.profileId, modelId: deployment.modelId } }];
    });
    if (!candidates.length) throw new ApiHttpError(409, "ROUTE_NO_CANDIDATE", "The selected model route has no executable deployment.");
    const turnId = dependencies.idGenerator.create("turn");
    const task: ExecutionTask = {
      id: dependencies.idGenerator.create("task"),
      sessionId: session.id,
      turnId,
      input: { transcriptEventId: userEvent.id, sha256: createHash("sha256").update(content, "utf8").digest("hex") },
      resolvedRoute: structuredClone(resolvedRoute),
      state: "created",
      revision: 1,
      createdAt: dependencies.clock.now()
    };
    const primaryAttempt: ExecutionAttempt = {
      id: dependencies.idGenerator.create("attempt"),
      taskId: task.id,
      ordinal: 1,
      trigger: "primary",
      deployment: structuredClone(candidates[0].deployment),
      state: "created",
      revision: 1,
      sideEffect: { state: "clean", evidenceEventIds: [] }
    };
    await executionRepository.createTask(task);
    await executionRepository.createAttempt(primaryAttempt);
    const runAttempt = async ({ attempt }: { attempt: ExecutionAttempt; signal: AbortSignal }): Promise<AttemptRunResult> => {
      const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
      const profile = state.profiles.find((item) => item.id === attempt.deployment.profileId);
      if (!workspace || !profile) return { status: "failed", failure: { code: "PROFILE_NOT_FOUND", class: "configuration", message: "The deployment profile is no longer available.", fallbackEligible: false }, sideEffect: { state: "clean", evidenceEventIds: [] } };
      const attemptTurnId = `${task.turnId}:${attempt.ordinal}`;
      const effectiveModel = attempt.deployment.modelId;
      try {
        // Provider resolution is part of the Attempt transaction. A missing secret must
        // settle the Attempt instead of escaping before the coordinator can transition it.
        const provider = await providerLaunchFor(attempt.deployment.providerId, profile);
        if (dependencies.agentBackends) {
          const backend = dependencies.agentBackends.forProfile(profile);
          const backendSession = await backend.openSession({
            sessionId: session.id,
            workspacePath: workspace.path,
            config: { profile },
            resume: session.backendSessionRef?.backendId === backend.id ? session.backendSessionRef : undefined
          });
          const backendInput: AgentInput = {
            turnId: attemptTurnId,
            prompt: content,
            ...(clientMessageId && attempt.ordinal === 1 ? { clientMessageId } : {}),
            model: effectiveModel,
            ...(normalizeOption(session.launchConfig.permission) ? { permission: normalizeOption(session.launchConfig.permission)! } : {}),
            ...(normalizeOption(session.launchConfig.mode) ? { mode: normalizeOption(session.launchConfig.mode)! } : {}),
            ...(Object.keys(provider.env).length ? { launchEnv: provider.env } : {}),
            ...(provider.args.length ? { launchArgs: provider.args } : {})
          };
          await orchestrator.submitTurn(session.id, { turnId: attemptTurnId, prompt: content, userMessageEvent: userEvent, persistUserMessage: false, runBackend: () => backendSession.runTurn(backendInput) });
          const result = await orchestrator.waitForTurn(session.id, attemptTurnId);
          const failure = classifyAgentTurnFailure(result.error);
          return {
            status: result.status,
            failure,
            usage: result.usage,
            sideEffect: result.sideEffect ?? (result.status === "failed" && failure?.phase === "spawn" ? { state: "clean", evidenceEventIds: [] } : { state: result.status === "completed" ? "clean" : "unknown", evidenceEventIds: [] })
          };
        }
        const registry = dependencies.profileAdapters;
        if (!registry.buildTurn || !registry.parseEvents) return { status: "failed", failure: { code: "TURN_UNSUPPORTED", class: "configuration", message: "This profile does not support structured turns.", fallbackEligible: false }, sideEffect: { state: "clean", evidenceEventIds: [] } };
        const capabilities = await resolveCapabilities(profile);
        const persistentRuntime = dependencies.persistentChatRuntime;
        const persistentWiring = persistentRuntime && profile.adapterId === "codex" && capabilities.supportsHeadlessTurns && provider.args.length === 0
          ? { runPersistent: (handlers: PersistentTurnHandlers) => persistentRuntime.runTurn(session.id, { turnId: attemptTurnId, prompt: content, cwd: workspace.path, env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...provider.env }, command: profile.command, model: effectiveModel, sandboxMode: normalizeOption(session.launchConfig.mode), approvalPolicy: normalizeOption(session.launchConfig.permission), resumeToken: session.chatContext?.resumeToken }, handlers) }
          : {};
        await orchestrator.submitTurn(session.id, {
          turnId: attemptTurnId,
          prompt: content,
          userMessageEvent: userEvent,
          persistUserMessage: false,
          ...persistentWiring,
          buildCommand: async () => {
            const spec = await registry.buildTurn!(profile, { workspacePath: workspace.path, prompt: content, permission: session.launchConfig.permission, mode: session.launchConfig.mode, model: effectiveModel, resumeToken: session.chatContext?.resumeToken });
            return { command: spec.command, args: [...spec.args, ...provider.args], cwd: workspace.path, env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...spec.env, ...provider.env } };
          },
          parseOutput: (stdout, hooks) => registry.parseEvents!(profile, stdout, { turnId: attemptTurnId }, hooks)
        });
        const result = await orchestrator.waitForTurn(session.id, attemptTurnId);
        const failure = classifyAgentTurnFailure(result.error);
        return { status: result.status, failure, usage: result.usage, sideEffect: result.sideEffect ?? (result.status === "failed" && failure?.phase === "spawn" ? { state: "clean", evidenceEventIds: [] } : { state: result.status === "completed" ? "clean" : "unknown", evidenceEventIds: [] }) };
      } catch (error) {
        const code = error instanceof ApiHttpError ? error.code : "TURN_SPAWN_FAILED";
        const failureClass = code === "PROVIDER_CREDENTIAL_MISSING" || code === "PROVIDER_SECRET_MISSING" || code === "SECRET_STORE_UNAVAILABLE" ? "secret-missing" : error instanceof ApiHttpError ? "configuration" : "startup";
        return { status: "failed", failure: { code, class: failureClass, message: error instanceof Error ? error.message : String(error), fallbackEligible: failureClass === "startup" }, sideEffect: { state: "clean", evidenceEventIds: [] } };
      }
    };
    const execution = routeExecutionCoordinator.execute({ task, candidates, automaticTechnicalFallback: route.automaticTechnicalFallback, runAttempt });
    void execution.catch((error) => dependencies.logger.warn("Routed execution failed", { taskId: task.id, error: String(error) }));
    return { task, primaryAttempt, resolvedDeployment: { id: primaryAttempt.deployment.deploymentId, name: primaryAttempt.deployment.deploymentName, modelId: primaryAttempt.deployment.modelId } };
  }

  async function handleApi(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
    const method = request.method ?? "GET";
    const segments = url.pathname.split("/").filter(Boolean).slice(1);
    const resource = segments[0];
    const id = segments[1];
    const action = segments[2];
    if (resource === "sessions" && id && method !== "GET" && action !== "messages") {
      return withSessionMutation(id, () => handleApiUnlocked(request, response, url));
    }
    return handleApiUnlocked(request, response, url);
  }

  async function handleApiUnlocked(request: http.IncomingMessage, response: http.ServerResponse, url: URL) {
    const method = request.method ?? "GET";
    const segments = url.pathname.split("/").filter(Boolean).slice(1);
    const resource = segments[0];
    const id = segments[1];
    const action = segments[2];
    if (!isKnownApiRoute(method, resource, id, action, segments)) throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
    if (dependencies.policy.readonly && method !== "GET" && method !== "HEAD") throw new ApiHttpError(403, "READONLY_MODE", "Readonly mode disables workspace writes.");
    const body = method === "GET" || method === "HEAD" ? {} : await readJson(request);

    if (method === "GET" && resource === "state") {
      sendJson(response, 200, serializeState());
      return;
    }

    if (method === "GET" && resource === "engines" && id === "readiness") {
      const engines: EngineReadiness[] = [];
      for (const profile of state.profiles) {
        if (profile.adapterId !== "codex" && profile.adapterId !== "claude-code") continue;
        const readiness = toEngineReadiness(profile, await resolveCapabilities(profile));
        if (readiness) engines.push(readiness);
      }
      sendJson(response, 200, { engines, probedAt: dependencies.clock.now() });
      return;
    }

    if (resource === "skills" && method === "GET") {
      // 只读端点（console-gaps SPEC §7.3）：scope 必选；workspace scope 要求 workspaceId 命中已注册工作区
      const scopeParam = url.searchParams.get("scope");
      if (scopeParam !== "system" && scopeParam !== "workspace") throw new ApiHttpError(400, "VALIDATION_FAILED", "scope must be system or workspace.", { field: "scope" });
      let scanOptions: SkillScanOptions = { homeDirectory: dependencies.policy.skillsHomeDirectory };
      if (scopeParam === "workspace") {
        const workspaceId = url.searchParams.get("workspaceId");
        if (!workspaceId) throw new ApiHttpError(400, "VALIDATION_FAILED", "workspaceId is required for workspace scope.", { field: "workspaceId" });
        const workspace = state.workspaces.find((item) => item.id === workspaceId);
        if (!workspace) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        scanOptions = { workspacePath: workspace.path };
      }
      if (!id) {
        sendJson(response, 200, { skills: await listSkills(scopeParam, scanOptions) });
        return;
      }
      if (id === "content") {
        const skillId = url.searchParams.get("id");
        if (!skillId) throw new ApiHttpError(400, "VALIDATION_FAILED", "Skill id is required.", { field: "id" });
        const content = await readSkillContent(scopeParam, skillId, scanOptions);
        if (!content) throw new ApiHttpError(404, "FILE_NOT_FOUND", "Skill not found.");
        sendJson(response, 200, content);
        return;
      }
    }

    if (resource === "prompt" && id === "enhance" && method === "POST") {
      // 润色/压缩一次性调用（project-quest SPEC §5.7）：readonly 已由入口统一拦截
      const enhanceBody = body as { profileId?: unknown; action?: unknown; content?: unknown; locale?: unknown };
      if (enhanceBody.action !== "polish" && enhanceBody.action !== "compress") throw new ApiHttpError(400, "VALIDATION_FAILED", "action must be polish or compress.", { field: "action" });
      if (typeof enhanceBody.content !== "string" || !enhanceBody.content.trim()) throw new ApiHttpError(400, "VALIDATION_FAILED", "content is required.", { field: "content" });
      if (Buffer.byteLength(enhanceBody.content, "utf8") > ENHANCE_INPUT_LIMIT) throw new ApiHttpError(400, "VALIDATION_FAILED", "content exceeds the 32KiB limit.", { field: "content", limit: ENHANCE_INPUT_LIMIT });
      const locale = enhanceBody.locale === "zh" ? "zh" : "en";
      const profile = requireProfile(typeof enhanceBody.profileId === "string" ? enhanceBody.profileId : "");
      const detected = await resolveCapabilities(profile);
      if (!detected.supportsPromptEnhancement || !dependencies.profileAdapters.buildEnhance) throw new ApiHttpError(400, "ENHANCE_UNAVAILABLE", "The selected CLI profile does not support prompt enhancement.");
      const spec = await dependencies.profileAdapters.buildEnhance(profile, { prompt: buildEnhancePrompt(enhanceBody.action, locale, enhanceBody.content) });
      try {
        sendJson(response, 200, await runEnhance(spec, { env: dependencies.policy.processEnvironment, timeoutMs: dependencies.policy.enhanceTimeoutMs }));
      } catch (error) {
        if (error instanceof EnhanceExecutionError) throw new ApiHttpError(error.code === "ENHANCE_TIMEOUT" ? 504 : 502, error.code, error.message);
        throw error;
      }
      return;
    }

    if (resource === "providers") {
      if (method === "GET" && !id) {
        sendJson(response, 200, { providers: await Promise.all((state.providers ?? []).map(providerSummary)) });
        return;
      }
      if (method === "POST" && !id) {
        validateProvider(body);
        const providerId = body.id as string;
        if (state.providers!.some((provider) => provider.id === providerId)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Provider id already exists.", { field: "id" });
        const now = dependencies.clock.now();
        const provider: ModelProviderConfig = {
          id: providerId,
          name: body.name as string,
          protocol: body.protocol,
          baseUrl: body.baseUrl as string,
          ...(typeof body.credentialRef === "string" ? { credentialRef: body.credentialRef.startsWith("env:") || body.credentialRef.startsWith("keychain:") ? body.credentialRef : `env:${body.credentialRef}` } : {}),
          models: [...new Set((Array.isArray(body.models) ? body.models : []).map((model: unknown) => String(model).trim()).filter(Boolean))],
          supportedEngineIds: [...new Set((Array.isArray(body.supportedEngineIds) ? body.supportedEngineIds : []).map((engine: unknown) => String(engine).trim()).filter(Boolean))],
          enabled: body.enabled !== false,
          createdAt: now,
          updatedAt: now
        };
        state.providers!.push(provider);
        await dependencies.stateRepository.save(state);
        const summary = await providerSummary(provider);
        sendJson(response, 201, { provider: summary, providers: [summary] });
        return;
      }
      if (id && action === "credential" && method === "PUT") {
        const provider = requireProvider(id);
        if (typeof body.secret !== "string" || !body.secret) throw new ApiHttpError(400, "VALIDATION_FAILED", "secret is required.", { field: "secret" });
        let ref: SecretRef;
        try { ref = await secretStore.put({ providerId: provider.id }, body.secret); }
        catch (error) {
          if (error instanceof SecretStoreError) throw new ApiHttpError(503, error.code, error.message, { providerId: provider.id });
          throw error;
        }
        provider.credentialRef = ref;
        provider.updatedAt = dependencies.clock.now();
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { providerId: provider.id, credentialStatus: "configured" });
        return;
      }
      if (id && action === "credential" && method === "DELETE") {
        const provider = requireProvider(id);
        const ref = normalizedSecretRef(provider);
        try { if (ref) await secretStore.remove(ref); }
        catch (error) {
          if (error instanceof SecretStoreError) throw new ApiHttpError(503, error.code, error.message, { providerId: provider.id });
          throw error;
        }
        provider.credentialRef = undefined;
        provider.updatedAt = dependencies.clock.now();
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { providerId: provider.id, credentialStatus: "missing" });
        return;
      }
      if (id && method === "PATCH") {
        const provider = requireProvider(id);
        validateProvider(body, true);
        if (body.id !== undefined && body.id !== id) throw new ApiHttpError(400, "VALIDATION_FAILED", "Provider id cannot be changed.", { field: "id" });
        for (const field of ["name", "protocol", "baseUrl", "models", "supportedEngineIds", "enabled"] as const) if (body[field] !== undefined) (provider as unknown as Record<string, unknown>)[field] = field === "models" || field === "supportedEngineIds" ? [...new Set((body[field] as unknown[]).map((value) => String(value).trim()).filter(Boolean))] : body[field];
        if (body.credentialRef !== undefined) provider.credentialRef = typeof body.credentialRef === "string" ? (body.credentialRef.startsWith("env:") || body.credentialRef.startsWith("keychain:") ? body.credentialRef : `env:${body.credentialRef}`) : undefined;
        provider.updatedAt = dependencies.clock.now();
        await dependencies.stateRepository.save(state);
        const summary = await providerSummary(provider);
        sendJson(response, 200, { provider: summary, providers: [summary] });
        return;
      }
      if (id && method === "DELETE") {
        const provider = requireProvider(id);
        if (state.sessions.some((session) => session.providerId === id) || state.modelDeployments?.some((deployment) => deployment.providerId === id && !deployment.archivedAt)) throw new ApiHttpError(409, "PROVIDER_IN_USE", "Provider is still in use.");
        const ref = normalizedSecretRef(provider);
        if (ref?.startsWith("keychain:")) await secretStore.remove(ref).catch((error) => { throw error instanceof SecretStoreError ? new ApiHttpError(503, error.code, error.message) : error; });
        state.providers = state.providers!.filter((candidate) => candidate.id !== id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { deleted: id });
        return;
      }
    }

    if (resource === "model-deployments") {
      if (method === "GET" && !id) { sendJson(response, 200, { deployments: await deploymentSummaries() }); return; }
      if (method === "GET" && id) { requireDeployment(id); sendJson(response, 200, { deployment: (await deploymentSummaries()).find((item) => item.id === id) }); return; }
      if (method === "POST" && !id) {
        const validation = validateDeploymentInput(body);
        if (!validation.ok) throw new ApiHttpError(400, "VALIDATION_FAILED", validation.message, { field: validation.field });
        if (state.modelDeployments!.some((deployment) => deployment.id === body.id)) throw new ApiHttpError(409, "MODEL_DEPLOYMENT_DUPLICATE", "Model deployment id already exists.");
        const provider = requireProvider(body.providerId);
        const profile = requireProfile(body.profileId);
        if (!providerProtocolMatchesAdapter(provider.protocol, profile.adapterId)) throw new ApiHttpError(400, "MODEL_DEPLOYMENT_INCOMPATIBLE", "Provider protocol does not match profile engine.");
        const now = dependencies.clock.now();
        const deployment: ModelDeploymentConfig = { id: body.id, name: body.name, providerId: body.providerId, profileId: body.profileId, modelId: body.modelId, enabled: body.enabled !== false, createdAt: now, updatedAt: now };
        state.modelDeployments!.push(deployment);
        await dependencies.stateRepository.save(state);
        const deployments = await deploymentSummaries();
        sendJson(response, 201, { deployment: deployments.find((item) => item.id === deployment.id), deployments });
        return;
      }
      if (method === "PATCH" && id) {
        const deployment = requireDeployment(id);
        if (body.id !== undefined && body.id !== id) throw new ApiHttpError(400, "VALIDATION_FAILED", "Deployment id cannot be changed.", { field: "id" });
        if (body.providerId !== undefined || body.profileId !== undefined) {
          const provider = requireProvider(body.providerId ?? deployment.providerId);
          const profile = requireProfile(body.profileId ?? deployment.profileId);
          if (!providerProtocolMatchesAdapter(provider.protocol, profile.adapterId)) throw new ApiHttpError(400, "MODEL_DEPLOYMENT_INCOMPATIBLE", "Provider protocol does not match profile engine.");
        }
        Object.assign(deployment, { ...(typeof body.name === "string" ? { name: body.name } : {}), ...(typeof body.providerId === "string" ? { providerId: body.providerId } : {}), ...(typeof body.profileId === "string" ? { profileId: body.profileId } : {}), ...(typeof body.modelId === "string" ? { modelId: body.modelId } : {}), ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}), updatedAt: dependencies.clock.now() });
        await dependencies.stateRepository.save(state);
        const deployments = await deploymentSummaries();
        sendJson(response, 200, { deployment: deployments.find((item) => item.id === id), deployments });
        return;
      }
      if (method === "DELETE" && id) {
        const deployment = requireDeployment(id);
        if ((state.modelRoutes ?? []).some((route) => route.enabled && !route.archivedAt && route.candidateDeploymentIds.includes(id))) throw new ApiHttpError(409, "MODEL_DEPLOYMENT_IN_USE", "Deployment is referenced by an active route.");
        deployment.enabled = false;
        deployment.archivedAt = dependencies.clock.now();
        deployment.updatedAt = dependencies.clock.now();
        await dependencies.stateRepository.save(state);
        const deployments = await deploymentSummaries();
        sendJson(response, 200, { deployment: deployments.find((item) => item.id === id), deployments });
        return;
      }
    }

    if (resource === "model-routes") {
      if (method === "GET" && !id) { sendJson(response, 200, { routes: state.modelRoutes ?? [] }); return; }
      if (method === "GET" && id) { const route = state.modelRoutes!.find((candidate) => candidate.id === id); if (!route) throw new ApiHttpError(404, "MODEL_ROUTE_NOT_FOUND", "Model route not found."); sendJson(response, 200, route); return; }
      if (method === "POST" && id && action === "resolve") {
        const profile = requireProfile(requireText(body.profileId, "profileId"));
        const workspace = await getWorkspace(requireText(body.workspaceId, "workspaceId"));
        const routeId = body.routeId === undefined || body.routeId === null ? undefined : requireBoundRoute(body.routeId);
        const workspaceBinding = state.workspaceModelRouteBindings?.find((binding) => binding.workspaceId === workspace.id);
        const fixedDeploymentId = body.fixedDeploymentId === undefined ? undefined : requireText(body.fixedDeploymentId, "fixedDeploymentId");
        const deployments = await deploymentSummaries();
        const resolvedRoute = resolveModelRoute({
          routes: state.modelRoutes ?? [],
          deployments,
          now: dependencies.clock.now(),
          globalRouteId: state.globalModelRouteId,
          projectRouteId: workspaceBinding?.routeId,
          sessionRouteId: routeId,
          ...(fixedDeploymentId ? { routeOverride: { fixedDeploymentId } } : {}),
          legacy: { profileId: profile.id, modelId: null, source: "profile-default" }
        });
        sendJson(response, 200, { resolvedRoute, deployments });
        return;
      }
      if (method === "POST" && !id) {
        validateRouteInput(body);
        if (state.modelRoutes!.some((route) => route.id === body.id)) throw new ApiHttpError(409, "MODEL_ROUTE_DUPLICATE", "Model route id already exists.");
        const now = dependencies.clock.now();
        const route: PriorityModelRoute = { id: body.id, name: body.name, enabled: body.enabled !== false, candidateDeploymentIds: [...body.candidateDeploymentIds], automaticTechnicalFallback: body.automaticTechnicalFallback === true, createdAt: now, updatedAt: now };
        state.modelRoutes!.push(route);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, { route, routes: state.modelRoutes });
        return;
      }
      if (method === "PATCH" && id) {
        const route = state.modelRoutes!.find((candidate) => candidate.id === id);
        if (!route) throw new ApiHttpError(404, "MODEL_ROUTE_NOT_FOUND", "Model route not found.");
        if (body.id !== undefined && body.id !== id) throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "Route id cannot be changed.");
        if (body.candidateDeploymentIds !== undefined) validateRouteCandidates(body.candidateDeploymentIds);
        Object.assign(route, { ...(typeof body.name === "string" ? { name: body.name } : {}), ...(Array.isArray(body.candidateDeploymentIds) ? { candidateDeploymentIds: [...body.candidateDeploymentIds] } : {}), ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}), ...(typeof body.automaticTechnicalFallback === "boolean" ? { automaticTechnicalFallback: body.automaticTechnicalFallback } : {}), updatedAt: dependencies.clock.now() });
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { route, routes: state.modelRoutes });
        return;
      }
      if (method === "DELETE" && id) {
        const route = state.modelRoutes!.find((candidate) => candidate.id === id);
        if (!route) throw new ApiHttpError(404, "MODEL_ROUTE_NOT_FOUND", "Model route not found.");
        if (state.globalModelRouteId === id || state.workspaceModelRouteBindings!.some((binding) => binding.routeId === id) || state.sessions.some((session) => session.modelRouteId === id)) throw new ApiHttpError(409, "MODEL_ROUTE_IN_USE", "Route is still bound.");
        route.enabled = false;
        route.archivedAt = dependencies.clock.now();
        route.updatedAt = dependencies.clock.now();
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, route);
        return;
      }
    }

    if (resource === "model-routing" && id === "global" && method === "PUT") {
      const routeId = body.routeId === null ? undefined : requireBoundRoute(body.routeId);
      state.globalModelRouteId = routeId;
      await dependencies.stateRepository.save(state);
      sendJson(response, 200, { routeId });
      return;
    }

    if (resource === "workspaces" && id && action === "model-route" && method === "PUT") {
      await getWorkspace(id);
      const routeId = body.routeId === null ? undefined : requireBoundRoute(body.routeId);
      state.workspaceModelRouteBindings = state.workspaceModelRouteBindings!.filter((binding) => binding.workspaceId !== id);
      if (routeId) state.workspaceModelRouteBindings.push({ workspaceId: id, routeId });
      await dependencies.stateRepository.save(state);
      sendJson(response, 200, { workspaceId: id, routeId });
      return;
    }

    if (resource === "execution-tasks") {
      if (!executionRepository) throw new ApiHttpError(503, "EXECUTION_HISTORY_CORRUPT", "Execution history is unavailable in this server build.");
      if (method === "GET" && id && !action) {
        const snapshot = await executionRepository.get(id);
        if (!snapshot) throw new ApiHttpError(404, "EXECUTION_NOT_FOUND", "Execution task not found.");
        sendJson(response, 200, snapshot);
        return;
      }
      if (method === "POST" && id && action === "confirm-retry") {
        if (!routeExecutionCoordinator) throw new ApiHttpError(503, "EXECUTION_NOT_FOUND", "Execution coordinator is unavailable.");
        try {
          const snapshot = await routeExecutionCoordinator.confirmRetry(id, Number(body.expectedRevision), requireText(body.confirmationToken, "confirmationToken"), requireText(body.inputSha256, "inputSha256"));
          sendJson(response, 200, snapshot);
        } catch (error) {
          throw executionErrorToApi(error);
        }
        return;
      }
      if (method === "POST" && id && action === "cancel") {
        if (!routeExecutionCoordinator) throw new ApiHttpError(503, "EXECUTION_NOT_FOUND", "Execution coordinator is unavailable.");
        try {
          sendJson(response, 200, await routeExecutionCoordinator.cancel(id, body.expectedRevision === undefined ? undefined : Number(body.expectedRevision)));
        } catch (error) {
          throw executionErrorToApi(error);
        }
        return;
      }
    }

    if (resource === "sessions" && id && action === "model-route" && segments[3] === "resolve" && method === "POST") {
      const session = requireSession(id);
      const fixedDeploymentId = body.fixedDeploymentId === undefined ? undefined : requireText(body.fixedDeploymentId, "fixedDeploymentId");
      sendJson(response, 200, { resolvedRoute: await resolveSessionRoute(session, fixedDeploymentId) });
      return;
    }

    if (resource === "sessions" && id && action === "execution-tasks" && method === "GET") {
      requireSession(id);
      if (!executionRepository) { sendJson(response, 200, { tasks: [] }); return; }
      const limit = url.searchParams.get("limit") === null ? undefined : Number(url.searchParams.get("limit"));
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Execution task limit is invalid.", { field: "limit" });
      sendJson(response, 200, await executionRepository.list(id, { after: url.searchParams.get("after") ?? undefined, limit }));
      return;
    }

    if (resource === "workspaces") {
      if (method === "GET" && id && action === "files") {
        sendJson(response, 200, await listWorkspaceFiles(id, url.searchParams.get("path") ?? "", url.searchParams.get("cursor") ?? undefined, Number(url.searchParams.get("limit") ?? MAX_FILE_PAGE)));
        return;
      }
      if (method === "GET" && id && action === "preview") {
        sendJson(response, 200, await previewWorkspaceFile(id, url.searchParams.get("path") ?? ""));
        return;
      }
      if (method === "GET" && id && action === "languages") {
        sendJson(response, 200, await summarizeWorkspaceLanguages(id));
        return;
      }
      if (method === "GET" && id && action === "git" && segments[3] === "status") {
        const { root } = await workspaceTarget(id);
        sendJson(response, 200, await dependencies.gitInspector.status(root));
        return;
      }
      if (method === "GET" && id && action === "git" && segments[3] === "diff") {
        const scope = url.searchParams.get("scope") === "staged" ? "staged" : "unstaged";
        const { root } = await workspaceTarget(id);
        sendJson(response, 200, await dependencies.gitInspector.diff(root, scope));
        return;
      }
      if (method === "POST" && (id === "pick" && !action || !id && action === "pick")) {
        if (!dependencies.directoryPicker.available) throw new ApiHttpError(503, "PICKER_UNAVAILABLE", "Directory picker is unavailable.");
        const intent = requireText(body.intentToken, "intentToken");
        if (pickerInFlight) throw new ApiHttpError(409, "PICKER_BUSY", "A folder picker is already active.");
        if (intent !== pickerIntent || Date.now() >= pickerIntentExpiresAt) throw new ApiHttpError(403, "PICKER_INTENT_INVALID", "Folder picker intent is invalid or expired.");
        pickerInFlight = true;
        renewPickerIntent();
        try {
          const picked = await withTimeout(dependencies.directoryPicker.pick(), 60_000);
          if (picked.cancelled) {
            sendJson(response, 200, { cancelled: true, pickerIntentToken: pickerIntent });
            return;
          }
          const workspacePath = await validateWorkspacePath(picked.path, undefined, true);
          const existing = state.workspaces.find((workspace) => workspace.path === workspacePath);
          if (existing) {
            sendJson(response, 200, { cancelled: false, workspace: existing, duplicate: true, pickerIntentToken: pickerIntent });
            return;
          }
          const workspace: WorkspaceV3 = { id: dependencies.idGenerator.create("workspace"), name: path.basename(workspacePath), path: workspacePath, kind: "local-folder", createdAt: dependencies.clock.now() };
          state.workspaces.push(workspace);
          await dependencies.stateRepository.save(state);
          sendJson(response, 201, { cancelled: false, workspace, pickerIntentToken: pickerIntent });
          return;
        } finally {
          pickerInFlight = false;
        }
      }
      if (method === "POST" && !id && !action) {
        const workspace: WorkspaceV3 = { id: dependencies.idGenerator.create("workspace"), name: requireResourceName(body.name, "name"), path: await validateWorkspacePath(requireText(body.path, "path")), kind: "local-folder", createdAt: dependencies.clock.now() };
        state.workspaces.push(workspace);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, workspace);
        return;
      }
      if (method === "PATCH" && id) {
        const workspace = await getWorkspace(id);
        if (body.name !== undefined) workspace.name = requireResourceName(body.name, "name");
        if (body.path !== undefined) workspace.path = await validateWorkspacePath(requireText(body.path, "path"), id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, workspace);
        return;
      }
      if (method === "DELETE" && id) {
        const workspace = await getWorkspace(id);
        if (state.sessions.some((session) => session.workspaceId === id)) throw new ApiHttpError(409, "WORKSPACE_IN_USE", "Workspace has sessions.");
        state.workspaces = state.workspaces.filter((item) => item.id !== workspace.id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
    }

    if (resource === "profiles") {
      if (method === "GET" && id && action === "capabilities") {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        sendJson(response, 200, await resolveCapabilities(profile));
        return;
      }
      if (method === "GET" && id && action === "models" && !segments[3]) {
        sendJson(response, 200, { models: await mergedProfileModels(requireProfile(id)) });
        return;
      }
      if (method === "POST" && id && action === "models" && segments[3] === "sync" && !segments[4]) {
        const profile = requireProfile(id);
        // 手动同步保持旧语义：配置缺失时清空 synced 层，并绕过自动同步 TTL。
        const snapshot = await readProfileConfiguredModels(profile);
        profile.syncedModels = snapshot?.models ?? [];
        if (snapshot?.defaultModel && snapshot.defaultModel !== "default") configuredDefaultModelByProfile.set(profile.id, snapshot.defaultModel);
        else configuredDefaultModelByProfile.delete(profile.id);
        modelAutoSyncAt.set(profile.id, nowMilliseconds());
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { models: await mergedProfileModels(profile), synced: profile.syncedModels });
        return;
      }
      if (method === "POST" && id && action === "sync-models" && !segments[3]) {
        sendJson(response, 200, await syncModels(id));
        return;
      }
      if (method === "POST" && id && action === "models" && segments[3] === "custom" && !segments[4]) {
        const profile = requireProfile(id);
        const model = requireText(body.model, "model").trim();
        if (!model || model.length > 128) throw new ApiHttpError(400, "VALIDATION_FAILED", "Model id must be 1-128 characters.", { field: "model" });
        if ((await mergedProfileModels(profile)).some((entry) => entry.id === model)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Model id already exists for this profile.", { field: "model" });
        profile.customModels = [...(profile.customModels ?? []), model];
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, { models: await mergedProfileModels(profile) });
        return;
      }
      if (method === "DELETE" && id && action === "models" && segments[3] === "custom" && segments[4]) {
        const profile = requireProfile(id);
        let model = segments[4];
        try {
          model = decodeURIComponent(model);
        } catch {
          // 非法百分号编码：按原文匹配
        }
        if (!(profile.customModels ?? []).includes(model)) throw new ApiHttpError(404, "VALIDATION_FAILED", "Custom model not found.", { field: "model" });
        profile.customModels = (profile.customModels ?? []).filter((item) => item !== model);
        if (!profile.customModels.length) profile.customModels = undefined;
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, { models: await mergedProfileModels(profile) });
        return;
      }
      if (method === "POST" && !id) {
        const command = requireText(body.command, "command");
        const adapterId = isKnownAdapterId(body.adapterId) ? body.adapterId : inferProfileAdapter(command);
        const profile = { id: dependencies.idGenerator.create("profile"), name: requireResourceName(body.name, "name"), command, args: requireArgs(body.args), adapterId, createdAt: dependencies.clock.now() };
        state.profiles.push(profile);
        await dependencies.stateRepository.save(state);
        sendJson(response, 201, profile);
        return;
      }
      if (method === "PATCH" && id) {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        if (body.name !== undefined) profile.name = requireResourceName(body.name, "name");
        if (body.command !== undefined) profile.command = requireText(body.command, "command");
        if (isKnownAdapterId(body.adapterId)) profile.adapterId = body.adapterId;
        else if (body.command !== undefined) profile.adapterId = inferProfileAdapter(profile.command);
        if (body.args !== undefined) profile.args = requireArgs(body.args);
        await dependencies.stateRepository.save(state);
        sendJson(response, 200, profile);
        return;
      }
      if (method === "DELETE" && id) {
        const profile = state.profiles.find((item) => item.id === id);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        if (state.sessions.some((session) => session.profileId === id)) throw new ApiHttpError(409, "PROFILE_IN_USE", "Profile has sessions.");
        state.profiles = state.profiles.filter((item) => item.id !== id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
    }

    if (resource === "sessions") {
      if (method === "POST" && id === "reorder" && !action) {
        const organizationStatus = body.organizationStatus;
        const pinned = body.pinned;
        if (!["active", "completed", "archived"].includes(organizationStatus) || typeof pinned !== "boolean" || !Array.isArray(body.orderedSessionIds) || !body.expectedRevisions || typeof body.expectedRevisions !== "object") throw new ApiHttpError(400, "VALIDATION_FAILED", "A complete session order is required.");
        const section = state.sessions.filter((session) => session.organizationStatus === organizationStatus && session.pinned === pinned);
        const ordered = body.orderedSessionIds.map((value: unknown) => String(value));
        if (new Set(ordered).size !== ordered.length || ordered.length !== section.length || ordered.some((sessionId: string) => !section.some((session) => session.id === sessionId))) throw new ApiHttpError(400, "VALIDATION_FAILED", "Order must contain each section member exactly once.");
        const revisions = body.expectedRevisions as Record<string, unknown>;
        for (const session of section) assertRevision(session, revisions[session.id]);
        const updates = new Map(ordered.map((sessionId: string, index: number) => [sessionId, (index + 1) * 1000]));
        const previousOrder = new Map(section.map((session) => [session.id, { manualOrder: session.manualOrder, revision: session.revision }]));
        for (const session of section) {
          session.manualOrder = updates.get(session.id)!;
          session.revision += 1;
        }
        try {
          await dependencies.stateRepository.save(state);
        } catch (error) {
          for (const session of section) {
            const previous = previousOrder.get(session.id)!;
            session.manualOrder = previous.manualOrder;
            session.revision = previous.revision;
          }
          throw error;
        }
        sendJson(response, 200, state.sessions.map(serializeSession));
        return;
      }
      if (method === "POST" && !id && !action) {
        const start = body.start === true || body.start === undefined && body.confirmed === true;
        if (start && body.confirmed !== true) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session start requires explicit confirmation.", { field: "confirmed" });
        const now = dependencies.clock.now();
        const workspaceId = requireText(body.workspaceId, "workspaceId");
        const profileId = requireText(body.profileId, "profileId");
        if (!state.workspaces.some((item) => item.id === workspaceId)) throw new ApiHttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
        const profile = state.profiles.find((item) => item.id === profileId);
        if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
        const providerId = body.providerId === undefined ? undefined : requireText(body.providerId, "providerId");
        if (providerId) {
          const provider = requireProvider(providerId);
          if (!providerProtocolMatchesAdapter(provider.protocol, profile.adapterId)) throw new ApiHttpError(400, "VALIDATION_FAILED", "Provider protocol does not match the selected CLI profile.", { field: "providerId" });
        }
        const modelRouteId = body.modelRouteId === undefined ? undefined : requireBoundRoute(body.modelRouteId);
        const launchConfig = normalizeLaunchConfig(body.launchConfig);
        const requestedMode = body.interactionMode === undefined ? "chat" : body.interactionMode;
        if (requestedMode !== "chat" && requestedMode !== "terminal") throw new ApiHttpError(400, "VALIDATION_FAILED", "interactionMode must be \"chat\" or \"terminal\".", { field: "interactionMode" });
        const launch = await resolveLaunch(profile, launchConfig);
        // 缺省 chat；Profile 不支持 headless 时服务端降级 terminal，不报错（api-spec §2.6）
        const interactionModeDowngraded = requestedMode === "chat" && !launch.capabilities.supportsHeadlessTurns;
        const downgradeReason = interactionModeDowngraded ? mapDetectionFailureToDowngradeReason(launch.capabilities.detectionFailure) : undefined;
        const interactionMode = interactionModeDowngraded ? "terminal" as const : requestedMode;
        const session: SessionV3 = {
          id: dependencies.idGenerator.create("session"), name: requireResourceName(body.name, "name"), workspaceId, profileId, interactionMode,
          runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: nextManualOrder(), launchConfig,
          ...(providerId ? { providerId } : {}),
          ...(modelRouteId ? { modelRouteId } : {}),
          backendId: dependencies.agentBackends?.forProfile(profile).id ?? backendIdForAdapter(profile.adapterId),
          backendSessionRef: {
            backendId: dependencies.agentBackends?.forProfile(profile).id ?? backendIdForAdapter(profile.adapterId),
            transport: interactionMode === "chat" ? "json-stream" : "pty"
          },
          revision: 1, createdAt: now, lastActiveAt: now
        };
        state.sessions.push(session);
        try {
          if (start) await startSession(session.id, true, body.terminal?.cols, body.terminal?.rows);
          else await dependencies.stateRepository.save(state);
        } catch (error) {
          if (start && error instanceof ApiHttpError && error.code === "SESSION_START_FAILED") {
            const capabilities = launch.capabilities;
            const serialized = serializeSession(session);
            sendJson(response, 201, { ...serialized, session: serialized, capabilities, ...(interactionModeDowngraded ? { interactionModeDowngraded: true } : {}), ...(downgradeReason ? { downgradeReason } : {}), startupError: { code: error.code, message: error.publicMessage, requestId: "create-session" } });
            return;
          }
          state.sessions = state.sessions.filter((item) => item.id !== session.id);
          await dependencies.transcriptRepository.delete(session.id).catch(() => undefined);
          await dependencies.stateRepository.save(state).catch(() => undefined);
          throw error;
        }
        const capabilities = start ? launch.capabilities : await resolveCapabilities(profile);
        const serialized = serializeSession(session);
        sendJson(response, 201, { ...serialized, session: serialized, capabilities, ...(interactionModeDowngraded ? { interactionModeDowngraded: true } : {}), ...(downgradeReason ? { downgradeReason } : {}) });
        return;
      }
      if (method === "PATCH" && id) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        // 创建后模式不可变（api-spec §2.6）
        if (body.interactionMode !== undefined) throw new ApiHttpError(400, "VALIDATION_FAILED", "interactionMode cannot be changed after creation.", { field: "interactionMode" });
        if (body.name !== undefined) session.name = requireResourceName(body.name, "name");
        if (body.launchConfig !== undefined) {
          const nextConfig = { ...session.launchConfig, ...normalizeLaunchConfig(body.launchConfig, true) };
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
          await resolveLaunch(profile, nextConfig);
          session.launchConfig = nextConfig;
        }
        if (body.activeModel !== undefined) {
          // 仅 chat 会话；轮次进行中允许，下一轮生效（api-spec §2.6）
          if (session.interactionMode !== "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "activeModel is only available for chat sessions.");
          const activeModel = requireText(body.activeModel, "activeModel");
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (!profile) throw new ApiHttpError(404, "PROFILE_NOT_FOUND", "Profile not found.");
          const capabilities = await resolveCapabilities(profile);
          if (!capabilities.models.some((item) => item.id === activeModel)) throw new ApiHttpError(400, "CLI_OPTION_UNSUPPORTED", "The selected CLI option is not supported.", { option: activeModel });
          session.chatContext = { ...session.chatContext, activeModel };
        }
        if (body.modelRouteId !== undefined) {
          session.modelRouteId = body.modelRouteId === null ? undefined : requireBoundRoute(body.modelRouteId);
        }
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "DELETE" && id) {
        const session = requireSession(id);
        if (state.sessions.some((candidate) => candidate.parentSessionId === id)) throw new ApiHttpError(409, "SESSION_HAS_FORKS", "Delete dependent Fork sessions first.");
        await stopSession(id);
        state.sessions = state.sessions.filter((candidate) => candidate.id !== id);
        await dependencies.transcriptRepository.delete(id);
        await executionRepository?.delete(id);
        await dependencies.stateRepository.save(state);
        sendJson(response, 204, null);
        return;
      }
      if (method === "POST" && id && action === "start") {
        sendJson(response, 200, serializeSession((await startSession(id, body.confirmed === true, body.cols, body.rows))!));
        return;
      }
      if (method === "POST" && id && action === "stop") {
        sendJson(response, 200, serializeSession((await stopSession(id))!));
        return;
      }
      if (method === "POST" && id && action === "pin") {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        session.pinned = body.pinned === true;
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && ["archive", "complete", "restore", "reopen"].includes(action ?? "")) {
        const session = requireSession(id);
        assertRevision(session, body.expectedRevision);
        if (session.runtimeStatus === "running" && body.stopRunning !== true) throw new ApiHttpError(409, "SESSION_RUNNING_CONFIRMATION_REQUIRED", "Running session must be stopped first.");
        if (action === "restore" && !["archived", "completed"].includes(session.organizationStatus)) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only archived or completed sessions can be restored.");
        if (action === "reopen" && session.organizationStatus !== "completed") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only completed sessions can be reopened.");
        if ((action === "archive" || action === "complete") && session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only active sessions can change lifecycle state.");
        if (session.runtimeStatus === "running") await stopSession(id);
        if (action === "archive") { session.organizationStatus = "archived"; session.archivedAt = dependencies.clock.now(); }
        else if (action === "complete") { session.organizationStatus = "completed"; session.completedAt = dependencies.clock.now(); }
        else { session.organizationStatus = "active"; session.archivedAt = undefined; session.completedAt = undefined; }
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
      if (method === "POST" && id && action === "fork") {
        const parent = requireSession(id);
        assertRevision(parent, body.expectedRevision);
        const visibleParent = await visibleTranscript(id);
        const latest = visibleParent.events.at(-1);
        const materialize = await forkDepth(parent) >= 32;
        const now = dependencies.clock.now();
        const child: SessionV3 = {
          ...parent, id: dependencies.idGenerator.create("session"), name: typeof body.name === "string" && body.name.trim() ? requireResourceName(body.name, "name") : `${parent.name} fork`,
          runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: nextManualOrder(), parentSessionId: materialize ? undefined : parent.id,
          forkEventId: materialize ? undefined : latest?.id, forkSequence: materialize ? undefined : latest?.sequence ?? 0, forkedAt: now, createdAt: now, lastActiveAt: now,
          chatContext: undefined, terminalContext: undefined, completedAt: undefined, archivedAt: undefined, exitCode: undefined, error: undefined, revision: 1
        };
        state.sessions.push(child);
        try {
          if (materialize) await materializeTranscript(child.id, visibleParent.events);
          await dependencies.stateRepository.save(state);
        } catch (error) {
          state.sessions = state.sessions.filter((candidate) => candidate.id !== child.id);
          await dependencies.transcriptRepository.delete(child.id).catch(() => undefined);
          throw error;
        }
        sendJson(response, 201, { session: serializeSession(child), parentBoundary: { eventId: latest?.id, sequence: latest?.sequence ?? 0 } });
        return;
      }
      if (method === "POST" && id && action === "messages") {
        await withSessionMutation(id, async () => {
          const session = requireSession(id);
          const clientMessageId = requireText(body.clientMessageId, "clientMessageId");
          const content = requireComposerContent(body.content);
          const existing = await findMessage(id, clientMessageId);
          if (existing) {
            const duplicateTurn = typeof existing.metadata?.turnId === "string" ? { turnId: existing.metadata.turnId } : {};
            sendJson(response, 202, { event: existing, runtimeStatus: session.runtimeStatus, duplicate: true, ...duplicateTurn });
            return;
          }
          const requestedOverride = body.routeOverride;
          const fixedDeploymentId = requestedOverride === undefined
            ? undefined
            : requestedOverride && typeof requestedOverride === "object" && typeof requestedOverride.fixedDeploymentId === "string" && requestedOverride.fixedDeploymentId.trim()
              ? requestedOverride.fixedDeploymentId
              : (() => { throw new ApiHttpError(400, "MODEL_ROUTE_INVALID", "routeOverride.fixedDeploymentId is required.", { field: "routeOverride.fixedDeploymentId" }); })();
          const { resolved: resolvedRoute, deployment } = await routeForSession(session, fixedDeploymentId);
          if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session must be active before messages can be sent.");
          if (session.runtimeStatus !== "running") {
            if (body.startIfStopped !== true) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
            await startSession(id, body.confirmedStart === true, 100, 30, fixedDeploymentId);
          }
          if (session.interactionMode === "chat" && resolvedRoute.kind === "route" && executionRepository && routeExecutionCoordinator) {
            const event = await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "user_message", source: "composer", raw: content, clientMessageId });
            if (!event) throw new ApiHttpError(500, "TRANSCRIPT_WRITE_FAILED", "Message could not be recorded.");
            const routed = await startRoutedExecution(session, content, clientMessageId, event, resolvedRoute);
            session.lastActiveAt = dependencies.clock.now();
            await dependencies.stateRepository.save(state);
            sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false, turnId: routed?.task.turnId, taskId: routed?.task.id, attemptId: routed?.primaryAttempt.id, resolvedDeployment: routed?.resolvedDeployment });
            return;
          }
          // interactionMode 分流（api-spec §2.2）：chat → submitTurn；terminal → 现状 PTY write 不变
          if (session.interactionMode === "chat") {
            const workspace = state.workspaces.find((item) => item.id === session.workspaceId);
            const profile = state.profiles.find((item) => item.id === session.profileId);
            if (!workspace || !profile) throw new ApiHttpError(400, "VALIDATION_FAILED", "Session references a missing workspace or profile.");
            const turnId = dependencies.idGenerator.create("turn");
            const provider = await providerLaunchFor(deployment?.providerId ?? session.providerId, profile);
            const effectiveModel = deployment?.modelId ?? normalizeOption(session.chatContext?.activeModel ?? session.launchConfig.model) ?? undefined;
            if (dependencies.agentBackends) {
              const backend = dependencies.agentBackends.forProfile(profile);
              const backendSession = await backend.openSession({
                sessionId: id,
                workspacePath: workspace.path,
                config: { profile },
                resume: session.backendSessionRef?.backendId === backend.id ? session.backendSessionRef : undefined
              });
              session.backendId = backend.id;
              session.backendSessionRef = {
                ...backendSession.ref,
                backendId: backend.id,
                transport: backendSession.selectedTransport
              };
              const backendInput: AgentInput = {
                turnId,
                prompt: content,
                clientMessageId,
                ...(effectiveModel ? { model: effectiveModel } : {}),
                ...(normalizeOption(session.launchConfig.permission) ? { permission: normalizeOption(session.launchConfig.permission)! } : {}),
                ...(normalizeOption(session.launchConfig.mode) ? { mode: normalizeOption(session.launchConfig.mode)! } : {}),
                ...(Object.keys(provider.env).length ? { launchEnv: provider.env } : {}),
                ...(provider.args.length ? { launchArgs: provider.args } : {})
              };
              const { event } = await orchestrator.submitTurn(id, {
                turnId,
                prompt: content,
                clientMessageId,
                runBackend: () => backendSession.runTurn(backendInput)
              });
              session.lastActiveAt = dependencies.clock.now();
              await dependencies.stateRepository.save(state);
              sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false, turnId, ...(deployment ? { resolvedDeployment: { id: deployment.id, name: deployment.name, modelId: deployment.modelId } } : {}) });
              return;
            }
            const registry = dependencies.profileAdapters;
            if (!registry.buildTurn || !registry.parseEvents) throw new ApiHttpError(422, "SESSION_START_FAILED", "Chat turns are not supported by this server build.");
            // 审批应答通道仅对 supportsApproval 的 profile 接线（D-8）；否则不产生挂起路径
            const capabilities = await resolveCapabilities(profile);
            const approvalWiring = capabilities.supportsApproval && registry.buildApprovalResponse
              ? { buildApprovalResponse: (approvalId: string, decision: "allow" | "deny") => registry.buildApprovalResponse!(profile, approvalId, decision) }
              : {};
            // codex 常驻运行时注入（streaming-spec §3.5）：选项翻译与 argv 路径同源（default → 省略）
            const persistentRuntime = dependencies.persistentChatRuntime;
            const persistentWiring = persistentRuntime && profile.adapterId === "codex" && capabilities.supportsHeadlessTurns && provider.args.length === 0
              ? {
                  runPersistent: (handlers: PersistentTurnHandlers) => persistentRuntime.runTurn(id, {
                    turnId,
                    prompt: content,
                    cwd: workspace.path,
                    env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...provider.env },
                    command: profile.command,
                    model: effectiveModel ?? null,
                    sandboxMode: normalizeOption(session.launchConfig.mode),
                    approvalPolicy: normalizeOption(session.launchConfig.permission),
                    resumeToken: session.chatContext?.resumeToken
                  }, handlers)
                }
              : {};
            const { event } = await orchestrator.submitTurn(id, {
              turnId,
              prompt: content,
              clientMessageId,
              ...approvalWiring,
              ...persistentWiring,
              // CLI 语义封闭在 Adapter；Orchestrator 只拿回调（决策 D-9）
              buildCommand: async () => {
                const spec = await registry.buildTurn!(profile, {
                  workspacePath: workspace.path,
                  prompt: content,
                  permission: session.launchConfig.permission,
                  mode: session.launchConfig.mode,
                  model: effectiveModel ?? null,
                  resumeToken: session.chatContext?.resumeToken
                });
                return { command: spec.command, args: [...spec.args, ...provider.args], cwd: workspace.path, env: { ...definedEnvironment(dependencies.policy.processEnvironment), ...spec.env, ...provider.env } };
              },
              parseOutput: (stdout, hooks) => registry.parseEvents!(profile, stdout, { turnId }, hooks)
            });
            session.lastActiveAt = dependencies.clock.now();
            await dependencies.stateRepository.save(state);
            sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false, turnId, ...(deployment ? { resolvedDeployment: { id: deployment.id, name: deployment.name, modelId: deployment.modelId } } : {}) });
            return;
          }
          const event = await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "user_message", source: "composer", raw: content, clientMessageId });
          if (!event) throw new ApiHttpError(500, "TRANSCRIPT_WRITE_FAILED", "Message could not be recorded.");
          if (!orchestrator.isRunning(id) || session.runtimeStatus !== "running") {
            await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Message was recorded but could not be delivered.", metadata: { code: "MESSAGE_DELIVERY_FAILED", clientMessageId } });
            throw new ApiHttpError(502, "MESSAGE_DELIVERY_FAILED", "Message was recorded but could not be delivered.");
          }
          try {
            orchestrator.writeTerminal(id, `\x1b[200~${content.replace(/\r\n|\r/g, "\n")}\x1b[201~\r`);
          } catch (error) {
            await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "error", source: "session-manager", raw: "Message was recorded but could not be delivered.", metadata: { code: "MESSAGE_DELIVERY_FAILED", clientMessageId } });
            throw new ApiHttpError(502, "MESSAGE_DELIVERY_FAILED", "Message was recorded but could not be delivered.", undefined, { cause: error });
          }
          session.lastActiveAt = dependencies.clock.now();
          await dependencies.stateRepository.save(state);
          sendJson(response, 202, { event, runtimeStatus: session.runtimeStatus, duplicate: false });
        });
        return;
      }
      if (method === "POST" && id && action === "turns" && segments[3] === "cancel") {
        // 取消受理 202 { turnId }；终态经 error 事件（code TURN_CANCELLED）到达（api-spec §2.4）
        const session = requireSession(id);
        if (session.interactionMode !== "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Turn cancellation is only available for chat sessions.");
        const turnId = requireText(body.turnId, "turnId");
        await orchestrator.cancelTurn(id, turnId);
        sendJson(response, 202, { turnId });
        return;
      }
      if (method === "POST" && id && action === "approvals" && segments[3]) {
        // 审批应答（api-spec §2.5）：受理 200 { approvalId, decision }；无挂起审批 409 APPROVAL_NOT_PENDING
        requireSession(id);
        const decision = body.decision;
        if (decision !== "allow" && decision !== "deny") throw new ApiHttpError(400, "VALIDATION_FAILED", "decision must be \"allow\" or \"deny\".", { field: "decision" });
        await orchestrator.respondApproval(id, segments[3], decision);
        sendJson(response, 200, { approvalId: segments[3], decision });
        return;
      }
      if (method === "GET" && id && action === "transcript") {
        const afterSequence = Number(url.searchParams.get("afterSequence") ?? 0);
        const limit = Number(url.searchParams.get("limit") ?? 200);
        if (!Number.isInteger(afterSequence) || afterSequence < 0 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new ApiHttpError(400, "VALIDATION_FAILED", "Transcript cursor and limit are invalid.");
        requireSession(id);
        sendJson(response, 200, await visibleTranscriptPage(id, afterSequence, limit));
        return;
      }
      if (method === "POST" && id && action === "resize") {
        // chat 会话无 PTY 可 resize（api-spec §5）
        if (getSession(id)?.interactionMode === "chat") throw new ApiHttpError(400, "INTERACTION_MODE_MISMATCH", "Terminal resize is not available for chat sessions.");
        if (!orchestrator.isRunning(id)) throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Session is not running.");
        orchestrator.resizeTerminal(id, body.cols, body.rows);
        sendJson(response, 204, null);
        return;
      }
      if (method === "POST" && id && action === "view") {
        // dual-mode §9.1：视图切换 API
        const session = requireSession(id);
        if (session.organizationStatus !== "active") throw new ApiHttpError(409, "SESSION_NOT_ACTIVE", "Only active sessions can switch view.");
        assertRevision(session, body.expectedRevision);
        const view = body.view;
        if (view !== "terminal" && view !== "gui") throw new ApiHttpError(400, "VALIDATION_FAILED", "view must be 'terminal' or 'gui'.", { field: "view" });
        // guiMode 守卫：unsupported 时禁止切 gui
        if (view === "gui") {
          const profile = state.profiles.find((item) => item.id === session.profileId);
          if (profile) {
            const capabilities = await resolveCapabilities(profile);
            if (capabilities.guiMode === "unsupported") throw new ApiHttpError(400, "VIEW_UNSUPPORTED", "GUI mode is not supported by this profile.");
          }
        }
        session.activeView = view;
        session.inputOwner = view;
        session.revision += 1;
        await dependencies.stateRepository.save(state);
        // 审计事件（docx 附录 B side effects）
        await appendEvent(session, { occurredAt: dependencies.clock.now(), kind: "lifecycle", source: "session-manager", raw: `View switched to ${view}.`, metadata: { view, reason: "user-switch" } });
        publishSessionUpdate(session);
        sendJson(response, 200, serializeSession(session));
        return;
      }
    }
    throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
  }

  return {
    async handleHttp(request, response, url) {
      beginOperation();
      try {
        if (url.pathname === "/health") {
          if (!["GET", "HEAD"].includes(request.method ?? "GET")) throw new ApiHttpError(404, "ROUTE_NOT_FOUND", "Route not found.");
          sendJson(response, 200, { status: "ok", service: "session-manager", readonly: dependencies.policy.readonly, timestamp: dependencies.clock.now() });
        } else if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
        else await serveStatic(dependencies, response, url.pathname);
      } finally {
        endOperation();
      }
    },
    handleWebSocket(client, _request, url) {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId || !getSession(sessionId)) {
        client.close(1008, "session not found");
        return;
      }
      if (url.searchParams.get("channel") === "events") {
        const rawAfterSequence = url.searchParams.get("afterSequence") ?? "0";
        if (!/^\d+$/.test(rawAfterSequence)) { client.close(1008, "invalid transcript cursor"); return; }
        const afterSequence = Number(rawAfterSequence);
        if (!Number.isSafeInteger(afterSequence)) { client.close(1008, "invalid transcript cursor"); return; }
        const subscriber: EventSubscriber = { client, ready: false, pending: [], pendingBytes: 0 };
        const subscribers = eventSubscribers.get(sessionId) ?? new Set<EventSubscriber>();
        subscribers.add(subscriber);
        eventSubscribers.set(sessionId, subscribers);
        void Promise.all([visibleTranscriptPage(sessionId, afterSequence, 200), visibleTranscript(sessionId)]).then(([page, visible]) => {
          if (client.readyState !== WebSocket.OPEN) return;
          for (const event of page.events) client.send(JSON.stringify({ type: "transcript-event", event }));
          const pending = subscriber.pending.splice(0);
          subscriber.pendingBytes = 0;
          for (const event of pending) if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "transcript-event", event }));
          subscriber.ready = true;
          client.send(JSON.stringify({ type: "subscription-ready", afterSequence, latestSequence: visible.events.at(-1)?.sequence ?? afterSequence }));
        }).catch(() => { subscribers.delete(subscriber); client.close(1011, "transcript replay failed"); });
        client.on("close", () => subscribers.delete(subscriber));
        client.on("error", () => subscribers.delete(subscriber));
        return;
      }
      orchestrator.attachTerminalClient(sessionId, client);
      client.send(JSON.stringify({ type: "runtime-status", status: getSession(sessionId)?.runtimeStatus ?? "stopped" }));
      // 终端回放：客户端重连（session 切换）时发送缓冲的 PTY 输出，避免黑屏
      const replay = orchestrator.getTerminalReplay(sessionId);
      if (replay) client.send(JSON.stringify({ type: "terminal-output", data: replay }));
      client.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as { type: string; data?: string; cols?: number; rows?: number };
          if (!orchestrator.isRunning(sessionId)) return;
          if ((message.type === "terminal-input" || message.type === "input") && typeof message.data === "string") {
            // dual-mode §10：inputOwner !== "terminal" 时拒绝终端输入（resize 不受限）
            const session = getSession(sessionId);
            if (session?.inputOwner && session.inputOwner !== "terminal") {
              client.send(JSON.stringify({ type: "input-rejected", reason: `Input owner is '${session.inputOwner}', terminal input blocked.` }));
              return;
            }
            orchestrator.writeTerminal(sessionId, message.data);
            touchSession(sessionId);
          } else if ((message.type === "terminal-resize" || message.type === "resize") && Number.isInteger(message.cols) && Number.isInteger(message.rows)) {
            orchestrator.resizeTerminal(sessionId, message.cols, message.rows);
          } else {
            client.send(JSON.stringify({ type: "protocol-error", error: { code: "VALIDATION_FAILED", message: "Invalid terminal frame.", requestId: "websocket" } }));
          }
        } catch {
          client.send(JSON.stringify({ type: "protocol-error", error: { code: "INVALID_JSON", message: "Invalid terminal frame.", requestId: "websocket" } }));
        }
      });
      client.on("close", () => orchestrator.detachTerminalClient(sessionId, client));
    },
    close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        closing = true;
        orchestrator.beginShutdown();
        await waitForIdle();
        const stoppedSessionIds = await orchestrator.shutdown();
        // 全部 chat 常驻进程随服务关停终止（streaming-spec FR-6）
        await dependencies.persistentChatRuntime?.shutdown();
        let changed = false;
        for (const sessionId of stoppedSessionIds) {
          const session = getSession(sessionId);
          if (session && session.runtimeStatus !== "stopped") {
            session.runtimeStatus = "stopped";
            session.lastActiveAt = dependencies.clock.now();
            session.revision += 1;
            changed = true;
          }
        }
        for (const subscribers of eventSubscribers.values()) for (const subscriber of subscribers) subscriber.client.close(1001, "server shutting down");
        eventSubscribers.clear();
        const failures: unknown[] = [];
        const shutdown = await Promise.allSettled([dependencies.ptyRuntime.shutdown(), changed && !dependencies.policy.readonly ? dependencies.stateRepository.save(state) : Promise.resolve()]);
        for (const result of shutdown) if (result.status === "rejected") failures.push(result.reason);
        const drains = await Promise.allSettled([dependencies.stateRepository.drain(), dependencies.transcriptRepository.drain(), executionRepository?.drain() ?? Promise.resolve()]);
        for (const result of drains) if (result.status === "rejected") failures.push(result.reason);
        if (failures.length) throw new AggregateError(failures, "Application shutdown failed");
      })();
      return closePromise;
    }
  };
}

async function serveStatic(dependencies: ApplicationDependencies, response: http.ServerResponse, pathname: string) {
  const root = path.resolve(process.cwd(), "dist");
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const target = path.resolve(root, requested);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return sendJson(response, 403, { error: "unsafe path" });
  const filePath = await dependencies.filesystem.stat(target).then(() => target).catch(() => path.join(root, "index.html"));
  const content = await dependencies.filesystem.readFile(filePath);
  const type = filePath.endsWith(".html") ? "text/html" : filePath.endsWith(".js") ? "text/javascript" : filePath.endsWith(".css") ? "text/css" : "application/octet-stream";
  response.writeHead(200, { "content-type": type });
  response.end(content);
}

function executionErrorToApi(error: unknown): ApiHttpError {
  if (error instanceof RouteExecutionError) {
    const status = error.code === "EXECUTION_NOT_FOUND" ? 404 : error.code === "TASK_REVISION_CONFLICT" ? 409 : 400;
    return new ApiHttpError(status, error.code, error.message);
  }
  return error instanceof ApiHttpError ? error : new ApiHttpError(500, "INTERNAL_ERROR", "Execution operation failed.", undefined, { cause: error });
}

function isKnownApiRoute(method: string, resource: string | undefined, id: string | undefined, action: string | undefined, segments: string[]) {
  if (method === "GET" && resource === "state" && !id) return true;
  if (method === "GET" && resource === "engines" && id === "readiness" && !action) return true;
  if (resource === "providers") {
    if (method === "GET" && !id) return true;
    if (method === "POST" && !id) return true;
    if (id && action === "credential" && (method === "PUT" || method === "DELETE")) return true;
    if (id && !action && (method === "PATCH" || method === "DELETE")) return true;
    return false;
  }
  if (resource === "model-deployments") {
    if (method === "GET" && (!id || Boolean(id) && !action)) return true;
    if (method === "POST" && !id) return true;
    if (id && !action && (method === "PATCH" || method === "DELETE")) return true;
    return false;
  }
  if (resource === "model-routes") {
    if (method === "GET" && (!id || Boolean(id) && !action)) return true;
    if (method === "POST" && !id) return true;
    if (method === "POST" && id && action === "resolve" && !segments[3]) return true;
    if (id && !action && (method === "PATCH" || method === "DELETE")) return true;
    return false;
  }
  if (resource === "model-routing") return method === "PUT" && id === "global" && !action;
  if (resource === "execution-tasks") {
    if (method === "GET" && id && !action) return true;
    if (method === "POST" && id && ["confirm-retry", "cancel"].includes(action ?? "") && !segments[3]) return true;
    return false;
  }
  if (resource === "workspaces") {
    if (method === "POST" && ((id === "pick" && !action) || (!id && action === "pick"))) return true;
    if (method === "GET" && id && ["files", "preview", "languages"].includes(action ?? "")) return true;
    if (method === "GET" && id && action === "git" && ["status", "diff"].includes(segments[3] ?? "")) return true;
    return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  }
  if (resource === "profiles") {
    if (method === "GET" && id && action === "capabilities") return true;
    if (method === "GET" && id && action === "models" && !segments[3]) return true;
    if (method === "POST" && id && action === "models" && ["sync", "custom"].includes(segments[3] ?? "") && !segments[4]) return true;
    if (method === "DELETE" && id && action === "models" && segments[3] === "custom" && Boolean(segments[4]) && !segments[5]) return true;
    return !action && ((method === "POST" && !id) || Boolean(id && (method === "PATCH" || method === "DELETE")));
  }
  if (resource === "skills") return method === "GET" && (!id || (id === "content" && !action));
  if (resource === "prompt") return method === "POST" && id === "enhance" && !action;
  if (resource !== "sessions") return false;
  if (method === "POST" && id === "reorder" && !action) return true;
  if (method === "POST" && !id && !action) return true;
  if (!id) return false;
  if (method === "GET" && action === "transcript") return true;
  if (method === "GET" && action === "execution-tasks" && !segments[3]) return true;
  if (method === "POST" && action === "model-route" && segments[3] === "resolve" && !segments[4]) return true;
  if (method === "POST" && action === "turns" && segments[3] === "cancel") return true;
  if (method === "POST" && action === "approvals" && Boolean(segments[3])) return true;
  if (method === "PATCH" || method === "DELETE") return !action;
  return method === "POST" && ["start", "stop", "resize", "pin", "archive", "complete", "restore", "reopen", "fork", "messages", "view"].includes(action ?? "");
}

async function readJson(request: http.IncomingMessage) {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|$)/i.test(contentType)) throw new ApiHttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1_048_576) { request.resume(); throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB."); }
  const chunks: Buffer[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.from(chunk);
      total += buffer.length;
      if (total > 1_048_576) { cleanup(); request.resume(); reject(new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "JSON request body exceeds 1 MiB.")); return; }
      chunks.push(buffer);
    };
    const onEnd = () => { cleanup(); resolve(); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { request.off("data", onData); request.off("end", onEnd); request.off("error", onError); };
    request.on("data", onData); request.once("end", onEnd); request.once("error", onError);
  });
  if (!chunks.length) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("body must be an object");
    return parsed as Record<string, any>;
  } catch (error) {
    if (error instanceof ApiHttpError) throw error;
    throw new ApiHttpError(400, "INVALID_JSON", "Request body must contain valid UTF-8 JSON.", undefined, { cause: error });
  }
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

/** SPECOS_MAX_RUNNING_SESSIONS：非法值回落默认 8；低于配置下限的合法整数抬升到 4（D-6） */
function resolveMaxRunningSessions(value: string | undefined, logger: ApplicationDependencies["logger"]): number {
  if (value === undefined || value === "") return DEFAULT_MAX_RUNNING_SESSIONS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    logger.warn("Invalid SPECOS_MAX_RUNNING_SESSIONS value; falling back to the default limit.", { value, limit: DEFAULT_MAX_RUNNING_SESSIONS });
    return DEFAULT_MAX_RUNNING_SESSIONS;
  }
  if (parsed < MIN_MAX_RUNNING_SESSIONS) {
    logger.warn("SPECOS_MAX_RUNNING_SESSIONS is below the configuration floor; clamping.", { value, limit: MIN_MAX_RUNNING_SESSIONS });
    return MIN_MAX_RUNNING_SESSIONS;
  }
  return parsed;
}

function definedEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return Object.fromEntries(Object.entries(environment).filter(([key, value]) => key !== "SPECOS_CSRF_CAPABILITY" && Boolean(value)).map(([key, value]) => [key, value!]));
}

export { commandPreview };

function bump(session: SessionV3) { session.revision += 1; }

function assertRevision(session: SessionV3, expectedRevision: unknown) {
  if (expectedRevision !== session.revision) throw new ApiHttpError(409, "SESSION_REVISION_CONFLICT", "Session revision conflict.", { expectedRevision, currentRevision: session.revision, session: { ...session, status: session.runtimeStatus } });
}

function normalizeLaunchConfig(value: unknown, partial = false) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalized: Record<string, string | null> = {};
  for (const key of ["permission", "mode", "model"] as const) {
    if (source[key] === undefined) { if (!partial) normalized[key] = null; }
    else if (source[key] === null || typeof source[key] === "string") normalized[key] = source[key] as string | null;
    else throw new ApiHttpError(400, "VALIDATION_FAILED", `${key} must be a string or null.`, { field: key });
  }
  return normalized as { permission: string | null; mode: string | null; model: string | null };
}

function requireResourceName(value: unknown, field: string) {
  const name = requireText(value, field);
  if (name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) throw new ApiHttpError(400, "VALIDATION_FAILED", `${field} is invalid or too long.`, { field });
  return name;
}

function requireComposerContent(value: unknown) {
  const content = requireText(value, "content");
  if (!content.trim()) throw new ApiHttpError(400, "VALIDATION_FAILED", "content must not be empty.", { field: "content" });
  if (Buffer.byteLength(content, "utf8") > 65_536) throw new ApiHttpError(413, "PAYLOAD_TOO_LARGE", "Composer content exceeds 64 KiB.");
  return content;
}

function languageForPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".md": "Markdown", ".json": "JSON", ".css": "CSS", ".html": "HTML", ".go": "Go", ".py": "Python", ".rs": "Rust", ".java": "Java", ".rb": "Ruby", ".sh": "Shell" };
  return map[extension];
}

function isExcluded(name: string) {
  return new Set(["node_modules", ".next", "dist", "build", "coverage", ".cache", ".DS_Store"]).has(name);
}

function isKnownAdapterId(value: unknown): value is CliAdapterId {
  return value === "claude-code" || value === "codex" || value === "kimi" || value === "glm" || value === "generic";
}

function inferProfileAdapter(command: string) {
  const normalized = command.toLowerCase();
  if (normalized.includes("codex")) return "codex" as const;
  if (normalized.includes("claude")) return "claude-code" as const;
  if (normalized.includes("kimi")) return "kimi" as const;
  if (normalized.includes("glm")) return "glm" as const;
  return "generic" as const;
}

function backendIdForAdapter(adapterId: CliAdapterId) {
  if (adapterId === "claude-code") return "claude";
  if (adapterId === "generic") return "generic-pty";
  return adapterId;
}

function isSafeRelativePath(value: string) {
  if (!value || value.includes("\\") || path.posix.isAbsolute(value)) return false;
  const segments = value.split("/");
  return !segments.includes("..") && !segments.includes(".git") && segments.every((segment) => Boolean(segment) && segment !== ".");
}

function compareFileEntries(a: FileTreeEntry, b: FileTreeEntry) {
  return Number(b.type === "directory") - Number(a.type === "directory") || a.name.localeCompare(b.name) || a.path.localeCompare(b.path);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiHttpError(504, "PICKER_TIMEOUT", "Folder picker timed out.")), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
