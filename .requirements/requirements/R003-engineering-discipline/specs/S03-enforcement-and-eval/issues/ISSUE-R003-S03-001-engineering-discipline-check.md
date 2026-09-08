---
id: ISSUE-R003-S03-001
requirement: R003
spec_package: S03
kind: implementation
track: implementation
primary_spec: SPEC-R003-S03-001
source_spec: ../spec.md
source_spec_id: SPEC-R003-S03
source_spec_version: 1.0.0
source_spec_hash: c93c94715da4f71578c7241e3ff3d39e0b49137b8705d500bfc3376257b2db00
source_test: ../test.md
source_test_id: TEST-R003-S03
source_test_version: 1.0.0
source_test_hash: e9b46f9d1e7a0f0beaf2b16bdf58c6928b2a90b5f18b70147563341120acab15
status: verified
priority: P1
owner: implementation-agent
depends_on:
  - ISSUE-R003-S01-002
  - ISSUE-R003-S02-001
change_profile: high-risk
---

# ISSUE-R003-S03-001 — Implement Engineering Discipline Check and Fixtures

## Covers

- REQ-R003-003
- REQ-R003-005
- REQ-R003-006
- SPEC-R003-S03-001
- SPEC-R003-S03-002
- SPEC-R003-S03-003
- TEST-R003-S03-001
- TEST-R003-S03-002
- TEST-R003-S03-003
- TEST-R003-S03-004
- AC-R003-001
- AC-R003-003
- AC-R003-005
- AC-R003-006
- AC-R003-008

## Goal

实现可重复的 R003 Issue preflight/closeout checker、JSON gate report 和至少 16 个有标签的 Node fixtures，使语义变更缺失关键字段时能稳定失败。

## Scope

### Must

- 新增 `scripts/checks/engineering-discipline.mjs`，支持 canonical child selector 和 `--phase preflight|closeout`。
- 对 opted-in `change_profile` Issues 验证 enum、mechanical rationale、preflight headings、surface rows和 closeout headings；产生稳定 `SPECOS_ENGINEERING_DISCIPLINE_*` errors。
- 在 selected child `evidence/gates/` 写安全的 JSON report；不修改 Issue 或 acceptance。
- 新增 Node test，使用临时目录创建至少 16 个 labeled fixtures，覆盖四种 profile、无效字段、surface 和 closeout 情况。
- 更新 checks README，运行最小定向测试。

### Must Not

- 不扫描或迁移所有历史 Workspaces。
- 不调用网络、LLM、外部服务或新增依赖。
- 不替代 `spec-test-gates.mjs`、不决定 QA/release readiness。
- 不改写用户已有 dirty files；若 README/Catalog 触点冲突则在 review 说明。

## Expected Areas (conditional)

- `scripts/checks/engineering-discipline.{mjs,test.mjs}` | `scripts/checks/README.md`
- selected R003 `evidence/gates/` test artifacts | Not applicable

## Execution Preflight

Change Profile:
- high-risk

Applicability Rationale:
- The check changes CI-adjacent blocking behavior and validation semantics for workflow artifacts.

Confirmed Facts:
- Existing `spec-test-gates.mjs` uses a child selector, Node built-ins and package-local evidence gate reports.
- S01 defines the required field names and S02 defines workflow ownership; check scope is only selected opted-in Issues.

Unverified Assumptions:
- Markdown heading/table parsing can remain sufficiently deterministic without a YAML dependency; implementation tests prove the supported template grammar.

Production Consumers / Real Entry Paths:
- CI/local developers invoke `node scripts/checks/engineering-discipline.mjs <selector>`; Node test runner invokes the real CLI subprocess.

Affected Surfaces and Planned Checks:

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | checker parser | direct Node unit/subprocess tests | Node test output | blocking |
| cli-config | selector and `--phase` CLI | valid/invalid selector/phase fixtures | JSON report | blocking |
| generated-output | evidence gate report | parse report after each run | artifact assertion | blocking |
| persistence-protocol | Issue frontmatter/headings | malformed/missing field fixtures | Node test output | blocking |

Unrelated Worktree Changes:
- Preserve existing user-owned ship-it/CI Record/Catalog modifications; no S03 task writes them.

Human Decisions Required:
- None; supported grammar is exactly the R003 canonical template, and unknown forms block with a safe error.

## Tasks

- [ ] Implement selector/phase parsing, Issue discovery and safe Markdown/YAML field extraction.
- [ ] Implement deterministic preflight and closeout validation with stable error codes and JSON reports.
- [ ] Add at least 16 temporary-directory fixture tests, including failure cases and repeat-run report checks.
- [ ] Update checks README and run focused tests.

## Acceptance Criteria

- Given a valid selected R003 package, When each phase runs, Then it exits 0 and writes a ready report.
- Given every labeled invalid fixture, When the relevant phase runs, Then it exits non-zero with the expected stable error code and blocked report.
- Given repeated input, When rerun, Then status and error code set are unchanged.
- Given a historical/no-profile Issue, When selected, Then it is ignored rather than migrated or falsely failed.

## Validation

- [ ] `node --test scripts/checks/engineering-discipline.test.mjs`
- [ ] `node --test scripts/checks/spec-test-gates.test.mjs`
- [ ] `node packages/cli/dist/main.js check`
- [ ] No unexplained Spec Deviation

## Dependencies

Depends On:

- ISSUE-R003-S01-002
- ISSUE-R003-S02-001

Blocks:

- ISSUE-R003-S02-002
- ISSUE-R003-S03-002

## Required Evidence

- N/A — verification Issue owns release evidence.

## Completion Record

Status: verified
Implemented By: Fairy
Completed At: 2026-09-06
PR / Commit: None — local uncommitted execution
Changed Files: scripts/checks/engineering-discipline.mjs; scripts/checks/engineering-discipline.test.mjs; scripts/checks/README.md; rules/ci/spec-release-gates.md.
Tests Executed: `node --check scripts/checks/engineering-discipline.mjs` (pass); `node --test scripts/checks/engineering-discipline.test.mjs` (16 fixtures pass).
Evidence References: N/A — verification Issue owns release evidence
Design Decisions: Parse only the declared R003 Issue grammar and selected child package; unknown/unsupported forms block instead of heuristic repair.
Alternatives Considered: Reusing `spec-test-gates.mjs` was rejected because it validates normalized Test evidence, not Issue preflight/closeout semantics.
Tradeoffs: The checker validates artifact completeness, not semantic truth of a consumer claim; Review remains responsible for factual judgment.
Checks Skipped: No performance benchmark — bounded local parser; no external I/O or repository-wide scan.
Verified Behavior: Selected child packages produce deterministic ready/blocked JSON reports; invalid selector, profile, preflight, surface and closeout cases block.
Known Limitations / Residual Risk: The checker validates declared structure, not the factual truth of a declared consumer; review remains the fact check.
Intentionally Untouched: Historical Workspaces, existing spec-test gate semantics, Test Console UI and user-owned dirty files.
AI Draft Review: Reviewed against S03 CLI/report contract and fixture output.
Spec Deviation: None
Open Questions: None
