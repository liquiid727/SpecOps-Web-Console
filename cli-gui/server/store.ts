import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  CURRENT_SCHEMA_VERSION,
  type AppState,
  type AppStateEnvelopeV2,
  type AppStateEnvelopeV3,
  type AppStateEnvelopeV4,
  type AppStateEnvelopeV5,
  type AppStateEnvelopeV6,
  type AppStateEnvelopeV7,
  type AppStateEnvelopeV8,
  type AppStateV3,
  type CliProfileV3,
  type SessionChatContext,
  type SessionRuntimeError,
  type SessionV3,
  type WorkspaceV3
} from "../shared/types.js";
import type { ModelProviderConfig } from "../shared/model-provider.js";
import type { ModelDeploymentConfig } from "../shared/model-deployment.js";
import type { PriorityModelRoute, WorkspaceModelRouteBinding } from "../shared/model-route.js";
import type { Clock, StateRepository } from "./ports.js";

export interface JsonStateRepositoryOptions {
  dataDirectory: string;
  clock: Clock;
  readonly?: boolean;
}

export class StateRepositoryError extends Error {
  constructor(readonly code: "STATE_CORRUPT" | "STATE_MIGRATION_FAILED" | "READONLY_MODE", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StateRepositoryError";
  }
}

const writeQueues = new Map<string, Promise<void>>();

