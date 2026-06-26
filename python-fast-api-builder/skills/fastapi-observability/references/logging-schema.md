# Logging Schema

最小字段：

- `timestamp`
- `level`
- `service`
- `env`
- `request_id`
- `trace_id`
- `span_id`
- `path`
- `method`
- `latency_ms`
- `error_code`

Agent 项目建议增加：

- `agent_run_id`
- `conversation_id`
- `model`
- `provider`
- `token_in`
- `token_out`

建议：

- 默认 JSON
- 不记录敏感原文
- 输入输出体只记录摘要或长度，不直接全量落日志
