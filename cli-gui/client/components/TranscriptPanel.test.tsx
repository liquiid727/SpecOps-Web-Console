import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptEvent } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { isNearBottom, projectTranscriptEvents, sanitizePtyOutput, buildTurnPrompts, deriveActiveTurnId } from "../transcript-display";
import { MarkdownLite, TranscriptMessage } from "./TranscriptPanel";

describe("Markdown transcript rendering", () => {
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

  it("renders GFM while dropping HTML and unsafe links", () => {
    act(() => root.render(<I18nProvider><MarkdownLite source={"# Plan\n\n- [x] ship\n\n| key | value |\n| --- | --- |\n| a | b |\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1)) [protocol-relative](//evil.example) [safe](https://example.com)"} /></I18nProvider>));
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a[href^='javascript']")).toBeNull();
    expect(container.querySelector("a[href^='//']")).toBeNull();
    expect(container.querySelector("a[href='https://example.com']")?.getAttribute("rel")).toContain("noreferrer");
  });

  it("bounds oversized render input", () => {
    act(() => root.render(<I18nProvider><MarkdownLite source={"a".repeat(300 * 1024)} /></I18nProvider>));
    expect(container.textContent).toContain("truncated");
  });
});

describe("session transcript projection", () => {
  it("removes ANSI control data and merges PTY chunks before rendering", () => {
    const event = (id: string, raw: string): TranscriptEvent => ({
      id,
      sessionId: "session-1",
      sequence: Number(id.slice(-1)),
      occurredAt: "2026-01-01T00:00:00Z",
      kind: "pty_output",
      source: "pty",
      raw,
      rawBytes: raw.length,
      truncated: false
    });

    const projected = projectTranscriptEvents([
      event("event-1", "\u001b]0;Des"),
      event("event-2", "ktop\u0007\u001b[2JOpenAI Codex\r\n")
    ]);

    expect(projected).toHaveLength(1);
    expect(projected[0].content).toBe("OpenAI Codex");
    expect(projected[0].content).not.toContain("Desktop");
    expect(projected[0].content).not.toContain("\u001b");
  });

  it("preserves ordinary carriage-return line output without terminal bytes", () => {
    expect(sanitizePtyOutput("first\rsecond\n\u001b[31mready\u001b[0m")).toBe("second\nready");
  });
});

// —— issue-007：规范 kind fixture（event-protocol-spec §3，无 legacy kind）——
function makeEvent(overrides: Partial<TranscriptEvent> & { id: string; kind: TranscriptEvent["kind"] }): TranscriptEvent {
  return {
    sessionId: "session-1",
    sequence: Number(overrides.id.replace(/\D/g, "")) || 1,
    occurredAt: "2026-01-01T00:00:00Z",
    source: "profile-adapter",
    raw: "payload",
    rawBytes: 7,
    truncated: false,
    ...overrides
  };
}

