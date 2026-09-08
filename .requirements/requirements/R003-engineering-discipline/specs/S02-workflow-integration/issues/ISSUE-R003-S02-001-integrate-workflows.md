---
id: ISSUE-R003-S02-001
requirement: R003
spec_package: S02
kind: implementation
track: implementation
primary_spec: SPEC-R003-S02-001
source_spec: ../spec.md
source_spec_id: SPEC-R003-S02
source_spec_version: 1.0.0
source_spec_hash: 1667af6ca078bff579cd40d2fc41d9982fd0d0b3800724e4d6357f4f4549c19d
source_test: ../test.md
source_test_id: TEST-R003-S02
source_test_version: 1.0.0
source_test_hash: 967645c1df4a8e5fc12010a322c96621fa95b24629925063ac0b7eb272a220e3
status: verified
priority: P1
owner: implementation-agent
depends_on:
  - ISSUE-R003-S01-002
change_profile: cross-surface
---

# ISSUE-R003-S02-001 — Integrate Engineering Discipline into Workflows

## Covers

- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- SPEC-R003-S02-001
- SPEC-R003-S02-002
- SPEC-R003-S02-003
- SPEC-R003-S02-004
- TEST-R003-S02-001
- TEST-R003-S02-002
- TEST-R003-S02-003
- TEST-R003-S02-004
- AC-R003-002
- AC-R003-003
- AC-R003-004
- AC-R003-005
- AC-R003-008

## Goal

使 Loop It、Review 和 Sync Handoff 使用 S01 的事实地图、表面证据、决策归属和如实收尾字段，同时保持既有 status、verification 和 QA 责任边界。

## Scope

### Must

- 更新 `loop-it` 的 precondition、single-Issue loop、Completion Record 与 final summary 以消费 S01 字段。
- 更新 `review-it` 的 review gates/focus/final report，以检查真实 consumer/entry、surface matrix、decision owner 和 closeout claims。
- 更新 `sync-handoff-gateway.md`，以声明 profile/surface 字段、机械变更 reason 和启用边界。
- 对现有 user-owned `ship-it`/CI Record/Catalog 改动只做兼容性审阅；若需要文本追加，保留既有 hunk 和语义。
- 为本次变更声明最小、定向验证命令。

### Must Not

- 不改变 Issue 状态机、独立验证或 QA acceptance owner。
- 不执行 Git commit/push/merge，不重置、覆盖或拆分用户已有修改。
- 不新增技能注册、角色或 Note tree。

## Expected Areas (conditional)

- `skills/developer/{loop-it,review-it,ship-it}/SKILL.md` | `ai/workflows/sync-handoff-gateway.md`
- `assets/templates/specs/template-go-pack-ci-record/ci-record.md` | `packages/catalog/config/catalog-assets.json`
- `scripts/checks/goalspec-template-consistency.test.mjs` | Not applicable

## Execution Preflight

Change Profile:
- cross-surface

Applicability Rationale:
- The workflow change affects execution, review, handoff and CI Record consumers.

Confirmed Facts:
- `loop-it` owns implementation/verification execution but never QA acceptance.
- `review-it` writes review.md only; `ship-it` already has user-owned standalone CI/Sync Handoff additions.
- Sync Handoff is currently proposed and lacks mechanical enforcement, which S03 will add.

Unverified Assumptions:
- The new wording can coexist with the user-owned ship-it additions without semantic conflict; review will check it.

Production Consumers / Real Entry Paths:
- Codex/host agents read these skills and workflow documents; `ship-it` CI Record template is consumed by Catalog asset selection and handoff output.

Affected Surfaces and Planned Checks:

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | host/agent skill loading | focused text assertions and reviewer inspection | Node test + review | blocking |
| cli-config | R003 checker command | S03 valid/invalid fixture runs | JSON report | blocking |
| generated-output | CI/Completion/Sync Handoff records | inspect generated R003 Issue and preserved existing CI record | review record | warning |

Unrelated Worktree Changes:
- Preserve the user-owned `ship-it`, CI Record template and Catalog modifications; do not stage or rewrite them independently.

Human Decisions Required:
- None — user authorized direct R003 execution and retaining the existing modifications as related input.

## Tasks

- [ ] Update Loop It and Review It with the S01 terms and boundaries.
- [ ] Update Sync Handoff with profile/surface and closeout alignment.
- [ ] Reconcile but do not erase the existing ship-it/CI Record/Catalog changes.
- [ ] Add focused regression assertions for workflow wording where practical.
- [ ] Run focused Node tests and inspect the diff for ownership/status regressions.

## Acceptance Criteria

- Given a semantic Issue, When Loop It starts, Then missing fact-map fields block before writes.
- Given a completed Issue, When Review It runs, Then it distinguishes source/build/real-entry proof and closeout facts from QA acceptance.
- Given a semantic workflow change, When Sync Handoff is written, Then it contains profile/surfaces/neighbor outcomes and cannot infer pass from a local command alone.

## Validation

- [ ] `node --test scripts/checks/goalspec-template-consistency.test.mjs`
- [ ] `node packages/cli/dist/main.js check`
- [ ] Focused workflow text assertions or S03 fixture preflight run
- [ ] No unexplained Spec Deviation

## Dependencies

Depends On:

- ISSUE-R003-S01-002

Blocks:

- ISSUE-R003-S02-002
- ISSUE-R003-S03-001

## Required Evidence

- N/A — verification Issue owns release evidence.

## Completion Record

Status: verified
Implemented By: Fairy
Completed At: 2026-09-06
PR / Commit: None — local uncommitted execution
Changed Files: skills/developer/{loop-it,review-it,ship-it}/SKILL.md; ai/workflows/sync-handoff-gateway.md; CI Record template; catalog asset metadata.
Tests Executed: `node --test scripts/checks/goalspec-template-consistency.test.mjs` (pass); S02 preflight checker (pass); `npm test` and `npm run build` (pass).
Evidence References: N/A — verification Issue owns release evidence
Design Decisions: Extend existing workflow artifacts rather than create a new orchestration layer.
Alternatives Considered: A standalone DSH skill was rejected because it would bypass the manifest and duplicate workflow truth.
Tradeoffs: Existing user-owned ship-it hunks are preserved; S02 may leave exact delivery wording to that input when no conflict exists.
Checks Skipped: Remote Git/CI actions — not requested and outside local documentation scope.
Verified Behavior: Loop/review/handoff/CI record share the profile, real-entry and closeout vocabulary without adding a second state machine.
Known Limitations / Residual Risk: Workflow documents guide hosts; no hosted runner was introduced.
Intentionally Untouched: Git staging/commit/push/merge and unrelated user changes.
AI Draft Review: Reviewed against S02 contract and preserved user-owned changes.
Spec Deviation: None
Open Questions: None
