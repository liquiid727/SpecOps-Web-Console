import fs from "node:fs/promises";
import path from "node:path";
import type { AppState, CliProfile } from "../shared/types.js";
import { now } from "./domain.js";

const dataDirectory = path.resolve(process.cwd(), "data");
const statePath = path.join(dataDirectory, "state.json");
let writeQueue: Promise<void> = Promise.resolve();

const defaultProfiles: CliProfile[] = [
  {
    id: "profile-codex",
    name: "Codex CLI",
    command: "codex",
    args: [],
    createdAt: now()
  },
  {
    id: "profile-claude",
    name: "Claude CLI",
    command: "claude",
    args: [],
    createdAt: now()
  }
];

const emptyState: AppState = { workspaces: [], profiles: defaultProfiles, sessions: [] };

export async function loadState(): Promise<AppState> {
  await fs.mkdir(dataDirectory, { recursive: true });
  const raw = await fs.readFile(statePath, "utf8").catch(() => undefined);
  if (!raw) {
    await saveState(emptyState);
    return structuredClone(emptyState);
  }
  const parsed = JSON.parse(raw) as AppState;
  const state = {
    workspaces: parsed.workspaces ?? [],
    profiles: parsed.profiles?.length ? parsed.profiles : defaultProfiles,
    sessions: (parsed.sessions ?? []).map((session) => ({
      ...session,
      status: "stopped" as const,
      error: undefined
    }))
  };
  await saveState(state);
  return state;
}

export function saveState(state: AppState) {
  const snapshot = structuredClone(state);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDirectory, { recursive: true });
    const temporaryPath = `${statePath}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, statePath);
  });
  return writeQueue;
}
