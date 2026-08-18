---
name: error-logging-governance
description: Use when a Go backend task touches logging packages, error packages, handler error mapping, structured logging fields, audit logs, or transport-to-domain error conversion rules.
version: 1.0.0
category: governance
tags:
  - error
  - logging
  - errno
  - errcode
  - reusable
---

# error-logging-governance — 错误链路与日志治理

这是仓库级横切治理 skill，用来统一业务错误语义、transport 错误映射、结构化日志字段，以及敏感信息与 bootstrap 日志边界。

它适用于：

- 新增或修改 `pkg/logger`、`pkg/errors`、`pkg/errcode`、`pkg/errno`
- handler / middleware / response 层的错误映射调整
- 新增审计日志、结构化字段或 trace/request 贯通
- 判断某个错误应停留在 `errcode` 还是暴露成 `errno`
- 审查 bootstrap 阶段能否临时使用标准库 `log`

它不负责：

- request/response DTO 与 `SafeTime` 契约；那部分交给 `api-contract-governance`
- 业务规则本身的 DDD 真相归属；那部分交给 `ddd-layering-governance`
- 替代整体 reviewer 对整体改动做最终结论

## 读取顺序

1. 项目的工程约束文档（如 `AGENTS.md`）
2. 当前项目的错误包或错误约定文档
3. 当前项目的日志包或日志约定文档
4. 需要时读 `references/error-chain-rules.md`
5. 需要时读 `references/logging-rules.md`
6. 审查或补充检查时读 `references/review-checklist.md`

## 硬性规则

- domain / application 业务语义统一走 `pkg/errcode`
- API-facing code / message / HTTP status 映射统一走 `pkg/errno`
- wrap / convert / transport mapping 统一走 `pkg/errors`
- handler 与 response 层统一通过 `response.ConvertToErrNo` 或等价封装输出 transport 错误
- 日志统一使用 `pkg/logger`，不要扩散 `fmt.Println`、`log.Println` 或直接 `zap` 字段依赖
- 日志字段至少补齐 `request_id` / `trace_id` / `module` 与关键业务标识
- 日志中不得泄露 token、密码、PII 或第三方回包中的敏感片段
- 不要发明新的 ad-hoc error code；新增错误码必须进入 `pkg/errcode` / `pkg/errno`
- bootstrap 期的标准库 `log` 例外只适用于 logger 初始化前的配置装载阶段

## 角色专属动作

- 判断错误语义该留在 `errcode` 还是提升为 `errno`
- 审查 wrap 链是否保留了原始业务语义
- 判断 handler 是否直接做了不安全断言或手工错误码分支
- 审查日志字段是否缺少 trace、模块或关键业务标识
- 审查审计/错误日志是否误带敏感信息

## 输出要求

输出应尽量包含：

- 错误链路风险点
- 日志字段或脱敏缺口
- `errcode` / `errno` / `pkg/errors` 的建议落点
- handler error mapping 调整建议
- 需要同步的项目文档
