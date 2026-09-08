---
requirement: R003
spec_package: S01
test_spec_id: TEST-R003-S01
source_prd: ../../prd.md
source_spec: ./spec.md
source_spec_id: SPEC-R003-S01
source_spec_version: 1.0.0
source_spec_hash: 600922fc4505f551952502c6be4f5379aa568df6c45dfe4756201f9b49c0071d
version: 1.0.0
status: approved
owner: testing-agent
qualityProfile: agent-workflow
riskTier: P1
approval: user-authorized direct execution on 2026-09-06
---

# Test Design — S01 Engineering Discipline Contract

## 1. Purpose and Scope

This document proves that canonical R003 rules and templates expose one
consistent engineering-discipline contract. It does not record final results;
those belong in `./evidence/`.

### In Scope

- Canonical rule, project/GoalSpec references, Issue/Test/Spec/Evidence templates and all required mirrors.
- Change-profile applicability, preflight, surface matrix, decision ownership and closeout fields.
- Template-consistency regression coverage.

### Out of Scope

- Runtime implementation of the checker (S03), workflow skill behavior (S02), UI behavior and historical workspace migration.

## 2. Coverage Matrix

| Requirement | Spec | Test | Category / level | Required Evidence | Gate Impact |
|---|---|---|---|---|---|
| REQ-R003-001 | SPEC-R003-S01-001 | TEST-R003-S01-001 | Contract / template | Node consistency result | blocking |
| REQ-R003-002 | SPEC-R003-S01-002 | TEST-R003-S01-002 | Contract / template | Node consistency result | blocking |
| REQ-R003-003 | SPEC-R003-S01-003 | TEST-R003-S01-003 | Contract / template | Node consistency result | blocking |
| REQ-R003-004 | SPEC-R003-S01-004 | TEST-R003-S01-004 | Documentation review | review record | blocking |
| REQ-R003-005 | SPEC-R003-S01-005 | TEST-R003-S01-005 | Contract / template | Node consistency result | blocking |

## 3. Test Environment and Data

- Fixture / seed / accounts: repository canonical templates and their mirrors; no accounts.
- Dependency mode: real filesystem, Node built-in test runner.
- Environment, feature flags, and configuration: repository root; no network, secrets or feature flags.
- Isolation and cleanup: tests only read templates; no mutable fixture data.
- PII / secrets handling: no secrets/PII are read or generated.
- Baseline or commit under test: current R003 working tree revision.

## 4. Test Scenarios

### TEST-R003-S01-001 Profile and Mechanical Rationale Fields

Covers:
- REQ-R003-001
- SPEC-R003-S01-001
- BR-R003-001
- BR-R003-003
- AC-R003-001

Category / Level:
- Contract / Node test

Required Evidence / Gate Impact:
- `node --test scripts/checks/goalspec-template-consistency.test.mjs` / blocking

Given:
- Canonical Issue template and all issue-template mirrors.

When:
- The consistency suite reads template content.

Then:
- It asserts the `change_profile` enum and applicability-rationale contract are present in canonical content and mirrors are byte-identical.
- It rejects a missing/invalid profile fixture through S03 once available.

### TEST-R003-S01-002 Preflight Fact Map Fields

Covers:
- REQ-R003-002
- SPEC-R003-S01-002
- BR-R003-002
- EDGE-R003-003
- AC-R003-002

Category / Level:
- Contract / Node test

Required Evidence / Gate Impact:
- template consistency result + S03 preflight fixture reference / blocking

Given:
- Canonical Issue template.

When:
- A semantic Issue is generated from it.

Then:
- It contains confirmed facts, assumptions, production consumer/entry, affected surfaces/planned checks, unrelated worktree changes and human decisions headings.
- S03 treats absent required preflight content as blocked.

### TEST-R003-S01-003 Surface Matrix and Provenance Fields

Covers:
- REQ-R003-003
- SPEC-R003-S01-003
- BR-R003-006
- EDGE-R003-002
- EDGE-R003-005
- AC-R003-003

Category / Level:
- Contract / Node test

