import { Fragment, useMemo } from "react";
import type { ReactNode } from "react";
import type { TranscriptDisplayItem } from "../../transcript-display";
import { parseToCards } from "./CardParser";
import { ApprovalCard } from "./ApprovalCard";
import { CommandCard } from "./CommandCard";
import { FileChangeCard } from "./FileChangeCard";
import { ShellRunCard } from "./ShellRunCard";
import { ToolUseCard } from "./ToolUseCard";
import { UsageFootnote } from "./UsageFootnote";

interface StructuredCardListProps {
  items: TranscriptDisplayItem[];
  /** chatMode=true 用结构化卡片渲染 tool-use/command/file-change/shell-run/approval，其余 fallback；false 全部走 renderFallback（现有 TranscriptMessage） */
  chatMode?: boolean;
  /** 兆底渲染：交由调用方渲染现有 TranscriptMessage（含 retry/approval 逐项接线），避免循环依赖 */
  renderFallback: (item: TranscriptDisplayItem) => ReactNode;
  /** 审批卡片事件回调（dual-mode §11） */
  onApprove?: (approvalId: string, decision: "allow" | "deny") => Promise<void>;
  /** 终端切换回调（shell-run 卡片 "在终端查看"） */
  onViewInTerminal?: () => void;
}

/** 卡片列表容器（CardRenderer）：按解析出的卡片类型分发到对应卡片组件（issue-051 + dual-mode §11） */
export function StructuredCardList({ items, chatMode, renderFallback, onApprove, onViewInTerminal }: StructuredCardListProps) {
  const cards = useMemo(() => parseToCards(items), [items]);
  if (!chatMode) return <>{items.map((item) => <Fragment key={item.id}>{renderFallback(item)}</Fragment>)}</>;
  return <>{cards.map((card, index) => {
    if (card.type === "tool-use") return <ToolUseCard key={card.id} card={card} />;
    if (card.type === "usage") return <UsageFootnote key={card.id} card={card} />;
    if (card.type === "command") return <CommandCard key={card.id} card={card} />;
    if (card.type === "file-change") return <FileChangeCard key={card.id} card={card} />;
    if (card.type === "shell-run") return <ShellRunCard key={card.id} card={card} onViewInTerminal={onViewInTerminal} />;
    if (card.type === "approval") {
      const approvalId = typeof card.metadata?.approvalId === "string" ? card.metadata.approvalId : card.id;
      return <ApprovalCard key={card.id} card={card} onRespond={onApprove ? (decision) => onApprove(approvalId, decision) : undefined} />;
    }
    return <Fragment key={card.id}>{renderFallback(items[index])}</Fragment>;
  })}</>;
}
