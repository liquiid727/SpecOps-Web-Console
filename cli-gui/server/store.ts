import fs from "node:fs/promises";
import path from "node:path";
import { CURRENT_SCHEMA_VERSION, type AppState, type AppStateEnvelopeV2, type AppStateV2, type CliProfileV2, type SessionRuntimeError, type SessionV2 } from "../shared/types.js";
import type { Clock, StateRepository } from "./ports.js";

export interface JsonStateRepositoryOptions {
  dataDirectory: string;
  clock: Clock;
}

const writeQueues = new Map<string, Promise<void>>();

export function createJsonStateRepository({ dataDirectory, clock }: JsonStateRepositoryOptions): StateRepository {
  const resolvedDataDirectory = path.resolve(dataDirectory);
  const statePath = path.join(resolvedDataDirectory, "state.json");

  const defaultProfiles = (): CliProfileV2[] => [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex", createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code", createdAt: clock.now() }
  ];

  const save = (state: AppStateV2) => {
    const snapshot: AppStateEnvelopeV2 = { schemaVersion: CURRENT_SCHEMA_VERSION, state: structuredClone(state) };
    const previous = writeQueues.get(statePath) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(async () => {
      await fs.mkdir(resolvedDataDirectory, { recursive: true });
      const temporaryPath = `${statePath}.${process.pid}.tmp`;
      await fs.writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await fs.rename(temporaryPath, statePath);
    });
    writeQueues.set(statePath, next);
    return next;
  };

  return {
    async load() {
      await fs.mkdir(resolvedDataDirectory, { recursive: true });
      const raw = await fs.readFile(statePath, "utf8").catch(() => undefined);
      if (!raw) {
        const state: AppStateV2 = { workspaces: [], profiles: defaultProfiles(), sessions: [] };
        await save(state);
        return structuredClone(state);
      }
      const parsed = JSON.parse(raw) as AppState | AppStateEnvelopeV2;
      const state = migrateState(parsed, clock);
      await save(state);
      return state;
    },
    save,
    async drain() {
      await (writeQueues.get(statePath) ?? Promise.resolve());
    }
  };
}

function migrateState(parsed: AppState | AppStateEnvelopeV2, clock: Clock): AppStateV2 {
  const source = isEnvelopeV2(parsed) ? parsed.state : parsed;
  const fallbackProfiles = [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], adapterId: "codex" as const, createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], adapterId: "claude-code" as const, createdAt: clock.now() }
  ];
  const profiles = (source.profiles?.length ? source.profiles : fallbackProfiles).map((profile): CliProfileV2 => ({
    ...profile,
    adapterId: profile.adapterId ?? inferAdapterId(profile.command)
  }));
  return {
    workspaces: source.workspaces ?? [],
    profiles,
    sessions: (source.sessions ?? []).map((session, index): SessionV2 => {
      const runtimeStatus = "runtimeStatus" in session ? session.runtimeStatus : session.status;
      const error: SessionRuntimeError | undefined = "error" in session && typeof session.error === "string"
        ? { code: "SESSION_START_FAILED", message: session.error, occurredAt: clock.now() }
        : "error" in session && session.error && typeof session.error === "object" ? session.error : undefined;
      return {
        ...session,
        runtimeStatus: runtimeStatus === "running" || runtimeStatus === "starting" || runtimeStatus === "error" ? "stopped" : "stopped",
        organizationStatus: "organizationStatus" in session ? session.organizationStatus : "active",
        pinned: "pinned" in session ? session.pinned : false,
        manualOrder: "manualOrder" in session ? session.manualOrder : (index + 1) * 1000,
        launchConfig: "launchConfig" in session ? session.launchConfig : { permission: null, mode: null, model: null },
        parentSessionId: "parentSessionId" in session ? session.parentSessionId : undefined,
        forkEventId: "forkEventId" in session ? session.forkEventId : undefined,
        forkSequence: "forkSequence" in session ? session.forkSequence : undefined,
        forkedAt: "forkedAt" in session ? session.forkedAt : undefined,
        completedAt: "completedAt" in session ? session.completedAt : undefined,
        archivedAt: "archivedAt" in session ? session.archivedAt : undefined,
        error,
        revision: "revision" in session ? session.revision : 1
      };
    })
  };
}

function isEnvelopeV2(value: AppState | AppStateEnvelopeV2): value is AppStateEnvelopeV2 {
  return "schemaVersion" in value && value.schemaVersion === CURRENT_SCHEMA_VERSION && "state" in value;
}

function inferAdapterId(command: string) {
  if (command.includes("codex")) return "codex" as const;
  if (command.includes("claude")) return "claude-code" as const;
  return "generic" as const;
}
