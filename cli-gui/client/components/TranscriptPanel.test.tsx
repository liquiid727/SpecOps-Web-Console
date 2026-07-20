import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
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
