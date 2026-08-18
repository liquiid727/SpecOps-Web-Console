# Hide PromptComposer when terminal view is active

## Description
When a session is in terminal interaction mode (`interactionMode === "terminal"`) and the center view is set to "terminal", the bottom PromptComposer input bar should be hidden. Currently, the composer remains visible even when the user has switched to the raw terminal tab, which is redundant since terminal input goes directly through the PTY.

## Problem
从截图可见，切换到"终端"tab 后底部的输入栏（含工作模式选择器、权限/模型选择器、文本输入框）仍然显示。这在终端模式下是多余的，占用了宝贵的垂直空间。

## Root Cause
`ChatView.tsx` 第 203 行的 `.chat-composer` div 无条件渲染 PromptComposer，没有根据 `centerView` 和 `interactionMode` 进行条件判断。

## Proposed Fix
在 `ChatView.tsx` 中，当 `centerView === "terminal" && !chatSession` 时隐藏整个 `.chat-composer` 区域：

```tsx
// ChatView.tsx L202-L222
{!(centerView === "terminal" && !chatSession) && (
  <div className="chat-composer">
    {chatFeatureOff && <p className="composer-disabled-note" role="note">{t("chatComposerDisabled")}</p>}
    <PromptComposer ... />
  </div>
)}
```

注意：chat 模式（`chatSession === true`）下即使切换到 terminal tab，composer 仍需保留（用户可能在查看终端回放的同时发送消息）。

## Acceptance Criteria
- [x] Terminal 交互模式 + terminal 视图时，PromptComposer 完全隐藏
- [x] Chat 交互模式 + terminal 视图时，PromptComposer 保持可见
- [x] 切换回 transcript 视图时，PromptComposer 重新出现
- [x] 终端区域获得隐藏 composer 释放的垂直空间

## Affected Files
- `cli-gui/client/components/ChatView.tsx`

## Dependencies
None

## Type
bug-fix / ui

## Priority
high

## SPEC Reference
Frontend-spec §2; console-gaps SPEC §1
