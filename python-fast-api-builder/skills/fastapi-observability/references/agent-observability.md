# Agent Observability

重点看三类问题：

- 运行慢：排查 provider、检索、串行步骤、重试
- 运行贵：统计 token、模型、调用次数
- 运行不稳：统计超时、取消、fallback、空结果

建议核心事件：

- `agent_run_started`
- `agent_step_started`
- `agent_step_finished`
- `agent_run_failed`
- `agent_run_completed`
