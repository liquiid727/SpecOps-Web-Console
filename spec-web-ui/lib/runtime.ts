export type SpecWebRuntimeMode = "workspace" | "readonly";

export function getSpecWebRuntimeMode(): SpecWebRuntimeMode {
  if (process.env.SPECOS_RUNTIME_MODE === "readonly" || process.env.VERCEL === "1") {
    return "readonly";
  }

  return "workspace";
}

export function isReadOnlyMode() {
  return getSpecWebRuntimeMode() === "readonly";
}

export function assertWorkspaceWritable() {
  if (isReadOnlyMode()) {
    throw new Error("SpecOS Web UI is deployed in read-only mode; workspace writes are disabled.");
  }
}
