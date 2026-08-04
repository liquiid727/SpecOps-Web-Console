/** 结构化卡片类型（cli-structured-tui-adaptation spec §1.1 + dual-mode §11）：按 component/type + event.kind 分类 */
export type CardType =
  | "user-message"
  | "message"
  | "thinking"
  | "code-block"
  | "tool-use"
  | "usage"
  | "command"
  | "shell-run"
  | "file-change"
  | "approval"
  | "progress"
  | "turn-status"
  | "diagnostic"
  | "unknown";

/** 卡片统一数据结构：CardParser 输出，CardRenderer（StructuredCardList）按 type 分发 */
export interface StructuredCardData {
  type: CardType;
  id: string;
  turnId?: string;
  timestamp: string;
  content: string;
  raw: string;
  metadata?: Record<string, any>;
  eventKind?: string;
}
