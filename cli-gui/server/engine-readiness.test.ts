import { describe, expect, it } from "vitest";
import type { CapabilityDetectionResult, CliProfileV3 } from "../shared/types";
import { toEngineReadiness } from "./engine-readiness";

const profile: CliProfileV3 = {
  id: "profile-codex",
  name: "Codex",
  command: "codex",
  args: [],
  adapterId: "codex",
  createdAt: "2026-07-29T00:00:00.000Z"
};

function detected(change: Partial<CapabilityDetectionResult> = {}): CapabilityDetectionResult {
  return {
    adapterId: "codex",
    compatibility: "supported",
    permissions: [],
    modes: [],
    models: [],
    supportsComposer: true,
    supportsStructuredRecognition: true,
    supportsHeadlessTurns: true,
    supportsResume: true,
    supportsApproval: false,
    supportsPromptEnhancement: true,
    ...change
  };
}

describe("Engine readiness", () => {
  it("reports a compatible structured engine without claiming auth readiness", () => {
    expect(toEngineReadiness(profile, detected({ detectedVersion: "0.180.0" }))).toMatchObject({
      engineId: "codex",
      profileId: "profile-codex",
      installation: "available",
      authentication: "unknown",
      compatibility: "supported",
      selectedTransport: "json-stream",
      version: "0.180.0"
    });
  });

  it("turns a missing command into an install remediation and PTY fallback", () => {
    expect(toEngineReadiness(profile, detected({
      compatibility: "unavailable",
      detectionFailure: "command-missing",
      supportsHeadlessTurns: false
    }))).toMatchObject({
      installation: "missing",
      compatibility: "unknown",
      selectedTransport: "pty",
      remediation: { kind: "install-guide", code: "ENGINE_NOT_INSTALLED" }
    });
  });

  it("maps probe timeout and unsupported versions to stable remediation codes", () => {
    expect(toEngineReadiness(profile, detected({
      compatibility: "unknown-version",
      detectionFailure: "probe-timeout",
      supportsHeadlessTurns: false
    }))).toMatchObject({
      compatibility: "unknown",
      selectedTransport: "pty",
      remediation: { kind: "retry-probe", code: "ENGINE_PROBE_TIMEOUT" }
    });

    expect(toEngineReadiness(profile, detected({
      compatibility: "supported",
      detectionFailure: "version-out-of-range",
      supportsHeadlessTurns: false
    }))).toMatchObject({
      installation: "available",
      compatibility: "unsupported",
      remediation: { kind: "update", code: "ENGINE_VERSION_UNSUPPORTED" }
    });
  });
});
