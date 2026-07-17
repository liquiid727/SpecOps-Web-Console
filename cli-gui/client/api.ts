import type { ApiErrorCode, ApiErrorResponse } from "../shared/types";
import type { AppState, CliProfile, Session, StateResponse, Workspace } from "../shared/types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly requestId: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => undefined) as T | ApiErrorResponse | undefined;
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? "unknown";
    if (isApiErrorResponse(payload)) {
      throw new ApiClientError(payload.error.message, response.status, payload.error.code, payload.error.requestId, payload.error.details);
    }
    throw new ApiClientError(`Request failed with status ${response.status}.`, response.status, "INTERNAL_ERROR", requestId);
  }
  if (payload === undefined || payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiClientError("Server returned an invalid success response.", response.status, "INTERNAL_ERROR", response.headers.get("x-request-id") ?? "unknown");
  }
  return payload as T;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" && typeof (error as { message?: unknown }).message === "string" && typeof (error as { requestId?: unknown }).requestId === "string");
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
