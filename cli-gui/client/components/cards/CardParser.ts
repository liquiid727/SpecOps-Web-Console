import type { TranscriptDisplayItem } from "../../transcript-display";
import type { CardType, StructuredCardData } from "./types";

/** 事件 → 卡片类型分类（cli-structured-tui-adaptation spec §1.2 + dual-mode §11） */
export function classifyCard(kind: string, metadata: Record<string, any> | undefined): CardType {
  if (kind === "user_message") return "user-message";
  if (kind === "tool_activity") {
    if (metadata?.tool === "command_execution") return "command";
    // usage 事件（issue-062 normalized usage）低视觉权重注脚，不占整张工具卡
    if (metadata?.vendorType === "usage" || metadata?.tool === "usage") return "usage";
    return "tool-use";
  }
  if (kind === "file_change") return "file-change";
  if (kind === "assistant_message") return "message";
  if (kind === "approval_request") return "approval";
  if (kind === "pty_output") return "shell-run";
  if (kind === "lifecycle") return "lifecycle";
  if (kind === "error") return "error";
  return "unknown";
}

/** 解析管线：TranscriptDisplayItem[] → StructuredCardData[]（与 items 顺序一一对应） */
export function parseToCards(items: TranscriptDisplayItem[]): StructuredCardData[] {
  return items.map((item) => {
    const { event } = item;
    const metadata = event.metadata as Record<string, any> | undefined;
    return {
      type: classifyCard(event.kind as string, metadata),
      id: item.id,
      turnId: typeof metadata?.turnId === "string" ? metadata.turnId : undefined,
      timestamp: event.occurredAt,
      content: item.content,
      raw: item.raw,
      metadata
    };
  });
}

/** 卡片时间戳短格式（与 TranscriptPanel formatTime 保持一致的展示口径） */
export function formatCardTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
