import type { RemoteCommand } from "../shared/types.js";

export class RemotePolicyError extends Error {
  readonly code = "FORBIDDEN_COMMAND";
  constructor(message: string) {
    super(message);
    this.name = "RemotePolicyError";
  }
}

export interface RemoteAuthorizationContext {
  allowedSessionIds: ReadonlySet<string>;
  allowedWorkspaceIds: ReadonlySet<string>;
}

/**
 * Control Server/agentd boundary accepts only typed domain commands. Raw
 * executable, argv, environment and filesystem path fields have no protocol
 * representation and are rejected during decoding.
 */
export function authorizeRemoteCommand(command: RemoteCommand, context: RemoteAuthorizationContext): void {
  if ("sessionId" in command && !context.allowedSessionIds.has(command.sessionId)) {
    throw new RemotePolicyError("Remote session access is not authorized.");
  }
  if ("workspaceId" in command && !context.allowedWorkspaceIds.has(command.workspaceId)) {
    throw new RemotePolicyError("Remote workspace access is not authorized.");
  }
}

export function parseRemoteCommand(value: unknown): RemoteCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RemotePolicyError("Remote command must be an object.");
  const record = value as Record<string, unknown>;
  if (["command", "args", "env", "path", "cwd"].some((field) => field in record)) throw new RemotePolicyError("Raw process and filesystem fields are forbidden.");
  switch (record.type) {
    case "engine.readiness":
    case "session.list":
      return { type: record.type };
    case "session.create":
      return { type: record.type, workspaceId: text(record.workspaceId), profileId: text(record.profileId), name: text(record.name) };
    case "session.turn": {
      const input = record.input;
      if (!input || typeof input !== "object" || Array.isArray(input) || typeof (input as { prompt?: unknown }).prompt !== "string") throw new RemotePolicyError("Agent input is invalid.");
      const candidate = input as { prompt: string; clientMessageId?: unknown; model?: unknown; permission?: unknown; mode?: unknown };
      if (candidate.prompt.length > 65_536) throw new RemotePolicyError("Agent input exceeds the remote limit.");
      if (candidate.mode !== undefined && candidate.mode !== "default" && candidate.mode !== "plan") throw new RemotePolicyError("Agent mode is invalid.");
      for (const field of [candidate.clientMessageId, candidate.model, candidate.permission]) if (field !== undefined && typeof field !== "string") throw new RemotePolicyError("Agent input option is invalid.");
      return {
        type: record.type,
        sessionId: text(record.sessionId),
        input: {
          prompt: candidate.prompt,
          ...(typeof candidate.clientMessageId === "string" ? { clientMessageId: candidate.clientMessageId } : {}),
          ...(typeof candidate.model === "string" ? { model: candidate.model } : {}),
          ...(typeof candidate.permission === "string" ? { permission: candidate.permission } : {}),
          ...(candidate.mode ? { mode: candidate.mode } : {})
        }
      };
    }
    case "session.cancel":
      return { type: record.type, sessionId: text(record.sessionId), turnId: text(record.turnId) };
    case "approval.decide":
      if (record.decision !== "allow" && record.decision !== "deny") throw new RemotePolicyError("Approval decision is invalid.");
      return { type: record.type, sessionId: text(record.sessionId), approvalId: text(record.approvalId), decision: record.decision };
    case "transcript.read":
      if (!Number.isInteger(record.afterSequence) || Number(record.afterSequence) < 0) throw new RemotePolicyError("Transcript sequence is invalid.");
      return { type: record.type, sessionId: text(record.sessionId), afterSequence: Number(record.afterSequence) };
    case "workspace.diff":
      if (record.scope !== "staged" && record.scope !== "unstaged") throw new RemotePolicyError("Diff scope is invalid.");
      return { type: record.type, workspaceId: text(record.workspaceId), scope: record.scope };
    default:
      throw new RemotePolicyError("Remote command type is not allowed.");
  }
}

function text(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw new RemotePolicyError("Remote command identifier is invalid.");
  return value;
}
