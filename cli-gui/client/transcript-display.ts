import type { TranscriptEvent } from "../shared/types";

export interface TranscriptDisplayItem {
  id: string;
  event: TranscriptEvent;
  content: string;
  raw: string;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// SessionEventReducer（dual-mode 设计 §7.2）：事件序列 → GUI View Model
// ---------------------------------------------------------------------------

export interface ReducedMessage {
  id: string;
  turnId?: string;
  kind: "user" | "assistant";
  content: string;
  occurredAt: string;
}

export interface ReducedToolCall {
  id: string;
  turnId?: string;
  tool: string;
  raw: string;
  occurredAt: string;
}

export interface ReducedShellRun {
  id: string;
  turnId?: string;
  command: string;
  exitCode?: number;
  output: string;
  occurredAt: string;
}

export interface ReducedFileChange {
  path: string;
  eventId: string;
  turnId?: string;
  occurredAt: string;
}

export interface ReducedApproval {
  id: string;
  approvalId: string;
  turnId?: string;
  decision?: string;
  expired: boolean;
  occurredAt: string;
}

export interface SessionViewModel {
  messagesById: Map<string, ReducedMessage>;
  toolCallsById: Map<string, ReducedToolCall>;
  shellRunsById: Map<string, ReducedShellRun>;
  fileChangesByPath: Map<string, ReducedFileChange>;
  approvalsById: Map<string, ReducedApproval>;
  currentStatus: SessionLifecycleStatus;
}

/** 从原始事件序列归并为 GUI 视图模型（dual-mode §7.2） */
export function reduceSessionEvents(events: TranscriptEvent[]): SessionViewModel {
  const messagesById = new Map<string, ReducedMessage>();
  const toolCallsById = new Map<string, ReducedToolCall>();
  const shellRunsById = new Map<string, ReducedShellRun>();
  const fileChangesByPath = new Map<string, ReducedFileChange>();
  const approvalsById = new Map<string, ReducedApproval>();
  const terminalTurns = new Set<string>();

  for (const event of events) {
    const turnId = typeof event.metadata?.turnId === "string" ? event.metadata.turnId : undefined;
    const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";

    if (event.kind === "user_message") {
      messagesById.set(event.id, { id: event.id, turnId, kind: "user", content: event.raw, occurredAt: event.occurredAt });
    } else if (event.kind === "assistant_message") {
      // 同 turnId 连续 assistant 合并
      const existing = turnId ? [...messagesById.values()].reverse().find((msg) => msg.turnId === turnId && msg.kind === "assistant") : undefined;
      if (existing) {
        existing.content = `${existing.content}\n\n${event.raw}`;
      } else {
        messagesById.set(event.id, { id: event.id, turnId, kind: "assistant", content: event.raw, occurredAt: event.occurredAt });
      }
    } else if (event.kind === "tool_activity") {
      const tool = typeof event.metadata?.tool === "string" ? event.metadata.tool : event.raw;
      toolCallsById.set(event.id, { id: event.id, turnId, tool, raw: event.raw, occurredAt: event.occurredAt });
    } else if (event.kind === "file_change") {
      const path = typeof event.metadata?.path === "string" ? event.metadata.path : event.raw;
      fileChangesByPath.set(path, { path, eventId: event.id, turnId, occurredAt: event.occurredAt });
    } else if (event.kind === "approval_request") {
      const approvalId = typeof event.metadata?.approvalId === "string" ? event.metadata.approvalId : event.id;
      approvalsById.set(approvalId, { id: event.id, approvalId, turnId, decision: undefined, expired: false, occurredAt: event.occurredAt });
    } else if (event.kind === "approval_response") {
      const approvalId = typeof event.metadata?.approvalId === "string" ? event.metadata.approvalId : "";
      const existing = approvalsById.get(approvalId);
      if (existing) existing.decision = typeof event.metadata?.decision === "string" ? event.metadata.decision : "recorded";
    } else if (event.kind === "pty_output") {
      // pty_output 归入 shellRuns：按 turnId 分组合并（终端会话 GUI 视图消费）
      const groupKey = turnId ?? "__pty__";
      const existing = shellRunsById.get(groupKey);
      if (existing) {
        existing.output += event.raw;
      } else {
        shellRunsById.set(groupKey, { id: event.id, turnId, command: "", output: event.raw, occurredAt: event.occurredAt });
      }
    }

    // 终态轮次标记
    if (turnId && (event.kind === "error" || (event.kind === "lifecycle" && status.startsWith("turn-")))) {
      terminalTurns.add(turnId);
    }
  }

  // 过期审批标记
  for (const approval of approvalsById.values()) {
    if (!approval.decision && approval.turnId && terminalTurns.has(approval.turnId)) {
      approval.expired = true;
    }
  }

  return {
    messagesById,
    toolCallsById,
    shellRunsById,
    fileChangesByPath,
    approvalsById,
    currentStatus: deriveSessionLifecycleStatus(events, "idle")
  };
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
 *
 * PTY 输出按轮次增量投影（dual-mode §9/§11）：全会话 PTY 字节累计进同一屏幕模拟，
 * 每组卡片只展示相对上一轮屏幕新增的内容（行级前缀/后缀对齐），并抑制紧邻用户
 * 消息的终端回显行——GUI 呼应对话流而非整屏终端快照；无新增内容的组（spinner
 * 重绘、视图切换重绘）不产生卡片。完整字节流仍由 Terminal 视图呈现（dual-mode §4.1）。
 *
 * lifecycle 事件：chat 模式与非 chat 模式都不入消息流（非中断态），仅保留给顶部状态条读；
 * 中断态（turn-failed/turn-cancelled）始终保留在消息流便于重试。
 */
export function projectTranscriptEvents(events: TranscriptEvent[], options: ProjectTranscriptOptions = {}): TranscriptDisplayItem[] {
  const projected: TranscriptDisplayItem[] = [];
  let ptyGroup: TranscriptEvent[] = [];
  let ptyHistory = "";
  let previousScreen: string[] = [];
  let lastUserPrompt = "";

  function flushPtyGroup() {
    if (!ptyGroup.length) return;
    const raw = ptyGroup.map((event) => event.raw).join("");
    ptyHistory += raw;
    const screen = sanitizePtyOutput(ptyHistory);
    const screenLines = screen ? screen.split("\n") : [];
    const content = diffTerminalTurn(previousScreen, screenLines, lastUserPrompt);
    previousScreen = screenLines;
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
    if (event.kind === "user_message") lastUserPrompt = event.raw;
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

/**
 * 轮次增量（dual-mode §9/§11）：GUI 卡片只展示本轮新增的终端内容，而非整屏快照。
 * - 与上一轮屏幕做行级公共前缀/后缀对齐，取中间新增段（未变的历史与未变的底部 chrome 都被剪掉）
 * - 抑制头部的用户消息终端回显行（提示符 + 原文），避免与用户气泡重复
 * - 增量全部是上一屏已出现过的行（状态栏/输入框重排）时视为纯重绘，不产生内容
 * 纯行对齐与回显抑制，与厂商无关（dual-mode §7.2）。
 */
function diffTerminalTurn(previous: string[], current: string[], userPrompt: string): string {
  let prefix = 0;
  while (prefix < previous.length && prefix < current.length && previous[prefix] === current[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < current.length - prefix
    && previous[previous.length - 1 - suffix] === current[current.length - 1 - suffix]) suffix += 1;
  const delta = current.slice(prefix, current.length - suffix);
  const promptLines = new Set(userPrompt.split("\n").map((line) => line.trim()).filter(Boolean));
  let start = 0;
  while (start < delta.length) {
    const line = delta[start].trim();
    if (!line) { start += 1; continue; }
    // 去掉提示符前缀（› ❯ > 等非字母数字开头）后与用户原文逐行比对
    const bare = line.replace(/^[^\p{L}\p{N}]+\s*/u, "");
    if (promptLines.size && (promptLines.has(line) || promptLines.has(bare))) { start += 1; continue; }
    break;
  }
  const remaining = delta.slice(start);
  const seen = new Set(previous.map((line) => line.trim()));
  if (previous.length && remaining.every((line) => !line.trim() || seen.has(line.trim()))) return "";
  return remaining.join("\n").trim();
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

/**
 * 展示级 TUI 噪音清洗（dual-mode §11/§12）：仅用于 GUI 卡片预览，不修改事件 raw。
 * - 去掉纯边框/分隔线行（box-drawing、竖线组合、盲文 spinner）
 * - 行内边框绘制字符替换为空格后修剪行尾
 * - 折叠 TUI 重绘产生的连续重复行
 * 与厂商无关：只处理终端绘制残留，不做任何语义解析（dual-mode §7.2 禁止事项）。
 */
export function cleanPtyPreview(value: string): string {
  const kept: string[] = [];
  for (const line of value.split("\n")) {
    if (line.trim() && isTerminalChromeLine(line)) continue;
    const cleaned = line
      .replace(/[\u2500-\u259f\u2b80-\u2bff\u2800-\u28ff]+/g, " ")
      .replace(/[ \t]+$/g, "");
    if (kept.length && kept[kept.length - 1].trim() === cleaned.trim() && cleaned.trim()) continue;
    kept.push(cleaned);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 纯终端 chrome 行：仅由边框绘制字符、竖线、破折号、提示符、盲文 spinner 与空白组成 */
function isTerminalChromeLine(line: string) {
  return /^[\s|｜•·‣—–\-=~_*>$#%›❯\u2500-\u259f\u2b80-\u2bff\u2800-\u28ff]+$/.test(line);
}

/**
 * PTY 输出净化（dual-mode §12）：用轻量屏幕缓冲模拟等效执行光标定位（CUP/CUU/CUD/CHA/VPA）、
 * 清行（EL）、清屏（ED）与滚动区域（DECSTBM/SU/SD/IL/DL）序列，输出最终屏幕文本。
 * 全屏 TUI（如 spinner 动画）的重绘帧因此互相覆盖而非叠加成碎片；被滚出顶部区域的行
 * 进入回滚缓冲保留历史。与厂商无关：纯终端语义，不做任何内容解析。
 */
export function sanitizePtyOutput(value: string) {
  const normalized = renderPtyScreen(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

/** 屏幕缓冲模拟：回滚缓冲 + 可增长网格 + 光标行列 + 滚动区域（regionBottom = -1 表示跟随网格末行） */
function renderPtyScreen(value: string): string {
  const scrollback: string[] = [];
  let grid: string[] = [""];
  let row = 0;
  let col = 0;
  let regionTop = 0;
  let regionBottom = -1;

  const bottomRow = () => (regionBottom >= 0 ? regionBottom : Math.max(grid.length - 1, row));

  function ensureRow(target: number) {
    while (grid.length <= target) grid.push("");
  }

  function writeChar(character: string) {
    ensureRow(row);
    const line = grid[row];
    grid[row] = line.length < col
      ? line + " ".repeat(col - line.length) + character
      : line.slice(0, col) + character + line.slice(col + 1);
    col += 1;
  }

  /** 区域上滚一行：顶部行滚出——区域顶在屏幕顶时进入回滚缓冲（终端 scrollback 语义），否则丢弃 */
  function scrollUp() {
    const bottom = bottomRow();
    ensureRow(bottom);
    if (regionTop === 0) scrollback.push(grid[regionTop] ?? "");
    grid.splice(regionTop, 1);
    grid.splice(bottom, 0, "");
  }

  function scrollDown() {
    const bottom = bottomRow();
    ensureRow(bottom);
    grid.splice(bottom, 1);
    grid.splice(regionTop, 0, "");
  }

  function lineFeed() {
    if (regionBottom >= 0 && row >= bottomRow()) {
      scrollUp();
      return;
    }
    row += 1;
    ensureRow(row);
  }

  function handleCsi(params: string, final: string) {
    if (params.startsWith("?")) return; // 私有模式（光标显隐/交替屏/括号粘贴）不影响文本内容
    const values = params.split(";").map((part) => Number.parseInt(part, 10));
    const first = Number.isFinite(values[0]) ? values[0] : undefined;
    const count = Math.max(first ?? 1, 1);
    switch (final) {
      case "A": row = Math.max(0, row - count); break;
      case "B": row += count; ensureRow(row); break;
      case "C": col += count; break;
      case "D": col = Math.max(0, col - count); break;
      case "E": row += count; ensureRow(row); col = 0; break;
      case "F": row = Math.max(0, row - count); col = 0; break;
      case "G": col = count - 1; break;
      case "d": row = count - 1; ensureRow(row); break;
      case "H":
      case "f":
        row = count - 1;
        col = Math.max((Number.isFinite(values[1]) ? values[1]! : 1) - 1, 0);
        ensureRow(row);
        break;
      case "J":
        if (!first || first === 0) {
          grid[row] = (grid[row] ?? "").slice(0, col);
          grid = grid.slice(0, row + 1);
        } else if (first === 1) {
          for (let index = 0; index < row; index += 1) grid[index] = "";
          grid[row] = " ".repeat(Math.min(col + 1, (grid[row] ?? "").length)) + (grid[row] ?? "").slice(col + 1);
        } else {
          grid = [];
          ensureRow(row);
        }
        break;
      case "K": {
        const line = grid[row] ?? "";
        if (!first || first === 0) grid[row] = line.slice(0, col);
        else if (first === 1) grid[row] = " ".repeat(Math.min(col + 1, line.length)) + line.slice(col + 1);
        else grid[row] = "";
        break;
      }
      case "L": for (let index = 0; index < count; index += 1) { grid.splice(row, 0, ""); if (regionBottom >= 0) grid.splice(bottomRow() + 1, 1); } break;
      case "M": for (let index = 0; index < count; index += 1) { grid.splice(row, 1); if (regionBottom >= 0) grid.splice(bottomRow(), 0, ""); } break;
      case "S": for (let index = 0; index < count; index += 1) scrollUp(); break;
      case "T": for (let index = 0; index < count; index += 1) scrollDown(); break;
      case "r":
        regionTop = Math.max((first ?? 1) - 1, 0);
        regionBottom = Number.isFinite(values[1]) ? values[1]! - 1 : -1;
        row = 0;
        col = 0;
        break;
      default: break; // SGR 颜色、模式开关等不影响文本内容
    }
  }

  let index = 0;
  while (index < value.length) {
    const character = value[index];
    if (character === "\u001b") {
      const next = value[index + 1];
      if (next === "[") {
        let end = index + 2;
        while (end < value.length && !/[@-~]/.test(value[end])) end += 1;
        if (end >= value.length) break; // 序列被截断（chunk 已在上游拼接，正常不会发生）
        handleCsi(value.slice(index + 2, end), value[end]);
        index = end + 1;
        continue;
      }
      if (next === "]") {
        let end = index + 2;
        while (end < value.length && value[end] !== "\u0007" && !(value[end] === "\u001b" && value[end + 1] === "\\")) end += 1;
        index = value[end] === "\u0007" ? end + 1 : end + 2;
        continue;
      }
      index += 2; // 其它 ESC 序列：ESC + 单字符
      continue;
    }
    if (character === "\r") { col = 0; index += 1; continue; }
    if (character === "\n") { lineFeed(); col = 0; index += 1; continue; }
    if (character === "\b") { col = Math.max(0, col - 1); index += 1; continue; }
    if (character === "\t") { col += 8 - (col % 8); index += 1; continue; }
    if (character < " ") { index += 1; continue; }
    writeChar(character);
    index += 1;
  }

  return [...scrollback, ...grid].join("\n");
}
