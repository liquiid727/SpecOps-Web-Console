# 实现 Session Manager 实时通信

## Description

建立前端与 Session Manager 之间的实时通信，使前端可以订阅指定 Session 输出并向对应 PTY 发送输入。

## Acceptance Criteria

- [x] 前端可以订阅指定 Session 输出。
- [x] 前端输入只发送到对应 PTY。
- [x] 多个 Session 输出不会串台。
- [x] 连接断开和恢复有明确错误状态。

## Dependencies

Issue #5

## Type

backend/fullstack

## Priority

high

## Source

- Traceability: legacy/unmapped
