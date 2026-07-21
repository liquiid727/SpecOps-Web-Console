import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { FeedbackProvider } from "./components/ui/Feedback";
import { ThemeProvider } from "./theme";

vi.mock("./terminal", () => ({
  TerminalView: () => <div data-testid="terminal-view" />
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the session workbench with unified sidebar and project controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });

    expect(await screenText(element, "Sessions")).toBeTruthy();
    expect(element.querySelector(".utility-rail")).toBeNull();
    expect(element.querySelector(".app-sidebar")).toBeTruthy();
    expect(element.querySelector(".session-navigator")).toBeTruthy();
    expect(element.querySelector(".session-workspace")).toBeTruthy();
    expect(element.querySelector(".terminal-surface")).toBeTruthy();
    expect(element.textContent).toContain("Design review");
    expect(element.textContent).toContain("Projects");
    expect(element.textContent).not.toContain("Workspaces");
    expect(element.textContent).toContain("Resume");
    expect(element.textContent).toContain("New session");
    expect(element.textContent).not.toContain("3001");
  });

  it("applies and persists the selected appearance theme", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Sessions");

    await act(async () => {
      element.querySelector<HTMLButtonElement>("[aria-label='Open settings']")?.click();
    });
    await act(async () => {
      Array.from(document.body.querySelectorAll<HTMLButtonElement>("[role='tab']")).find((button) => button.textContent === "Appearance")?.click();
    });
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>("[data-theme-choice='classic']")?.click();
    });

    expect(document.documentElement.dataset.theme).toBe("classic");
    expect(localStorage.getItem("product-ai-os-cli-gui-theme")).toBe("classic");
  });

  it("keeps picker failures in the global feedback layer when settings is open", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/state") return new Response(JSON.stringify(state), { status: 200 });
      return new Response(JSON.stringify({ error: { code: "PICKER_INTENT_INVALID", message: "Folder picker intent is invalid or expired.", requestId: "request-test" } }), { status: 403, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch as typeof globalThis.fetch);
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Sessions");

    await act(async () => {
      element.querySelector<HTMLButtonElement>("[aria-label='Open settings']")?.click();
    });
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>(".open-folder-button")?.click();
      await Promise.resolve();
    });

    await vi.waitFor(() => {
      const notice = document.body.querySelector(".feedback-notice.notification.error")?.textContent ?? "";
      expect(notice).toContain("folder picker session expired");
      expect(notice).toContain("request-test");
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    });
    expect(document.body.querySelector(".overlay-panel")).toBeNull();
  });
});

async function screenText(element: HTMLElement, text: string) {
  await vi.waitFor(() => expect(element.textContent).toContain(text));
  return element.textContent?.includes(text);
}
