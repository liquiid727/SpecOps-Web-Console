---
name: fastapi-agent-runtime
description: Design FastAPI-hosted agent execution flow, background work, streaming responses, session persistence, retries, and timeout boundaries. Use when building agent APIs on FastAPI, defining orchestration seams, reviewing long-running request handling, or separating HTTP concerns from agent runtime behavior.
---

# FastAPI Agent Runtime

用这个 skill 设计 Agent 服务的运行时边界，尤其是 HTTP 接入层和 Agent 执行层之间的职责切分。

## 关注点

- 同步 vs 异步执行
- 后台任务边界
- 流式输出
- 会话和 checkpoint
- 超时、取消、重试

## 基本要求

- 路由层只处理协议、鉴权、请求解析和响应序列化。
- Agent 编排进入应用层或专门 runtime 层。
- 长任务不要直接阻塞请求线程直到不可控时长。
- 流式接口与批处理接口分开设计。

## 先读哪些资料

- 运行时拓扑：`references/runtime-topology.md`
- 流式与后台任务：`references/streaming-and-jobs.md`
- 容错边界：`references/failure-boundaries.md`

## 输出要求

至少明确：

- 执行入口
- 状态存储方式
- 取消与超时策略
- 重试与幂等语义
- 流式协议边界
