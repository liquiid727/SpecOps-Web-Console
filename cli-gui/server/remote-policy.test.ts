import { describe, expect, it } from "vitest";
import { authorizeRemoteCommand, parseRemoteCommand, RemotePolicyError } from "./remote-policy";

describe("remote command policy", () => {
  const context = {
    allowedSessionIds: new Set(["session-1"]),
    allowedWorkspaceIds: new Set(["workspace-1"])
  };

  it("accepts an allow-listed scoped command", () => {
    const command = parseRemoteCommand({ type: "workspace.diff", workspaceId: "workspace-1", scope: "unstaged" });
    expect(() => authorizeRemoteCommand(command, context)).not.toThrow();
  });

  it("rejects arbitrary shell fields and workspace confusion", () => {
    expect(() => parseRemoteCommand({ type: "shell.run", command: "rm", args: ["-rf", "/"] })).toThrow(RemotePolicyError);
    const command = parseRemoteCommand({ type: "workspace.diff", workspaceId: "workspace-other", scope: "staged" });
    expect(() => authorizeRemoteCommand(command, context)).toThrow(/workspace/);
  });
});
