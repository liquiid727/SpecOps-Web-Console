# QA-FLOW: 首次使用路径与 Session 管理验证

## Description

验证从 Quest Home 输入任务到创建 Chat Session 的完整首次使用路径，以及 Session
打开、切换、重命名、生命周期和恢复行为在产品级体验下符合预期。

## Acceptance Criteria

- [x] Open Folder 使用平台选择器（Tauri native）或明确 Web fallback；无 Workspace 时有下一步指引。
- [x] 最近 Workspace 可一键重开；路径校验和 symlink 防护沿用安全契约。
- [x] Quest Home → Workspace → Engine → Task → Chat Session 不超过 4 步用户交互。
- [x] 快速创建成功后自动进入 Session，Composer 获得焦点可立即发送。
- [x] Workspace / Profile / Model 不可用时，创建入口显示可执行修复说明，不提交无效 Session。
- [x] Session 的打开、切换、重命名、Pin、Complete、Archive、Fork、Delete、Restore 可预测。
- [x] 破坏性操作（Delete、Archive）有确认步骤。

## Verification Evidence (2026-07-30)

- E2E: Quest Home one-submit creation (11/11), context menu, B-gate smoke chain (multi-turn+archive) all PASS.
- L3: Open folder via workspace actions menu; Quest Home profile selector in PromptComposer; session CRUD via context menu verified.
- Destructive ops confirmed: Archive triggers confirmation dialog in B-gate E2E test.
- [x] 刷新、关闭后重新打开和切换历史 Session 不丢失 transcript、状态或用户草稿。

## Verification Method

- L1: 自动化回归
- L2: E2E / acceptance scripts
- L3: 人工走查 + 截图

## Checklist IDs

QA-FLOW-01, QA-FLOW-02, QA-FLOW-03, QA-FLOW-04, QA-FLOW-05, QA-FLOW-06, QA-FLOW-07

## SPEC Reference

spec-experience-verification.md §3.2

## PRD Mapping

QA-US-02 → FR-QA-3, FR-QA-6

## Dependencies

Issues #064, #066, #073

## Type

qa

## Priority

high