export function createJsonStateRepository({ dataDirectory, clock, readonly = false }: JsonStateRepositoryOptions): StateRepository {
  const resolvedDataDirectory = path.resolve(dataDirectory);
  const statePath = path.join(resolvedDataDirectory, "state.json");
  let migrationPending = false;

  const defaultProfiles = (): CliProfileV3[] => [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex", createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code", createdAt: clock.now() }
  ];

  const save = (state: AppStateV3) => {
    if (readonly) return Promise.reject(new StateRepositoryError("READONLY_MODE", "Readonly mode does not write state."));
    const snapshot: AppStateEnvelopeV8 = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      state: structuredClone({
        ...state,
        providers: state.providers ?? [],
        modelDeployments: state.modelDeployments ?? [],
        modelRoutes: state.modelRoutes ?? [],
        workspaceModelRouteBindings: state.workspaceModelRouteBindings ?? []
      })
    };
    const previous = writeQueues.get(statePath) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      await fs.mkdir(resolvedDataDirectory, { recursive: true });
      const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
        await fs.rename(temporaryPath, statePath);
      } finally {
        await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      }
    });
    writeQueues.set(statePath, next);
    return next;
  };

  return {
    async load() {
      let raw: string | undefined;
      try {
        raw = await fs.readFile(statePath, "utf8");
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw error;
      }

      if (raw === undefined) {
        const state: AppStateV3 = { workspaces: [], profiles: defaultProfiles(), sessions: [], providers: [], modelDeployments: [], modelRoutes: [], workspaceModelRouteBindings: [] };
        if (!readonly) await save(state);
        return structuredClone(state);
      }
      if (raw.trim() === "") throw new StateRepositoryError("STATE_CORRUPT", "State file is empty; the source was left unchanged.");

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        throw new StateRepositoryError("STATE_CORRUPT", "State file is not valid JSON; the source was left unchanged.", { cause: error });
      }

      const envelope = isCurrentEnvelope(parsed) ? parsed : undefined;
      const sourceVersion = detectSourceVersion(parsed);
      let state: AppStateV3;
      try {
        state = await migrateAndValidate(parsed, clock);
      } catch (error) {
        if (error instanceof StateRepositoryError) throw error;
        throw new StateRepositoryError("STATE_MIGRATION_FAILED", "State file could not be migrated safely; the source was left unchanged.", { cause: error });
      }

      const changed = !envelope || JSON.stringify(envelope.state) !== JSON.stringify(state);
      if (changed) {
        migrationPending = true;
        if (!readonly) {
          await createRecoveryBackup(statePath, sourceVersion);
          await save(state);
          migrationPending = false;
        }
      }
      return structuredClone(state);
    },
    save,
    async drain() {
      await (writeQueues.get(statePath) ?? Promise.resolve());
    }
  };

  async function createRecoveryBackup(sourcePath: string, sourceVersion: number) {
    const backupPath = `${sourcePath}.v${sourceVersion}.bak`;
    try {
      await fs.copyFile(sourcePath, backupPath, fs.constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

export async function migrateAndValidate(parsed: unknown, clock: Clock): Promise<AppStateV3> {
  if (!parsed || typeof parsed !== "object") throw new Error("state root must be an object");
  const envelope = isStateEnvelope(parsed) ? parsed : undefined;
  const sourceVersion = detectSourceVersion(parsed);
  if ("schemaVersion" in parsed && (!envelope || sourceVersion > CURRENT_SCHEMA_VERSION || sourceVersion < 2)) throw new Error("unsupported state schema version");
  const source = (envelope?.state ?? parsed) as Partial<AppStateV3>;
  if (!Array.isArray(source.workspaces) || !Array.isArray(source.profiles) || !Array.isArray(source.sessions)) {
    throw new Error("state must contain workspaces, profiles, and sessions arrays");
  }

  const fallbackProfiles = [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex" as const, createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code" as const, createdAt: clock.now() }
  ];
  const profiles = (source.profiles.length ? source.profiles : fallbackProfiles).map((profile): CliProfileV3 => {
    if (!profile || typeof profile !== "object") throw new Error("profile must be an object");
    const candidate = profile as Partial<CliProfileV3>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.command) || !Array.isArray(candidate.args) || candidate.args.some((arg) => typeof arg !== "string") || (candidate.adapterId !== undefined && !["claude-code", "codex", "kimi", "glm", "generic"].includes(candidate.adapterId))) {
      throw new Error("profile has invalid fields");
    }
    return {
      id: candidate.id,
      name: candidate.name,
      command: candidate.command,
      args: [...candidate.args],
      adapterId: candidate.adapterId ?? inferAdapterId(candidate.command),
      adapterVersionRange: candidate.adapterVersionRange,
      // 可选增量字段（console-gaps SPEC §2.3）：宽容放行，形状不对时丢弃而非拒绝整份 state
      customModels: sanitizeModelList(candidate.customModels),
      syncedModels: sanitizeModelList(candidate.syncedModels),
      createdAt: candidate.createdAt ?? clock.now()
    };
  });

  const workspaces = await Promise.all(source.workspaces.map(async (workspace): Promise<WorkspaceV3> => {
    if (!workspace || typeof workspace !== "object") throw new Error("workspace must be an object");
    const candidate = workspace as Partial<WorkspaceV3>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.path) || (candidate.createdAt !== undefined && typeof candidate.createdAt !== "string") || (candidate.lastOpenedAt !== undefined && typeof candidate.lastOpenedAt !== "string")) throw new Error("workspace has invalid fields");
    // v2 -> v3: kind 缺失回填 "local-folder"；预留值/伪造值在 MVP01 一律拒绝（storage-spec §3.3）。
    const kind = candidate.kind ?? "local-folder";
    if (kind !== "local-folder") throw new Error(`workspace kind is not runnable in MVP01: ${String(kind)}`);
    const canonicalPath = await fs.realpath(candidate.path).catch((error) => {
      throw new Error(`workspace path cannot be canonicalized: ${candidate.path}`, { cause: error });
    });
    const stat = await fs.stat(canonicalPath).catch(() => undefined);
    if (!stat?.isDirectory()) throw new Error(`workspace path is not a directory: ${candidate.path}`);
    return { id: candidate.id, name: candidate.name, path: canonicalPath, kind, createdAt: candidate.createdAt ?? clock.now(), lastOpenedAt: candidate.lastOpenedAt };
  }));

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  if (new Set(workspaces.map((workspace) => workspace.path)).size !== workspaces.length) throw new Error("state contains duplicate workspace paths");
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const sessions = source.sessions.map((session, index): SessionV3 => {
    if (!session || typeof session !== "object") throw new Error("session must be an object");
    const candidate = session as Partial<SessionV3> & { status?: string; error?: unknown; adapterId?: unknown; resumeToken?: unknown };
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.workspaceId) || !nonEmpty(candidate.profileId) || !workspaceIds.has(candidate.workspaceId) || !profileIds.has(candidate.profileId)) {
      throw new Error("session contains an invalid reference");
    }
    const launchConfig = candidate.launchConfig && typeof candidate.launchConfig === "object"
      ? candidate.launchConfig
      : { permission: null, mode: null, model: null };
    if ([launchConfig.permission, launchConfig.mode, launchConfig.model, launchConfig.branch].some((value) => value !== null && value !== undefined && typeof value !== "string")) throw new Error("session has invalid launch configuration");
    // v2 -> v3: interactionMode 缺失回填 "terminal"（历史会话全部是 PTY 会话）。
    const interactionMode = candidate.interactionMode ?? "terminal";
    if (interactionMode !== "chat" && interactionMode !== "terminal") throw new Error("session has invalid interaction mode");
    const chatContext = normalizeChatContext(candidate.chatContext, interactionMode);
    const terminalContext = normalizeTerminalContext(candidate.terminalContext, interactionMode);
    const profile = profiles.find((item) => item.id === candidate.profileId)!;
    if (candidate.resumeToken !== undefined && typeof candidate.resumeToken !== "string") throw new Error("session has invalid legacy resume token");
    if (candidate.adapterId !== undefined && typeof candidate.adapterId !== "string") throw new Error("session has invalid legacy adapter id");
    const normalizedBackendSessionRef = normalizeBackendSessionRef(candidate.backendSessionRef);
    const backendId = nonEmpty(candidate.backendId)
      ? candidate.backendId
      : normalizedBackendSessionRef?.backendId
        ?? (nonEmpty(candidate.adapterId) ? backendIdForLegacyAdapter(candidate.adapterId) : backendIdForAdapter(profile.adapterId));
    if (normalizedBackendSessionRef && normalizedBackendSessionRef.backendId !== backendId) throw new Error("session backend id does not match backend session ref");
    const legacyNativeSessionId = candidate.resumeToken
      ?? (interactionMode === "chat" ? chatContext?.resumeToken : terminalContext?.resumeToken);
    const unknownFields = sourceVersion < CURRENT_SCHEMA_VERSION ? extractUnknownSessionFields(session as unknown as Record<string, unknown>) : undefined;
    const migrationMetadata = sourceVersion < CURRENT_SCHEMA_VERSION
      ? {
        sourceSchemaVersion: sourceVersion,
        ...(unknownFields && Object.keys(unknownFields).length ? { unknownFields } : {})
      }
      : normalizedBackendSessionRef?.migrationMetadata;
    const backendSessionRef = {
      backendId: normalizedBackendSessionRef?.backendId ?? backendId,
      transport: normalizedBackendSessionRef?.transport ?? (interactionMode === "chat" ? "json-stream" as const : "pty" as const),
      ...(normalizedBackendSessionRef?.nativeSessionId || legacyNativeSessionId ? { nativeSessionId: normalizedBackendSessionRef?.nativeSessionId ?? legacyNativeSessionId } : {}),
      ...(normalizedBackendSessionRef?.resumeData ? { resumeData: normalizedBackendSessionRef.resumeData } : {}),
      ...(migrationMetadata ? { migrationMetadata } : {})
    };
    const manualOrder = typeof candidate.manualOrder === "number" && Number.isFinite(candidate.manualOrder) ? candidate.manualOrder : (index + 1) * 1000;
    const revision = typeof candidate.revision === "number" && Number.isInteger(candidate.revision) && candidate.revision > 0 ? candidate.revision : 1;
    if (!["active", "completed", "archived"].includes(candidate.organizationStatus ?? "active")) throw new Error("session has invalid organization status");
    if (candidate.pinned !== undefined && typeof candidate.pinned !== "boolean") throw new Error("session has invalid pinned state");
    if (candidate.forkSequence !== undefined && (!Number.isInteger(candidate.forkSequence) || candidate.forkSequence < 0)) throw new Error("session has invalid fork boundary");
    if ([candidate.createdAt, candidate.lastActiveAt, candidate.forkedAt, candidate.completedAt, candidate.archivedAt].some((value) => value !== undefined && typeof value !== "string")) throw new Error("session has invalid timestamps");
    return {
      id: candidate.id,
      workspaceId: candidate.workspaceId,
      profileId: candidate.profileId,
      name: candidate.name,
      interactionMode,
      // dual-mode 归一（设计 §9）：load 时按 interactionMode 补默认值（chat → gui，terminal → terminal）
      activeView: candidate.activeView === "terminal" || candidate.activeView === "gui" ? candidate.activeView : interactionMode === "chat" ? "gui" : "terminal",
      inputOwner: candidate.inputOwner === "terminal" || candidate.inputOwner === "gui" || candidate.inputOwner === "none" ? candidate.inputOwner : interactionMode === "chat" ? "gui" : "terminal",
      runtimeStatus: "stopped",
      organizationStatus: candidate.organizationStatus ?? "active",
      pinned: candidate.pinned ?? false,
      manualOrder,
      launchConfig: {
        permission: launchConfig.permission ?? null,
        mode: launchConfig.mode ?? null,
        model: launchConfig.model ?? null,
        ...(launchConfig.branch !== undefined ? { branch: launchConfig.branch } : {})
      },
      ...(nonEmpty(candidate.providerId) ? { providerId: candidate.providerId } : {}),
      ...(nonEmpty(candidate.modelRouteId) ? { modelRouteId: candidate.modelRouteId } : {}),
      ...(chatContext !== undefined ? { chatContext } : {}),
      ...(terminalContext !== undefined ? { terminalContext } : {}),
      backendId,
      backendSessionRef,
      parentSessionId: candidate.parentSessionId,
      forkEventId: candidate.forkEventId,
      forkSequence: candidate.forkSequence,
      forkedAt: candidate.forkedAt,
      createdAt: candidate.createdAt ?? clock.now(),
      lastActiveAt: candidate.lastActiveAt ?? candidate.createdAt ?? clock.now(),
      completedAt: candidate.completedAt,
      archivedAt: candidate.archivedAt,
      exitCode: candidate.exitCode,
      error: isRuntimeError(candidate.error) ? candidate.error : undefined,
      revision
    };
  });

  const ids = [...workspaces, ...profiles, ...sessions].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("state contains duplicate IDs");
  const sessionIds = new Set(sessions.map((session) => session.id));
  for (const session of sessions) {
    if (session.parentSessionId !== undefined && (!sessionIds.has(session.parentSessionId) || session.parentSessionId === session.id)) throw new Error("session contains an invalid fork parent");
  }
  const modelRoutes = sanitizeRoutes(source.modelRoutes, clock);
  const routeById = new Map(modelRoutes.map((route) => [route.id, route]));
  const activeRoute = (routeId: string | undefined) => {
    const route = routeId ? routeById.get(routeId) : undefined;
    return route && route.enabled && !route.archivedAt ? route : undefined;
  };
  const workspaceModelRouteBindings = sanitizeWorkspaceBindings(source.workspaceModelRouteBindings)
    .filter((binding, index, bindings) => {
      if (!workspaceIds.has(binding.workspaceId)) return false;
      if (binding.routeId !== undefined && !activeRoute(binding.routeId)) return false;
      return bindings.findIndex((candidate) => candidate.workspaceId === binding.workspaceId) === index;
    });
  for (const session of sessions) {
    if (session.modelRouteId !== undefined && !routeById.has(session.modelRouteId)) delete session.modelRouteId;
  }
  return {
    workspaces,
    profiles,
    sessions,
    providers: sanitizeProviders(source.providers, sourceVersion, clock),
    modelDeployments: sanitizeDeployments(source.modelDeployments, clock),
    modelRoutes,
    globalModelRouteId: activeRoute(source.globalModelRouteId)?.id,
    workspaceModelRouteBindings
  };
}

