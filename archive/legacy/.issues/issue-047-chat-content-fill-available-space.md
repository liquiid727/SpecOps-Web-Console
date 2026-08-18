# Fix chat content area not filling available space

## Description
Chat 消息列表（`.chat-messages`）没有充分利用可用高度，内容区域存在多余留白。消息列表应铺满中间区域，transcript-list 宽度在大屏下也不应受限于 880px 的硬限制。

## Problem
从截图可见：
1. chat-messages 区域使用 `display: grid; align-content: start`，导致内容不足时底部大片空白
2. `.transcript-list` 宽度被限制为 `min(880px, 100%)`，在宽屏幕下浪费了两侧空间
3. 消息气泡在实际内容较少时不能充分利用可视区域

## Root Cause
`client/styles/qoder.css` L187-188:
```css
.chat-messages { ... display: grid; align-content: start; ... }
.chat-messages > .transcript-list { width: min(880px, 100%); ... margin: 0 auto; }
```

## Proposed Fix

1. `.chat-messages` 保持 flex 列方向，让内部内容自然填充：
```css
.chat-messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
}
```

2. `.transcript-list` 响应式宽度：
```css
.chat-messages > .transcript-list {
  width: 100%;
  max-width: 1080px;  /* 大屏适当约束可读性 */
  min-height: 0;
  flex: 1;
  margin: 0 auto;
  padding-inline: 0;
}
```

3. 在 `responsive.css` 中为窄屏保持紧凑：
```css
@media (max-width: 768px) {
  .chat-messages > .transcript-list { max-width: 100%; }
}
```

## Acceptance Criteria
- [x] Chat 消息在大屏下利用更多水平空间（max-width 从 880px 提升到 1080px）
- [x] 消息列表在内容少时仍然顶部对齐，但区域本身填满可用空间
- [x] 滚动行为保持正常（贴底跟随、上滚暂停）
- [x] 窄屏（<768px）下保持全宽

## Affected Files
- `cli-gui/client/styles/qoder.css`
- `cli-gui/client/styles/responsive.css`

## Dependencies
None

## Type
ui / layout

## Priority
high

## SPEC Reference
Frontend-spec §3.2
