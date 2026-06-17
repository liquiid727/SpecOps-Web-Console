# Telemetry Baseline

Trace：

- 每个 HTTP 请求起一个根 span
- 外部依赖调用创建子 span：
  - DB
  - Redis
  - LLM provider
  - 外部 HTTP API

Metrics：

- `http_server_requests_total`
- `http_server_request_duration_ms`
- `agent_run_total`
- `agent_run_failed_total`
- `agent_run_duration_ms`

不要上来就做很宽的 metrics 维度，先限制标签数量。
