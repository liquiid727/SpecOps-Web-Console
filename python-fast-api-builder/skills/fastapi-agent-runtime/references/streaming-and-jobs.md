# Streaming And Jobs

建议拆成两类接口：

- 请求后立即返回任务 ID
- 流式返回增量事件

不要在一个 endpoint 同时支持：

- 普通 JSON
- SSE
- websocket

除非你已经定义了明确协商策略。

事件流中建议有：

- `started`
- `delta`
- `tool_call`
- `warning`
- `completed`
- `failed`
