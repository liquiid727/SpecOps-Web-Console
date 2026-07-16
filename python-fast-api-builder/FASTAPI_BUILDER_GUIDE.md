# Python FastAPI Builder

面向 Python FastAPI 为主、Agent 服务化项目的 repo-local 规范包。

## 目标

- 给新项目提供一套可复制的工程起点。
- 把常见工程规范拆成多个单职责 skill，避免一个大而全的说明堆在一起。
- 优先覆盖大厂研发里最容易失控的几块：目录、配置、日志、错误码、测试、运行时边界。

## 包结构

- `skills/fastapi-project-bootstrap`
  - 起项目时使用。
  - 提供目录骨架、依赖、配置、基础模块建议。
- `skills/fastapi-api-governance`
  - 设计接口、Schema、命名和错误码时使用。
- `skills/fastapi-observability`
  - 设计日志、Trace、Metrics 时使用。
- `skills/fastapi-testing-gates`
  - 设计测试层次、质量门禁、发布前验证时使用。
- `skills/fastapi-agent-runtime`
  - 设计 Agent 编排、流式响应、后台任务、重试和超时时使用。

## 默认工程基线

- Python: `3.12`
- 依赖管理: `uv`
- Web: `FastAPI`
- 配置: `pydantic-settings`
- 校验模型: `Pydantic v2`
- 代码质量: `ruff`
- 测试: `pytest`, `pytest-asyncio`, `httpx`
- 数据库: `SQLAlchemy 2.x`, `Alembic`
- 观测: `OpenTelemetry`

## 命名规范

- 包和模块: `snake_case`
- 类名: `PascalCase`
- 函数和变量: `snake_case`
- 常量: `UPPER_SNAKE_CASE`
- 路径资源名: 复数优先，如 `/v1/agent-runs`
- DTO:
  - 请求: `CreateAgentRunRequest`
  - 响应: `AgentRunResponse`
- 服务:
  - 应用层: `AgentRunService`
  - 基础设施适配器: `OpenAIClient`, `RedisCheckpointStore`

## 配置与依赖注入

- 禁止业务代码散落 `os.getenv()`。
- 所有配置统一收口到 `Settings`。
- 环境变量命名前缀统一，例如 `APP_`。
- FastAPI 依赖注入只负责装配，不承载业务逻辑。
- 资源初始化优先放在 `lifespan`。

## 日志规范

- 默认 JSON 结构化日志。
- 每条日志至少包含：
  - `timestamp`
  - `level`
  - `service`
  - `env`
  - `request_id`
  - `trace_id`
  - `span_id`
  - `error_code`
- Agent 项目额外建议包含：
  - `agent_run_id`
  - `conversation_id`
  - `model`
  - `provider`
  - `latency_ms`
  - `token_in`
  - `token_out`

## 错误码规范

- HTTP 状态码表达协议语义。
- `code` 字段表达稳定业务语义。
- 所有错误响应统一返回：

```json
{
  "code": "AGENT_CONTEXT_NOT_FOUND",
  "message": "conversation context not found",
  "request_id": "req_123",
  "details": {}
}
```

- 错误码建议分层：
  - `COMMON_*`
  - `AUTH_*`
  - `VALIDATION_*`
  - `AGENT_*`
  - `STORAGE_*`
  - `INTEGRATION_*`

## 测试规范

- `tests/unit/`: 纯函数、领域对象、应用服务，不连外部资源。
- `tests/integration/`: DB、Redis、对象存储、外部 API fake。
- `tests/contract/`: OpenAPI、错误码、响应结构、向后兼容。
- `tests/e2e/`: 主链路端到端流程。
- 发布前最小门禁：
  - `ruff check .`
  - `ruff format --check .`
  - `pytest`

## 更新与发布建议

- 所有依赖变更集中在 `pyproject.toml` 和 lock 文件。
- 接口变更先更新 contract，再更新实现。
- 数据结构变更必须同步 migration。
- 破坏性变更要明确：
  - 影响面
  - 升级步骤
  - 回滚策略

## 推荐使用方式

1. 先用 `fastapi-project-bootstrap` 起骨架。
2. 设计 API 时切到 `fastapi-api-governance`。
3. 设计日志和 tracing 时切到 `fastapi-observability`。
4. 设计测试与质量门禁时切到 `fastapi-testing-gates`。
5. 做 Agent 编排和运行时设计时切到 `fastapi-agent-runtime`。
