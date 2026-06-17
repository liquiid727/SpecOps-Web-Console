---
name: fastapi-api-governance
description: Standardize FastAPI route naming, request and response schemas, versioning, error contracts, and public API boundaries. Use when designing or reviewing FastAPI endpoints, OpenAPI contracts, response models, error-code systems, or interface compatibility for backend services and agent APIs.
---

# FastAPI API Governance

用这个 skill 把接口设计从“能跑”拉到“可维护、可演进、可协作”。

## 关注点

- 路由命名
- DTO 命名
- 统一响应结构
- 错误码分层
- 版本边界
- OpenAPI 可读性

## 基本规则

- 路径使用资源语义，不用动词堆砌。
- 请求和响应模型显式声明，不直接暴露 ORM 对象。
- 错误码和 HTTP 状态码分离。
- 修改公开接口前，先更新 contract 和示例。

## 先读哪些资料

- 命名与 DTO：`references/naming-and-schemas.md`
- 错误码与响应：`references/error-contract.md`
- 版本与兼容性：`references/versioning-policy.md`

## 输出要求

输出至少应明确：

- endpoint 列表
- 请求模型
- 响应模型
- 错误码表
- 兼容性说明
