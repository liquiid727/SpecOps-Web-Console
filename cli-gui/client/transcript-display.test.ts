import { describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../shared/types";
import { deriveSessionLifecycleStatus, isNearBottom, projectTranscriptEvents, reduceSessionEvents, deriveActiveTurnId, isTurnStillActive, buildApprovalStates, cleanPtyPreview, sanitizePtyOutput } from "./transcript-display";

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

  describe("cleanPtyPreview", () => {
    it("drops pure box-drawing / separator chrome lines", () => {
      const input = "╭────────╮\nhello output\n╰────────╯";
      expect(cleanPtyPreview(input)).toBe("hello output");
    });

    it("replaces inline box-drawing characters and trims line ends", () => {
      expect(cleanPtyPreview("│ model: gpt-5 │")).toBe("model: gpt-5");
    });

    it("collapses consecutive duplicate lines produced by TUI redraw", () => {
      const input = "Thinking...\nThinking...\nThinking...\ndone";
      expect(cleanPtyPreview(input)).toBe("Thinking...\ndone");
    });

    it("drops braille spinner-only lines and keeps real content", () => {
      const input = "⠋⠙⠹\n$ npm test\nall tests passed";
      expect(cleanPtyPreview(input)).toBe("$ npm test\nall tests passed");
    });

    it("returns empty string for pure chrome output", () => {
      expect(cleanPtyPreview("────\n| | |\n⠀⠀")).toBe("");
    });
  });

  describe("sanitizePtyOutput screen emulation", () => {
    it("overwrites carriage-return progress updates and strips SGR colors", () => {
      expect(sanitizePtyOutput("first\rsecond\n\u001b[31mready\u001b[0m")).toBe("second\nready");
    });

    it("replays spinner redraw frames (cursor-home + erase-line) without stacking fragments", () => {
      // 典型 TUI spinner：每帧 ESC[H 归位 + ESC[K 清行后重写——只应保留最后一帧
      const frames = "\u001b[H\u001b[K•Working (1s)\u001b[H\u001b[K•Working (2s)\u001b[H\u001b[K•Done";
      expect(sanitizePtyOutput(frames)).toBe("•Done");
    });

    it("applies absolute cursor positioning (CUP) so later writes replace earlier ones", () => {
      const input = "\u001b[1;1Hheader\n\u001b[2;1Hold status\u001b[2;1H\u001b[Knew status";
      expect(sanitizePtyOutput(input)).toBe("header\nnew status");
    });

    it("honors erase-display (ED2) as a fresh screen", () => {
      expect(sanitizePtyOutput("boot noise\u001b[2J\u001b[Hwelcome")).toBe("welcome");
    });

    it("preserves scrolled-out history in the scrollback buffer", () => {
      // 滚动区域 [1,2]：第三次换行把 line1 滚出顶部→进入回滚保留
      const input = "\u001b[1;2rline1\nline2\nline3";
      expect(sanitizePtyOutput(input)).toBe("line1\nline2\nline3");
    });

    it("drops OSC title sequences", () => {
      expect(sanitizePtyOutput("\u001b]0;window title\u0007hello")).toBe("hello");
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

    it("projects each pty group as the turn delta instead of the whole screen", () => {
      // 终端会话：启动 banner → 用户消息 → TUI 重绘历史 + 新回复。第二张卡片只应含本轮新增内容
      const events = [
        pty("1", "Welcome v1.0\r\nready\r\n"),
        userMsg("2", "hello"),
        pty("3", "\u001b[1;1H\u001b[JWelcome v1.0\r\nready\r\n› hello\r\nHi there!\r\n")
      ];
      const items = projectTranscriptEvents(events, { chatMode: false });
      expect(items.map((i) => i.event.kind)).toEqual(["pty_output", "user_message", "pty_output"]);
      expect(items[0].content).toBe("Welcome v1.0\nready");
      // 本轮增量：回显行“› hello”被抑制，只剩新回复
      expect(items[2].content).toBe("Hi there!");
    });

    it("emits no card for a pty group that only redraws the same screen", () => {
      const events = [
        pty("1", "status: ok\r\n"),
        userMsg("2", "x"),
        pty("3", "\u001b[1;1H\u001b[Jstatus: ok\r\n")
      ];
      const items = projectTranscriptEvents(events, { chatMode: false });
      expect(items.map((i) => i.event.kind)).toEqual(["pty_output", "user_message"]);
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

  describe("isNearBottom scroll-lock", () => {
    it("returns true when within 32px of bottom", () => {
      expect(isNearBottom(968, 1000, 32)).toBe(true);
      expect(isNearBottom(970, 1000, 30)).toBe(true);
    });

    it("returns false when scrolled away from bottom", () => {
      expect(isNearBottom(0, 1000, 400)).toBe(false);
      expect(isNearBottom(500, 1000, 400)).toBe(false);
    });
  });

  describe("deriveActiveTurnId", () => {
    it("identifies the in-progress turn from events", () => {
      const events = [
        userMsg("1", "hello"),
        { ...assistantMsg("2", "reply", "turn-1"), metadata: { turnId: "turn-1" } },
      ];
      expect(deriveActiveTurnId(events)).toBe("turn-1");
    });

    it("returns undefined when turn has terminal state", () => {
      const events = [
        { ...assistantMsg("1", "reply", "turn-1"), metadata: { turnId: "turn-1" } },
        lifecycle("2", "turn-completed"),
      ];
      // lifecycle with turn-* prefix terminates the turn (but has no turnId in metadata here)
      // Add turnId to metadata for proper detection
      const eventsWithTurnId: TranscriptEvent[] = [
        { ...assistantMsg("1", "reply", "turn-1"), metadata: { turnId: "turn-1" } },
        { ...lifecycle("2", "turn-completed"), metadata: { status: "turn-completed", turnId: "turn-1" } },
      ];
      expect(deriveActiveTurnId(eventsWithTurnId)).toBeUndefined();
    });

    it("does not reactivate a turn after an authoritative terminal frame", () => {
      const terminalTurns = new Set(["turn-1"]);
      expect(isTurnStillActive("turn-1", terminalTurns)).toBe(false);
      expect(isTurnStillActive("turn-2", terminalTurns)).toBe(true);
      expect(isTurnStillActive(undefined, terminalTurns)).toBe(false);
    });
  });

  describe("buildApprovalStates", () => {
    it("pairs request with response and marks expired approvals", () => {
      const events: TranscriptEvent[] = [
        { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-27T00:00:00Z", kind: "approval_request", source: "profile-adapter", raw: "perm", rawBytes: 4, truncated: false, metadata: { approvalId: "a1", turnId: "t1" } },
        { id: "e2", sessionId: "s", sequence: 2, occurredAt: "2026-07-27T00:00:01Z", kind: "approval_response", source: "session-manager", raw: "allow", rawBytes: 5, truncated: false, metadata: { approvalId: "a1", decision: "allow", turnId: "t1" } },
        { id: "e3", sessionId: "s", sequence: 3, occurredAt: "2026-07-27T00:00:02Z", kind: "approval_request", source: "profile-adapter", raw: "perm2", rawBytes: 5, truncated: false, metadata: { approvalId: "a2", turnId: "t2" } },
        { id: "e4", sessionId: "s", sequence: 4, occurredAt: "2026-07-27T00:00:03Z", kind: "lifecycle", source: "session-manager", raw: "failed", rawBytes: 6, truncated: false, metadata: { status: "turn-failed", turnId: "t2" } },
      ];
      const states = buildApprovalStates(events);
      expect(states.get("a1")).toEqual({ decision: "allow", expired: false });
      expect(states.get("a2")).toEqual({ decision: undefined, expired: true });
    });
  });

  describe("performance baseline", () => {
    it("reduces 1000 events in under 100ms", () => {
      const events: TranscriptEvent[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `e${i}`,
        sessionId: "s",
        sequence: i + 1,
        occurredAt: "2026-07-27T00:00:00Z",
        kind: i % 3 === 0 ? "assistant_message" : i % 3 === 1 ? "tool_activity" : "file_change",
        source: "profile-adapter",
        raw: `event content ${i}`,
        rawBytes: 20,
        truncated: false,
        metadata: { turnId: `turn-${Math.floor(i / 10)}`, ...(i % 3 === 1 ? { tool: "read_file" } : {}), ...(i % 3 === 2 ? { path: `/src/file-${i}.ts` } : {}) }
      }));
      const start = performance.now();
      const result = reduceSessionEvents(events);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
      expect(result.messagesById.size).toBeGreaterThan(0);
      expect(result.toolCallsById.size).toBeGreaterThan(0);
      expect(result.fileChangesByPath.size).toBeGreaterThan(0);
    });

    it("projects 1000 events in under 100ms", () => {
      const events: TranscriptEvent[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `e${i}`,
        sessionId: "s",
        sequence: i + 1,
        occurredAt: "2026-07-27T00:00:00Z",
        kind: "assistant_message",
        source: "profile-adapter",
        raw: `message ${i}`,
        rawBytes: 10,
        truncated: false,
        metadata: { turnId: `turn-${i}` }
      }));
      const start = performance.now();
      const items = projectTranscriptEvents(events);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
      expect(items.length).toBe(1000);
    });
  });
});
