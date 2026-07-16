import type { AppState, CliProfile, Session, StateResponse, Workspace } from "../shared/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  const payload = (await response.json().catch(() => undefined)) as T & { error?: string };
  if (!response.ok) throw new Error(payload?.error ?? `request failed: ${response.status}`);
  return payload;
}

export const api = {
  state: () => request<StateResponse>("/api/state"),
  createWorkspace: (input: { name: string; path: string }) => request<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
  createProfile: (input: { name: string; command: string; args: string[] }) => request<CliProfile>("/api/profiles", { method: "POST", body: JSON.stringify(input) }),
  createSession: (input: { name: string; workspaceId: string; profileId: string; confirmed: boolean }) => request<Session>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  startSession: (id: string) => request<Session>(`/api/sessions/${id}/start`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  stopSession: (id: string) => request<Session>(`/api/sessions/${id}/stop`, { method: "POST", body: "{}" }),
  renameSession: (id: string, name: string) => request<Session>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE", body: "{}" }),
  deleteWorkspace: (id: string) => request<void>(`/api/workspaces/${id}`, { method: "DELETE", body: "{}" }),
  deleteProfile: (id: string) => request<void>(`/api/profiles/${id}`, { method: "DELETE", body: "{}" })
};

export function mergeState(previous: AppState, next: StateResponse): AppState {
  return { workspaces: next.workspaces, profiles: next.profiles, sessions: next.sessions };
}
