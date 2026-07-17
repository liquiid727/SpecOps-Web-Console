import type { ApiError } from "./api.js";
import type { Session, SessionRuntimeStatus } from "./state.js";
import type { TranscriptEvent } from "./transcript.js";

export type TerminalClientFrame =
  | { type: "terminal-input"; data: string }
  | { type: "terminal-resize"; cols: number; rows: number };

export type TerminalServerFrame =
  | { type: "terminal-output"; data: string }
  | { type: "runtime-status"; status: SessionRuntimeStatus; exitCode?: number }
  | { type: "protocol-error"; error: ApiError };

export type EventServerFrame =
  | { type: "subscription-ready"; afterSequence: number; latestSequence: number }
  | { type: "transcript-event"; event: TranscriptEvent }
  | { type: "session-updated"; session: Session }
  | { type: "recording-warning"; code: string }
  | { type: "protocol-error"; error: ApiError };

export type LegacyTerminalClientFrame =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

export type LegacyTerminalServerFrame =
  | { type: "output"; data: string }
  | { type: "status"; status: SessionRuntimeStatus; exitCode?: number }
  | { type: "error"; message: string };
