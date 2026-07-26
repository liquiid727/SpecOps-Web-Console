import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { buildPtyReplaySegments, PtyReplay } from "./ChatTerminalReplay";

// —— issue-014：chat 会话 Terminal tab 只读回放（frontend-spec §2，domain-spec §4 I-3）——
function makeEvent(overrides: Partial<TranscriptEvent> & { id: string; kind: TranscriptEvent["kind"] }): TranscriptEvent {
  return {
    sessionId: "session-1",
    sequence: Number(overrides.id.replace(/\D/g, "")) || 1,
    occurredAt: "2026-01-01T00:00:00Z",
    source: "pty",
    raw: "payload",
    rawBytes: 7,
    truncated: false,
    ...overrides
  };
}

describe("pty replay segmentation", () => {
  it("keeps only pty_output events and strips ANSI escapes", () => {
    const segments = buildPtyReplaySegments([
      makeEvent({ id: "e1", kind: "user_message", source: "composer", raw: "do it", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "pty_output", raw: "\u001b[32mready\u001b[0m\r\n", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e3", kind: "assistant_message", raw: "done", metadata: { turnId: "turn-1" } })
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ turnId: "turn-1", content: "ready" });
  });

  it("groups consecutive chunks by turnId and starts a new segment when the turn changes", () => {
    const segments = buildPtyReplaySegments([
      makeEvent({ id: "e1", kind: "pty_output", raw: "first ", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "pty_output", raw: "turn\n", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e3", kind: "pty_output", raw: "second turn\n", metadata: { turnId: "turn-2" } }),
      makeEvent({ id: "e4", kind: "pty_output", raw: "no turn\n" })
    ]);
    expect(segments.map((segment) => segment.turnId)).toEqual(["turn-1", "turn-2", undefined]);
    expect(segments[0].content).toBe("first turn");
  });

  it("drops segments whose sanitized content is empty", () => {
    expect(buildPtyReplaySegments([makeEvent({ id: "e1", kind: "pty_output", raw: "\u001b[2J\u001b[H" })])).toHaveLength(0);
  });
});

describe("pty replay read-only rendering", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("labels segments with their turnId and renders untagged output under a session label", () => {
    act(() => root.render(<I18nProvider><PtyReplay segments={[{ turnId: "turn-1", content: "npm install output" }, { turnId: undefined, content: "banner" }]} /></I18nProvider>));
    const headers = [...container.querySelectorAll(".pty-replay-header")].map((node) => node.textContent);
    expect(headers).toEqual(["turn-1", "Session output"]);
    expect(container.querySelectorAll(".pty-replay-text")[0].textContent).toBe("npm install output");
  });

  it("exposes no input focus or keyboard write path", () => {
    act(() => root.render(<I18nProvider><PtyReplay segments={[{ turnId: "turn-1", content: "output" }]} /></I18nProvider>));
    expect(container.querySelector("textarea, input, [contenteditable='true'], .xterm")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
    expect(container.querySelector(".pty-replay")?.getAttribute("role")).toBe("log");
  });

  it("appends live pty_output as new content without touching prior segments", () => {
    const first = [{ turnId: "turn-1", content: "first" }];
    act(() => root.render(<I18nProvider><PtyReplay segments={first} /></I18nProvider>));
    expect(container.querySelectorAll(".pty-replay-segment")).toHaveLength(1);
    act(() => root.render(<I18nProvider><PtyReplay segments={[...first, { turnId: "turn-2", content: "second" }]} /></I18nProvider>));
    const texts = [...container.querySelectorAll(".pty-replay-text")].map((node) => node.textContent);
    expect(texts).toEqual(["first", "second"]);
  });
});
