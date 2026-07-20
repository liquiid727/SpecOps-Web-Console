import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { projectTranscriptEvents, sanitizePtyOutput } from "../transcript-display";
import { MarkdownLite } from "./TranscriptPanel";

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
