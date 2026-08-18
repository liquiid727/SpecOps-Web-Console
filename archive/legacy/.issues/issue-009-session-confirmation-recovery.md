# 实现 Session 创建确认与恢复流程

## Description

实现 Session 的创建确认、启动、恢复和删除交互，确保用户在本地 CLI 启动前能看到完整命令与工作目录。

## Acceptance Criteria

- [x] 创建前显示命令、参数和工作目录。
- [x] 用户确认后才启动 CLI。
- [x] stopped Session 显示恢复操作。
- [x] 恢复复用原 Workspace、Profile 和名称。
- [x] 删除运行中 Session 前要求确认。
- [x] Verify in browser using dev-browser skill。

## Dependencies

Issue #4, Issue #5, Issue #6, Issue #8

## Type

fullstack

## Priority

high

## Source

- Traceability: legacy/unmapped
