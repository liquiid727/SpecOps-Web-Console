import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionSnapshot } from "../../shared/execution-attempt";
import { I18nProvider } from "../i18n";
import { AttemptTimeline } from "./AttemptTimeline";

function snapshot(state: ExecutionSnapshot["task"]["state"] = "awaiting_confirmation"): ExecutionSnapshot {
  return {
    task: {
      id: "task-1",
      sessionId: "session-1",
      turnId: "turn-1",
      input: { transcriptEventId: "event-1", sha256: "input-sha" },
      resolvedRoute: { kind: "route", routeId: "route-1", resolvedAt: "2026-08-02T00:00:00Z", sourceTrace: [], candidates: [], executableCandidates: [], canSend: true },
      state,
      revision: 3,
      confirmationToken: state === "awaiting_confirmation" ? "confirm-token" : undefined,
      confirmationInputSha256: state === "awaiting_confirmation" ? "input-sha" : undefined,
      createdAt: "2026-08-02T00:00:00Z"
    },
    attempts: [{
      id: "attempt-1",
      taskId: "task-1",
      ordinal: 1,
      trigger: "primary",
      deployment: { deploymentId: "deployment-1", deploymentName: "Primary", providerId: "provider-1", providerName: "Provider", profileId: "profile-1", modelId: "model-1" },
      state: "failed",
      revision: 3,
      failure: { code: "PROVIDER_UNAVAILABLE", class: "provider-unavailable", message: "connection failed" },
      sideEffect: { state: "unknown", evidenceEventIds: ["event-tool"] },
      startedAt: "2026-08-02T00:00:00.000Z",
      completedAt: "2026-08-02T00:00:00.120Z"
    }]
  };
}

describe("AttemptTimeline", () => {
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

  it("renders stable task and attempt state contracts and confirmation evidence", () => {
    act(() => root.render(<I18nProvider><AttemptTimeline snapshots={[snapshot()]} onConfirmRetry={async () => undefined} /></I18nProvider>));
    expect(container.querySelector("[data-attempt-timeline]")).not.toBeNull();
    expect(container.querySelector("[data-task-state='awaiting_confirmation']")).not.toBeNull();
    expect(container.querySelector("[data-attempt-id='attempt-1']")?.getAttribute("data-attempt-trigger")).toBe("primary");
    expect(container.querySelector("[data-fallback-confirmation='true']")).not.toBeNull();
    expect(container.textContent).toContain("event-tool");
  });

  it("delegates confirm and cancel without duplicate callback wiring", async () => {
    const onConfirm = vi.fn(async () => undefined);
    const onCancel = vi.fn(async () => undefined);
    act(() => root.render(<I18nProvider><AttemptTimeline snapshots={[snapshot()]} onConfirmRetry={onConfirm} onCancel={onCancel} /></I18nProvider>));
    const confirm = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Confirm retry")) as HTMLButtonElement;
    const cancel = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Cancel task")) as HTMLButtonElement;
    await act(async () => { confirm.click(); });
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(cancel.disabled).toBe(false);
  });
});
