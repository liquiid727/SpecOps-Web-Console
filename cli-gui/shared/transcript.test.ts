// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { TranscriptEventKind } from "./transcript.js";
import { isLegacyTranscriptEventKind, LEGACY_KIND_ALIASES, normalizeTranscriptEventKind } from "./transcript.js";

describe("transcript kind protocol contracts", () => {
  it("maps every legacy kind to its canonical alias", () => {
    expect(LEGACY_KIND_ALIASES).toEqual({
      user_input: "user_message",
      markdown: "assistant_message",
      permission_request: "approval_request"
    });
    for (const [legacy, canonical] of Object.entries(LEGACY_KIND_ALIASES)) {
      expect(isLegacyTranscriptEventKind(legacy)).toBe(true);
      expect(normalizeTranscriptEventKind(legacy)).toBe(canonical);
    }
  });

  it("keeps canonical and unknown kinds unchanged", () => {
    const canonicalKinds: TranscriptEventKind[] = [
      "user_message", "assistant_message", "tool_activity", "file_change", "pty_output",
      "lifecycle", "error", "approval_request", "approval_response", "retention_marker"
    ];
    for (const kind of canonicalKinds) {
      expect(isLegacyTranscriptEventKind(kind)).toBe(false);
      expect(normalizeTranscriptEventKind(kind)).toBe(kind);
    }
    expect(normalizeTranscriptEventKind("future_kind")).toBe("future_kind");
  });
});
