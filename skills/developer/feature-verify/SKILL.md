---
name: feature-verify
description: Use when a GoalSpec child Spec Package or complete Requirement Workspace needs a QA acceptance decision from current implementation evidence, review findings, normalized verification evidence, and entry acceptance criteria.
---

# Feature Verify — GoalSpec QA Acceptance

Before deciding QA, reconcile evidence with the [Verification Evidence Handoff](../../ai/workflows/verification-evidence-handoff.md): inspect coverage and gap rows, verify result/artifact references, and account for every required TEST. Passing totals or loop state do not prove package coverage.

Write QA decisions from current, traceable facts. This skill verifies one child
package first, then aggregates the root requirement; it never implements code,
creates Test Designs, changes implementation scope, or rewrites evidence.

## Invocation and authority

Use the installed `feature-verify` Skill, or resolve its canonical repository path from the project's role manifest. In SpecOS that path is `skills/developer/feature-verify/SKILL.md`, owned by `qa-agent`. Read the actual instructions before acting; a role or command name alone is not an executable tool. If neither source is available, report the missing QA entrypoint instead of substituting a clean review.

Writing acceptance requires an explicit QA/acceptance request or a delivery workflow whose authorized scope includes QA decisions. An implementation-only batch stops at its execution target and reports QA as a separate next stage. Missing evidence is not permission to fabricate acceptance or waive a gate.

## Inputs and authority

Select one `R0NN/S0N` child package, or a root `R0NN` only after its required
children are evaluated. Read in order: repository rules and design; root
`prd.md` or `issue.md`; `index.yaml` and its `specs[].required` entries; child `spec.md`,
optional `test.md`, `review.md`, `evidence/implementation.md`,
`evidence/index.yaml`, evidence artifacts, and
child `acceptance.md`. For root aggregation, read every required child
`acceptance.md` and mapped PRD AC/UAT evidence.

## Child-package decision

Before deciding, verify:

- the child Spec is approved; when independent verification is required, its
  Test Design is approved and its Spec version/hash binding is current;
- implementation evidence identifies the current revision and reports no
  unresolved blocking deviation;
- every blocking TEST has normalized current evidence registered in
  `evidence/index.yaml` with TEST, SPEC/version, entry, commit, environment,
  time, result, and flaky classification;
- Test exit criteria, mapped AC, Review Gate, and any applicable release gates
  are satisfied.

Write only the child `acceptance.md` decision, Evidence Manifest, implementation/test
coverage, blockers, review state, residual risk, promotion recommendation, and
waiver details. Set `decision: accepted` only when all conditions pass; set
`blocked` for missing, stale, failed, or unresolved evidence/gates. Use
`accepted-with-waiver` only for an explicit human-approved waiver with risk,
owner, approver, rationale, expiry, and follow-up entry or tracked action.

The child template has no lifecycle status field: QA MUST NOT invent a `status` field. Preserve prior evidence and cite it as stale rather than rewriting it to match a new Spec or commit.

## Root requirement decision

Use `index.yaml.specs[].required`, not a PRD `required_specs` field, to decide
which child packages gate the root. The root Acceptance aggregates each required
child decision, then maps each PRD AC and UAT result to child acceptance and
evidence.

The root may record `decision: blocked` and `promotion: denied` while a required
child is missing, blocked, or unaccepted. It MUST NOT record `accepted` or
`accepted-with-waiver` until all required children are accepted or explicitly
human-waived, every PRD AC/UAT is verified, and no blocking Open Question
remains.

## Stop conditions

Stop and record `blocked` rather than guessing when a source artifact is
missing, version-mismatched, raw/unindexed, flaky/unclassified, or has an open
blocking review finding. Return test-asset gaps to verification work and code
defects to implementation work. `review-it` may supply findings and `ship-it`
may deliver an accepted package, but neither replaces this QA decision.
