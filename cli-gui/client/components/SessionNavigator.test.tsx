import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, Workspace } from "../../shared/types";
import { I18nProvider } from "../i18n";
import { SessionNavigator } from "./SessionNavigator";

const workspace: Workspace = { id: "workspace-1", name: "Payment Platform", path: "/projects/payment", createdAt: "2026-01-01T00:00:00Z" };
const sessions: Session[] = [
  { id: "session-1", workspaceId: workspace.id, profileId: "profile-1", name: "Backend refactor", status: "running", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T01:00:00Z" },
  { id: "session-2", workspaceId: workspace.id, profileId: "profile-1", name: "Review API", status: "stopped", createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T01:00:00Z" }
];

describe("SessionNavigator", () => {
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

  it("groups sessions by workspace and marks the active session", () => {
    act(() => root.render(<I18nProvider><SessionNavigator groups={[{ workspace, sessions }]} activeSessionId="session-1" onSelect={() => undefined} onNewSession={() => undefined} /></I18nProvider>));

    expect(container.textContent).toContain("Payment Platform");
    expect(container.textContent).toContain("Backend refactor");
    expect(container.textContent).toContain("Review API");
    expect(container.querySelector("[aria-current='page']")?.textContent).toContain("Backend refactor");
  });

  it("selects a session and exposes the new-session action", () => {
    const onSelect = vi.fn();
    const onNewSession = vi.fn();
    act(() => root.render(<I18nProvider><SessionNavigator groups={[{ workspace, sessions }]} onSelect={onSelect} onNewSession={onNewSession} /></I18nProvider>));

    const buttons = Array.from(container.querySelectorAll("button"));
    act(() => buttons.find((button) => button.textContent?.includes("Review API"))?.click());
    act(() => buttons.find((button) => button.textContent?.includes("New session"))?.click());

    expect(onSelect).toHaveBeenCalledWith("session-2");
    expect(onNewSession).toHaveBeenCalledOnce();
  });
});
