import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, Workspace } from "../../shared/types";
import type { SessionGroup } from "../app/session-selectors";
import { I18nProvider } from "../i18n";
import { Sidebar } from "./Sidebar";

const workspace: Workspace = { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" };
const sessions: Session[] = [
  { id: "session-1", workspaceId: workspace.id, profileId: "profile-1", name: "Backend refactor", status: "running", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T02:00:00Z", manualOrder: 0, revision: 3 },
  { id: "session-2", workspaceId: workspace.id, profileId: "profile-1", name: "Review API", status: "stopped", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T01:00:00Z", manualOrder: 1, revision: 5 }
];

function baseProps(overrides: Partial<Parameters<typeof Sidebar>[0]> = {}): Parameters<typeof Sidebar>[0] {
  const groups: SessionGroup[] = [{ id: "manual:unpinned", labelKey: "unpinned", sessions: sessions as unknown as SessionGroup["sessions"] }];
  const chatGroups: SessionGroup[] = [{ id: "manual:unpinned", labelKey: "unpinned", sessions: [] }];
  return {
    questGroups: groups,
    chatGroups,
    workspaces: [workspace],
    activeSessionId: "session-1",
    currentView: "quest-home",
    grouping: "manual",
    filter: "active",
    readonly: false,
    openFolderBusy: false,
    onViewChange: () => undefined,
    onNewQuest: () => undefined,
    onSelectSession: () => undefined,
    onGroupingChange: () => undefined,
    onFilterChange: () => undefined,
    onReorder: () => undefined,
    onOpenFolder: () => undefined,
    onOpenSettings: () => undefined,
    onRename: () => undefined,
    onPin: () => undefined,
    onComplete: () => undefined,
    onArchive: () => undefined,
    onFork: () => undefined,
    onDelete: () => undefined,
    ...overrides
  };
}

describe("Sidebar", () => {
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

  it("renders grouped quests and marks the active session", () => {
    act(() => root.render(<I18nProvider><Sidebar {...baseProps()} /></I18nProvider>));
    expect(container.textContent).toContain("Backend refactor");
    expect(container.textContent).toContain("Review API");
    expect(container.querySelector("[aria-current='page']")?.textContent).toContain("Backend refactor");
    // 会话列表不展示启动/停止类运行状态描述（仅轮次进行中提示）
    expect(container.textContent).not.toContain("Running");
    expect(container.textContent).not.toContain("Stopped");
    // chat 封闭期：无存量 chat 会话时 Chats 分区展示「暂未开放」空态（console-gaps SPEC §1）
    expect(container.textContent).toContain("Chat is temporarily unavailable");
    // 语言切换收入设置 Appearance，左栏不再挂载（console-gaps SPEC §6）
    expect(container.querySelector(".language-toggle")).toBeNull();
  });

  it("selects a quest and switches views from the bottom links", () => {
    const onSelectSession = vi.fn();
    const onViewChange = vi.fn();
    act(() => root.render(<I18nProvider><Sidebar {...baseProps({ onSelectSession, onViewChange })} /></I18nProvider>));
    const buttons = Array.from(container.querySelectorAll("button"));
    act(() => buttons.find((button) => button.classList.contains("quest-row-main") && button.textContent?.includes("Review API"))?.click());
    act(() => buttons.find((button) => button.classList.contains("sidebar-link") && button.textContent?.includes("Knowledge"))?.click());
    expect(onSelectSession).toHaveBeenCalledWith("session-2");
    expect(onViewChange).toHaveBeenCalledWith("knowledge");
  });

  it("reorders sessions via the keyboard move controls with optimistic revisions", () => {
    const onReorder = vi.fn();
    act(() => root.render(<I18nProvider><Sidebar {...baseProps({ onReorder })} /></I18nProvider>));
    const moveDown = Array.from(container.querySelectorAll("button")).find((button) => button.getAttribute("aria-label") === "Move down") as HTMLButtonElement;
    act(() => moveDown.click());
    expect(onReorder).toHaveBeenCalledWith(["session-2", "session-1"], expect.objectContaining({
      organizationStatus: "active",
      pinned: false,
      expectedRevisions: { "session-1": 3, "session-2": 5 }
    }));
  });

  it("opens the action menu from right-click, roves focus, and restores focus on Escape", async () => {
    const onPin = vi.fn();
    act(() => root.render(<I18nProvider><Sidebar {...baseProps({ onPin })} /></I18nProvider>));
    const row = Array.from(container.querySelectorAll<HTMLButtonElement>(".quest-row-main")).find((button) => button.textContent?.includes("Review API"))!;

    act(() => row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })));
    await act(async () => undefined);
    const menu = container.querySelector<HTMLElement>("[role='menu']")!;
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    expect(document.activeElement).toBe(items[0]);

    act(() => menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    expect(document.activeElement).toBe(items[1]);
    act(() => menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });

    expect(container.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it("keeps grouping and filtering available from the compact header menu", async () => {
    const onGroupingChange = vi.fn();
    const onFilterChange = vi.fn();
    act(() => root.render(<I18nProvider><Sidebar {...baseProps({ onGroupingChange, onFilterChange })} /></I18nProvider>));
    const trigger = container.querySelector<HTMLButtonElement>("[aria-label='Filter by']")!;
    act(() => trigger.click());
    await act(async () => undefined);
    const menuItems = Array.from(container.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    act(() => menuItems.find((item) => item.textContent === "Time")?.click());
    expect(onGroupingChange).toHaveBeenCalledWith("time");
    act(() => trigger.click());
    await act(async () => undefined);
    const reopenedItems = Array.from(container.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    act(() => reopenedItems.find((item) => item.textContent === "Archived")?.click());
    expect(onFilterChange).toHaveBeenCalledWith("archived");
  });
});