export function migrateState(parsed: AppState | AppStateEnvelopeV2 | AppStateEnvelopeV3 | AppStateEnvelopeV4 | AppStateEnvelopeV5 | AppStateEnvelopeV6 | AppStateEnvelopeV7 | AppStateEnvelopeV8, clock: Clock): AppStateV3 {
  const source = (isStateEnvelope(parsed) ? parsed.state : parsed) as Partial<AppStateV3>;
  const profiles = source.profiles?.length ? source.profiles : [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex" as const, createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code" as const, createdAt: clock.now() }
  ];
  return {
    workspaces: (source.workspaces ?? []).map((workspace) => ({ ...workspace, kind: (workspace as Partial<WorkspaceV3>).kind ?? "local-folder" })),
    profiles: profiles.map((profile) => ({ ...profile, adapterId: profile.adapterId ?? inferAdapterId(profile.command) })),
    sessions: (source.sessions ?? []).map((rawSession, index) => {
      const session = rawSession as Partial<SessionV3>;
      return {
        ...session,
      interactionMode: session.interactionMode ?? "terminal",
      runtimeStatus: "stopped" as const,
      organizationStatus: session.organizationStatus ?? "active",
      pinned: session.pinned ?? false,
      manualOrder: session.manualOrder ?? (index + 1) * 1000,
      launchConfig: session.launchConfig ?? { permission: null, mode: null, model: null },
      revision: session.revision ?? 1
      };
    }),
    providers: sanitizeProviders(source.providers, detectSourceVersion(parsed), clock),
    modelDeployments: sanitizeDeployments(source.modelDeployments, clock),
    modelRoutes: sanitizeRoutes(source.modelRoutes, clock),
    globalModelRouteId: nonEmpty(source.globalModelRouteId) ? source.globalModelRouteId : undefined,
    workspaceModelRouteBindings: sanitizeWorkspaceBindings(source.workspaceModelRouteBindings)
  } as AppStateV3;
}

