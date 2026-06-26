---
name: fastapi-project-bootstrap
description: Scaffold a production-oriented Python FastAPI service with a clean directory baseline, uv dependency management, pydantic-settings configuration, async-ready infrastructure seams, and a reusable template asset. Use when creating a new FastAPI project, standardizing an ad-hoc service into a proper scaffold, or generating a team-approved starter layout for backend or agent services.
---

# FastAPI Project Bootstrap

用这个 skill 起一个可持续维护的 FastAPI 工程底座，不要直接堆 `main.py + routers + services`。

## 工作方式

1. 先确认项目是普通 API 服务还是 Agent 服务。
2. 复制 `assets/template/` 作为起点，再按项目需要裁剪。
3. 保持目录按业务域聚合，避免全局 `routers/`, `crud/`, `schemas/` 散落。
4. 把配置、日志、依赖注入、生命周期初始化先立住，再补业务代码。

## 默认骨架

- `src/app/main.py`: 应用入口
- `src/app/core/`: 配置、日志、错误定义、依赖注入
- `src/app/api/`: 路由装配和 HTTP 适配
- `src/app/modules/`: 按业务域拆分
- `tests/`: 分层测试

如果是 Agent 服务，优先在 `modules/agent_run`、`modules/conversation` 这类领域内聚合代码，不要先按技术层切碎。

## 关键要求

- 使用 `uv` 管理依赖和 lock 文件。
- 使用 `pyproject.toml` 统一声明项目元数据、lint、test 配置。
- 使用 `pydantic-settings` 托管配置。
- 使用 FastAPI `lifespan` 初始化连接池、客户端和后台资源。
- 只在 `api/` 暴露 HTTP 协议细节，业务逻辑进入 `application/` 或 `domain/`。

## 需要加载的资源

- 目录与文件模板：`assets/template/`
- 结构说明：`references/project-layout.md`
- 配置与依赖建议：`references/bootstrap-checklist.md`

## 输出要求

输出至少要包含：

- 目录结构
- 初始依赖列表
- 环境变量命名方案
- 启动命令
- 基础质量门禁命令
