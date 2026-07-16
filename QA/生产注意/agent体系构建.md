Mentor = 项目总工 / 架构负责人 / 监工 Agent
SubAgent = 专业员工 / 模块负责人
Skill = 这个岗位的工具箱 + SOP + 领域知识 + 检查清单

比如中台项目可以这样拆：

agents/
  mentor/
    role.md
    project-rules.md
    task-dispatch.md
    review-checklist.md

  payment-agent/
    role.md
    payment-domain.md
    idempotency-skill.md
    refund-skill.md
    reconciliation-skill.md
    payment-review-checklist.md

  identity-agent/
    role.md
    auth-domain.md
    oauth-skill.md
    session-token-skill.md
    permission-rbac-skill.md
    security-checklist.md

  frontend-agent/
    role.md
    admin-ui-rules.md
    table-form-skill.md
    route-design-skill.md
    ux-checklist.md

  reviewer-agent/
    role.md
    architecture-review.md
    security-review.md
    consistency-review.md

核心原则是：

不要把 skill 按“项目”堆在一起，而是按“岗位职责”挂载。

例如：

支付 Agent 不需要知道太多前端 UI 规范，但必须知道：

- 金额不能用 float
- 支付请求必须幂等
- 回调必须可重试
- 订单状态机不能乱跳
- 退款、补单、对账必须留审计日志
- 第三方支付超时不能直接判失败

认证 Agent 不需要懂支付分账，但必须知道：

- access token / refresh token 生命周期
- 多端登录策略
- RBAC / ABAC 权限边界
- OAuth 回调安全
- 登录风控
- session 失效策略

前端 Agent 则关注：

- 企业后台不要无限向下铺页面
- 复杂页面拆二级路由 / 抽屉 / 弹窗 / 分步骤
- 表格、筛选、详情、编辑分层
- 关键信息必须在首屏可见
- 危险操作二次确认

我建议你的体系可以抽象成 4 层：

1. Mentor Layer：总控层
负责拆任务、分配 Agent、合并结果、做最终裁决。

2. Domain Agent Layer：领域专家层
支付、认证、商品、订单、前端、运维、安全、测试等。

3. Skill Layer：能力包
每个 Agent 挂自己的 SOP、模板、检查清单、领域规范。

4. Review Layer：审查层
专门检查架构漂移、资金安全、权限安全、前后端一致性、测试覆盖。

一个很实用的工作流是：

用户需求
  ↓
Mentor 读取 project current / roadmap / constraints
  ↓
Mentor 拆成模块任务
  ↓
派发给 payment-agent / identity-agent / frontend-agent
  ↓
各 Agent 使用自己的 skill 产出方案
  ↓
Reviewer Agent 统一审查
  ↓
Mentor 汇总成最终 PRD / Spec / Task / Code Review

这个模式其实很适合你现在做的“中台 / 支付 / 认证 / 商品 / 代理商 / SaaS 后台”这种复杂项目。

我会建议你不要叫它单纯的 skill system，可以叫：

Agent Workforce System
Multi-Agent Skill Registry
Project Mentor + Domain Agent System
中台多 Agent 协作规范

最关键的一句话是：

Skill 不是越多越好，而是要挂在正确的 Agent 身上，让每个 Agent 只加载自己岗位需要的上下文。
