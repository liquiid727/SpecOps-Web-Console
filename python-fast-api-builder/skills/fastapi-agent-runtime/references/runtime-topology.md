# Runtime Topology

推荐分层：

- `api/`
  - HTTP 协议层
- `application/`
  - 用例编排
- `domain/`
  - 状态、策略、错误
- `infrastructure/`
  - provider, db, redis, queue

Agent 项目建议把“run agent”抽象为明确用例，而不是把一整条流程散在路由和 util 中。
