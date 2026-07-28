---
name: go-backend-governance
description: Use when a Go backend task spans multiple governance dimensions and you need a single entry skill to route API contract, time serialization, logging and error mapping, and DDD layering decisions.
version: 1.0.0
category: governance
tags:
  - governance
  - routing
  - backend
  - reusable
---

# go-backend-governance — Go 后端治理总入口

这是一个聚合型入口 skill。

当你只知道“这是一项 Go 后端治理任务”，但还没判断清楚它主要落在 API 契约、时间、错误日志还是 DDD 分层时，先用它做边界判断，再继续下钻到对应细分 skill。

它适用于：

- 同一个任务同时触及 request/response、时间字段、错误映射、日志字段、分层或领域建模
- review 里出现多种横切反模式，需要先判断主要治理面
- 从既有仓库抽取 Go backend foundation 规则时，需要给使用者一个统一入口

它不负责：

- 产品特有状态机或业务真相裁决
- 某个仓库的私有包路径迁移方案
- 强制所有项目采用一模一样的 response envelope、logger backend 或错误码编号

## 读取顺序

1. 先读项目工程约束文档，例如 `AGENTS.md`、`rules/`、相关 spec。
2. 如果问题主要是 request/response、Swagger、API 时间序列化或 response wrapper，转到 `api-contract-governance`。
3. 如果问题主要是时钟源、TTL、过期、定时任务、数据库时间字段或时间相关测试，转到 `go-time-governance`。
4. 如果问题主要是错误链、transport error mapping、结构化日志、审计日志或脱敏，转到 `error-logging-governance`。
5. 如果问题主要是 `application` 过厚、domain 校验归属、VO/entity/domain service 建模或去魔法值，转到 `ddd-layering-governance`。

## 工作流

1. 先判断当前问题的主治理面。
2. 如果只有一个主治理面，直接使用对应细分 skill。
3. 如果有两个以上治理面，先给出主次顺序，再分别引用对应细分 skill 的硬性规则。
4. 输出中明确哪些是横切规则，哪些是业务上下文自己的规则。

## 输出要求

输出应尽量包含：

- 当前任务的主治理面判断
- 需要继续使用的细分 skill
- 发现的横切反模式
- 建议落层或落包位置
- 还需要补查的项目约束
