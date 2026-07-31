# Deliver Chat-first session creation with capability-aware launch configuration

## Description
Let a ready user select a workspace and engine, enter a task, and create a structured Chat Session from Quest Home without exposing raw command arguments in the primary flow.

## Acceptance Criteria
- [x] Quest Home supports task-first creation with workspace, engine/profile, model, and permission choices.
- [x] Session names are derived from the task summary and a structured Chat Session is the default when supported.
- [x] Default and real read-only Plan mode are the only visible MVP02 work modes.
- [x] Unsupported Chat falls back to an explicit Terminal or remediation path; it never silently downgrades.
- [x] Empty, loading, ready, and failure states retain the draft and ship in English and Chinese.

## Dependencies
Issues #061, #065

## Type
fullstack

## Priority
high

## SPEC Reference
CLI-GUI-023; desktop PRD TR-003, FR-TR-2/3/4; UI interaction SPEC Sections 1 and 4.

## Validation
- Browser E2E for Workspace to first Chat turn with supported and unsupported Engine fixtures.

## Local Review Status

- Accepted on 2026-07-30: QuestHome fully implements task-first flow with workspace/profile/model selection.
- CHAT_ENABLED flag gates chat; downgrade toast shows i18n reason (5 downgradeReason keys in en/zh).
- quickCreateSession derives session name from task content (first 48 chars).
- Engine readiness drives chat eligibility via runtime.engines.engineReadiness API.
