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

  it("renders the Qoder placeholder, Spec/Goal toggle and circular send button", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    const textarea = container.querySelector("textarea")!;
    expect(textarea.getAttribute("placeholder")).toContain("context");
    expect(container.textContent).toContain("Spec");
    expect(container.textContent).toContain("Goal");
    expect(byLabel(container, "Send prompt")).toBeTruthy();
  });

  it("switches between Spec and Goal mode", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    const goal = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Goal") as HTMLButtonElement;
    const spec = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Spec") as HTMLButtonElement;
    expect(spec.getAttribute("aria-pressed")).toBe("true");
    act(() => goal.click());
    expect(goal.getAttribute("aria-pressed")).toBe("true");
    expect(spec.getAttribute("aria-pressed")).toBe("false");
  });

  it("opens the @ context menu and inserts a context token", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    act(() => byLabel(container, "Context").click());
    const fileItem = Array.from(container.querySelectorAll('[role="option"]')).find((item) => item.textContent === "File") as HTMLButtonElement;
    expect(fileItem).toBeTruthy();
    act(() => fileItem.click());
    expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toContain("@file");
  });

  it("opens the / command palette and inserts a command token", () => {
    act(() => root.render(<I18nProvider><FeedbackProvider><PromptComposer disabled={false} onSend={async () => undefined} /></FeedbackProvider></I18nProvider>));
    act(() => byLabel(container, "Commands").click());
    const testItem = Array.from(container.querySelectorAll('[role="option"]')).find((item) => item.textContent?.includes("Test")) as HTMLButtonElement;
    expect(testItem).toBeTruthy();
    act(() => testItem.click());
    expect((container.querySelector("textarea") as HTMLTextAreaElement).value).toContain("/test");
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
    expect(container.textContent).toContain("Applies from the next turn");
    act(() => byLabel(container, "Model").click());
    const option = Array.from(container.querySelectorAll('[role="option"]')).find((item) => item.textContent === "gpt-5") as HTMLButtonElement;
    act(() => option.click());
    expect(onActiveModelChange).toHaveBeenCalledWith("gpt-5");
    expect(onLaunchConfigChange).not.toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5" }));
  });
});
