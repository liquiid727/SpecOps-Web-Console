# Workflows

Use this directory for orchestration flows connecting prompts, roles, review
stages and execution gates.

## PRD To Ship Main Chain

The GoalSpec chain is:

    PRD Workspace
    → N × Approved Spec Package
    → N × Test Design
    → N × Issue files
    → implementation / evidence / review
    → child QA acceptance
    → root PRD AC/UAT acceptance
    → ship

The root lives at .requirements/requirements/R0NN-<slug>/. Each child Spec
Package owns spec.md, test.md, issues/, review.md, acceptance.md and evidence/.
A PRD is not an approved Spec baseline, and an Issue Done is not QA acceptance.

## Quality Delivery Pipeline

The main chain also defines the operating quality pipeline:

    PRD / Spec / Test Design testable acceptance
    → implementation and verification tracks
    → code + focused unit tests in the implementation change
    → PR gate: unit + critical path + Agent smoke Eval (when applicable)
    → post-merge / nightly: regression + full Eval + contract + performance
    → pre-production: canary + sampled evaluation + trajectory alerts
    → production: observability + degradation / human handoff
    → incident learning: dataset and test-case updates

- PRD and Spec define testable functional AC. Agent workflows additionally
  declare success metrics, Eval data, thresholds, and handoff conditions.
- The approved Test Design is the independent verification contract. It is
  generated after Spec approval and before Issues are generated; implementation
  unit tests are useful local checks but do not satisfy the independent test
  or release-evidence gate.
- AI may draft cases and analyze failures; a human owner reviews them before
  they become test evidence or influence a release gate.
- The detailed lifecycle and Gate requirements live in
  `docs/spec-modes/GoalSpec/agent-native-sdlc-standard.md`; evidence, Eval,
  CI, and quality-platform rules live in
  `rules/testing/production-test-standards.md`.

- product-architect-agent owns raw idea → root PRD.
- spec-editor owns PRD → child Spec Packages and the bounded Issue generation
  handoff after Test Design approval.
- testing-agent/test-editor owns independent Test Design generation, verification
  strategy and evidence gaps.
- qa-agent owns child/root acceptance decisions after test, review and gate
  evidence exist.

Artifact root locations come from .specos/manifest.yaml and
rules/shared/artifact-locations.md. Legacy root four-file packages remain
read-only evidence.
