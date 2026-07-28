# 完善错误处理、安全边界与只读模式

## Description

补齐 MVP01 的错误处理和安全边界，确保本地命令启动可控，并保证只读部署不会尝试启动本地进程。

## Acceptance Criteria

- [ ] 处理 CLI 不存在、PTY 创建失败、目录无权限和异常退出。
- [ ] Profile 参数始终按数组传递。
- [ ] 只读模式禁用 Session 写入和本地进程启动。
- [ ] 错误不会影响其他运行中的 Session。
- [ ] 补充相关单元测试和集成测试。

## Dependencies

Issue #2, Issue #3, Issue #5, Issue #8, Issue #9

## Type

fullstack

## Priority

high

## Source

- Traceability: legacy/unmapped
