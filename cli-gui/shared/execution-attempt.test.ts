import { describe, expect, it } from "vitest";
import { canTransitionAttempt, canTransitionTask, failureAllowsAutomaticFallback, observeSideEffect, redactSensitiveText } from "./execution-attempt.js";

describe("CLI-GUI-031 execution normalization", () => {
  it("folds effect evidence conservatively", () => {
    expect(observeSideEffect([])).toEqual({ state: "unknown", evidenceEventIds: [] });
    expect(observeSideEffect([{ id: "read", effect: "read" }, { id: "none", effect: "none" }])).toMatchObject({ state: "clean", evidenceEventIds: ["read", "none"] });
    expect(observeSideEffect([{ id: "write", effect: "write" }]).state).toBe("confirmed");
    expect(observeSideEffect([{ id: "external", effect: "external" }]).state).toBe("confirmed");
    expect(observeSideEffect([{ id: "unknown", effect: "unknown" }]).state).toBe("possible");
    expect(observeSideEffect([{ id: "missing" }]).state).toBe("possible");
    expect(observeSideEffect([{ id: "gap", effect: "read" }], false).state).toBe("unknown");
  });

  it("does not allow duplicate terminal transitions", () => {
    expect(canTransitionTask("completed", "completed")).toBe(false);
    expect(canTransitionAttempt("failed", "failed")).toBe(false);
    expect(failureAllowsAutomaticFallback({ code: "MODEL_NOT_FOUND", class: "configuration", message: "missing", fallbackEligible: true })).toBe(false);
  });

  it("redacts credential canaries without classifying ordinary error text", () => {
    const canaries = ["bearer-canary", "credential-canary", "secret-canary", "token-canary", "key-canary", "env-canary", "prompt-canary"];
    const source = [
      `Authorization: Bearer ${canaries[0]}`,
      `credentialRef=${canaries[1]}`,
      `secret=${canaries[2]}`,
      `token=${canaries[3]}`,
      `key='${canaries[4]}'`,
      `env="${canaries[5]}"`,
      JSON.stringify({ prompt: canaries[6] }),
      "ordinary token expired while connecting"
    ].join("; ");
    const redacted = redactSensitiveText(source);
    for (const canary of canaries) expect(redacted).not.toContain(canary);
    expect(redacted).not.toContain("$1");
    expect(redacted).toContain("ordinary token expired while connecting");
    expect({ code: "CONNECTION_FAILED", class: "connection", phase: "app-server", message: redacted }).toMatchObject({ code: "CONNECTION_FAILED", class: "connection", phase: "app-server" });
  });
});
