import type { Session, WorkspaceV2 } from "../../shared/types";
import type { SessionFilter, SessionGrouping } from "./preferences";

export type TimeBucket = "today" | "yesterday" | "previous7Days" | "older";

export interface SessionGroup {
  id: string;
  labelKey: string;
  workspace?: WorkspaceV2;
  sessions: Session[];
}

export function selectSessions(sessions: Session[], filter: SessionFilter) {
  return sessions.filter((session) => (session.organizationStatus ?? "active") === filter);
}

/** 按 interactionMode 过滤：未填 interactionMode 的旧会话按 terminal 处理（不变式 I-3） */
export function filterByInteractionMode(sessions: Session[], mode: "chat" | "terminal") {
  return sessions.filter((session) => {
    const effective = session.interactionMode ?? "terminal";
    return effective === mode;
  });
}

export function groupSessions(sessions: Session[], workspaces: WorkspaceV2[], grouping: SessionGrouping, filter: SessionFilter, modeFilter?: "chat" | "terminal", now = new Date()): SessionGroup[] {
  const visible = selectSessions(sessions, filter);
  const filtered = modeFilter ? filterByInteractionMode(visible, modeFilter) : visible;
  if (grouping === "project") {
    // Workspace is the navigation boundary: keep empty folders visible so the
    // user can start the first session in the intended directory.
    return workspaces.map((workspace) => ({ id: `workspace:${workspace.id}`, labelKey: "project", workspace, sessions: sortSessions(filtered.filter((session) => session.workspaceId === workspace.id), "manual") }));
  }
  if (grouping === "time") {
    const groups = new Map<TimeBucket, Session[]>([["today", []], ["yesterday", []], ["previous7Days", []], ["older", []]]);
    for (const session of filtered) groups.get(timeBucket(session.lastActiveAt, now))?.push(session);
    return [...groups.entries()].filter(([, items]) => items.length > 0).map(([bucket, items]) => ({ id: `time:${bucket}`, labelKey: bucket, sessions: sortSessions(items, "recent") }));
  }
  if (grouping === "recent") return [{ id: "recent", labelKey: "recent", sessions: sortSessions(filtered, "recent") }];
  const pinned = sortSessions(filtered.filter((session) => session.pinned), "manual");
  const unpinned = sortSessions(filtered.filter((session) => !session.pinned), "manual");
  return [
    ...(pinned.length ? [{ id: "manual:pinned", labelKey: "pinned", sessions: pinned }] : []),
    ...(unpinned.length ? [{ id: "manual:unpinned", labelKey: "unpinned", sessions: unpinned }] : [])
  ];
}

export function sortSessions(sessions: Session[], mode: "manual" | "recent") {
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
