# Naming And Schemas

## 路径

- 推荐：`/v1/agent-runs`
- 避免：`/runAgent`, `/do-run`, `/agent/run/do`

## DTO

- 请求：`CreateAgentRunRequest`
- 响应：`AgentRunResponse`
- 列表响应：`ListAgentRunsResponse`

## Schema 原则

- 所有公开响应使用 `response_model`
- 对外模型与内部领域对象分离
- `id`, `status`, `created_at`, `updated_at` 字段命名保持稳定
- 使用 `Literal` 或 Enum 表达有限状态，不用裸字符串注释约定
