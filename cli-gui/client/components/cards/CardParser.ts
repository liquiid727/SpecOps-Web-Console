import type { TranscriptDisplayItem } from "../../transcript-display";
import type { CardType, StructuredCardData } from "./types";

/** 事件 → 卡片类型分类（cli-structured-tui-adaptation spec §1.2 + dual-mode §11） */
export function classifyCard(kind: string, metadata: Record<string, any> | undefined, componentType?: string): CardType {
  if (componentType) {
    const mapped = componentTypeToCardType(componentType);
    if (mapped) return mapped;
  }
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
  if (kind === "lifecycle" || kind === "error" || kind === "approval_response") return "turn-status";
  return "unknown";
}

/** 解析管线：TranscriptDisplayItem[] → StructuredCardData[]（GUI 逻辑卡片，可拆分/合并同轮事件） */
export function parseToCards(items: TranscriptDisplayItem[]): StructuredCardData[] {
  const cards: StructuredCardData[] = [];
  for (const item of items) {
    const { event } = item;
    const metadata = event.metadata as Record<string, any> | undefined;
    const componentType = typeof event.component?.type === "string" ? event.component.type : undefined;
    const base: Omit<StructuredCardData, "type" | "id" | "content" | "raw"> = {
      turnId: typeof metadata?.turnId === "string" ? metadata.turnId : undefined,
      timestamp: event.occurredAt,
      metadata: mergeComponentMetadata(metadata, event.component),
      eventKind: event.kind as string
    };
    if (event.kind === "assistant_message" && componentType !== "thinking" && componentType !== "code_block") {
      const parts = splitAssistantContent(item.content);
      for (const [index, part] of parts.entries()) {
        cards.push({
          ...base,
          type: part.type,
          id: index === 0 ? item.id : `${item.id}:${part.type}-${index}`,
          content: part.content,
          raw: part.content,
          metadata: part.type === "code-block" ? { ...base.metadata, language: part.language } : base.metadata
        });
      }
      continue;
    }
    const type = classifyCard(event.kind as string, metadata, componentType);
    const previous = cards.at(-1);
    if (type === "turn-status" && base.turnId && previous?.type === "turn-status" && previous.turnId === base.turnId) {
      previous.content = [previous.content, item.content].filter(Boolean).join("\n\n");
      previous.raw = [previous.raw, item.raw].filter(Boolean).join("\n\n");
      previous.metadata = { ...previous.metadata, ...base.metadata };
      continue;
    }
    cards.push({
      ...base,
      type,
      id: item.id,
      content: event.component?.text ?? item.content,
      raw: item.raw
    });
  }
  return cards;
}

/** 卡片时间戳短格式（与 TranscriptPanel formatTime 保持一致的展示口径） */
export function formatCardTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function componentTypeToCardType(value: string): CardType | undefined {
  switch (value) {
    case "user_message": return "user-message";
    case "message": return "message";
    case "thinking": return "thinking";
    case "code_block": return "code-block";
    case "tool": return "tool-use";
    case "usage": return "usage";
    case "command": return "command";
    case "file_change": return "file-change";
    case "approval": return "approval";
    case "progress": return "progress";
    case "turn_status": return "turn-status";
    case "diagnostic": return "diagnostic";
    case "shell_output": return "shell-run";
    default: return undefined;
  }
}

function mergeComponentMetadata(metadata: Record<string, any> | undefined, component: TranscriptDisplayItem["event"]["component"]) {
  if (!component) return metadata;
  return {
    ...metadata,
    componentType: component.type,
    ...(component.title ? { title: component.title } : {}),
    ...(component.language ? { language: component.language } : {}),
    ...(component.status ? { status: component.status } : {}),
    ...(component.data ? component.data : {})
  };
}

function splitAssistantContent(content: string): Array<{ type: "message" | "code-block"; content: string; language?: string }> {
  const parts: Array<{ type: "message" | "code-block"; content: string; language?: string }> = [];
  const pattern = /```([a-zA-Z0-9_+-]*)[^\n]*\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const before = content.slice(cursor, match.index).trim();
    if (before) parts.push({ type: "message", content: before });
    parts.push({ type: "code-block", content: match[2] ?? "", language: match[1] || undefined });
    cursor = pattern.lastIndex;
  }
  const after = content.slice(cursor).trim();
  if (after) parts.push({ type: "message", content: after });
  return parts.length ? parts : [{ type: "message", content }];
}
