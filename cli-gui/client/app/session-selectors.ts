import type { SessionV2, WorkspaceV2 } from "../../shared/types";
import type { SessionFilter, SessionGrouping } from "./preferences";

export type TimeBucket = "today" | "yesterday" | "previous7Days" | "older";

export interface SessionGroup {
  id: string;
  labelKey: string;
  workspace?: WorkspaceV2;
  sessions: SessionV2[];
}

export function selectSessions(sessions: SessionV2[], filter: SessionFilter) {
  return sessions.filter((session) => (session.organizationStatus ?? "active") === filter);
}

export function groupSessions(sessions: SessionV2[], workspaces: WorkspaceV2[], grouping: SessionGrouping, filter: SessionFilter, now = new Date()): SessionGroup[] {
  const visible = selectSessions(sessions, filter);
  if (grouping === "project") {
    return workspaces.map((workspace) => ({ id: `workspace:${workspace.id}`, labelKey: "project", workspace, sessions: sortSessions(visible.filter((session) => session.workspaceId === workspace.id), "manual") })).filter((group) => group.sessions.length > 0 || visible.some((session) => session.workspaceId === group.workspace?.id));
  }
  if (grouping === "time") {
    const groups = new Map<TimeBucket, SessionV2[]>([["today", []], ["yesterday", []], ["previous7Days", []], ["older", []]]);
    for (const session of visible) groups.get(timeBucket(session.lastActiveAt, now))?.push(session);
    return [...groups.entries()].filter(([, items]) => items.length > 0).map(([bucket, items]) => ({ id: `time:${bucket}`, labelKey: bucket, sessions: sortSessions(items, "recent") }));
  }
  if (grouping === "recent") return [{ id: "recent", labelKey: "recent", sessions: sortSessions(visible, "recent") }];
  const pinned = sortSessions(visible.filter((session) => session.pinned), "manual");
  const unpinned = sortSessions(visible.filter((session) => !session.pinned), "manual");
  return [
    ...(pinned.length ? [{ id: "manual:pinned", labelKey: "pinned", sessions: pinned }] : []),
    ...(unpinned.length ? [{ id: "manual:unpinned", labelKey: "unpinned", sessions: unpinned }] : [])
  ];
}

export function sortSessions(sessions: SessionV2[], mode: "manual" | "recent") {
  return [...sessions].sort((a, b) => {
    if (mode === "recent") return b.lastActiveAt.localeCompare(a.lastActiveAt) || a.id.localeCompare(b.id);
    return (a.manualOrder ?? 0) - (b.manualOrder ?? 0) || b.lastActiveAt.localeCompare(a.lastActiveAt) || a.id.localeCompare(b.id);
  });
}

export function timeBucket(value: string, now: Date): TimeBucket {
  const timestamp = new Date(value).getTime();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const age = Math.floor((startToday - new Date(timestamp).setHours(0, 0, 0, 0)) / day);
  if (!Number.isFinite(age) || age <= 0) return "today";
  if (age === 1) return "yesterday";
  if (age <= 7) return "previous7Days";
  return "older";
}
