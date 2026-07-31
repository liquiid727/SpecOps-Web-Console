# 实现 Session 数据模型与状态持久化

## Description

实现 Session 数据模型，使 Session 关联 Workspace 和 CLI Profile，并持久化配置与生命周期状态。

## Acceptance Criteria

- [x] Session 关联 Workspace 和 CLI Profile。
- [x] 支持名称、创建时间、最近活跃时间和状态。
- [x] 支持 starting、running、stopped、error。
- [x] 服务重启后运行态正确标记为 stopped。

## Dependencies

Issue #2, Issue #3

## Type

backend

## Priority

high

## Source

- Traceability: legacy/unmapped
