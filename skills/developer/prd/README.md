# PRD Generator Skill

Generate structured Product Requirements Documents (PRD) for new features. Focused solely on producing a clear, implementable PRD — Precise bug/local-change intake belongs to `to-issues`; technical design is handled separately.

## Features

- Clarifies unresolved product decisions proportionally to the request
- Generates a well-structured PRD with user stories, numbered functional requirements, non-goals, success metrics, and more
- Enforces verifiable acceptance criteria (observable / testable / verifiable)
- Supports user review and adjustment before saving
- Classifies the Requirement Workspace as `feature`, `change`, `bug`, or `refactor`
- Saves to `<artifacts.requirementsDir>/R0NN-<slug>/` with `prd.md`, `index.yaml`, and root `acceptance.md`
- Bilingual (Chinese & English) edge case handling

## Workflow

Use PRD for product requirements. For a precise bug, regression, or local change,
use `/to-issues` to write a peer root `issue.md` and associate the affected Spec.
An existing approved Spec may directly guide a repair; revise it only when its
contract changes.

The product-requirement pipeline:

| Stage | Skill | Purpose |
|-------|-------|---------|
| 1. Requirements | `/prd` (this skill) | Define *what* to build |
| 2. Child Spec Package | `/prd-to-spec` | Create one or more modular child Specs |
| 3. Independent Test Design | `/spec-to-test` | Derive verification from each approved child Spec |
| Implementation | implementation-agent | Implement the approved Spec and record evidence |

Independent Test Design is required when the verification scope calls for it;
it is not a prerequisite for ordinary implementation.

After a PRD is confirmed, run `/prd-to-spec`. Do not skip directly to implementation when the project requires Spec traceability.

## Usage

Trigger with prompts like:

- "create a prd for..."
- "write prd for..."
- "写PRD"
- "需求文档"
- "需求分析"

## Files

- `SKILL.md` — Skill definition and instructions
- `test-prompts.json` — Test prompts for validation

## Attribution

This skill is adapted from [ralph/skills/prd](https://github.com/snarktank/ralph/tree/main/skills/prd).
