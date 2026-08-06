# Wire Route bindings, preflight, and one-shot override API

## Traceability
- Track: implementation
- Spec ID: CLI-GUI-030
- Source Spec: `.features/CLI-GUI-030-priority-model-routes/spec.md`
- Source Version: 1.0
- Requirement IDs: US-004, US-005, US-009, FR-11..FR-14, FR-24, FR-27
- Depends On: issue-096, issue-094

## Goal
将 pure resolver 接入全局、Workspace、Session 和 message send preflight，保证不可发送时不持久化 user message、不启动进程。

## Scope
- global/workspace Route binding API。
- Session PATCH `modelRouteId` + expectedRevision。
- `POST /api/sessions/:id/model-route/resolve`。
- sendMessage 可选 one-shot `routeOverride.fixedDeploymentId`。
- fixed selection 不持久化；unsupported terminal/Engine 稳定错误。
- 旧客户端/无 Route Session 走 legacy behavior。

## Out of Scope
- Attempt/fallback（issues 098-102）。
- GUI（issues 103-107）。

## Acceptance Criteria
- [x] global < project < session < run 的 API 集成符合 pure resolver
- [x] invalid fixed/no candidate 时无 user_message、Task 或 process spawn
- [x] Session revision conflict 与 readonly 语义不变
- [x] one-shot selection 请求结束后不写 Session/AppState
- [x] terminal/unsupported Engine 不伪报 Route 可用
- [x] legacy clients/no-route regression tests 通过

## Inputs
- issue-096 resolver、application/session/chat API

## Outputs
- binding/preflight/send contracts、integration tests

## Owner
implementation-agent（backend-agent + openapi-agent）

## Required Evidence
- API fixtures；spawn/user-message call-count assertions；legacy regression

## Gate Impact
- blocking

## Local loop status

Accepted locally after independent HTTP/application verification. Evidence: `tests/results/cli-gui-030.issue-097.local.json`, `tests/results/cli-gui-030.issue-097.route.raw.json`, and `reviews/CLI-GUI-030-issue-097/qa-report.md`. This does not claim packaged-host, real-engine, cross-process, or browser verification.
