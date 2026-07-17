// @vitest-environment node
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ApiErrorCode,
  ApiErrorResponse,
  AppStateEnvelopeV2,
  AppStateV2,
  EventServerFrame,
  PickWorkspaceResponse,
  SessionStatus,
  SessionV2,
  TerminalServerFrame
} from "./types.js";
import { CURRENT_SCHEMA_VERSION, withCompatibilityState, withCompatibilityStatus } from "./types.js";

const canonicalSession: SessionV2 = {
  id: "session-1",
  workspaceId: "workspace-1",
  profileId: "profile-1",
  name: "Backend refactor",
  runtimeStatus: "error",
  organizationStatus: "active",
  pinned: true,
  manualOrder: 1000,
  launchConfig: { permission: "plan", mode: null, model: "opus" },
  parentSessionId: "session-parent",
  forkEventId: "event-4",
  forkSequence: 4,
  forkedAt: "2026-01-01T00:30:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  lastActiveAt: "2026-01-01T01:00:00Z",
  error: { code: "SESSION_START_FAILED", message: "command not found", occurredAt: "2026-01-01T01:00:00Z" },
  revision: 3
};

describe("schema v2 contracts", () => {
  it("defines an exact version-two state envelope", () => {
    const envelope: AppStateEnvelopeV2 = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      state: { workspaces: [], profiles: [], sessions: [canonicalSession] }
    };

    expect(envelope.schemaVersion).toBe(2);
    expectTypeOf(envelope.schemaVersion).toEqualTypeOf<2>();
    expectTypeOf<AppStateV2["sessions"][number]>().toEqualTypeOf<SessionV2>();
  });

  it("derives the temporary status alias without mutating canonical sessions", () => {
    const compatible = withCompatibilityStatus(canonicalSession);

    expect(compatible.status).toBe("error");
    expect(compatible).toMatchObject({
      organizationStatus: "active",
      pinned: true,
      manualOrder: 1000,
      revision: 3,
      parentSessionId: "session-parent"
    });
    expect("status" in canonicalSession).toBe(false);
    expect(compatible.error?.message).toBe("command not found");
  });

  it("adapts state responses while preserving workspace and profile arrays", () => {
    const state: AppStateV2 = { workspaces: [], profiles: [], sessions: [canonicalSession] };
    const compatible = withCompatibilityState(state);

    expect(compatible.workspaces).toBe(state.workspaces);
    expect(compatible.profiles).toBe(state.profiles);
    expect(compatible.sessions[0].status).toBe(canonicalSession.runtimeStatus);
    expect(JSON.parse(JSON.stringify(compatible)).sessions[0].status).toBe("error");
  });

  it("shares discriminated transport and error types", () => {
    expectTypeOf<SessionStatus>().toEqualTypeOf<SessionV2["runtimeStatus"]>();
    expectTypeOf<ApiErrorResponse["error"]["code"]>().toEqualTypeOf<ApiErrorCode>();
    expectTypeOf<TerminalServerFrame["type"]>().toEqualTypeOf<"terminal-output" | "runtime-status" | "protocol-error">();
    expectTypeOf<EventServerFrame["type"]>().toEqualTypeOf<"subscription-ready" | "transcript-event" | "session-updated" | "recording-warning" | "protocol-error">();

    const pick: PickWorkspaceResponse = { cancelled: false, workspace: { id: "workspace-1", name: "Workspace", path: "/tmp/workspace", createdAt: "2026-01-01T00:00:00Z" } };
    if (!pick.cancelled) expectTypeOf(pick.workspace.path).toBeString();
  });
});