describe("ChatView structured rendering (kind → render table)", () => {
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

  function renderEvents(events: TranscriptEvent[]) {
    const items = projectTranscriptEvents(events);
    act(() => root.render(<I18nProvider>{items.map((item) => <TranscriptMessage item={item} key={item.id} />)}</I18nProvider>));
    return items;
  }

  it("maps every canonical kind and falls back neutrally for unknown kinds", () => {
    renderEvents([
      makeEvent({ id: "e1", kind: "user_message", source: "composer", raw: "do the thing" }),
      makeEvent({ id: "e2", kind: "assistant_message", raw: "**done**", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e3", kind: "tool_activity", raw: "go test ./... output", metadata: { tool: "bash: go test" } }),
      makeEvent({ id: "e4", kind: "file_change", raw: "payment.go", metadata: { path: "src/payment.go" } }),
      makeEvent({ id: "e5", kind: "pty_output", source: "pty", raw: "raw bytes\r\n" }),
      makeEvent({ id: "e6", kind: "lifecycle", source: "session-manager", raw: "Session running.", metadata: { status: "running" } }),
      makeEvent({ id: "e7", kind: "error", source: "session-manager", raw: "spawn failed", metadata: { code: "SESSION_START_FAILED" } }),
      makeEvent({ id: "e8", kind: "approval_request", raw: "command: npm install", metadata: { approvalId: "a1" } }),
      makeEvent({ id: "e9", kind: "approval_response", raw: "decision recorded", metadata: { approvalId: "a1", decision: "allow" } }),
      makeEvent({ id: "e10", kind: "retention_marker", source: "session-manager", raw: "older events removed" }),
      makeEvent({ id: "e11", kind: "mystery_kind" as TranscriptEvent["kind"], raw: "future payload" })
    ]);

    expect(container.querySelector(".transcript-event.user_message pre")?.textContent).toBe("do the thing");
    expect(container.querySelector(".transcript-event.user_message .markdown-lite")).toBeNull();
    expect(container.querySelector(".transcript-event.assistant_message .markdown-lite strong")?.textContent).toBe("done");
    const tool = container.querySelector(".transcript-event.tool_activity details");
    expect(tool?.hasAttribute("open")).toBe(false);
    expect(tool?.querySelector("summary")?.textContent).toBe("bash: go test");
    expect(tool?.querySelector("pre")?.textContent).toContain("go test ./... output");
    expect(container.querySelector(".transcript-event.file_change code")?.textContent).toBe("src/payment.go");
    expect(container.querySelector(".transcript-event.pty_output details")).not.toBeNull();
    expect(container.querySelector(".transcript-event.lifecycle .lifecycle-status")?.textContent).toBe("running");
    expect(container.querySelector(".transcript-event.error .error-code")?.textContent).toBe("SESSION_START_FAILED");
    expect(container.querySelector(".transcript-event.approval_request")).not.toBeNull();
    expect(container.querySelector(".transcript-event.approval_response .lifecycle-status")?.textContent).toBe("allow");
    expect(container.querySelector(".transcript-event.retention_marker")).not.toBeNull();
    const unknown = container.querySelector(".transcript-event.unknown-kind");
    expect(unknown?.getAttribute("data-kind")).toBe("mystery_kind");
    expect(unknown?.textContent).toContain("future payload");
  });

  it("merges consecutive assistant messages of the same turn into one streaming bubble", () => {
    const items = renderEvents([
      makeEvent({ id: "e1", kind: "assistant_message", raw: "first segment", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "assistant_message", raw: "second segment", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e3", kind: "assistant_message", raw: "other turn", metadata: { turnId: "turn-2" } })
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].content).toBe("first segment\n\nsecond segment");
    expect(container.querySelectorAll(".transcript-event.assistant_message")).toHaveLength(2);
  });

  it("renders interrupted turns with a recognizable state and error code", () => {
    renderEvents([
      makeEvent({ id: "e1", kind: "lifecycle", source: "session-manager", raw: "Turn cancelled.", metadata: { status: "turn-cancelled", turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "error", source: "session-manager", raw: "Turn timed out after 600000ms.", metadata: { code: "TURN_TIMEOUT", turnId: "turn-1" } })
    ]);

    const lifecycle = container.querySelector(".transcript-event.lifecycle");
    expect(lifecycle?.classList.contains("interrupted")).toBe(true);
    expect(lifecycle?.querySelector(".lifecycle-status")?.textContent).toBe("turn-cancelled");
    expect(container.querySelector(".transcript-event.error .error-code")?.textContent).toBe("TURN_TIMEOUT");
  });
});

describe("Markdown sanitize hardening (XSS fixtures)", () => {
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

  it("neutralizes scripts, event attributes, javascript links, and remote images", () => {
    act(() => root.render(<I18nProvider><MarkdownLite source={'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1)) [data](data:text/html;base64,PGI+) ![tracker](https://evil.example/pixel.png)'} /></I18nProvider>));
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("a[href^='javascript']")).toBeNull();
    expect(container.querySelector("a[href^='data:']")).toBeNull();
    const imageLink = container.querySelector(".markdown-image-link");
    expect(imageLink?.textContent).toBe("tracker");
    expect(imageLink?.getAttribute("rel")).toContain("noopener");
  });

  it("keeps fenced code copyable as raw source", () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    act(() => root.render(<I18nProvider><MarkdownLite source={"```ts\nconst a = 1;\nconst b = 2;\n```"} /></I18nProvider>));
    const block = container.querySelector(".markdown-code-block");
    expect(block?.querySelector("code")?.className).toContain("language-ts");
    act(() => block?.querySelector<HTMLButtonElement>(".code-copy")?.click());
    expect(writeText).toHaveBeenCalledWith("const a = 1;\nconst b = 2;\n");
  });
});

// —— issue-008：chat 轮次交互（frontend-spec §5.2，api-spec §4.2）——
describe("chat turn interactions", () => {
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

  it("derives the active turn from the event stream and clears it on terminal events", () => {
    const open = [
      makeEvent({ id: "e1", kind: "user_message", source: "composer", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "assistant_message", metadata: { turnId: "turn-1" } })
    ];
    expect(deriveActiveTurnId(open)).toBe("turn-1");
    expect(deriveActiveTurnId([...open, makeEvent({ id: "e3", kind: "lifecycle", source: "session-manager", metadata: { turnId: "turn-1", status: "turn-completed" } })])).toBeUndefined();
    expect(deriveActiveTurnId([...open, makeEvent({ id: "e3", kind: "error", source: "session-manager", metadata: { turnId: "turn-1", code: "TURN_TIMEOUT" } })])).toBeUndefined();
    // 无 turnId 的事件不影响推导
    expect(deriveActiveTurnId([...open, makeEvent({ id: "e4", kind: "pty_output", source: "pty" })])).toBe("turn-1");
  });

  it("maps turnId to the original prompt for retry", () => {
    const prompts = buildTurnPrompts([
      makeEvent({ id: "e1", kind: "user_message", source: "composer", raw: "original prompt", metadata: { turnId: "turn-1" } }),
      makeEvent({ id: "e2", kind: "assistant_message", raw: "reply", metadata: { turnId: "turn-1" } })
    ]);
    expect(prompts.get("turn-1")).toBe("original prompt");
    expect(prompts.get("turn-2")).toBeUndefined();
  });

  it("shows a retry button on failed turn errors and invokes the retry callback", () => {
    const onRetry = vi.fn();
    const [item] = projectTranscriptEvents([makeEvent({ id: "e1", kind: "error", source: "session-manager", raw: "turn failed", metadata: { turnId: "turn-1", code: "TURN_FAILED" } })]);
    act(() => root.render(<I18nProvider><TranscriptMessage item={item} onRetry={onRetry} /></I18nProvider>));
    const retry = container.querySelector(".retry-turn") as HTMLButtonElement;
    expect(retry?.textContent).toBe("Retry");
    act(() => retry.click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry button when no retry callback is provided", () => {
    const [item] = projectTranscriptEvents([makeEvent({ id: "e1", kind: "error", source: "session-manager", raw: "turn failed", metadata: { turnId: "turn-1", code: "TURN_FAILED" } })]);
    act(() => root.render(<I18nProvider><TranscriptMessage item={item} /></I18nProvider>));
    expect(container.querySelector(".retry-turn")).toBeNull();
  });
});

describe("scroll follow policy", () => {
  it("follows while pinned to the bottom and stops after the user scrolls up", () => {
    expect(isNearBottom(968, 1000, 300)).toBe(true);
    expect(isNearBottom(700, 1000, 300)).toBe(true);
    expect(isNearBottom(600, 1000, 300)).toBe(false);
    expect(isNearBottom(0, 200, 200)).toBe(true);
  });
});
