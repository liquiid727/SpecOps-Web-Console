import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/App";
import { parsePreferences, preferencesKey } from "./app/preferences";
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

    expect(await screenText(element, "Quests")).toBeTruthy();
    expect(element.querySelector(".utility-rail")).toBeNull();
    expect(element.querySelector(".app-sidebar")).toBeTruthy();
    expect(element.querySelector("#session-navigator")).toBeTruthy();
    expect(element.querySelector(".quest-home")).toBeTruthy();
    await act(async () => {
      element.querySelector<HTMLButtonElement>("[aria-label='Toggle right panel']")?.click();
    });
    expect(element.querySelector(".qoder-right-panel")).toBeTruthy();
    expect(element.textContent).toContain("Design review");
    expect(element.textContent).toContain("Workspace");
    expect(element.textContent).not.toContain("Workspaces");
    expect(element.textContent).toContain("Better Loop");
    expect(element.textContent).toContain("New Quest");
    expect(element.textContent).not.toContain("3001");
  });

  it("renders an accessible retry state when the initial workspace load fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });

    await vi.waitFor(() => expect(element.querySelector(".center-state")).toBeTruthy());
    expect(element.textContent).toContain("failed to load projects");
    const retry = element.querySelector<HTMLButtonElement>(".secondary-button");
    expect(retry).toBeTruthy();
    expect(retry?.textContent).toContain("Retry");
    expect(element.querySelector("svg")).toBeTruthy();
  });

  it("applies and persists the selected appearance theme", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Quests");

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
    await screenText(element, "Quests");

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

  it("quick create from Quest Home posts a terminal session while chat is feature-flagged off", async () => {
    const sessionBodies: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/sessions" && init?.method === "POST") {
        sessionBodies.push(String(init.body));
        return new Response(JSON.stringify({ id: "session-new", session: { id: "session-new", workspaceId: "workspace-1", profileId: "profile-1", name: "Ship the fix", status: "running", interactionMode: "terminal", createdAt: "2026-07-28T00:00:00.000Z", lastActiveAt: "2026-07-28T00:00:00.000Z" } }), { status: 200 });
      }
      if (url.endsWith("/messages")) return new Response(JSON.stringify({ accepted: true }), { status: 200 });
      return new Response(JSON.stringify(state), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch as typeof globalThis.fetch);
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Quests");

    // Quest Home 一次提交：chat 封闭期创建的会话必须是 terminal（console-gaps SPEC §1）
    const textarea = element.querySelector(".quest-home textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "Ship the fix");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    await vi.waitFor(() => expect(sessionBodies.length).toBeGreaterThan(0));
    expect(JSON.parse(sessionBodies[0]).interactionMode).toBe("terminal");
  });

  it("keeps the composer read-only for existing chat sessions while chat is feature-flagged off", async () => {
    const chatState = {
      ...state,
      sessions: [
        ...state.sessions,
        { id: "session-chat", workspaceId: "workspace-1", profileId: "profile-1", name: "Legacy chat", status: "stopped", interactionMode: "chat", createdAt: "2026-07-16T00:00:00.000Z", lastActiveAt: "2026-07-16T00:00:00.000Z" }
      ]
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/state") return new Response(JSON.stringify(chatState), { status: 200 });
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof globalThis.fetch);
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Legacy chat");

    // 存量 chat 会话仍可从 Chats 分区打开查看 transcript，但 composer 禁用（console-gaps SPEC §1）
    const chatRow = Array.from(element.querySelectorAll<HTMLButtonElement>(".chat-row")).find((button) => button.textContent?.includes("Legacy chat"))!;
    await act(async () => { chatRow.click(); });

    await vi.waitFor(() => expect(element.querySelector(".chat-view")).toBeTruthy());
    expect(element.textContent).toContain("This conversation is read-only");
    expect((element.querySelector(".chat-composer textarea") as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("switches primary views with Ctrl/Cmd+1..5 shortcuts", async () => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Quests");

    expect(element.querySelector(".quest-home")).toBeTruthy();
    expect(element.querySelector(".knowledge-view")).toBeNull();

    const fireShortcut = (key: string) =>
      act(() => document.body.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true })));

    await fireShortcut("3");
    expect(element.querySelector(".knowledge-view")).toBeTruthy();

    await fireShortcut("4");
    expect(element.querySelector(".marketplace-view")).toBeTruthy();

    await fireShortcut("5");
    expect(element.querySelector(".settings-view")).toBeTruthy();

    // 设置页 Shortcuts tab 与 app/shortcuts.ts 定义同源渲染表格。
    const shortcutsTab = Array.from(element.querySelectorAll(".settings-nav button")).find((button) => button.textContent?.includes("Shortcuts")) as HTMLButtonElement;
    expect(shortcutsTab).toBeTruthy();
    await act(async () => {
      shortcutsTab.click();
    });
    expect(element.querySelectorAll(".shortcuts-table").length).toBe(4);
    expect(element.textContent).toContain("Toggle navigator sidebar");
    expect(element.textContent).toContain("Next work mode");

    await fireShortcut("2");
    expect(element.querySelector(".chat-view")).toBeTruthy();

    await fireShortcut("1");
    expect(element.querySelector(".quest-home")).toBeTruthy();

    // The same shortcuts must not hijack typing inside form fields.
    const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(textarea, "plan @");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "3", ctrlKey: true, bubbles: true }));
    });
    expect((element.querySelector("textarea") as HTMLTextAreaElement).value).toContain("@");
  });

  // —— console-gaps issue #3：Ctrl+Tab / Ctrl+Shift+Tab 循环四态工作模式并持久化 ——
  it("cycles the composer work mode with Ctrl+Tab and persists it, even from a focused textarea", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(state), { status: 200 })));
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);

    await act(async () => {
      root?.render(<I18nProvider><ThemeProvider><FeedbackProvider><App /></FeedbackProvider></ThemeProvider></I18nProvider>);
    });
    await screenText(element, "Quests");

    const storedMode = () => parsePreferences(window.localStorage.getItem(preferencesKey)).composerWorkMode;
    expect(storedMode()).toBe("default");

    const cycle = (shiftKey: boolean, target: EventTarget = document.body) =>
      act(() => target.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", ctrlKey: true, shiftKey, bubbles: true })));

    await cycle(false);
    expect(storedMode()).toBe("spec");
    await cycle(false);
    expect(storedMode()).toBe("goal");

    // 输入框聚焦时同样生效（console-gaps SPEC §3）
    const textarea = element.querySelector("textarea") as HTMLTextAreaElement;
    await cycle(false, textarea);
    expect(storedMode()).toBe("plan");

    await cycle(true);
    expect(storedMode()).toBe("goal");
  });
});

async function screenText(element: HTMLElement, text: string) {
  await vi.waitFor(() => expect(element.textContent).toContain(text));
  return element.textContent?.includes(text);
}
