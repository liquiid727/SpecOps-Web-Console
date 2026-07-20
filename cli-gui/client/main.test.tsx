import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";

vi.mock("./terminal", () => ({
  TerminalView: () => <div data-testid="terminal-view" />
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const state = {
  readonly: false,
  workspaces: [
    { id: "workspace-1", name: "SpecOS", path: "/Users/liquiid/code/specos-ai", createdAt: "2026-07-16T00:00:00.000Z" }
  ],
  profiles: [
    { id: "profile-1", name: "Codex", command: "codex", args: [], createdAt: "2026-07-16T00:00:00.000Z" }
  ],
  sessions: [
    {
      id: "session-1",
      workspaceId: "workspace-1",
      profileId: "profile-1",
      name: "Design review",
      status: "stopped",
      createdAt: "2026-07-16T00:00:00.000Z",
      lastActiveAt: "2026-07-16T00:00:00.000Z"
    }
  ]
};

describe("CLI GUI workbench", () => {
  let root: Root | undefined;

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders the session workbench with current navigation and workspace controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><App /></I18nProvider>);
    });

    expect(await screenText(element, "Sessions")).toBeTruthy();
    expect(element.querySelector(".utility-rail")).toBeTruthy();
    expect(element.querySelector(".session-navigator")).toBeTruthy();
    expect(element.querySelector(".session-workspace")).toBeTruthy();
    expect(element.querySelector(".terminal-surface")).toBeTruthy();
    expect(element.textContent).toContain("Design review");
    expect(element.textContent).toContain("Resume");
    expect(element.textContent).toContain("New session");
    expect(element.textContent).not.toContain("3001");
  });
});

async function screenText(element: HTMLElement, text: string) {
  await vi.waitFor(() => expect(element.textContent).toContain(text));
  return element.textContent?.includes(text);
}
