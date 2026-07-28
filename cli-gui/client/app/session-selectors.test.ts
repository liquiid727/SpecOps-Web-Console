import { describe, expect, it } from "vitest";
import type { Session, WorkspaceV2 } from "../../shared/types";
import { filterByInteractionMode, groupSessions, timeBucket } from "./session-selectors";

const workspace: WorkspaceV2 = { id: "workspace", name: "Project", path: "/tmp/project", createdAt: "2026-01-01T00:00:00Z" };
const makeSession = (id: string, status: Session["organizationStatus"], lastActiveAt: string, pinned = false, manualOrder = 1000, interactionMode?: Session["interactionMode"]): Session => ({ id, workspaceId: workspace.id, profileId: "profile", name: id, runtimeStatus: "stopped", organizationStatus: status, pinned, manualOrder, interactionMode, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: lastActiveAt, lastActiveAt });

describe("session selectors", () => {
  it("filters lifecycle and keeps stable recent ordering", () => {
    const sessions = [makeSession("b", "active", "2026-07-20T10:00:00Z"), makeSession("a", "active", "2026-07-20T10:00:00Z"), makeSession("done", "completed", "2026-07-20T11:00:00Z")];
    expect(groupSessions(sessions, [workspace], "recent", "active")[0].sessions.map((session) => session.id)).toEqual(["a", "b"]);
    expect(groupSessions(sessions, [workspace], "project", "completed")[0].sessions.map((session) => session.id)).toEqual(["done"]);
  });

  it("creates manual pinned sections and time buckets", () => {
    const now = new Date("2026-07-20T12:00:00Z");
    expect(groupSessions([makeSession("p", "active", "2026-07-20T09:00:00Z", true), makeSession("u", "active", "2026-07-18T09:00:00Z")], [workspace], "manual", "active").map((group) => group.labelKey)).toEqual(["pinned", "unpinned"]);
    expect(timeBucket("2026-07-19T09:00:00Z", now)).toBe("yesterday");
    expect(timeBucket("2026-07-10T09:00:00Z", now)).toBe("older");
  });

  it("splits sessions by interactionMode", () => {
    const sessions = [
      makeSession("chat-1", "active", "2026-07-20T10:00:00Z", false, 1000, "chat"),
      makeSession("term-1", "active", "2026-07-20T09:00:00Z", false, 1000, "terminal"),
      makeSession("legacy", "active", "2026-07-20T08:00:00Z", false, 1000) // legacy: no interactionMode, falls back to terminal
    ];
    expect(groupSessions(sessions, [workspace], "recent", "active", "terminal")[0].sessions.map((session) => session.id)).toEqual(["term-1", "legacy"]);
    expect(groupSessions(sessions, [workspace], "recent", "active", "chat")[0].sessions.map((session) => session.id)).toEqual(["chat-1"]);
    // no modeFilter → all sessions
    expect(groupSessions(sessions, [workspace], "recent", "active")[0].sessions.map((session) => session.id)).toEqual(["chat-1", "term-1", "legacy"]);
  });

  it("filterByInteractionMode treats missing interactionMode as terminal", () => {
    const sessions = [
      makeSession("chat", "active", "2026-07-20T10:00:00Z", false, 1000, "chat"),
      makeSession("term", "active", "2026-07-20T09:00:00Z", false, 1000, "terminal"),
      makeSession("legacy", "active", "2026-07-20T08:00:00Z", false, 1000)
    ];
    expect(filterByInteractionMode(sessions, "terminal").map((session) => session.id)).toEqual(["term", "legacy"]);
    expect(filterByInteractionMode(sessions, "chat").map((session) => session.id)).toEqual(["chat"]);
  });
});
