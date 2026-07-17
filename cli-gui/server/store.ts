import fs from "node:fs/promises";
import path from "node:path";
import type { AppState, CliProfile } from "../shared/types.js";
import type { Clock, StateRepository } from "./ports.js";

export interface JsonStateRepositoryOptions {
  dataDirectory: string;
  clock: Clock;
}

const writeQueues = new Map<string, Promise<void>>();

export function createJsonStateRepository({ dataDirectory, clock }: JsonStateRepositoryOptions): StateRepository {
  const resolvedDataDirectory = path.resolve(dataDirectory);
  const statePath = path.join(resolvedDataDirectory, "state.json");

  const defaultProfiles = (): CliProfile[] => [
    { id: "profile-codex", name: "Codex CLI", command: "codex", args: [], createdAt: clock.now() },
    { id: "profile-claude", name: "Claude CLI", command: "claude", args: [], createdAt: clock.now() }
  ];

  const save = (state: AppState) => {
    const snapshot = structuredClone(state);
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
        const state: AppState = { workspaces: [], profiles: defaultProfiles(), sessions: [] };
        await save(state);
        return structuredClone(state);
      }
      const parsed = JSON.parse(raw) as AppState;
      const profiles = parsed.profiles?.length ? parsed.profiles : defaultProfiles();
      const state: AppState = {
        workspaces: parsed.workspaces ?? [],
        profiles,
        sessions: (parsed.sessions ?? []).map((session) => ({ ...session, status: "stopped", error: undefined }))
      };
      await save(state);
      return state;
    },
    save,
    async drain() {
      await (writeQueues.get(statePath) ?? Promise.resolve());
    }
  };
}
