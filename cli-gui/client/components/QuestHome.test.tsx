import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliProfile, Workspace } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { FeedbackProvider } from "./ui/Feedback";
import { QuestHome } from "./QuestHome";

vi.mock("../runtime/client-runtime", () => {
  // 稳定单例：真实 ClientRuntime context 值不变；若每次渲染返回新对象会让 capabilities effect 死循环
  const runtime = {
    engines: {
      engineReadiness: () => new Promise(() => undefined),
      // CLI/模型联动（QA 调节）：模型列表来自所选 CLI 的 capabilities
      profileCapabilities: () => Promise.resolve({ adapterId: "codex", compatibility: "supported", permissions: [], modes: [], models: [{ id: "gpt-5-codex" }], supportsComposer: true, supportsStructuredRecognition: true, supportsHeadlessTurns: true })
    }
  };
  return { useClientRuntime: () => runtime };
});

const workspaces: Workspace[] = [
  { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" }
];
const profiles: CliProfile[] = [
  { id: "profile-1", name: "Codex CLI", command: "codex", args: [], createdAt: "2026-01-01T00:00:00Z" }
];

function Harness({ ws = workspaces, ps = profiles, onQuickCreate = async () => undefined, onOpenSettings = () => undefined, onAdvancedCreate, draftMode }: {
  ws?: Workspace[];
  ps?: CliProfile[];
  onQuickCreate?: (input: { content: string; workspaceId: string; profileId: string }) => Promise<void>;
  onOpenSettings?: () => void;
  onAdvancedCreate?: () => void;
  draftMode?: boolean;
}) {
  return <QuestHome workspaces={ws} profiles={ps} onQuickCreate={onQuickCreate} onOpenSettings={onOpenSettings} onAdvancedCreate={onAdvancedCreate} draftMode={draftMode} />;
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

  it("renders the title, workspace chip, recommended tasks and the CLI selector above the composer", async () => {
    render(root, <Harness />);
    await act(async () => undefined);
    expect(container.textContent).toContain("Quest on, hands off");
    expect(container.querySelector(".quest-context-bar")).not.toBeNull();
    // context bar 仅保留 workspace chip；CLI 选择器移到 composer 上方与模型并排（QA 调节）
    expect(container.querySelector<HTMLButtonElement>(".context-chip[aria-label='Project']")!.textContent).toContain("Payment Platform");
    expect(container.querySelector(".context-chip[aria-label='CLI profile']")).toBeNull();
    expect(container.querySelector(".composer-controls .cli-selector")!.textContent).toContain("Codex CLI");
    expect(container.querySelectorAll(".task-card")).toHaveLength(3);
    // 单屏精简（QA 调节）：安全横幅与最近工作区列表不再渲染
    expect(container.querySelector(".security-banner")).toBeNull();
    expect(container.querySelector(".quest-home-workspaces")).toBeNull();
  });

  it("loads the model options from the selected CLI capabilities", async () => {
    render(root, <Harness />);
    // capabilities 解析后模型选择器启用并包含联动模型项
    await act(async () => undefined);
    const modelTrigger = Array.from(container.querySelectorAll<HTMLButtonElement>(".composer-controls .capability-selector:not(.cli-selector) .custom-select-trigger"))[0]!;
    expect(modelTrigger.disabled).toBe(false);
    act(() => modelTrigger.click());
    expect(container.textContent).toContain("gpt-5-codex");
  });

  it("keeps only the clean input surface in new-quest draft mode", () => {
    render(root, <Harness draftMode />);
    // 草稿态：保留标题、context bar 与 composer，隐藏引擎就绪/安全横幅/最近工作区
    expect(container.querySelector(".quest-home.draft-mode")).not.toBeNull();
    expect(container.querySelector(".quest-context-bar")).not.toBeNull();
    expect(container.querySelector(".prompt-composer")).not.toBeNull();
    expect(container.querySelector(".engine-readiness")).toBeNull();
    expect(container.querySelector(".security-banner")).toBeNull();
    expect(container.querySelector(".quest-home-workspaces")).toBeNull();
  });

  it("orders the workspace chip by most recent use", () => {
    const ws: Workspace[] = [
      { id: "workspace-old", name: "Old Project", path: "/projects/old", createdAt: "2026-01-01T00:00:00Z" },
      { id: "workspace-new", name: "Fresh Project", path: "/projects/fresh", createdAt: "2026-01-02T00:00:00Z", lastOpenedAt: "2026-03-01T00:00:00Z" }
    ];
    render(root, <Harness ws={ws} />);
    // 最近使用的工作区成为默认选中项（frontend-spec §6）
    expect(container.querySelector<HTMLButtonElement>(".context-chip[aria-label='Project']")!.textContent).toContain("Fresh Project");
  });

  it("switches the workspace through the inline popover limited to the 3 most recent", () => {
    const ws: Workspace[] = [
      { id: "w1", name: "Alpha", path: "/p/a", createdAt: "2026-01-01T00:00:00Z", lastOpenedAt: "2026-04-01T00:00:00Z" },
      { id: "w2", name: "Beta", path: "/p/b", createdAt: "2026-01-02T00:00:00Z", lastOpenedAt: "2026-03-01T00:00:00Z" },
      { id: "w3", name: "Gamma", path: "/p/c", createdAt: "2026-01-03T00:00:00Z", lastOpenedAt: "2026-02-01T00:00:00Z" },
      { id: "w4", name: "Delta", path: "/p/d", createdAt: "2026-01-04T00:00:00Z", lastOpenedAt: "2026-01-05T00:00:00Z" }
    ];
    render(root, <Harness ws={ws} />);
    const chip = container.querySelector<HTMLButtonElement>(".context-chip[aria-label='Project']")!;
    act(() => chip.click());
    // popover 仅展示最近 3 个工作区（issue-054）
    const items = container.querySelectorAll<HTMLButtonElement>(".context-popover-item");
    expect(items).toHaveLength(3);
    expect(Array.from(items).map((item) => item.textContent)).toEqual(["Alpha", "Beta", "Gamma"]);
    act(() => items[1].click());
    expect(container.querySelector(".context-popover")).toBeNull();
    expect(container.querySelector<HTMLButtonElement>(".context-chip[aria-label='Project']")!.textContent).toContain("Beta");
  });

  it("opens the advanced creation dialog from the context bar link", () => {
    const onAdvancedCreate = vi.fn();
    render(root, <Harness onAdvancedCreate={onAdvancedCreate} />);
    const link = container.querySelector<HTMLButtonElement>(".advanced-create-link")!;
    act(() => link.click());
    expect(onAdvancedCreate).toHaveBeenCalledOnce();
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