function normalizeChatContext(value: unknown, interactionMode: "chat" | "terminal"): SessionChatContext | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("session has invalid chat context");
  const candidate = value as Partial<SessionChatContext>;
  if ([candidate.resumeToken, candidate.activeModel, candidate.lastTurnCompletedAt].some((field) => field !== undefined && typeof field !== "string")) throw new Error("session has invalid chat context");
  // 不变式 I-3：terminal 会话不得携带 chatContext，迁移时剥除。
  if (interactionMode !== "chat") return undefined;
  return {
    ...(candidate.resumeToken !== undefined ? { resumeToken: candidate.resumeToken } : {}),
    ...(candidate.activeModel !== undefined ? { activeModel: candidate.activeModel } : {}),
    ...(candidate.lastTurnCompletedAt !== undefined ? { lastTurnCompletedAt: candidate.lastTurnCompletedAt } : {})
  };
}

function normalizeTerminalContext(value: unknown, interactionMode: "chat" | "terminal") {
  if (value === undefined || interactionMode !== "terminal") return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("session has invalid terminal context");
  const resumeToken = (value as { resumeToken?: unknown }).resumeToken;
  if (resumeToken !== undefined && typeof resumeToken !== "string") throw new Error("session has invalid terminal context");
  return resumeToken ? { resumeToken } : {};
}

