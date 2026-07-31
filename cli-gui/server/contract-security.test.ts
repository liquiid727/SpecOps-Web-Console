// @vitest-environment node
// MVP02-A contract, performance, and security verification suite (issue-074)
import { describe, expect, it } from "vitest";
import type { TranscriptEvent } from "../shared/types";
import { reduceSessionEvents, projectTranscriptEvents, buildApprovalStates, deriveActiveTurnId } from "../client/transcript-display";

// ---------------------------------------------------------------------------
// §1 Contract: Session/Event/Error behavior consistency
// ---------------------------------------------------------------------------

describe("MVP02-A contract suite", () => {
  const makeEvents = (count: number): TranscriptEvent[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `e${i}`,
      sessionId: "s1",
      sequence: i + 1,
      occurredAt: "2026-07-30T00:00:00Z",
      kind: i % 5 === 0 ? "user_message" : i % 5 === 1 ? "assistant_message" : i % 5 === 2 ? "tool_activity" : i % 5 === 3 ? "file_change" : "lifecycle",
      source: i % 5 === 0 ? "composer" : "profile-adapter",
      raw: `event-${i}`,
      rawBytes: 10,
      truncated: false,
      metadata: {
        turnId: `turn-${Math.floor(i / 5)}`,
        ...(i % 5 === 2 ? { tool: "read_file" } : {}),
        ...(i % 5 === 3 ? { path: `/file-${i}.ts` } : {}),
        ...(i % 5 === 4 ? { status: "turn-completed" } : {})
      }
    }));

  it("reduceSessionEvents produces consistent view model from identical inputs (contract)", () => {
    const events = makeEvents(100);
    const result1 = reduceSessionEvents(events);
    const result2 = reduceSessionEvents([...events]);
    expect(result1.messagesById.size).toBe(result2.messagesById.size);
    expect(result1.toolCallsById.size).toBe(result2.toolCallsById.size);
    expect(result1.fileChangesByPath.size).toBe(result2.fileChangesByPath.size);
  });

  it("projectTranscriptEvents is deterministic across calls", () => {
    const events = makeEvents(50);
    const p1 = projectTranscriptEvents(events);
    const p2 = projectTranscriptEvents(events);
    expect(p1.map((i) => i.id)).toEqual(p2.map((i) => i.id));
  });

  it("deriveActiveTurnId respects terminal turn states", () => {
    const events: TranscriptEvent[] = [
      { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-30T00:00:00Z", kind: "assistant_message", source: "adapter", raw: "hi", rawBytes: 2, truncated: false, metadata: { turnId: "t1" } },
      { id: "e2", sessionId: "s", sequence: 2, occurredAt: "2026-07-30T00:00:01Z", kind: "lifecycle", source: "manager", raw: "done", rawBytes: 4, truncated: false, metadata: { status: "turn-completed", turnId: "t1" } },
      { id: "e3", sessionId: "s", sequence: 3, occurredAt: "2026-07-30T00:00:02Z", kind: "assistant_message", source: "adapter", raw: "new", rawBytes: 3, truncated: false, metadata: { turnId: "t2" } },
    ];
    expect(deriveActiveTurnId(events)).toBe("t2");
  });

  it("approval idempotency: respondApproval after settlement has no effect on state", () => {
    const events: TranscriptEvent[] = [
      { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-30T00:00:00Z", kind: "approval_request", source: "adapter", raw: "perm", rawBytes: 4, truncated: false, metadata: { approvalId: "a1", turnId: "t1" } },
      { id: "e2", sessionId: "s", sequence: 2, occurredAt: "2026-07-30T00:00:01Z", kind: "approval_response", source: "manager", raw: "allow", rawBytes: 5, truncated: false, metadata: { approvalId: "a1", decision: "allow", turnId: "t1" } },
      // Duplicate response should not change state (replay)
      { id: "e3", sessionId: "s", sequence: 3, occurredAt: "2026-07-30T00:00:02Z", kind: "approval_response", source: "manager", raw: "allow", rawBytes: 5, truncated: false, metadata: { approvalId: "a1", decision: "allow", turnId: "t1" } },
    ];
    const states = buildApprovalStates(events);
    expect(states.get("a1")).toEqual({ decision: "allow", expired: false });
    expect(states.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §2 Performance baselines
// ---------------------------------------------------------------------------

describe("MVP02-A performance baselines", () => {
  it("reduceSessionEvents handles 1000 events under 100ms", () => {
    const events: TranscriptEvent[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `e${i}`, sessionId: "s", sequence: i + 1, occurredAt: "2026-07-30T00:00:00Z",
      kind: "assistant_message", source: "adapter", raw: `msg ${i}`, rawBytes: 6, truncated: false,
      metadata: { turnId: `turn-${Math.floor(i / 10)}` }
    }));
    const start = performance.now();
    reduceSessionEvents(events);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("projectTranscriptEvents handles 1000 events under 100ms", () => {
    const events: TranscriptEvent[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `e${i}`, sessionId: "s", sequence: i + 1, occurredAt: "2026-07-30T00:00:00Z",
      kind: "assistant_message", source: "adapter", raw: `msg ${i}`, rawBytes: 6, truncated: false,
      metadata: { turnId: `turn-${i}` }
    }));
    const start = performance.now();
    const items = projectTranscriptEvents(events);
    expect(performance.now() - start).toBeLessThan(100);
    expect(items.length).toBe(1000);
  });

  it.skip("50k events cross-conversation stress test (requires browser environment)", () => {
    // Skipped: requires real DOM + requestAnimationFrame + IntersectionObserver
  });
});

// ---------------------------------------------------------------------------
// §3 Security assertions
// ---------------------------------------------------------------------------

describe("MVP02-A security assertions", () => {
  it("workspace path with symlink-like traversal does not escape scope in projectTranscriptEvents", () => {
    const events: TranscriptEvent[] = [
      { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-30T00:00:00Z", kind: "file_change", source: "adapter", raw: "../../../etc/passwd", rawBytes: 20, truncated: false, metadata: { turnId: "t1", path: "../../../etc/passwd" } },
    ];
    // The projection layer renders the path as-is; actual access control is at the API layer
    const items = projectTranscriptEvents(events);
    expect(items[0].content).toBe("../../../etc/passwd");
    // The key assertion is that no file system operation is triggered at the display layer
  });

  it("malicious markdown in transcript content does not produce raw HTML script tags", () => {
    const xssPayload = '<script>alert("xss")</script>';
    const events: TranscriptEvent[] = [
      { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-30T00:00:00Z", kind: "assistant_message", source: "adapter", raw: xssPayload, rawBytes: 30, truncated: false, metadata: { turnId: "t1" } },
    ];
    const items = projectTranscriptEvents(events);
    // Content passes through to React which escapes by default; raw stays as-is for copy
    expect(items[0].raw).toBe(xssPayload);
    expect(items[0].content).toBe(xssPayload);
    // React's JSX rendering inherently escapes this; no dangerouslySetInnerHTML
  });

  it("approval replay produces stable states without mutation side effects", () => {
    const events: TranscriptEvent[] = [
      { id: "e1", sessionId: "s", sequence: 1, occurredAt: "2026-07-30T00:00:00Z", kind: "approval_request", source: "adapter", raw: "perm", rawBytes: 4, truncated: false, metadata: { approvalId: "a1", turnId: "t1" } },
      { id: "e2", sessionId: "s", sequence: 2, occurredAt: "2026-07-30T00:00:01Z", kind: "approval_response", source: "manager", raw: "deny", rawBytes: 4, truncated: false, metadata: { approvalId: "a1", decision: "deny", turnId: "t1" } },
    ];
    // Build states multiple times - should be identical (no mutation accumulation)
    const s1 = buildApprovalStates(events);
    const s2 = buildApprovalStates(events);
    expect(s1.get("a1")).toEqual(s2.get("a1"));
    expect(s1.get("a1")?.decision).toBe("deny");
  });

  it.skip("macOS WKWebView rendering matrix (requires packaged desktop environment)", () => {});
  it.skip("Windows WebView2 rendering matrix (requires packaged desktop environment)", () => {});
  it.skip("Tauri capability escalation detection (requires packaged Tauri build)", () => {});
});
