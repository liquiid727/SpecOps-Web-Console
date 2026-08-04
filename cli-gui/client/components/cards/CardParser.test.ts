import { describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../../../shared/types";
import type { TranscriptDisplayItem } from "../../transcript-display";
import { classifyCard, parseToCards } from "./CardParser";

function makeItem(id: string, kind: TranscriptEvent["kind"], metadata?: Record<string, any>, component?: TranscriptEvent["component"], raw = `content-${id}`): TranscriptDisplayItem {
  const event: TranscriptEvent = {
    id,
    sessionId: "session-1",
    sequence: Number(id.replace(/\D/g, "")) || 1,
    occurredAt: "2026-01-01T00:00:00Z",
    kind,
    source: "profile-adapter",
    raw,
    rawBytes: 8,
    truncated: false,
    metadata,
    component
  };
  return { id, event, content: raw, raw: event.raw, truncated: false };
}

describe("CardParser classification", () => {
  it("maps user_message to user-message", () => {
    expect(classifyCard("user_message", undefined)).toBe("user-message");
  });

  it("maps tool_activity with command_execution metadata to command", () => {
    expect(classifyCard("tool_activity", { tool: "command_execution" })).toBe("command");
  });

  it("maps other tool_activity to tool-use", () => {
    expect(classifyCard("tool_activity", { tool: "read_file" })).toBe("tool-use");
    expect(classifyCard("tool_activity", undefined)).toBe("tool-use");
  });

  it("maps usage tool_activity to the usage footnote type", () => {
    // issue-062 normalized usage 事件：token 用量不占整张工具卡
    expect(classifyCard("tool_activity", { tool: "usage", inputTokens: 14974, outputTokens: 10 })).toBe("usage");
    expect(classifyCard("tool_activity", { vendorType: "usage" })).toBe("usage");
  });

  it("maps file_change / assistant_message / lifecycle / error", () => {
    expect(classifyCard("file_change", undefined)).toBe("file-change");
    expect(classifyCard("assistant_message", undefined)).toBe("message");
    expect(classifyCard("lifecycle", undefined)).toBe("turn-status");
    expect(classifyCard("error", undefined)).toBe("turn-status");
  });

  it("lets structured component type override the compatibility kind", () => {
    expect(classifyCard("pty_output", { diagnostic: true }, "diagnostic")).toBe("diagnostic");
    expect(classifyCard("assistant_message", undefined, "thinking")).toBe("thinking");
    expect(classifyCard("tool_activity", undefined, "command")).toBe("command");
  });

  it("maps unrecognized kinds to unknown", () => {
    expect(classifyCard("pty_output", undefined)).toBe("shell-run");
    expect(classifyCard("future_kind", undefined)).toBe("unknown");
  });
});

describe("parseToCards", () => {
  it("keeps item order and copies id/content/raw/timestamp", () => {
    const items = [
      makeItem("event-1", "user_message"),
      makeItem("event-2", "tool_activity", { tool: "command_execution", command: "ls", exitCode: 0, turnId: "turn-1" }),
      makeItem("event-3", "file_change", { path: "src/app.ts" })
    ];
    const cards = parseToCards(items);
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.type)).toEqual(["user-message", "command", "file-change"]);
    expect(cards[1]).toMatchObject({
      id: "event-2",
      turnId: "turn-1",
      timestamp: "2026-01-01T00:00:00Z",
      content: "content-event-2",
      raw: "content-event-2"
    });
    expect(cards[1].metadata?.exitCode).toBe(0);
  });

  it("leaves turnId undefined when metadata has no string turnId", () => {
    const cards = parseToCards([makeItem("event-9", "assistant_message", { turnId: 42 })]);
    expect(cards[0].turnId).toBeUndefined();
    expect(cards[0].type).toBe("message");
  });

  it("splits assistant fenced code into message and code-block cards", () => {
    const cards = parseToCards([makeItem("event-10", "assistant_message", { turnId: "turn-1" }, undefined, "Use this:\n\n```ts\nconst a = 1;\n```\n\nDone.")]);
    expect(cards.map((card) => card.type)).toEqual(["message", "code-block", "message"]);
    expect(cards[1]).toMatchObject({ id: "event-10:code-block-1", content: "const a = 1;\n", metadata: expect.objectContaining({ language: "ts" }) });
  });

  it("merges same-turn lifecycle and error into one turn-status card", () => {
    const cards = parseToCards([
      makeItem("event-11", "lifecycle", { turnId: "turn-1", status: "turn-failed" }, undefined, "Turn failed."),
      makeItem("event-12", "error", { turnId: "turn-1", code: "TURN_FAILED" }, undefined, "boom")
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ type: "turn-status", content: "Turn failed.\n\nboom", metadata: expect.objectContaining({ status: "turn-failed", code: "TURN_FAILED" }) });
  });
});
