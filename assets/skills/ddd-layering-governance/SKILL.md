---
name: ddd-layering-governance
description: Use when a backend task needs DDD layering guidance, thin application orchestration, domain-owned validation, VO or entity or domain service modeling, or enum and value-object refactors that remove magic values from business flows.
version: 1.0.0
category: governance
tags:
  - ddd
  - layering
  - domain-modeling
  - governance
  - reusable
---

# ddd-layering-governance — DDD 分层与领域建模治理

这是仓库级治理 skill，不是某个业务上下文的专属 agent。它解释代码应该如何分层，以及业务规则、业务校验、领域类型应该归属哪里。

它适用于：

- 判断 `domain / application / interfaces / infrastructure` 职责边界
- 收敛 `application` 过厚问题
- 设计或审查 VO / entity / domain service 落点
- 将业务状态、类型、模式从魔法值收敛为 enum / VO / typed constant
- 判断业务校验该进入 handler、use case 还是 domain API

它不负责：

- 裁决跨上下文状态机真相或高风险架构方案；这类问题要联动 architect
- 替代 orchestrator、planner、reviewer
- 承接任何业务模块自身的 state machine truth

## 读取顺序

1. 项目的工程约束文档（如 `AGENTS.md`）
2. 项目的分层或架构说明
3. 任务相关的 `references/*.md`

## 硬性规则

- `application` 只拥有 use case 编排、事务边界、跨仓储调度、外部集成、幂等与重试协调，不承载业务合法性真相
- `domain` 拥有 entity、VO、domain service、业务不变量、业务合法性和兼容归一化
- 业务校验入口必须优先通过 `ParseXxx`、`NormalizeXxx`、`NewXxx`、`IsValid` 等 domain API
- 可枚举业务值必须使用 enum、VO 或 typed constant 收敛，禁止让裸字符串或裸整数魔法值跨层扩散
- `domain service` 只封装上下文内部业务规则，不负责 transport 解析、仓储编排或外部系统流控
- `interfaces` 只做 request binding、response rendering 与 transport error mapping，不做业务合法性裁决

## 角色专属动作

- 定位当前代码中把业务校验放错层的位置
- 识别 `application` 变厚、`domain` 失真、handler/use case 散落 `switch/if` 的问题
- 判断一个规则更适合进入 VO、entity 还是 domain service
- 判断某个状态、类型、模式、provider 等字段是否应收敛成 enum / VO / typed value
- 在 review 中给出分层裁决与领域建模建议，而不是只指出“风格不统一”

## 工作流

1. 先确认当前问题是“分层归属”还是“领域建模归属”。
2. 如果是分层问题，优先读 `references/layering-rules.md`。
3. 如果是领域类型、业务校验或去魔法值问题，优先读 `references/domain-modeling-rules.md`。
4. 如需识别常见误区，读 `references/anti-patterns.md`。
5. 如需给实现者或 reviewer 落 checklist，读 `references/review-checklist.md`。
6. 如果问题已经升级为跨上下文 truth owner、状态机或高风险流程裁决，转交 architect。

## 输出要求

输出应尽量包含：

- 分层裁决
- 领域建模建议
- 发现的反模式
- 建议代码落点
- 需要同步的项目文档
