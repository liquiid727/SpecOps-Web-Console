import type { TranscriptEvent } from "../shared/types";

export interface TranscriptDisplayItem {
  id: string;
  event: TranscriptEvent;
  content: string;
  raw: string;
  truncated: boolean;
}

/**
 * Build the readable session projection without changing the raw transcript.
 * PTY chunks are transport data, so adjacent chunks are joined before escape
 * sequences are removed. This also handles an ANSI sequence split at a chunk
 * boundary.
 */
export function projectTranscriptEvents(events: TranscriptEvent[]): TranscriptDisplayItem[] {
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
