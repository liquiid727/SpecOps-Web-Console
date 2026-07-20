import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  CURRENT_SCHEMA_VERSION,
  type AppState,
  type AppStateEnvelopeV2,
  type AppStateV2,
  type CliProfileV2,
  type SessionRuntimeError,
  type SessionV2,
  type WorkspaceV2
} from "../shared/types.js";
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

  const defaultProfiles = (): CliProfileV2[] => [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex", createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code", createdAt: clock.now() }
  ];

  const save = (state: AppStateV2) => {
    if (readonly) return Promise.reject(new StateRepositoryError("READONLY_MODE", "Readonly mode does not write state."));
    const snapshot: AppStateEnvelopeV2 = { schemaVersion: CURRENT_SCHEMA_VERSION, state: structuredClone(state) };
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
        const state: AppStateV2 = { workspaces: [], profiles: defaultProfiles(), sessions: [] };
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

      const envelope = isEnvelopeV2(parsed) ? parsed : undefined;
      let state: AppStateV2;
      try {
        state = await migrateAndValidate(parsed as AppState | AppStateEnvelopeV2, clock);
      } catch (error) {
        if (error instanceof StateRepositoryError) throw error;
        throw new StateRepositoryError("STATE_MIGRATION_FAILED", "State file could not be migrated safely; the source was left unchanged.", { cause: error });
      }

      const changed = !envelope || JSON.stringify(envelope.state) !== JSON.stringify(state);
      if (changed) {
        migrationPending = true;
        if (!readonly) {
          await createRecoveryBackup(statePath);
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

  async function createRecoveryBackup(sourcePath: string) {
    const backupPath = `${sourcePath}.v1.bak`;
    try {
      await fs.copyFile(sourcePath, backupPath, fs.constants.COPYFILE_EXCL);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

export async function migrateAndValidate(parsed: AppState | AppStateEnvelopeV2, clock: Clock): Promise<AppStateV2> {
  if (!parsed || typeof parsed !== "object") throw new Error("state root must be an object");
  const envelope = isEnvelopeV2(parsed) ? parsed : undefined;
  if ("schemaVersion" in parsed && !envelope) throw new Error("unsupported state schema version");
  const source = (envelope?.state ?? parsed) as Partial<AppState>;
  if (!Array.isArray(source.workspaces) || !Array.isArray(source.profiles) || !Array.isArray(source.sessions)) {
    throw new Error("state must contain workspaces, profiles, and sessions arrays");
  }

  const fallbackProfiles = [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex" as const, createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code" as const, createdAt: clock.now() }
  ];
  const profiles = (source.profiles.length ? source.profiles : fallbackProfiles).map((profile): CliProfileV2 => {
    if (!profile || typeof profile !== "object") throw new Error("profile must be an object");
    const candidate = profile as Partial<CliProfileV2>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.command) || !Array.isArray(candidate.args) || candidate.args.some((arg) => typeof arg !== "string") || (candidate.adapterId !== undefined && !["claude-code", "codex", "generic"].includes(candidate.adapterId))) {
      throw new Error("profile has invalid fields");
    }
    return {
      id: candidate.id,
      name: candidate.name,
      command: candidate.command,
      args: [...candidate.args],
      adapterId: candidate.adapterId ?? inferAdapterId(candidate.command),
      adapterVersionRange: candidate.adapterVersionRange,
      createdAt: candidate.createdAt ?? clock.now()
    };
  });

  const workspaces = await Promise.all(source.workspaces.map(async (workspace): Promise<WorkspaceV2> => {
    if (!workspace || typeof workspace !== "object") throw new Error("workspace must be an object");
    const candidate = workspace as Partial<WorkspaceV2>;
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.path) || (candidate.createdAt !== undefined && typeof candidate.createdAt !== "string") || (candidate.lastOpenedAt !== undefined && typeof candidate.lastOpenedAt !== "string")) throw new Error("workspace has invalid fields");
    const canonicalPath = await fs.realpath(candidate.path).catch((error) => {
      throw new Error(`workspace path cannot be canonicalized: ${candidate.path}`, { cause: error });
    });
    const stat = await fs.stat(canonicalPath).catch(() => undefined);
    if (!stat?.isDirectory()) throw new Error(`workspace path is not a directory: ${candidate.path}`);
    return { id: candidate.id, name: candidate.name, path: canonicalPath, createdAt: candidate.createdAt ?? clock.now(), lastOpenedAt: candidate.lastOpenedAt };
  }));

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  if (new Set(workspaces.map((workspace) => workspace.path)).size !== workspaces.length) throw new Error("state contains duplicate workspace paths");
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const sessions = source.sessions.map((session, index): SessionV2 => {
    if (!session || typeof session !== "object") throw new Error("session must be an object");
    const candidate = session as Partial<SessionV2> & { status?: string; error?: unknown };
    if (!nonEmpty(candidate.id) || !nonEmpty(candidate.name) || !nonEmpty(candidate.workspaceId) || !nonEmpty(candidate.profileId) || !workspaceIds.has(candidate.workspaceId) || !profileIds.has(candidate.profileId)) {
      throw new Error("session contains an invalid reference");
    }
    const launchConfig = candidate.launchConfig && typeof candidate.launchConfig === "object"
      ? candidate.launchConfig
      : { permission: null, mode: null, model: null };
    if ([launchConfig.permission, launchConfig.mode, launchConfig.model].some((value) => value !== null && value !== undefined && typeof value !== "string")) throw new Error("session has invalid launch configuration");
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
      runtimeStatus: "stopped",
      organizationStatus: candidate.organizationStatus ?? "active",
      pinned: candidate.pinned ?? false,
      manualOrder,
      launchConfig: {
        permission: launchConfig.permission ?? null,
        mode: launchConfig.mode ?? null,
        model: launchConfig.model ?? null
      },
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
  return { workspaces, profiles, sessions };
}

export function migrateState(parsed: AppState | AppStateEnvelopeV2, clock: Clock): AppStateV2 {
  const source = isEnvelopeV2(parsed) ? parsed.state : parsed;
  const profiles = source.profiles?.length ? source.profiles : [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex" as const, createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code" as const, createdAt: clock.now() }
  ];
  return {
    workspaces: source.workspaces ?? [],
    profiles: profiles.map((profile) => ({ ...profile, adapterId: profile.adapterId ?? inferAdapterId(profile.command) })),
    sessions: (source.sessions ?? []).map((rawSession, index) => {
      const session = rawSession as Partial<SessionV2>;
      return {
        ...session,
      runtimeStatus: "stopped" as const,
      organizationStatus: session.organizationStatus ?? "active",
      pinned: session.pinned ?? false,
      manualOrder: session.manualOrder ?? (index + 1) * 1000,
      launchConfig: session.launchConfig ?? { permission: null, mode: null, model: null },
      revision: session.revision ?? 1
      };
    })
  } as AppStateV2;
}

function isEnvelopeV2(value: unknown): value is AppStateEnvelopeV2 {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value && (value as { schemaVersion?: unknown }).schemaVersion === CURRENT_SCHEMA_VERSION && "state" in value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
