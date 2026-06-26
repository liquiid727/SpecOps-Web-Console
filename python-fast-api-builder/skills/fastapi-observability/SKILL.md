---
name: fastapi-observability
description: Design structured logging, tracing, metrics, correlation IDs, and operational diagnostics for FastAPI services. Use when adding or reviewing JSON logs, OpenTelemetry instrumentation, latency measurement, request correlation, or production debugging hooks for API and agent systems.
---

# FastAPI Observability

用这个 skill 定义 FastAPI 服务的日志、追踪和指标，不要让排障依赖手工 grep 文本日志。

## 默认目标

- 请求链路可追踪
- 错误可定位
- 核心延迟可观测
- Agent 运行成本可计量

## 优先级

1. 结构化日志
2. `request_id` / `trace_id` 贯通
3. 关键接口延迟与错误率
4. Agent 运行时指标

## 先读哪些资料

- 日志字段：`references/logging-schema.md`
- Trace 与 Metrics：`references/telemetry-baseline.md`
- Agent 观测建议：`references/agent-observability.md`

## 输出要求

至少给出：

- 日志字段清单
- 中间件或依赖注入挂载点
- 关键指标列表
- 追踪链路边界