function normalizeBackendSessionRef(value: unknown): import("../shared/types.js").BackendSessionRef | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("session has invalid backend session ref");
  const candidate = value as Partial<import("../shared/types.js").BackendSessionRef>;
  if (!nonEmpty(candidate.backendId) || !["native-sdk", "acp", "json-stream", "pty"].includes(String(candidate.transport))) throw new Error("session has invalid backend session ref");
  if (candidate.nativeSessionId !== undefined && typeof candidate.nativeSessionId !== "string") throw new Error("session has invalid backend session ref");
  if (candidate.resumeData !== undefined && (!candidate.resumeData || typeof candidate.resumeData !== "object" || Array.isArray(candidate.resumeData))) throw new Error("session has invalid backend session ref");
  const migrationMetadata = normalizeMigrationMetadata(candidate.migrationMetadata);
  return {
    backendId: candidate.backendId,
    transport: candidate.transport!,
    ...(candidate.nativeSessionId ? { nativeSessionId: candidate.nativeSessionId } : {}),
    ...(candidate.resumeData ? { resumeData: candidate.resumeData } : {}),
    ...(migrationMetadata ? { migrationMetadata } : {})
  };
}

function normalizeMigrationMetadata(value: unknown): import("../shared/types.js").BackendSessionRef["migrationMetadata"] | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("session has invalid backend migration metadata");
  const sourceSchemaVersion = (value as { sourceSchemaVersion?: unknown }).sourceSchemaVersion;
  const unknownFields = (value as { unknownFields?: unknown }).unknownFields;
  if (typeof sourceSchemaVersion !== "number" || !Number.isInteger(sourceSchemaVersion) || sourceSchemaVersion < 1) throw new Error("session has invalid backend migration metadata");
  if (unknownFields !== undefined && (!unknownFields || typeof unknownFields !== "object" || Array.isArray(unknownFields))) throw new Error("session has invalid backend migration metadata");
  return {
    sourceSchemaVersion,
    ...(unknownFields ? { unknownFields: structuredClone(unknownFields as Record<string, unknown>) } : {})
  };
}

