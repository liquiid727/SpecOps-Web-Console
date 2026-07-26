import type { ApiErrorCode, ApiErrorResponse, FilePreview, FileTreePage, GitDiffResponse, GitStatusResponse, LanguageSummaryResponse, PickWorkspaceResponse, SendMessageRequest, SendMessageResponse, SessionWithCompatibilityStatus, StateResponse, TranscriptPage } from "../shared/types";
import type { AppStateV2, CliProfileV2, CliProfileCapabilities, WorkspaceV2 } from "../shared/types";
import type { EventServerFrame, TerminalServerFrame } from "../shared/websocket";

export class ApiClientError extends Error {
  constructor(message: string, readonly status: number, readonly code: ApiErrorCode, readonly requestId: string, readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
  }
}

let csrfCapability: string | undefined;
let pickerIntentToken: string | undefined;

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  if (csrfCapability && !headers.has("x-specos-csrf-capability")) headers.set("x-specos-csrf-capability", csrfCapability);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => undefined) as T | ApiErrorResponse | undefined;
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? "unknown";
    if (isApiErrorResponse(payload)) throw new ApiClientError(payload.error.message, response.status, payload.error.code, payload.error.requestId, payload.error.details);
    throw new ApiClientError(`Request failed with status ${response.status}.`, response.status, "INTERNAL_ERROR", requestId);
  }
  if (payload === undefined || payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new ApiClientError("Server returned an invalid success response.", response.status, "INTERNAL_ERROR", response.headers.get("x-request-id") ?? "unknown");
  return payload as T;
}

export interface TranscriptSubscriptionHandlers {
  onOpen?: () => void;
  onReady?: (afterSequence: number, latestSequence: number) => void;
  onEvent?: (event: import("../shared/types").TranscriptEvent) => void;
  onSession?: (session: import("../shared/types").SessionV2) => void;
  onTurnStatus?: (turnId: string, status: import("../shared/websocket").TurnStatus) => void;
  onWarning?: (code: string) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface TerminalSubscriptionHandlers {
  onOpen?: () => void;
  onOutput?: (data: string) => void;
  onStatus?: (status: import("../shared/types").SessionRuntimeStatus, exitCode?: number) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export function openTranscriptSubscription(sessionId: string, afterSequence: number, handlers: TranscriptSubscriptionHandlers) {
  if (typeof WebSocket === "undefined") return () => undefined;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const query = new URLSearchParams({ sessionId, channel: "events", afterSequence: String(Math.max(0, afterSequence)) });
  if (csrfCapability) query.set("capability", csrfCapability);
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws?${query.toString()}`);
  socket.addEventListener("open", () => handlers.onOpen?.());
  socket.addEventListener("message", (message) => {
    try {
      const frame = JSON.parse(String(message.data)) as EventServerFrame;
      if (frame.type === "subscription-ready") handlers.onReady?.(frame.afterSequence, frame.latestSequence);
      else if (frame.type === "transcript-event") handlers.onEvent?.(frame.event);
      else if (frame.type === "session-updated") handlers.onSession?.(frame.session);
      else if (frame.type === "turn-status") handlers.onTurnStatus?.(frame.turnId, frame.status);
      else if (frame.type === "recording-warning") handlers.onWarning?.(frame.code);
      else if (frame.type === "protocol-error") handlers.onError?.(frame.error.message);
    } catch {
      handlers.onError?.("Invalid transcript event frame.");
    }
  });
  socket.addEventListener("error", () => handlers.onError?.("Transcript connection failed."));
  socket.addEventListener("close", () => handlers.onClose?.());
  return () => socket.close(1000, "client closed");
}

export function openTerminalSubscription(sessionId: string, handlers: TerminalSubscriptionHandlers) {
  if (typeof WebSocket === "undefined") return { sendInput: () => undefined, resize: () => undefined, close: () => undefined };
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const query = new URLSearchParams({ sessionId, channel: "terminal" });
  if (csrfCapability) query.set("capability", csrfCapability);
  const socket = new WebSocket(`${protocol}://${window.location.host}/ws?${query.toString()}`);
  socket.addEventListener("open", () => handlers.onOpen?.());
  socket.addEventListener("message", (message) => {
    try {
      const frame = JSON.parse(String(message.data)) as TerminalServerFrame | { type: "output" | "status" | "error"; data?: string; status?: import("../shared/types").SessionRuntimeStatus; message?: string; exitCode?: number };
      if (frame.type === "terminal-output" || frame.type === "output") handlers.onOutput?.(frame.data ?? "");
      else if (frame.type === "runtime-status" || frame.type === "status") handlers.onStatus?.(frame.status!, frame.exitCode);
      else if (frame.type === "protocol-error") handlers.onError?.(frame.error.message);
      else if (frame.type === "error") handlers.onError?.(frame.message ?? "Terminal connection failed.");
    } catch {
      handlers.onError?.("Invalid terminal frame.");
    }
  });
  socket.addEventListener("error", () => handlers.onError?.("Terminal connection failed."));
  socket.addEventListener("close", () => handlers.onClose?.());
  return {
    sendInput(data: string) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "terminal-input", data })); },
    resize(cols: number, rows: number) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "terminal-resize", cols, rows })); },
    close() { socket.close(1000, "client closed"); }
  };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string" && typeof (error as { message?: unknown }).message === "string" && typeof (error as { requestId?: unknown }).requestId === "string");
}

async function loadState() {
  const next = await request<StateResponse>("/api/state");
  csrfCapability = next.csrfCapability;
  pickerIntentToken = next.pickerIntentToken;
  return next;
}

