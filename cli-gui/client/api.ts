import type { ApiErrorCode, ApiErrorResponse, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, PickWorkspaceResponse, SendMessageRequest, SendMessageResponse, SessionWithCompatibilityStatus, TranscriptPage } from "../shared/types";
import type { AppStateV2, CliProfileV2, StateResponse, WorkspaceV2 } from "../shared/types";

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
  createWorkspace: (input: { name: string; path: string }) => request<WorkspaceV2>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
  createProfile: (input: { name: string; command: string; args: string[] }) => request<CliProfileV2>("/api/profiles", { method: "POST", body: JSON.stringify(input) }),
  createSession: (input: { name: string; workspaceId: string; profileId: string; confirmed: boolean }) => request<SessionWithCompatibilityStatus>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  startSession: (id: string) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/start`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  stopSession: (id: string) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/stop`, { method: "POST", body: "{}" }),
  renameSession: (id: string, name: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ name, expectedRevision }) }),
  updateLaunchConfig: (id: string, launchConfig: { permission?: string | null; mode?: string | null; model?: string | null }, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ launchConfig, expectedRevision }) }),
  pinSession: (id: string, pinned: boolean, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/pin`, { method: "POST", body: JSON.stringify({ pinned, expectedRevision }) }),
  archiveSession: (id: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/archive`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  completeSession: (id: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/complete`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  restoreSession: (id: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/restore`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  forkSession: (id: string, expectedRevision: number) => request<{ session: SessionWithCompatibilityStatus }>(`/api/sessions/${id}/fork`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  reorderSessions: (orderedSessionIds: string[], expectedRevisions: Record<string, number>) => request<SessionWithCompatibilityStatus[]>("/api/sessions/reorder", { method: "POST", body: JSON.stringify({ orderedSessionIds, expectedRevisions }) }),
  sendMessage: (id: string, input: SendMessageRequest) => request<SendMessageResponse>(`/api/sessions/${id}/messages`, { method: "POST", body: JSON.stringify(input) }),
  transcript: (id: string, afterSequence = 0) => request<TranscriptPage>(`/api/sessions/${id}/transcript?afterSequence=${afterSequence}`),
  workspaceFiles: (workspaceId: string, path = "") => request<FileTreePage>(`/api/workspaces/${workspaceId}/files${path ? `?path=${encodeURIComponent(path)}` : ""}`),
  filePreview: (workspaceId: string, path: string) => request<FilePreview>(`/api/workspaces/${workspaceId}/preview?path=${encodeURIComponent(path)}`),
  languageSummary: (workspaceId: string) => request<LanguageSummaryResponse>(`/api/workspaces/${workspaceId}/languages`),
  gitStatus: (workspaceId: string) => request<GitStatusResponse>(`/api/workspaces/${workspaceId}/git/status`),
  gitDiff: (workspaceId: string, scope: "unstaged" | "staged" = "unstaged") => request<GitDiffResponse>(`/api/workspaces/${workspaceId}/git/diff?scope=${scope}`),
  pickWorkspace: () => request<PickWorkspaceResponse>("/api/workspaces/pick", { method: "POST", body: JSON.stringify({ intentToken: "direct-user-action" }) }),
  deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE", body: "{}" }),
  deleteWorkspace: (id: string) => request<void>(`/api/workspaces/${id}`, { method: "DELETE", body: "{}" }),
  deleteProfile: (id: string) => request<void>(`/api/profiles/${id}`, { method: "DELETE", body: "{}" })
};

export type ClientAppState = AppStateV2 & { sessions: SessionWithCompatibilityStatus[] };

export function mergeState(_previous: ClientAppState, next: StateResponse): ClientAppState {
  return { workspaces: next.workspaces, profiles: next.profiles, sessions: next.sessions };
}
