import type { TranscriptEvent } from "../shared/types";

export interface TranscriptDisplayItem {
  id: string;
  event: TranscriptEvent;
  content: string;
  raw: string;
  truncated: boolean;
}

/** 轮次中断态（turn-failed/turn-cancelled）：chat 模式下唯一保留的 lifecycle 状态 */
export const INTERRUPTED_LIFECYCLE_STATUSES = new Set(["turn-failed", "turn-cancelled"]);

/** 会话运行态（top-level session lifecycle，非 turn 级别）。orchestrator.ts 实际写入：starting / running / stopped */
export const SESSION_LIFECYCLE_STATUSES = new Set(["starting", "running", "stopped", "turn-failed"]);

/** 会话运行态归一化：用于顶部状态条显示 */
export type SessionLifecycleStatus = "idle" | "starting" | "running" | "stopped" | "failed";

export function lifecycleToSessionStatus(status: string | undefined, fallback: SessionLifecycleStatus): SessionLifecycleStatus {
  switch (status) {
    case "starting": return "starting";
    case "running": return "running";
    case "stopped": return "stopped";
    case "turn-failed": return "failed";
    default: return fallback;
  }
}

/** 从事件流派生当前会话运行态（顶部状态条用）：取最新 session-* lifecycle，否则按 fallback（runtimeStatus） */
export function deriveSessionLifecycleStatus(events: TranscriptEvent[], fallback: SessionLifecycleStatus): SessionLifecycleStatus {
  let last: SessionLifecycleStatus = fallback;
  let hasError = false;
  for (const event of events) {
    if (event.kind === "error") { hasError = true; continue; }
    if (event.kind !== "lifecycle") continue;
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
    if (SESSION_LIFECYCLE_STATUSES.has(status)) last = lifecycleToSessionStatus(status, last);
  }
  // 事件流里存在 error 事件（CLI 崩溃/启动失败）→ 失败态优先（runtime-orchestrator-spec §5）
  if (hasError) return "failed";
  return last;
}

export interface ProjectTranscriptOptions {
  /** chat 模式：过滤终端噪音——PTY 原始输出与所有 lifecycle 不入聊天流（lifecycle 走顶部状态条） */
  chatMode?: boolean;
}

/**
 * Build the readable session projection without changing the raw transcript.
 * PTY chunks are transport data, so adjacent chunks are joined before escape
 * sequences are removed. This also handles an ANSI sequence split at a chunk
 * boundary.
 *
 * lifecycle 事件：chat 模式与非 chat 模式都不入消息流（非中断态），仅保留给顶部状态条读；
 * 中断态（turn-failed/turn-cancelled）始终保留在消息流便于重试。
 */
export function projectTranscriptEvents(events: TranscriptEvent[], options: ProjectTranscriptOptions = {}): TranscriptDisplayItem[] {
  const projected: TranscriptDisplayItem[] = [];
  let ptyGroup: TranscriptEvent[] = [];

  function flushPtyGroup() {
    if (!ptyGroup.length) return;
    const raw = ptyGroup.map((event) => event.raw).join("");
    const content = sanitizePtyOutput(raw);
    if (content) {
      const first = ptyGroup[0];
      projected.push({ id: first.id, event: first, content, raw, truncated: ptyGroup.some((event) => event.truncated) });
    }
    ptyGroup = [];
  }

  for (const event of events) {
    if (options.chatMode && isChatNoise(event)) continue;
    // 非中断态 lifecycle 永远不入消息流——状态可视化走顶部 SessionLifecycleStatusBar
    if (event.kind === "lifecycle") {
      const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
      if (!INTERRUPTED_LIFECYCLE_STATUSES.has(status)) continue;
    }
    if (event.kind === "pty_output") {
      ptyGroup.push(event);
      continue;
    }
    flushPtyGroup();
    // 同 turnId 连续 assistant_message 合并为单气泡流式追加段落（frontend-spec §3.2）
    const previous = projected.at(-1);
    if (event.kind === "assistant_message" && previous?.event.kind === "assistant_message" && sameTurn(previous.event, event)) {
      previous.content = `${previous.content}\n\n${event.raw}`;
      previous.raw = `${previous.raw}\n\n${event.raw}`;
      previous.truncated = previous.truncated || event.truncated;
      continue;
    }
    projected.push({ id: event.id, event, content: event.raw, raw: event.raw, truncated: event.truncated });
  }
  flushPtyGroup();
  return projected;
}

