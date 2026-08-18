# 建立本地 Session Manager 运行骨架

## Description

为 MVP01 建立本地 Session Manager 运行骨架，为后续 PTY、持久化和实时通信提供明确模块边界。首个运行形态为 localhost，并区分 workspace/readonly 模式。

## Acceptance Criteria

- [x] 本地服务可启动并监听 localhost。
- [x] 明确区分 workspace/readonly 模式。
- [x] 为 PTY、持久化和实时通信提供独立模块边界。
- [x] 服务异常时返回可理解错误。

## Dependencies

None

## Type

infra/backend

## Priority

high

## Source

- Traceability: legacy/unmapped
