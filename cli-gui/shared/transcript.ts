/**
 * Canonical transcript event kinds (event-protocol-spec §3).
 * MVP01-A freezes this full set; B-phase adds data, never new protocol shape.
 */
export type TranscriptEventKind =
  | "user_message"
  | "assistant_message"
  | "tool_activity"
  | "file_change"
  | "pty_output"
  | "lifecycle"
  | "error"
  | "approval_request"
  | "approval_response"
  | "retention_marker";

/** Legacy kinds that may still exist on disk; normalized on read only (决策 D-3). */
export type LegacyTranscriptEventKind = "user_input" | "markdown" | "permission_request";

/**
 * Read-side alias map applied at the storage exit (storage-spec §4).
 * Disk files are never rewritten; mapping happens on in-memory return values only.
 */
export const LEGACY_KIND_ALIASES: Record<LegacyTranscriptEventKind, TranscriptEventKind> = {
  user_input: "user_message",
  markdown: "assistant_message",
  permission_request: "approval_request"
};

export function isLegacyTranscriptEventKind(kind: string): kind is LegacyTranscriptEventKind {
  return kind in LEGACY_KIND_ALIASES;
}

/** Normalizes a stored kind; unknown kinds pass through unchanged (forward compatibility). */
export function normalizeTranscriptEventKind(kind: string): string {
  return isLegacyTranscriptEventKind(kind) ? LEGACY_KIND_ALIASES[kind] : kind;
}

export type TranscriptEventSource = "composer" | "terminal" | "pty" | "session-manager" | "profile-adapter";
export type TranscriptEventMetadataValue = string | number | boolean | null;

/**
 * Reserved metadata keys (event-protocol-spec §2.1):
 * - `turnId`      string  — chat-mode turn attribution (all chat events)
 * - `status`      string  — lifecycle transition target (starting/running/stopped/error/turn-completed)
 * - `exitCode`    number  — process exit code on lifecycle events (when available)
 * - `code`        string  — error code on error events
 * - `approvalId`  string  — approval pairing key (approval_request/approval_response)
 * - `decision`    string  — approval decision: allow | deny | timeout
 * - `path`        string  — changed file relative path (file_change)
 * - `tool`        string  — tool/command identifier (tool_activity)
 * - `retention`   string  — retention policy reason (retention_marker)
 */
export interface TranscriptEvent {
  id: string;
  sessionId: string;
  sequence: number;
  occurredAt: string;
  kind: TranscriptEventKind;
  source: TranscriptEventSource;
  raw: string;
  rawBytes: number;
  truncated: boolean;
  metadata?: Record<string, TranscriptEventMetadataValue>;
  clientMessageId?: string;
}

export interface TranscriptPage {
  events: TranscriptEvent[];
  hasMore: boolean;
  nextAfterSequence: number;
  visibleStartSequence: number;
  retentionTruncated: boolean;
}
