import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliProfile, Workspace } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { FeedbackProvider } from "./ui/Feedback";
import { QuestHome } from "./QuestHome";

const workspaces: Workspace[] = [
  { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" }
];
const profiles: CliProfile[] = [
  { id: "profile-1", name: "Codex CLI", command: "codex", args: [], createdAt: "2026-01-01T00:00:00Z" }
];

function Harness({ ws = workspaces, ps = profiles, onQuickCreate = async () => undefined, onOpenSettings = () => undefined }: {
  ws?: Workspace[];
  ps?: CliProfile[];
  onQuickCreate?: (input: { content: string; workspaceId: string; profileId: string }) => Promise<void>;
  onOpenSettings?: () => void;
}) {
  return <QuestHome workspaces={ws} profiles={ps} onQuickCreate={onQuickCreate} onOpenSettings={onOpenSettings} />;
}

function render(root: Root, element: ReactElement) {
  act(() => root.render(<I18nProvider><FeedbackProvider>{element}</FeedbackProvider></I18nProvider>));
}

function setComposerContent(container: HTMLElement, value: string) {
  const textarea = container.querySelector<HTMLTextAreaElement>(".prompt-composer textarea")!;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return textarea;
}

async function submitComposer(container: HTMLElement) {
  await act(async () => {
    container.querySelector<HTMLFormElement>(".prompt-composer")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("QuestHome", () => {
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

  it("renders the title, start-in selectors, recommended tasks and security banner", () => {
    render(root, <Harness />);
    expect(container.textContent).toContain("Quest on, hands off");
    expect(container.querySelector(".start-in-row")).not.toBeNull();
    // Start in 行提供工作区与 profile 下拉（frontend-spec §2、§6）
    expect(container.querySelector<HTMLButtonElement>(".start-in-select .custom-select-trigger[aria-label='Project']")!.textContent).toContain("Payment Platform");
    expect(container.querySelector<HTMLButtonElement>(".start-in-select .custom-select-trigger[aria-label='CLI profile']")!.textContent).toContain("Codex CLI");
    expect(container.querySelectorAll(".task-card")).toHaveLength(3);
    expect(container.querySelector(".security-banner")).not.toBeNull();
    expect(container.textContent).toContain("Security, from the first line of code");
  });

  it("orders the workspace selector by most recent use", () => {
    const ws: Workspace[] = [
      { id: "workspace-old", name: "Old Project", path: "/projects/old", createdAt: "2026-01-01T00:00:00Z" },
      { id: "workspace-new", name: "Fresh Project", path: "/projects/fresh", createdAt: "2026-01-02T00:00:00Z", lastOpenedAt: "2026-03-01T00:00:00Z" }
    ];
    render(root, <Harness ws={ws} />);
    // 最近使用的工作区成为默认选中项（frontend-spec §6）
    expect(container.querySelector<HTMLButtonElement>(".start-in-select .custom-select-trigger[aria-label='Project']")!.textContent).toContain("Fresh Project");
  });

  it("submits the composer content through the one-shot creation flow and clears on success", async () => {
    const onQuickCreate = vi.fn().mockResolvedValue(undefined);
    render(root, <Harness onQuickCreate={onQuickCreate} />);
    const textarea = setComposerContent(container, "Build the onboarding flow");
    await submitComposer(container);
    expect(onQuickCreate).toHaveBeenCalledWith({ content: "Build the onboarding flow", workspaceId: "workspace-1", profileId: "profile-1" });
    expect(textarea.value).toBe("");
  });

  it("keeps the first message in the composer when creation fails", async () => {
    const onQuickCreate = vi.fn().mockRejectedValue(Object.assign(new Error("boom"), { code: "VALIDATION_FAILED" }));
    render(root, <Harness onQuickCreate={onQuickCreate} />);
    const textarea = setComposerContent(container, "Keep me around");
    await submitComposer(container);
    expect(onQuickCreate).toHaveBeenCalledOnce();
    // 创建失败：输入不丢失，可直接重试（issue-015 AC6）
    expect(textarea.value).toBe("Keep me around");
  });

  it("creates a session from a recommended task card", async () => {
    const onQuickCreate = vi.fn().mockResolvedValue(undefined);
    render(root, <Harness onQuickCreate={onQuickCreate} />);
    const firstCard = container.querySelector<HTMLButtonElement>(".task-card")!;
    await act(async () => firstCard.click());
    expect(onQuickCreate).toHaveBeenCalledWith({ content: "Develop an online survey system", workspaceId: "workspace-1", profileId: "profile-1" });
  });

  it("guides setup when no workspace or profile exists", () => {
    const onOpenSettings = vi.fn();
    render(root, <Harness ws={[]} onOpenSettings={onOpenSettings} />);
    // 工作区为空：引导添加而不是渲染 composer（issue-015 AC5）
    expect(container.textContent).toContain("Set up a project and CLI profile first");
    expect(container.querySelector(".prompt-composer")).toBeNull();
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes("Open settings"))!;
    act(() => button.click());
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