const knownSessionFields = new Set([
  "id", "workspaceId", "profileId", "name", "interactionMode", "activeView", "inputOwner",
  "runtimeStatus", "status", "organizationStatus", "pinned", "manualOrder", "launchConfig",
  "chatContext", "terminalContext", "backendId", "backendSessionRef", "adapterId", "resumeToken",
  "providerId", "modelRouteId",
  "parentSessionId", "forkEventId", "forkSequence", "forkedAt", "createdAt", "lastActiveAt",
  "completedAt", "archivedAt", "exitCode", "error", "revision"
]);

function extractUnknownSessionFields(session: Record<string, unknown>): Record<string, unknown> | undefined {
  const unknownFields = Object.fromEntries(Object.entries(session).filter(([key]) => !knownSessionFields.has(key)));
  return Object.keys(unknownFields).length ? structuredClone(unknownFields) : undefined;
}

function detectSourceVersion(value: unknown): number {
  if (value && typeof value === "object" && "schemaVersion" in value) {
    const version = (value as { schemaVersion?: unknown }).schemaVersion;
    return typeof version === "number" ? version : 0;
  }
  return 1;
}

function isEnvelopeV2(value: unknown): value is AppStateEnvelopeV2 {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value && (value as { schemaVersion?: unknown }).schemaVersion === 2 && "state" in value);
}

function isEnvelopeV3(value: unknown): value is AppStateEnvelopeV3 {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value && (value as { schemaVersion?: unknown }).schemaVersion === 3 && "state" in value);
}

function isEnvelopeV4(value: unknown): value is AppStateEnvelopeV4 {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value && (value as { schemaVersion?: unknown }).schemaVersion === 4 && "state" in value);
}

function isEnvelopeV5(value: unknown): value is AppStateEnvelopeV5 {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 5 && "state" in value);
}

function isEnvelopeV6(value: unknown): value is AppStateEnvelopeV6 {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 6 && "state" in value);
}

function isEnvelopeV7(value: unknown): value is AppStateEnvelopeV7 {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 7 && "state" in value);
}

function isEnvelopeV8(value: unknown): value is AppStateEnvelopeV8 {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 8 && "state" in value);
}

function isStateEnvelope(value: unknown): value is AppStateEnvelopeV2 | AppStateEnvelopeV3 | AppStateEnvelopeV4 | AppStateEnvelopeV5 | AppStateEnvelopeV6 | AppStateEnvelopeV7 | AppStateEnvelopeV8 {
  return isEnvelopeV2(value) || isEnvelopeV3(value) || isEnvelopeV4(value) || isEnvelopeV5(value) || isEnvelopeV6(value) || isEnvelopeV7(value) || isEnvelopeV8(value);
}

