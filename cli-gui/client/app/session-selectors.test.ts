import { describe, expect, it } from "vitest";
import type { SessionV2, WorkspaceV2 } from "../../shared/types";
import { groupSessions, timeBucket } from "./session-selectors";

const workspace: WorkspaceV2 = { id: "workspace", name: "Project", path: "/tmp/project", createdAt: "2026-01-01T00:00:00Z" };
const makeSession = (id: string, status: SessionV2["organizationStatus"], lastActiveAt: string, pinned = false, manualOrder = 1000): SessionV2 => ({ id, workspaceId: workspace.id, profileId: "profile", name: id, runtimeStatus: "stopped", organizationStatus: status, pinned, manualOrder, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: lastActiveAt, lastActiveAt });

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
});
