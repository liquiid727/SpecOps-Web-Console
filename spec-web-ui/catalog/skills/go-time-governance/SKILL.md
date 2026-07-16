---
name: go-time-governance
description: Use when a Go backend task touches time fields, clock sources, expiration logic, TTLs, scheduled jobs, database timestamps, time serialization, fake clocks, or tests that depend on the current time.
version: 1.0.0
category: governance
tags:
  - time
  - clock
  - timezone
  - ttl
  - reusable
---

# go-time-governance — Go 后端时间治理

这是仓库级横切治理 skill，用来统一 Go 后端的时间源、时区边界、数据库时间字段、过期/TTL 语义、定时任务时间窗口，以及测试中的可控时间。

它适用于：

- 新增或修改 `time.Time` / `*time.Time` / `sql.NullTime` 字段
- 新增过期时间、有效期、TTL、重试窗口、幂等窗口、状态流转时间
- 新增定时任务、延迟任务、超时、轮询或后台清理逻辑
- 审查 `time.Now()` 是否应该替换为 `Clock` 注入
- 审查数据库时间精度、零值、空值、infinity/out-of-range year
- 编写依赖当前时间的单测、集成测试或回放测试

它不负责：

- API request/response 模型与 Swagger 契约；那部分交给 `api-contract-governance`
- 错误链路和日志字段裁决；那部分交给 `error-logging-governance`
- 业务真相归属或 DDD 建模裁决；那部分交给 `ddd-layering-governance`

## 读取顺序

1. 项目的工程约束文档（如 `AGENTS.md`）
2. 当前项目已有 clock/time helper、配置、model、migration 与测试约定
3. 涉及时钟源或业务过期判断时读 `references/clock-and-business-time.md`
4. 涉及 DB/API 时间边界时读 `references/storage-and-serialization.md`
5. 审查或补充检查时读 `references/review-checklist.md`

## 硬性规则

- 业务运行逻辑不要散落 `time.Now()`；可测试的业务时间判断优先通过 `Clock` 或等价时间源注入
- 存储与跨服务传输默认使用 UTC；展示层本地化不反向污染 domain/application
- API 输出时间遵循 `api-contract-governance`：UTC RFC3339 字符串，异常 DB 时间通过 response-layer helper 处理
- 过期、TTL、重试窗口、幂等窗口必须写清 owner、起算点、结束条件和精度要求
- 数据库时间字段要明确 zero/null/infinity 行为，不把 Go 零值时间当成业务缺省值
- 测试不得依赖真实当前时间或 `time.Sleep` 稳定性；优先使用 fake clock、固定时间或可控 ticker
- 定时任务与后台循环必须支持 context cancellation，避免不可控 goroutine 和无法收敛的测试

## 角色专属动作

- 判断某段逻辑是否需要 `Clock` 注入
- 判断时间字段应为必填、optional、nullable，还是 response-layer `SafeTime`
- 判断过期/TTL 语义是否有明确 owner 与起算点
- 审查 DB 时间精度、时区、零值、空值和 infinity 风险
- 审查时间相关测试是否可重复、可回放、无真实等待

## 输出要求

输出应尽量包含：

- 时间源风险点
- 字段类型和存储建议
- UTC / RFC3339 / 本地化边界
- 过期、TTL、定时任务或重试窗口的 owner 与起算点
- fake clock 或固定时间测试建议
- 需要同步的 API 契约、migration 或项目文档
