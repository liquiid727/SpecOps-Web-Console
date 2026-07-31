import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CliProfile, Session, Workspace } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { FeedbackProvider } from "./ui/Feedback";
import { RightPanel } from "./RightPanel";

vi.mock("../terminal", () => ({ TerminalView: ({ sessionId }: { sessionId: string }) => <div data-terminal={sessionId}>terminal</div> }));
vi.mock("../api", () => ({
  api: {
    gitStatus: vi.fn(() => Promise.resolve({ repository: true, branch: "main", clean: true, entries: [], truncated: false })),
    gitDiff: vi.fn(() => Promise.resolve({ files: [], truncated: false })),
    workspaceFiles: vi.fn(() => Promise.resolve({ entries: [], nextCursor: undefined })),
    filePreview: vi.fn(() => Promise.resolve({ kind: "text", content: "" })),
    languageSummary: vi.fn(() => Promise.resolve({ entries: [], partial: false }))
  }
}));

const workspace: Workspace = { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" };
const profile: CliProfile = { id: "profile-1", name: "Claude CLI", command: "claude", args: ["--json"], createdAt: "2026-01-01T00:00:00Z" };
const stoppedSession: Session = { id: "session-1", workspaceId: workspace.id, profileId: profile.id, name: "Backend refactor", status: "stopped", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T01:00:00Z" };

function render(root: Root, session: Session, onTabChange = () => undefined, monitor?: { runningCount: number; runningLimit: number }) {
  act(() => root.render(<I18nProvider><FeedbackProvider><RightPanel session={session} workspace={workspace} profile={profile} readonly={false} runningCount={monitor?.runningCount} runningLimit={monitor?.runningLimit} onTabChange={onTabChange} onClose={() => undefined} /></FeedbackProvider></I18nProvider>));
}

describe("RightPanel", () => {
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

  it("renders only data-backed tabs and runtime details in the summary tab", () => {
    render(root, stoppedSession);
    const tabLabels = Array.from(container.querySelectorAll("[role='tab']")).map((tab) => tab.textContent);
    expect(tabLabels).toEqual(["Summary", "Files", "Terminal", "Raw Events"]);
    expect(container.querySelector(".summary-details")).not.toBeNull();
    expect(container.textContent).toContain("Claude CLI");
    expect(container.textContent).toContain("Payment Platform");
  });

  it("shows the runtime monitor running/limit and warns near the concurrency limit", () => {
    render(root, stoppedSession, () => undefined, { runningCount: 3, runningLimit: 8 });
    expect(container.querySelector(".runtime-monitor-row")?.textContent).toContain("3/8");
    expect(container.querySelector(".runtime-monitor-warning")).toBeNull();
    render(root, stoppedSession, () => undefined, { runningCount: 7, runningLimit: 8 });
    expect(container.querySelector(".runtime-monitor-warning")?.textContent).toContain("Approaching the running session limit");
  });

  it("shows a stopped empty-state on the terminal tab when the session is not running", () => {
    const onTabChange = vi.fn();
    render(root, stoppedSession, onTabChange);
    const terminalTab = Array.from(container.querySelectorAll("[role='tab']")).find((tab) => tab.textContent === "Terminal") as HTMLButtonElement;
    act(() => terminalTab.click());
    expect(onTabChange).toHaveBeenCalledWith("terminal");
    expect(container.querySelector(".right-panel-empty")).not.toBeNull();
    expect(container.querySelector("[data-terminal]")).toBeNull();
  });

  it("streams the terminal when the session is running", () => {
    render(root, { ...stoppedSession, status: "running" });
    const terminalTab = Array.from(container.querySelectorAll("[role='tab']")).find((tab) => tab.textContent === "Terminal") as HTMLButtonElement;
    act(() => terminalTab.click());
    expect(container.querySelector("[data-terminal='session-1']")).not.toBeNull();
  });

  it("exposes the Files/Preview/Languages/Diff/Git inspector sub-tabs on the files tab", async () => {
    render(root, stoppedSession);
    const filesTab = Array.from(container.querySelectorAll("[role='tab']")).find((tab) => tab.textContent === "Files") as HTMLButtonElement;
    await act(async () => {
      filesTab.click();
      await Promise.resolve();
    });
    const subTabLabels = Array.from(container.querySelectorAll(".files-subtabs button")).map((tab) => tab.textContent);
    expect(subTabLabels).toEqual(["Git", "Files", "Preview", "Languages", "Diff"]);
  });
});
