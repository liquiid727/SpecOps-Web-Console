---
name: api-contract-governance
description: Use when a Go backend task touches interfaces or transport-layer request and response models, handler success payloads, Swagger request or response annotations, API time serialization, SafeTime, or response wrapping rules.
version: 1.0.0
category: governance
tags:
  - api
  - request-response
  - safetime
  - swagger
  - reusable
---

# api-contract-governance — API 契约与响应封装治理

这是仓库级横切治理 skill，用来统一 `interfaces/api` 的 request/response 契约、API 层 `SafeTime` 使用方式，以及 handler/Swagger 的稳定输出规则。

它适用于：

- 新增或修改 `interfaces/api/request` / `interfaces/api/response`
- 把 handler 从 inline request struct 或 `gin.H` 收敛为显式模型
- 审查 Swagger `@Param` / `@Success` 是否仍指向显式 request/response 模型
- 审查 API 输出时间字段是否要使用 `SafeTime` 或 response-layer helper
- 判断横切响应包装应留在共享 response wrapper，还是下沉到具体 context 的 response 包

它不负责：

- 后端时间源、TTL、过期判断、DB 时间精度或 fake clock；那部分交给 `go-time-governance`
- 业务错误链路的规范裁决；那部分交给 `error-logging-governance`
- DDD 业务真相归属或 VO 建模裁决；那部分交给 `ddd-layering-governance`
- 替代整体 reviewer 对完整改动做总体审查

## 读取顺序

1. 项目的工程约束文档（如 `AGENTS.md`）
2. 任务相关 context 的 API 层说明
3. 任务相关 context 的 request/response 目录说明
6. 需要时再读 `references/api-contract-rules.md`
7. 审查或补充检查时读 `references/review-checklist.md`

## 硬性规则

- 每个 endpoint 都必须有显式 request / response model
- 成功响应禁止回退成 `gin.H`、`map[string]any` 或匿名 map
- handler 中禁止新增 inline request struct
- Swagger `@Param` / `@Success` 必须指向 request/response 包里的显式模型
- `interfaces` 只做协议解析、response rendering 与 transport error mapping，不承载业务合法性真相
- 领域 / 应用 / model 层的 optional time 与时间源治理遵循 `go-time-governance`
- response 层对可能出现 DB infinity / out-of-range year 的字段统一使用 `SafeTime`
- API 时间字段只允许 UTC RFC3339 字符串；禁止 Unix 时间戳和无时区 datetime
- 共享 response wrapper 只保留横切响应包装；业务 DTO 必须放在各 context 的 response 包

## 角色专属动作

- 判断 request/response 模型是否落在正确的 context 目录
- 判断 API response 时间字段是否需要 `SafeTime` / `NewSafeTimePtr`
- 判断某个成功响应是否错误地退化成 map 结构
- 判断 transport wrapper 该放在 shared 还是具体 context response 包
- 审查 Swagger 注解是否仍与代码结构一致

## 输出要求

输出应尽量包含：

- 契约风险点
- 需要调整的 request/response 落点
- API 层 `SafeTime` 使用建议
- Swagger 同步要求
- 需要同步的项目文档