/** chat 模式的终端噪音判定：PTY 原始输出与常规 lifecycle（Session starting/running/stopped、Turn completed 等） */
function isChatNoise(event: TranscriptEvent) {
  if (event.kind === "pty_output") return true;
  if (event.kind !== "lifecycle") return false;
  const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
  return !INTERRUPTED_LIFECYCLE_STATUSES.has(status);
}

function sameTurn(left: TranscriptEvent, right: TranscriptEvent) {
  const leftTurn = left.metadata?.turnId;
  const rightTurn = right.metadata?.turnId;
  return typeof leftTurn === "string" && leftTurn === rightTurn;
}

/** 贴底判定：距底部 ≤ 32px 视为跟随中（frontend-spec §3.2 滚动策略） */
export function isNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return scrollHeight - scrollTop - clientHeight <= 32;
}

/**
 * 从事件流推导进行中轮次（api-spec §4.2：断线重连无 turn-status 补发）：
 * 最后一个携带 turnId 且尚无终态（lifecycle turn-* / error）的轮次视为进行中。
 */
export function deriveActiveTurnId(events: TranscriptEvent[]): string | undefined {
  const terminalTurns = new Set<string>();
  let candidate: string | undefined;
  for (const event of events) {
    const turnId = typeof event.metadata?.turnId === "string" ? event.metadata.turnId : undefined;
    if (!turnId) continue;
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
    const isTerminal = event.kind === "error" || (event.kind === "lifecycle" && status.startsWith("turn-"));
    if (isTerminal) {
      terminalTurns.add(turnId);
      if (candidate === turnId) candidate = undefined;
      continue;
    }
    if (!terminalTurns.has(turnId)) candidate = turnId;
  }
  return candidate;
}

/** 审批配对状态（frontend-spec §5.4）：approvalId → 决定/过期。悬挂审批（无 response 且所属轮次已终态）视为已过期 */
export interface ApprovalDisplayState {
  decision?: string;
  expired: boolean;
}

export function buildApprovalStates(events: TranscriptEvent[]): Map<string, ApprovalDisplayState> {
  const requestTurns = new Map<string, string | undefined>();
  const decisions = new Map<string, string>();
  const terminalTurns = new Set<string>();
  for (const event of events) {
    const approvalId = typeof event.metadata?.approvalId === "string" ? event.metadata.approvalId : undefined;
    const turnId = typeof event.metadata?.turnId === "string" ? event.metadata.turnId : undefined;
    if (event.kind === "approval_request" && approvalId) requestTurns.set(approvalId, turnId);
    if (event.kind === "approval_response" && approvalId) {
      const decision = typeof event.metadata?.decision === "string" ? event.metadata.decision : "recorded";
      decisions.set(approvalId, decision);
    }
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
    if (turnId && (event.kind === "error" || (event.kind === "lifecycle" && status.startsWith("turn-")))) terminalTurns.add(turnId);
  }
  const states = new Map<string, ApprovalDisplayState>();
  for (const [approvalId, turnId] of requestTurns) {
    const decision = decisions.get(approvalId);
    states.set(approvalId, { decision, expired: !decision && Boolean(turnId && terminalTurns.has(turnId)) });
  }
  return states;
}

/** turnId → 原始 prompt（失败轮次重试时以新 clientMessageId 重发原文，frontend-spec §5.2） */
export function buildTurnPrompts(events: TranscriptEvent[]): Map<string, string> {
  const prompts = new Map<string, string>();
  for (const event of events) {
    const turnId = typeof event.metadata?.turnId === "string" ? event.metadata.turnId : undefined;
    if (event.kind === "user_message" && turnId) prompts.set(turnId, event.raw);
  }
  return prompts;
}

export function sanitizePtyOutput(value: string) {
  const withoutEscapeSequences = value
    .replace(/\u001b\](?:[\s\S]*?)(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b(?:[ -/]*[@-~]|.)/g, "")
    .replace(/\u001b/g, "");

  const normalized = normalizeCarriageReturns(withoutEscapeSequences)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function normalizeCarriageReturns(value: string) {
  let result = "";
  let line = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\r") {
      if (value[index + 1] !== "\n") line = "";
      continue;
    }
    if (character === "\n") {
      result += `${line}\n`;
      line = "";
      continue;
    }
    if (character === "\b") {
      line = line.slice(0, -1);
      continue;
    }
    line += character;
  }
  return result + line;
}
