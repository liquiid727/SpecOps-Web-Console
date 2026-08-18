---
requirement: R001
source_prd: ./prd.md
source_spec: ./spec.md
source_test: ./test.md
status: implementing
---

# Issues — Requirement Package Explorer

## Summary

| Issue | Goal | Covers | Status |
|---|---|---|---|
| ISSUE-R001-001 | Add read-only Requirement Package explorer | SPEC-R001-F01-001, SPEC-R001-F01-002, SPEC-R001-F01-003 | IN REVIEW |

## ISSUE-R001-001 — Add read-only Requirement Package explorer

Status: IN REVIEW
Priority: P1

Covers:
- REQ-R001-001
- REQ-R001-002
- REQ-R001-003
- REQ-R001-004
- SPEC-R001-F01-001
- SPEC-R001-F01-002
- SPEC-R001-F01-003
- TEST-R001-F01-001
- TEST-R001-F01-002
- TEST-R001-F01-003

### Goal

在不复制或修改 Markdown 真相源的情况下，让 Web UI 读取并展示真实 Requirement Package。

### Scope

Must:
- 只扫描真实 R0NN package。
- 展示四件套、门禁、源文件和 traceability。
- 覆盖空态、缺失文件和无效路由。

Must Not:
- 不写入 Requirement Package。
- 不重新实现 Agent workflow。
- 不把 Issue Done 作为 Requirement Done。

### Tasks

- [x] 增加 server-side Requirement Package reader。
- [x] 增加列表、详情和四件套只读路由。
- [x] 增加空态、加载态和不可用状态。
- [x] 增加 reader/UI 单元测试。
- [ ] 完成浏览器视觉验证。

### Validation

- [x] `npm test -- --run`：23 files / 83 tests passed。
- [x] `npm run build`：Next.js production build passed。
- [x] `curl http://127.0.0.1:3000/requirements`：HTTP 200，需求包列表已渲染。
- [ ] Browser visual verification：当前环境无可用浏览器控制工具。

### Dependencies

Depends On:
- None

Blocks:
- Future editable Requirement Package UI and CLI hash/stale gate UI.

### Completion Record

Status: IN REVIEW
Implemented By: Codex
Completed At: 2026-08-17
PR / Commit: Not created
Changed Files: `spec-web-ui/app/requirements/`, `spec-web-ui/components/requirements/`, `spec-web-ui/lib/requirements.ts`, related navigation/types/tests
Tests Executed: `npm test -- --run`; `npm run build`; HTTP 200 check for `/requirements`
Spec Deviation: None
