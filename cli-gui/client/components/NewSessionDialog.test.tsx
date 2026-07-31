import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliProfile, CliProfileCapabilities, Workspace } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { NewSessionDialog } from "./NewSessionDialog";

const workspace: Workspace = { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" };
const profile: CliProfile = { id: "profile-1", name: "Claude Code", command: "claude", args: ["--model", "opus"], createdAt: "2026-01-01T00:00:00Z" };

function capabilitiesWith(supportsHeadlessTurns: boolean): CliProfileCapabilities {
  return { adapterId: "codex", compatibility: "supported", permissions: [], modes: [], models: [], supportsComposer: true, supportsStructuredRecognition: true, supportsHeadlessTurns } as never;
}

describe("NewSessionDialog", () => {
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

  it("defaults to chat mode when the engine supports structured turns", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const loadCapabilities = vi.fn().mockResolvedValue(capabilitiesWith(true));
    await act(async () => root.render(<I18nProvider><NewSessionDialog workspaces={[workspace]} profiles={[profile]} readonly={false} onClose={() => undefined} onCreate={onCreate} onOpenSettings={() => undefined} loadCapabilities={loadCapabilities} /></I18nProvider>));

    // Chat 开启（CHAT_ENABLED=true）：支持 headless 的 Profile 默认 chat，模式可选（issue-066 Chat-first）
    const modeTrigger = container.querySelector<HTMLButtonElement>(".interaction-mode-field .custom-select-trigger")!;
    expect(modeTrigger.disabled).toBe(false);
    expect(modeTrigger.textContent).toContain("Chat");
    expect(container.textContent).not.toContain("Chat is a future capability");

    const input = container.querySelector("input")!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Backend refactor");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(container.textContent).toContain('"claude" "--model" "opus"');
    expect(container.textContent).toContain("/projects/payment");
    expect(container.textContent).toContain("Project");
    expect(container.textContent).not.toContain("Workspace");
    expect(loadCapabilities).toHaveBeenCalledWith(profile.id, expect.anything());
    expect(onCreate).toHaveBeenCalledWith({ name: "Backend refactor", workspaceId: workspace.id, profileId: profile.id, interactionMode: "chat" });
  });

  it("locks the mode to terminal when the profile cannot run chat turns", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const loadCapabilities = vi.fn().mockResolvedValue(capabilitiesWith(false));
    await act(async () => root.render(<I18nProvider><NewSessionDialog workspaces={[workspace]} profiles={[profile]} readonly={false} onClose={() => undefined} onCreate={onCreate} onOpenSettings={() => undefined} loadCapabilities={loadCapabilities} /></I18nProvider>));

    // 能力锁定：所选 Profile 不支持 headless → 锁定 terminal 并展示降级说明（frontend-spec §6）
    const modeTrigger = container.querySelector<HTMLButtonElement>(".interaction-mode-field .custom-select-trigger")!;
    expect(modeTrigger.disabled).toBe(true);
    expect(modeTrigger.textContent).toContain("Terminal");
    expect(container.textContent).toContain("does not support chat mode");

    const input = container.querySelector("input")!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Terminal only");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(onCreate).toHaveBeenCalledWith({ name: "Terminal only", workspaceId: workspace.id, profileId: profile.id, interactionMode: "terminal" });
  });

  it("auto-generates a session name from the workspace when the name is left empty", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const loadCapabilities = vi.fn().mockResolvedValue(capabilitiesWith(true));
    await act(async () => root.render(<I18nProvider><NewSessionDialog workspaces={[workspace]} profiles={[profile]} readonly={false} onClose={() => undefined} onCreate={onCreate} onOpenSettings={() => undefined} loadCapabilities={loadCapabilities} /></I18nProvider>));

    // 名称留空直接提交：自动生成「工作区名 + 时间」，不阻断创建
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(onCreate).toHaveBeenCalledOnce();
    const payload = onCreate.mock.calls[0][0] as { name: string; workspaceId: string; profileId: string; interactionMode: string };
    expect(payload.name).toMatch(/^Payment Platform \d{2}-\d{2} \d{2}:\d{2}$/);
    expect(payload).toMatchObject({ workspaceId: workspace.id, profileId: profile.id, interactionMode: "chat" });
  });

  it("directs incomplete setup to settings", () => {
    const onOpenSettings = vi.fn();
    act(() => root.render(<I18nProvider><NewSessionDialog workspaces={[]} profiles={[]} readonly={false} onClose={() => undefined} onCreate={async () => undefined} onOpenSettings={onOpenSettings} /></I18nProvider>));

    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Open settings"))!;
    act(() => button.click());

    expect(container.textContent).toContain("Set up a project and CLI profile first");
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
