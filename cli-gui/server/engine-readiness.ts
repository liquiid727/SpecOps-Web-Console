import type {
  AgentEngineId,
  CapabilityDetectionResult,
  CliProfileV3,
  EngineReadiness
} from "../shared/types.js";

const ENGINE_BY_ADAPTER: Partial<Record<CliProfileV3["adapterId"], AgentEngineId>> = {
  codex: "codex",
  "claude-code": "claude"
};

/** Map low-level version probing into stable, non-mutating product readiness. */
export function toEngineReadiness(profile: CliProfileV3, detected: CapabilityDetectionResult): EngineReadiness | undefined {
  const engineId = ENGINE_BY_ADAPTER[profile.adapterId];
  if (!engineId) return undefined;
  const missing = detected.detectionFailure === "command-missing" || detected.compatibility === "unavailable";
  const unsupported = detected.detectionFailure === "version-out-of-range";
  const timedOut = detected.detectionFailure === "probe-timeout";

  return {
    engineId,
    profileId: profile.id,
    installation: missing ? "missing" : "available",
    // Version probing cannot reliably prove login state. Keep this truthful
    // until the native backends expose a non-mutating auth probe.
    authentication: "unknown",
    compatibility: missing
      ? "unknown"
      : unsupported
        ? "unsupported"
      : detected.compatibility === "supported"
        ? "supported"
        : "unknown",
    version: detected.detectedVersion,
    selectedTransport: detected.supportsHeadlessTurns ? "json-stream" : "pty",
    capabilities: detected,
    remediation: missing
      ? { kind: "install-guide", code: "ENGINE_NOT_INSTALLED", label: `Install ${engineId === "codex" ? "Codex" : "Claude Code"} CLI` }
      : unsupported
        ? { kind: "update", code: "ENGINE_VERSION_UNSUPPORTED", label: `Update ${engineId === "codex" ? "Codex" : "Claude Code"} CLI` }
        : timedOut
          ? { kind: "retry-probe", code: "ENGINE_PROBE_TIMEOUT", label: "Retry compatibility check" }
          : detected.compatibility === "unknown-version"
          ? { kind: "retry-probe", code: "ENGINE_PROBE_UNKNOWN", label: "Retry compatibility check" }
          : undefined
  };
}
