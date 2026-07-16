1. 架构漂移（Architecture Drift）


2. 工程腐化（Engineering Rot）

3. 技术债（Tech Debt）

4. 可维护性（Maintainability）

一个函数：

1000 行

AI 经常觉得：

没问题。

其实：

Review：

Function > 150 行

Warning

>300

Error

再例如：

switch

50 case

if

10 层

for

三层嵌套

都是臭味。

5. API 治理（API Governance）



6. 数据治理（Data Governance）



7. 可观测性（Observability）

8. 安全治理（Security）


9. 数据一致性（Consistency）



10. 性能风险（Performance）



11. 测试治理（Testing）

边界测试

异常测试

恢复测试


例如：

Happy Path

100%

Failure



Review Framework

不要只是四个维度，而是做成一个固定的 13 大维度 Review：

编号	Review Domain	关注点
R1	Architecture	架构边界、依赖、职责漂移
R2	Engineering	工程规范、死代码、TODO、配置漂移
R3	Tech Debt	过时依赖、升级建议、遗留实现
R4	Maintainability	可维护性、复杂度、重复代码
R5	API Governance	API 风格、Envelope、OpenAPI、一致性
R6	Data Governance	Migration、Schema、ID、时间、删除语义
R7	Observability	日志、Metrics、Tracing、Health、Readiness
R8	Security	鉴权、密钥、权限、加密、安全基线
R9	Consistency	事务、幂等、Outbox、缓存一致性
R10	Performance	N+1、慢 SQL、缓存、批处理、资源消耗
R11	Testing	单测、集成测试、Race、Fuzz、边界场景
R12	Documentation	README、ADR、设计文档、OpenAPI、状态同步
R13	AI Governance	Spec、Prompt、Rules、Agent、Memory、Workflow 一致性

这样形成的就不只是一次性的检查清单，而是一套可以长期复用的 Engineering Review Framework（ERF
