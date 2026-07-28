# PRD Generator Skill

Generate structured Product Requirements Documents (PRD) for new features. Focused solely on producing a clear, implementable PRD — Issue decomposition and technical design are handled by separate skills.

## Features

- Asks 3-5 clarifying questions with lettered options for quick iteration
- Generates a well-structured PRD with user stories, numbered functional requirements, non-goals, success metrics, and more
- Enforces verifiable acceptance criteria (observable / testable / verifiable)
- Supports user review and adjustment before saving
- Classifies the PRD as `feature`, `epic`, or `system`
- Saves to the directory declared by `.specos/manifest.yaml` `artifacts.draftsDir` (default `.prd/`), falling back to legacy `spec-draft/` or `tasks/` conventions
- Bilingual (Chinese & English) edge case handling

## Workflow

The PRD skill is the first step in the spec-driven pipeline:

| Stage | Skill | Purpose |
|-------|-------|---------|
| 1. Requirements | `/prd` (this skill) | Define *what* to build |
| 2. Feature Spec | `/prd-to-spec` | Create one or more modular Feature Specs |
| 3. Independent Test Spec | `/spec-to-test` | Derive verification from each approved Feature Spec |
| 4. Work decomposition | `/to-issues` | Create separate implementation or verification tickets |

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
