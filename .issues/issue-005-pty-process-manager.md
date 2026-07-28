# 实现 PTY 进程管理

## Description

为每个 Session 实现独立 PTY 和 CLI 进程生命周期管理，支持基本终端控制以及多会话并发。

## Acceptance Criteria

- [ ] 每个 Session 使用独立 PTY。
- [ ] 支持启动、输入、Ctrl+C、resize 和停止。
- [ ] 捕获退出码和异常退出。
- [ ] 至少支持 4 个并发 Session。

## Dependencies

Issue #1, Issue #4

## Type

backend

## Priority

high

## Source

tasks/prd-cli-gui.md