function isCurrentEnvelope(value: unknown): value is AppStateEnvelopeV8 {
  return isEnvelopeV8(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 可选模型列表字段：仅接受非空字符串数组，其余形状丢弃（缺省读取等价 []） */
function sanitizeModelList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const models = value.filter(nonEmpty).map((model) => model.trim());
  return models.length ? [...new Set(models)] : undefined;
}

function sanitizeProviders(value: unknown, sourceVersion: number, clock: Clock): ModelProviderConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<ModelProviderConfig>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !["openai-compatible", "anthropic-compatible"].includes(String(candidate.protocol)) || !nonEmpty(candidate.baseUrl)) return [];
    const rawRef = typeof candidate.credentialRef === "string" ? candidate.credentialRef.trim() : undefined;
    const credentialRef = rawRef
      ? rawRef.startsWith("env:") || rawRef.startsWith("keychain:")
        ? rawRef
        : sourceVersion < 6 && /^[A-Z][A-Z0-9_]*$/.test(rawRef) ? `env:${rawRef}`
          : undefined
      : undefined;
    const now = clock.now();
    return [{
      id: candidate.id,
      name: candidate.name,
      protocol: candidate.protocol as ModelProviderConfig["protocol"],
      baseUrl: candidate.baseUrl,
      ...(credentialRef ? { credentialRef } : {}),
      models: sanitizeModelList(candidate.models) ?? [],
      supportedEngineIds: sanitizeModelList(candidate.supportedEngineIds) ?? [],
      enabled: candidate.enabled !== false,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now
    } satisfies ModelProviderConfig];
  });
}

function sanitizeDeployments(value: unknown, clock: Clock): ModelDeploymentConfig[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<ModelDeploymentConfig>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.providerId) || !nonEmpty(candidate.profileId) || !nonEmpty(candidate.modelId)) return [];
    const now = clock.now();
    return [{
      id: candidate.id,
      name: candidate.name,
      providerId: candidate.providerId,
      profileId: candidate.profileId,
      modelId: candidate.modelId,
      enabled: candidate.enabled !== false,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      ...(typeof candidate.archivedAt === "string" ? { archivedAt: candidate.archivedAt } : {})
    } satisfies ModelDeploymentConfig];
  });
}

function sanitizeRoutes(value: unknown, clock: Clock): PriorityModelRoute[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<PriorityModelRoute>;
    if (!nonEmpty(candidate.id) || seen.has(candidate.id) || !nonEmpty(candidate.name) || !Array.isArray(candidate.candidateDeploymentIds)) return [];
    const ids = candidate.candidateDeploymentIds.filter(nonEmpty);
    if (!ids.length || ids.length > 8 || new Set(ids).size !== ids.length) return [];
    seen.add(candidate.id);
    const now = clock.now();
    return [{
      id: candidate.id,
      name: candidate.name,
      enabled: candidate.enabled !== false,
      candidateDeploymentIds: [...ids],
      automaticTechnicalFallback: candidate.automaticTechnicalFallback === true,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
      ...(typeof candidate.archivedAt === "string" ? { archivedAt: candidate.archivedAt } : {})
    } satisfies PriorityModelRoute];
  });
}

function sanitizeWorkspaceBindings(value: unknown): WorkspaceModelRouteBinding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<WorkspaceModelRouteBinding>;
    return nonEmpty(candidate.workspaceId) && (candidate.routeId === undefined || nonEmpty(candidate.routeId))
      ? [{ workspaceId: candidate.workspaceId, ...(candidate.routeId ? { routeId: candidate.routeId } : {}) }]
      : [];
  });
}

function isRuntimeError(value: unknown): value is SessionRuntimeError {
  return Boolean(value && typeof value === "object" && typeof (value as SessionRuntimeError).code === "string" && typeof (value as SessionRuntimeError).message === "string" && typeof (value as SessionRuntimeError).occurredAt === "string");
}

function inferAdapterId(command: string) {
  const normalized = command.toLowerCase();
  if (normalized.includes("codex")) return "codex" as const;
  if (normalized.includes("claude")) return "claude-code" as const;
  return "generic" as const;
}

function backendIdForAdapter(adapterId: CliProfileV3["adapterId"]) {
  if (adapterId === "claude-code") return "claude";
  if (adapterId === "generic") return "generic-pty";
  return adapterId;
}

function backendIdForLegacyAdapter(adapterId: string) {
  if (adapterId === "claude-code") return "claude";
  if (adapterId === "generic") return "generic-pty";
  return adapterId;
}
