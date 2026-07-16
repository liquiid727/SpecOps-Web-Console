---
name: fastapi-testing-gates
description: Define layered testing strategy, contract checks, async integration tests, release gates, and regression expectations for FastAPI services. Use when creating test plans, hardening a FastAPI codebase, setting CI quality gates, or deciding what must pass before a backend change can ship.
---

# FastAPI Testing Gates

用这个 skill 设计 FastAPI 项目的测试层次和发布门禁，避免“只有几个接口测试就上线”。

## 分层

- `unit`
- `integration`
- `contract`
- `e2e`

## 原则

- 先测试稳定边界，再测试实现细节。
- Agent 项目重点补：
  - 状态流转
  - 幂等
  - 重试
  - 超时
  - 流式输出

## 先读哪些资料

- 测试分层：`references/test-pyramid.md`
- CI 门禁：`references/release-gates.md`
- Agent 特有场景：`references/agent-test-focus.md`

## 输出要求

至少明确：

- 每层测试覆盖对象
- 关键回归场景
- 发布前必须通过的命令
- 哪些测试可以 fake，哪些必须真连
