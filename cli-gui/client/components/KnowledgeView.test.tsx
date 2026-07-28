import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { KnowledgeView } from "./KnowledgeView";

function byText(container: HTMLElement, text: string): HTMLElement {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text) as HTMLElement;
}

describe("KnowledgeView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<I18nProvider><KnowledgeView /></I18nProvider>));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows the three knowledge tabs and the wiki tree", () => {
    expect(container.textContent).toContain("Repo Wiki");
    expect(container.textContent).toContain("Knowledge Card");
    expect(container.textContent).toContain("Memory");
    expect(byText(container, "README")).toBeTruthy();
    expect(byText(container, "Architecture")).toBeTruthy();
  });

  it("switches to the Memory tab and hides the wiki tree", () => {
    act(() => byText(container, "Memory").click());
    expect(byText(container, "Recent activity")).toBeTruthy();
    expect(byText(container, "README")).toBeFalsy();
  });

  it("filters the wiki tree via the search box", () => {
    const input = container.querySelector("input") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "arch");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(byText(container, "Architecture")).toBeTruthy();
    expect(byText(container, "README")).toBeFalsy();
  });

  // —— console-gaps issue #7：Skills 只读浏览 ——
  it("loads system skills and previews SKILL.md content read-only", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/skills/content")) return new Response(JSON.stringify({ content: "# Alpha body", truncated: false }), { status: 200, headers: { "content-type": "application/json" } });
      if (url.startsWith("/api/skills")) return new Response(JSON.stringify({ skills: [{ id: "claude:alpha", name: "Alpha", description: "First skill", source: "claude", scope: "system", path: "~/.claude/skills/alpha" }] }), { status: 200, headers: { "content-type": "application/json" } });
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch);

    await act(async () => byText(container, "Skills").click());
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("First skill");
    expect(container.textContent).toContain("claude");

    await act(async () => (container.querySelector(".skills-item") as HTMLElement).click());
    expect(container.textContent).toContain("# Alpha body");
    expect(container.textContent).toContain("~/.claude/skills/alpha");
  });

  it("asks to register a workspace before browsing workspace-scope skills", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ skills: [] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof globalThis.fetch);

    await act(async () => byText(container, "Skills").click());
    await act(async () => byText(container, "Workspace").click());
    expect(container.textContent).toContain("Register a workspace to browse its skills.");
  });
});
