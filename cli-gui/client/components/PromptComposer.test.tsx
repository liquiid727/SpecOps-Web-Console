import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { FeedbackProvider } from "./ui/Feedback";
import { PromptComposer } from "./PromptComposer";

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
  setter.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function byLabel(container: HTMLElement, label: string): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === label) as HTMLButtonElement;
}

describe("PromptComposer", () => {
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

  it("renders the Qoder placeholder, work mode selector and circular send button", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    const textarea = container.querySelector("textarea")!;
    expect(textarea.getAttribute("placeholder")).toContain("context");
    expect(container.querySelector(".work-mode-trigger")?.textContent).toBe("Default");
    expect(byLabel(container, "Send prompt")).toBeTruthy();
  });

  it("exposes only the executable Default and Plan modes", () => {
    const onWorkModeChange = vi.fn();
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} workMode="default" onWorkModeChange={onWorkModeChange} /></FeedbackProvider></I18nProvider>));
    const trigger = container.querySelector(".work-mode-trigger") as HTMLButtonElement;
    expect(trigger.textContent).toBe("Default");
    act(() => trigger.click());
    const options = Array.from(container.querySelectorAll('[role="menuitemradio"]'));
    expect(options.map((option) => option.textContent)).toEqual(["Default", "Plan"]);
    expect(options[0].getAttribute("aria-checked")).toBe("true");
    act(() => (options[1] as HTMLButtonElement).click());
    expect(onWorkModeChange).toHaveBeenCalledWith("plan");
    expect(container.querySelector(".work-mode-menu")).toBeNull();
  });

  it("sends the prompt unchanged regardless of the active work mode", async () => {
    const onSend = vi.fn(async () => undefined);
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={onSend} workMode="plan" onWorkModeChange={() => undefined} /></FeedbackProvider></I18nProvider>));
    const textarea = container.querySelector("textarea")!;
    act(() => setTextareaValue(textarea, "ship the login form"));
    await act(async () => { byLabel(container, "Send prompt").click(); });
    expect(onSend).toHaveBeenCalledWith("ship the login form", expect.any(String));
  });

  it("hides unresolved context controls instead of sending fake tokens", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    expect(byLabel(container, "Context")).toBeUndefined();
  });

  it("hides command tokens until they have backend semantics", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    expect(byLabel(container, "Commands")).toBeUndefined();
  });

  it("sends the prompt and clears the box", async () => {
    const onSend = vi.fn(async () => undefined);
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={onSend} /></FeedbackProvider></I18nProvider>));
    const textarea = container.querySelector("textarea")!;
    act(() => setTextareaValue(textarea, "build a login form"));
    await act(async () => { byLabel(container, "Send prompt").click(); });
    expect(onSend).toHaveBeenCalledWith("build a login form", expect.any(String));
    expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps the composer disabled and blocks sending while loading or readonly", () => {
    const onSend = vi.fn(async () => undefined);
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled onSend={onSend} /></FeedbackProvider></I18nProvider>));
    expect((container.querySelector("textarea") as HTMLTextAreaElement).disabled).toBe(true);
    expect(byLabel(container, "Send prompt").disabled).toBe(true);
  });

  // —— issue-008：chat 轮次交互（frontend-spec §5.1/§5.2/§5.3）——
  it("keeps the textarea editable but blocks submit and offers stop while a turn is active", () => {
    const onSend = vi.fn(async () => undefined);
    const onCancelTurn = vi.fn();
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={onSend} interactionMode="chat" turnActive onCancelTurn={onCancelTurn} /></FeedbackProvider></I18nProvider>));
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
    act(() => setTextareaValue(textarea, "queued prompt"));
    const form = container.querySelector("form")!;
    act(() => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(onSend).not.toHaveBeenCalled();
    expect(byLabel(container, "Send prompt")).toBeUndefined();
    expect(container.textContent).toContain("Waiting for the current turn");
    act(() => byLabel(container, "Stop turn").click());
    expect(onCancelTurn).toHaveBeenCalledTimes(1);
  });

  it("routes chat model changes through the immediate activeModel channel", () => {
    const onActiveModelChange = vi.fn();
    const onLaunchConfigChange = vi.fn();
    const capabilities = { adapterId: "codex", compatibility: "supported", permissions: [], modes: [], models: [{ id: "gpt-5" }, { id: "gpt-5-mini" }], supportsComposer: true, supportsStructuredRecognition: true, supportsHeadlessTurns: true } as never;
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} interactionMode="chat" capabilities={capabilities} onActiveModelChange={onActiveModelChange} onLaunchConfigChange={onLaunchConfigChange} /></FeedbackProvider></I18nProvider>));
    // 下轮生效提示改由选择器 title 承载（工具条无行内文案）
    expect(container.querySelector(".composer-toolbar .capability-selector")?.getAttribute("title")).toContain("Applies from the next turn");
    act(() => byLabel(container, "Model").click());
    const option = Array.from(container.querySelectorAll('[role="option"]')).find((item) => item.textContent === "gpt-5") as HTMLButtonElement;
    act(() => option.click());
    expect(onActiveModelChange).toHaveBeenCalledWith("gpt-5");
    expect(onLaunchConfigChange).not.toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5" }));
  });

  // —— Qoder 卡片式工具条（截图 1:1）：chat 模式无 permission/mode 选择器行 ——
  it("renders the Qoder chat toolbar without the launch controls row", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} interactionMode="chat" /></FeedbackProvider></I18nProvider>));
    expect(container.querySelector(".composer-controls")).toBeNull();
    expect(container.querySelector(".composer-toolbar")).not.toBeNull();
    expect(byLabel(container, "Permission")).toBeUndefined();
    expect(container.querySelector(".composer-pill")).toBeNull();
    expect(byLabel(container, "Attach")).toBeUndefined();
    expect(byLabel(container, "Send prompt")).toBeTruthy();
    const chip = container.querySelector(".composer-chip") as HTMLButtonElement;
    expect(chip.textContent).toBe("Default");
    act(() => chip.click());
    expect(container.querySelectorAll('[role="menuitemradio"]').length).toBe(2);
  });

  // —— console-gaps issue #5（project-quest SPEC §5.7）：润色/压缩与一步撤销 ——
  function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }

  it("replaces the prompt on successful enhancement and restores it via undo", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { content: "Polished prompt.", truncated: false }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} profileId="profile-1" enhanceSupported /></FeedbackProvider></I18nProvider>));
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      act(() => setTextareaValue(textarea, "rough draft"));
      await act(async () => { byLabel(container, "Polish prompt").click(); });
      expect(fetchMock).toHaveBeenCalledWith("/api/prompt/enhance", expect.objectContaining({ method: "POST" }));
      expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ profileId: "profile-1", action: "polish", content: "rough draft", locale: "en" });
      expect(textarea.value).toBe("Polished prompt.");

      const undo = container.querySelector(".composer-undo") as HTMLButtonElement;
      expect(undo.textContent).toBe("Undo");
      act(() => undo.click());
      expect(textarea.value).toBe("rough draft");
      expect(container.querySelector(".composer-undo")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps the original prompt when enhancement fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(502, { error: { code: "ENHANCE_FAILED", message: "Enhancement command failed.", requestId: "request-test" } })));
    try {
      act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} profileId="profile-1" enhanceSupported /></FeedbackProvider></I18nProvider>));
      const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
      act(() => setTextareaValue(textarea, "rough draft"));
      await act(async () => { byLabel(container, "Compress prompt").click(); });
      expect(textarea.value).toBe("rough draft");
      expect(container.querySelector(".composer-undo")).toBeNull();
      expect(document.body.textContent).toContain("original prompt is preserved");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("disables enhancement and explains when the profile does not support it", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} profileId="profile-1" enhanceSupported={false} /></FeedbackProvider></I18nProvider>));
    act(() => setTextareaValue(container.querySelector("textarea") as HTMLTextAreaElement, "draft"));
    const polish = byLabel(container, "Polish prompt");
    expect(polish.disabled).toBe(true);
    expect(polish.getAttribute("title")).toContain("does not support prompt enhancement");
    // 空输入同样禁用（即使 capability 支持）
    act(() => setTextareaValue(container.querySelector("textarea") as HTMLTextAreaElement, ""));
    expect(byLabel(container, "Compress prompt").disabled).toBe(true);
  });
});
