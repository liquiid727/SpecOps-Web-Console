import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { SessionWorkspace } from "./SessionWorkspace";

vi.mock("../terminal", () => ({ TerminalView: ({ sessionId }: { sessionId: string }) => <div data-terminal={sessionId}>terminal</div> }));

const baseSession: Session = { id: "session-1", workspaceId: "workspace-1", profileId: "profile-1", name: "Backend refactor", status: "stopped", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T01:00:00Z" };

describe("SessionWorkspace", () => {
  let container: HTMLDivElement;
  let root: Root;
  const callbacks = { onNewSession: vi.fn(), onOpenInspector: vi.fn(), onResume: vi.fn(), onStatus: vi.fn(), onStop: vi.fn() };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    Object.values(callbacks).forEach((callback) => callback.mockClear());
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders a running terminal and stop action", () => {
    act(() => root.render(<I18nProvider><SessionWorkspace {...callbacks} session={{ ...baseSession, status: "running" }} readonly={false} /></I18nProvider>));
    expect(container.querySelector("[data-terminal='session-1']")).not.toBeNull();
    const stop = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Stop"))!;
    act(() => stop.click());
    expect(callbacks.onStop).toHaveBeenCalledOnce();
  });

  it("shows errors and disables resume in readonly mode", () => {
    act(() => root.render(<I18nProvider><SessionWorkspace {...callbacks} session={{ ...baseSession, status: "error", error: "command not found" }} readonly /></I18nProvider>));
    expect(container.textContent).toContain("Session stopped with an error");
    expect(container.textContent).toContain("command not found");
    const resume = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Resume"))!;
    expect(resume.disabled).toBe(true);
  });
});
