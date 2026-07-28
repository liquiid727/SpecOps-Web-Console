import { describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../shared/types";
import { deriveSessionLifecycleStatus, projectTranscriptEvents } from "./transcript-display";

function lifecycle(id: string, status: string, occurredAt = "2026-07-27T00:00:00Z"): TranscriptEvent {
  return { id, sessionId: "s", sequence: Number(id.replace(/\D/g, "")) || 0, occurredAt, kind: "lifecycle", source: "session-manager", raw: `Lifecycle ${status}`, rawBytes: 0, truncated: false, metadata: { status } };
}

function userMsg(id: string, content: string, occurredAt = "2026-07-27T00:00:00Z"): TranscriptEvent {
  return { id, sessionId: "s", sequence: Number(id.replace(/\D/g, "")) || 0, occurredAt, kind: "user_message", source: "composer", raw: content, rawBytes: 0, truncated: false };
}

function assistantMsg(id: string, content: string, turnId: string, occurredAt = "2026-07-27T00:00:00Z"): TranscriptEvent {
  return { id, sessionId: "s", sequence: Number(id.replace(/\D/g, "")) || 0, occurredAt, kind: "assistant_message", source: "profile-adapter", raw: content, rawBytes: 0, truncated: false, metadata: { turnId } };
}

function pty(id: string, raw: string, occurredAt = "2026-07-27T00:00:00Z"): TranscriptEvent {
  return { id, sessionId: "s", sequence: Number(id.replace(/\D/g, "")) || 0, occurredAt, kind: "pty_output", source: "pty", raw, rawBytes: 0, truncated: false };
}

describe("transcript-display", () => {
  describe("deriveSessionLifecycleStatus", () => {
    it("returns fallback when no session lifecycle events", () => {
      expect(deriveSessionLifecycleStatus([], "stopped")).toBe("stopped");
      expect(deriveSessionLifecycleStatus([], "running")).toBe("running");
    });

    it("picks the latest session lifecycle status (starting → running → stopped)", () => {
      const events = [
        lifecycle("1", "starting"),
        lifecycle("2", "running"),
        lifecycle("3", "stopped"),
        lifecycle("4", "turn-completed") // not session-level
      ];
      expect(deriveSessionLifecycleStatus(events, "stopped")).toBe("stopped");
    });

    it("treats turn-failed as failed (session-level visual)", () => {
      const events = [lifecycle("1", "running"), lifecycle("2", "turn-failed")];
      expect(deriveSessionLifecycleStatus(events, "stopped")).toBe("failed");
    });

    it("ignores turn-* lifecycle statuses that aren't turn-failed", () => {
      const events = [lifecycle("1", "turn-completed")];
      expect(deriveSessionLifecycleStatus(events, "stopped")).toBe("stopped");
    });
  });

  describe("projectTranscriptEvents lifecycle handling", () => {
    it("keeps interrupted lifecycle (turn-failed) in the message stream", () => {
      const events = [userMsg("1", "hi"), lifecycle("2", "turn-failed")];
      const items = projectTranscriptEvents(events);
      expect(items.map((i) => i.event.kind)).toEqual(["user_message", "lifecycle"]);
    });

    it("drops non-interrupted lifecycle events from both chat and non-chat modes", () => {
      const events = [
        userMsg("1", "hi"),
        lifecycle("2", "starting"),
        lifecycle("3", "running"),
        lifecycle("4", "stopped")
      ];
      expect(projectTranscriptEvents(events, { chatMode: false }).map((i) => i.event.kind)).toEqual(["user_message"]);
      expect(projectTranscriptEvents(events, { chatMode: true }).map((i) => i.event.kind)).toEqual(["user_message"]);
    });

    it("keeps pty_output in non-chat mode but drops it in chat mode", () => {
      const events = [userMsg("1", "hi"), pty("2", "hello world")];
      expect(projectTranscriptEvents(events, { chatMode: false }).map((i) => i.event.kind)).toEqual(["user_message", "pty_output"]);
      expect(projectTranscriptEvents(events, { chatMode: true }).map((i) => i.event.kind)).toEqual(["user_message"]);
    });

    it("merges same-turn assistant_message into one display item", () => {
      const events = [assistantMsg("1", "Hello ", "t1"), assistantMsg("2", "world.", "t1")];
      const items = projectTranscriptEvents(events);
      expect(items).toHaveLength(1);
      expect(items[0].content).toBe("Hello \n\nworld.");
    });

    it("does not merge assistant_message from different turns", () => {
      const events = [assistantMsg("1", "Hello ", "t1"), assistantMsg("2", "Hi.", "t2")];
      const items = projectTranscriptEvents(events);
      expect(items).toHaveLength(2);
    });
  });
});