Required Evidence / Gate Impact:
- template consistency result + S03 multi-surface fixture result / blocking

Given:
- Canonical Test Design and Evidence templates.

When:
- The consistency suite reads them.

Then:
- They require separate surface, consumer/real-entry, verification and evidence metadata.
- Source and build/release rows are not represented as one passing projection.

### TEST-R003-S01-004 Decision Ownership

Covers:
- REQ-R003-004
- SPEC-R003-S01-004
- INV-R003-001
- AC-R003-004

Category / Level:
- Review / documentation

Required Evidence / Gate Impact:
- review record mapped to S01 / blocking

Given:
- Updated rule, standard and templates.

When:
- The reviewer follows their owner mapping.

Then:
- Durable, contract, implementation and review decisions point to Design, PRD/Spec, Completion Record and Review respectively.
- No new `.agents/notes/` path is introduced.

### TEST-R003-S01-005 Honest Closeout Fields

Covers:
- REQ-R003-005
- SPEC-R003-S01-005
- INV-R003-002
- AC-R003-005
- AC-R003-007

Category / Level:
- Contract / Node test

Required Evidence / Gate Impact:
- template consistency result + S03 closeout fixture result / blocking

Given:
- Canonical Issue template.

When:
- Completion Record fields are inspected.

Then:
- Executed tests/evidence, skipped checks, verified behavior, known limitations/residual risk and intentionally untouched surfaces are distinct.
- Completion wording never equates focused validation with QA acceptance.

## 5. Required Coverage and Regression

Applicable coverage:
- Unit: Node template consistency checks.
- Integration: S03 fixtures parse new template shape.
- Contract: all canonical/mirror templates remain byte-identical.
- Security: no secret/PII fields are added.
- Compatibility: existing templates retain GoalSpec v2 source/version/evidence semantics.
- E2E/manual, performance, concurrency, migration and failure injection: Not applicable — S01 changes static rule/template assets only.

Regression scope:
- `scripts/checks/goalspec-template-consistency.test.mjs` and R003 S03 fixture tests.

## 6. Affected Observable Surfaces

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | agents read `.rules/project.md`, GoalSpec standard and templates | read canonical fields and consistency tests | Node test output | blocking |
| generated-output | template copies in assets/fullstack/spec-only packs | byte-for-byte mirror assertions | Node test output | blocking |
| cli-config | future `npx specos intake` template consumer | inspect canonical-template source path and no schema break | review record | warning |

## 7. Evidence, Gates, and Flaky Policy

Every execution record identifies TEST/SPEC/ISSUE IDs, source Spec version/hash, commit, environment, timestamp, runner, result, artifact paths and flaky classification.

| Stage | Scope | Required Checks | Evidence | Blocking |
|---|---|---|---|---|
| PR | S01 templates/rules | Node consistency test | normalized run + stdout artifact | yes |
| Merge / nightly | R003 checks | consistency + S03 fixture suite | normalized run | P1 |
| Pre-production | Not applicable | no runtime release surface | rationale | no |

Flaky result policy:
- A filesystem/parse failure is deterministic until proven otherwise; preserve attempts and do not retry into PASS without classification.

## 8. Agent Eval Plan

- Dataset: `R003 engineering-discipline fixtures v1`; S03 owns the 16 categorized fixtures.
- PR smoke selection: all fixture classes touching template fields, at least 16 cases.
- Passing threshold: 100% expected fixture outcome; semantic/high-risk false-N/A is 0; profile/evidence selection accuracy is at least 90%.
- Retained trajectory: source field, profile, surface rows, error code and report path.
- Human review: testing-agent reviews generated cases, assertions and gate impact before approval.

## 9. Exit Criteria

- [ ] Every P1 mapped REQ and SPEC has scenario coverage.
- [ ] Applicable BR, INV, EDGE and AC have a verification method.
- [ ] Canonical/mirror consistency and S03 fixture checks pass with current evidence.
- [ ] Review confirms no parallel Note artifact or GoalSpec mode was added.
- [ ] Evidence is bound to the current Spec version/hash and commit.
- [ ] No unresolved P0/P1 defect remains.
