export type TranscriptEventKind =
  | "user_input"
  | "pty_output"
  | "markdown"
  | "lifecycle"
  | "error"
  | "tool_activity"
  | "permission_request"
  | "retention_marker";

export type TranscriptEventSource = "composer" | "terminal" | "pty" | "session-manager" | "profile-adapter";
export type TranscriptEventMetadataValue = string | number | boolean | null;

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