export const api = {
  state: loadState,
  createWorkspace: (input: { name: string; path: string }) => request<WorkspaceV2>("/api/workspaces", { method: "POST", body: JSON.stringify(input) }),
  createProfile: (input: { name: string; command: string; args: string[]; adapterId?: string }) => request<CliProfileV2>("/api/profiles", { method: "POST", body: JSON.stringify(input) }),
  profileCapabilities: (id: string, signal?: AbortSignal) => request<CliProfileCapabilities>(`/api/profiles/${id}/capabilities`, { signal }),
  createSession: (input: { name: string; workspaceId: string; profileId: string; confirmed: boolean; start?: boolean; terminal?: { cols: number; rows: number } }) => request<SessionWithCompatibilityStatus & { session?: SessionWithCompatibilityStatus; capabilities?: CliProfileCapabilities; interactionModeDowngraded?: boolean }>("/api/sessions", { method: "POST", body: JSON.stringify({ start: input.start ?? true, ...input }) }),
  startSession: (id: string) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/start`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  stopSession: (id: string) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/stop`, { method: "POST", body: "{}" }),
  renameSession: (id: string, name: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ name, expectedRevision }) }),
  updateLaunchConfig: (id: string, launchConfig: { permission?: string | null; mode?: string | null; model?: string | null }, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ launchConfig, expectedRevision }) }),
  pinSession: (id: string, pinned: boolean, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/pin`, { method: "POST", body: JSON.stringify({ pinned, expectedRevision }) }),
  archiveSession: (id: string, expectedRevision: number, stopRunning = false) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/archive`, { method: "POST", body: JSON.stringify({ expectedRevision, ...(stopRunning ? { stopRunning: true } : {}) }) }),
  completeSession: (id: string, expectedRevision: number, stopRunning = false) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/complete`, { method: "POST", body: JSON.stringify({ expectedRevision, ...(stopRunning ? { stopRunning: true } : {}) }) }),
  restoreSession: (id: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}/restore`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  forkSession: (id: string, expectedRevision: number) => request<{ session: SessionWithCompatibilityStatus }>(`/api/sessions/${id}/fork`, { method: "POST", body: JSON.stringify({ expectedRevision }) }),
  reorderSessions: (orderedSessionIds: string[], expectedRevisions: Record<string, number>, organizationStatus = "active", pinned = false) => request<SessionWithCompatibilityStatus[]>("/api/sessions/reorder", { method: "POST", body: JSON.stringify({ organizationStatus, pinned, orderedSessionIds, expectedRevisions }) }),
  sendMessage: (id: string, input: SendMessageRequest) => request<SendMessageResponse>(`/api/sessions/${id}/messages`, { method: "POST", body: JSON.stringify(input) }),
  cancelTurn: (id: string, turnId: string) => request<{ turnId: string }>(`/api/sessions/${id}/turns/cancel`, { method: "POST", body: JSON.stringify({ turnId }) }),
  updateActiveModel: (id: string, activeModel: string, expectedRevision: number) => request<SessionWithCompatibilityStatus>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ activeModel, expectedRevision }) }),
  transcript: (id: string, afterSequence = 0, limit = 200, signal?: AbortSignal) => request<TranscriptPage>(`/api/sessions/${id}/transcript?afterSequence=${afterSequence}${limit !== 200 ? `&limit=${limit}` : ""}`, { signal }),
  workspaceFiles: (workspaceId: string, path = "", cursor?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ ...(path ? { path } : {}), ...(cursor ? { cursor } : {}) }).toString();
    return request<FileTreePage>(`/api/workspaces/${workspaceId}/files${query ? `?${query}` : ""}`, { signal });
  },
  filePreview: (workspaceId: string, path: string, signal?: AbortSignal) => request<FilePreview>(`/api/workspaces/${workspaceId}/preview?path=${encodeURIComponent(path)}`, { signal }),
  languageSummary: (workspaceId: string, signal?: AbortSignal) => request<LanguageSummaryResponse>(`/api/workspaces/${workspaceId}/languages`, { signal }),
  gitStatus: (workspaceId: string, signal?: AbortSignal) => request<GitStatusResponse>(`/api/workspaces/${workspaceId}/git/status`, { signal }),
  gitDiff: (workspaceId: string, scope: "unstaged" | "staged" = "unstaged", signal?: AbortSignal) => request<GitDiffResponse>(`/api/workspaces/${workspaceId}/git/diff?scope=${scope}`, { signal }),
  pickWorkspace: async () => {
    await loadState();
    const result = await request<PickWorkspaceResponse>("/api/workspaces/pick", { method: "POST", body: JSON.stringify({ intentToken: pickerIntentToken ?? "" }) });
    if (result.pickerIntentToken) pickerIntentToken = result.pickerIntentToken;
    return result;
  },
  deleteSession: (id: string) => request<void>(`/api/sessions/${id}`, { method: "DELETE", body: "{}" }),
  deleteWorkspace: (id: string) => request<void>(`/api/workspaces/${id}`, { method: "DELETE", body: "{}" }),
  deleteProfile: (id: string) => request<void>(`/api/profiles/${id}`, { method: "DELETE", body: "{}" })
};

export type ClientAppState = AppStateV2 & { sessions: SessionWithCompatibilityStatus[] };

export function mergeState(_previous: ClientAppState, next: StateResponse): ClientAppState {
  return { workspaces: next.workspaces, profiles: next.profiles, sessions: next.sessions };
}
