---
id: ISSUE-R003-S01-001
requirement: R003
spec_package: S01
kind: implementation
track: implementation
primary_spec: SPEC-R003-S01-001
source_spec: ../spec.md
source_spec_id: SPEC-R003-S01
source_spec_version: 1.0.0
source_spec_hash: 600922fc4505f551952502c6be4f5379aa568df6c45dfe4756201f9b49c0071d
source_test: ../test.md
source_test_id: TEST-R003-S01
source_test_version: 1.0.0
source_test_hash: 5e1ba8dbdf1385ee082af16834b3a7c55d1c5a1f59f807cc80fdee3cbbe12741
status: verified
priority: P1
owner: implementation-agent
depends_on: []
change_profile: cross-surface
---

# ISSUE-R003-S01-001 — Add Engineering Discipline Rule and Template Contract

## Covers

- REQ-R003-001
- REQ-R003-002
- REQ-R003-003
- REQ-R003-004
- REQ-R003-005
- SPEC-R003-S01-001
- SPEC-R003-S01-002
- SPEC-R003-S01-003
- SPEC-R003-S01-004
- SPEC-R003-S01-005
- TEST-R003-S01-001
- TEST-R003-S01-002
- TEST-R003-S01-003
- TEST-R003-S01-004
- TEST-R003-S01-005
- AC-R003-001
- AC-R003-002
- AC-R003-003
- AC-R003-004
- AC-R003-005
- AC-R003-007

## Goal

让后续 GoalSpec Workspaces 从 canonical rules 和 templates 获得相同的 change profile、
preflight、surface evidence、decision ownership 和 honest closeout 契约。

## Scope

### Must

- 创建 `rules/shared/change-discipline.md`，用 SpecOS 自有措辞定义适用性、事实地图、表面矩阵、决策归属和收尾规则。
- 更新 `.rules/project.md`、GoalSpec 标准与必要模板字段，且不引入 mode、Note tree 或第二状态机。
- 更新所有 canonical template mirrors，并扩展 `goalspec-template-consistency.test.mjs` 覆盖新增字段。
- 在 Issue Template 中添加 R003 预检和 Completion Record 字段；在 Test Design/Evidence templates 中添加 surface/provenance 字段。
- 为本次变更声明最小、定向的验证命令。

### Must Not

- 不复制第三方 DSH 文本或创建 `.agents/notes/`。
- 不改写用户已有 `ship-it`、CI Record 或 Catalog 修改。
- 不改变 GoalSpec 的 Issue status、verification 或 QA ownership。
- 不进行无关文档重构。

## Expected Areas (conditional)

- `rules/shared/change-discipline.md` | `.rules/project.md` | `docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md`
- `.requirements/templates/spec-package/{spec.md,test.md,evidence/README.md,issues/ISSUE-R001-S01-001-example.md}` | all declared mirror paths
- `scripts/checks/goalspec-template-consistency.test.mjs` | Not applicable

## Execution Preflight

Change Profile:
- cross-surface

Applicability Rationale:
- The change modifies rules, canonical templates, generated template mirrors and their contract test.

Confirmed Facts:
- `.requirements/templates/` is canonical; assets and project templates are exact mirrors verified by the consistency test.
- Existing Completion Records already own implementation decisions; `design/` is optional durable system truth.

Unverified Assumptions:
- No consumer depends on an exact absence of the new additive fields; S01 verification confirms mirrors and intake-compatible template content.

Production Consumers / Real Entry Paths:
- Agents and `npx specos intake` consume canonical templates; Catalog consumes mirrored asset files.

Affected Surfaces and Planned Checks:

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | Agent reads rules/GoalSpec/templates | focused content assertions | Node test output | blocking |
| generated-output | assets/fullstack/spec-only template mirrors | byte-equality consistency test | Node test output | blocking |
| cli-config | `npx specos intake` template root | manifest/check smoke and review | check output + review | warning |

Unrelated Worktree Changes:
- Preserve existing user changes in `skills/developer/ship-it/SKILL.md`, `assets/templates/specs/template-go-pack-ci-record/ci-record.md`, and `packages/catalog/config/catalog-assets.json`.

Human Decisions Required:
- None; PRD approval explicitly excludes a new `design/` document and third-party copying.

## Tasks

- [ ] Add the canonical engineering-discipline rule and references.
- [ ] Add additive R003 fields to Spec, Test, Issue and Evidence canonical templates.
- [ ] Synchronize every required mirror and expand consistency assertions.
- [ ] Run the focused template consistency test and `node packages/cli/dist/main.js check`.

## Acceptance Criteria

- Given a new semantic Issue, When generated from the template, Then it has change profile, complete preflight and distinct closeout fields.
- Given changed canonical templates, When the consistency suite runs, Then every declared mirror matches byte-for-byte.
- Given a reader needs a decision owner, When reading the rule, Then it can choose Design, PRD/Spec, Completion Record or Review without creating a Note tree.

## Validation

- [ ] `node --test scripts/checks/goalspec-template-consistency.test.mjs`
- [ ] `node packages/cli/dist/main.js check`
- [ ] No unexplained Spec Deviation

## Dependencies

Depends On:

- None

Blocks:

- ISSUE-R003-S01-002
- ISSUE-R003-S02-001

## Required Evidence

- N/A — verification Issue owns release evidence.

## Completion Record

Status: verified
Implemented By: Fairy
Completed At: 2026-09-06
PR / Commit: None — local uncommitted execution
Changed Files: rules/shared/change-discipline.md; .rules/project.md; GoalSpec standard; canonical templates and mirrors; template consistency test.
Tests Executed: `node --test scripts/checks/goalspec-template-consistency.test.mjs` (pass); `node packages/cli/dist/main.js check` (pass).
Evidence References: N/A — verification Issue owns release evidence
Design Decisions: Additive fields remain in their existing owner artifacts; no new workflow state or Note tree.
Alternatives Considered: Add fields to existing artifacts rather than creating `.agents/notes/`; the latter would duplicate GoalSpec truth.
Tradeoffs: The closed surface vocabulary is explicit, so new surface names require a deliberate Spec update.
Checks Skipped: None.
Verified Behavior: Canonical templates expose the R003 contract and every declared mirror is byte-identical.
Known Limitations / Residual Risk: Static template checks do not prove future agent compliance; S03 blocks required field omissions.
Intentionally Untouched: Existing user-owned ship-it, CI Record and Catalog dirty changes remain preserved.
AI Draft Review: Reviewed against S01 contract and focused test output.
Spec Deviation: None
Open Questions: None
