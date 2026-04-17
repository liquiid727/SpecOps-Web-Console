# Spec-Driven Backend Dev Pipeline

LSP + Context DB 融合架构 + spec驱动 +bruno 自动测试的 AI OS 系统

完成+跑通这一整个流程：Spec-Driven Backend Dev Pipeline

Pencil 原型 → 自动生成 UI Spec → 自动生成 API → 自动生成前端页面（React/Flutter）」- 特别开发

LSP + Context DB 融合架构 + spec驱动 +bruno 自动测试的 AI OS 系统


1. Spec-Draft（需求输入）
   ↓
2. Spec-Refine（AI + 人）
   ↓
3. Final Spec（双形态）
   - Human Spec（文档）
   - Machine Spec（结构化 YAML）
     ↓
4. Plan（Task Plan / Workflow）
   ↓
5. Generation（生成阶段）
   - API / Schema
   - Test（Bruno）
   - Code（Agent）
     ↓
6. Validation（CI / 测试）

我的工作流：

1. Spec-Draft（需求输入）

   - 来源：产品 / 自己 / PRD
   - 形式：自由描述（OpenSpec 风格）
2. Spec-Refine（AI + 人）

   - 补充规则 / 边界 / 错误
   - 消除歧义
3. Final Spec（双形态）

   - Human Spec：给人看的说明文档
   - Machine Spec：结构化 YAML（系统输入）
4. Task Plan（执行流程）

   - 从 Spec 推导
   - 定义步骤 / 分支 / 错误处理
5. Scenario（测试链路）

   - 定义完整业务流程
   - 用于生成 Bruno / 自动测试
   - K95 测试
6. Generation（生成阶段）

   - API Schema
   - Test（Bruno）
   - Code（Agent）
7. Validation（校验）

   - 自动测试-形成 scenario report UI，方便查看场景和链路
   - CI 校验
