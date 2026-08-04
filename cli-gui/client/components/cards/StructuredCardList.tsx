import { Fragment, useMemo } from "react";
import type { ReactNode } from "react";
import type { ApprovalDisplayState, TranscriptDisplayItem } from "../../transcript-display";
import { parseToCards } from "./CardParser";
import { ApprovalCard } from "./ApprovalCard";
import { CodeBlockCard } from "./CodeBlockCard";
import { CommandCard } from "./CommandCard";
import { DiagnosticCard } from "./DiagnosticCard";
import { FileChangeCard } from "./FileChangeCard";
import { MessageCard } from "./MessageCard";
import { ProgressCard } from "./ProgressCard";
import { ShellRunCard } from "./ShellRunCard";
import { ThinkingCard } from "./ThinkingCard";
import { ToolUseCard } from "./ToolUseCard";
import { TurnStatusCard } from "./TurnStatusCard";
import { UsageFootnote } from "./UsageFootnote";
import { UserMessageCard } from "./UserMessageCard";

interface StructuredCardListProps {
  items: TranscriptDisplayItem[];
  /** chatMode=true 用结构化卡片渲染 tool-use/command/file-change/shell-run/approval，其余 fallback；false 全部走 renderFallback（现有 TranscriptMessage） */
  chatMode?: boolean;
  /** 兆底渲染：交由调用方渲染现有 TranscriptMessage（含 retry/approval 逐项接线），避免循环依赖 */
  renderFallback: (item: TranscriptDisplayItem) => ReactNode;
  /** 审批卡片事件回调（dual-mode §11） */
  onApprove?: (approvalId: string, decision: "allow" | "deny") => Promise<void>;
  approvalStates?: Map<string, ApprovalDisplayState>;
  turnPrompts?: Map<string, string>;
  onRetry?: (content: string) => void;
  approvalFallback?: boolean;
  /** 终端切换回调（shell-run 卡片 "在终端查看"） */
  onViewInTerminal?: () => void;
}

/** 卡片列表容器（CardRenderer）：按解析出的卡片类型分发到对应卡片组件（issue-051 + dual-mode §11） */
export function StructuredCardList({ items, chatMode, renderFallback, onApprove, approvalStates, turnPrompts, onRetry, approvalFallback, onViewInTerminal }: StructuredCardListProps) {
  const cards = useMemo(() => parseToCards(items), [items]);
  if (!chatMode) return <>{items.map((item) => <Fragment key={item.id}>{renderFallback(item)}</Fragment>)}</>;
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return <>{cards.map((card) => {
    if (card.type === "user-message") return <UserMessageCard key={card.id} card={card} />;
    if (card.type === "message") return <MessageCard key={card.id} card={card} />;
    if (card.type === "thinking") return <ThinkingCard key={card.id} card={card} />;
    if (card.type === "code-block") return <CodeBlockCard key={card.id} card={card} />;
    if (card.type === "tool-use") return <ToolUseCard key={card.id} card={card} />;
    if (card.type === "usage") return <UsageFootnote key={card.id} card={card} />;
    if (card.type === "command") return <CommandCard key={card.id} card={card} />;
    if (card.type === "file-change") return <FileChangeCard key={card.id} card={card} />;
    if (card.type === "progress") return <ProgressCard key={card.id} card={card} />;
    if (card.type === "turn-status") {
      const prompt = card.turnId ? turnPrompts?.get(card.turnId) : undefined;
      return <TurnStatusCard key={card.id} card={card} onRetry={onRetry && prompt ? () => onRetry(prompt) : undefined} fallbackHint={approvalFallback && card.eventKind === "error" && Boolean(card.turnId)} />;
    }
    if (card.type === "diagnostic") return <DiagnosticCard key={card.id} card={card} />;
    if (card.type === "shell-run") return <ShellRunCard key={card.id} card={card} onViewInTerminal={onViewInTerminal} />;
    if (card.type === "approval") {
      const approvalId = typeof card.metadata?.approvalId === "string" ? card.metadata.approvalId : card.id;
      const approval = approvalStates?.get(approvalId);
      return <ApprovalCard key={card.id} card={card} decision={approval?.decision} expired={approval?.expired} onRespond={onApprove ? (decision) => onApprove(approvalId, decision) : undefined} />;
    }
    const fallback = itemsById.get(card.id.split(":")[0]);
    return fallback ? <Fragment key={card.id}>{renderFallback(fallback)}</Fragment> : null;
  })}</>;
}
