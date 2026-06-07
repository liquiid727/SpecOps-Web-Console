# Workflows

Use this directory for documented orchestration flows that connect prompts, agent roles, review stages, and execution gates.

## Test Console Workflow

The `test-console-v1.yaml` workflow documents the minimal independent verification loop:

`accepted spec -> test-plan -> API/Scenario execution -> normalized result -> report UI -> QA acceptance`

`qa-agent` owns the final acceptance pass after implementation, independent test evidence, reviewer findings, and gate reports exist. It does not create test assets or replace CI; it records the final quality decision, blockers, residual risks, waivers, and promotion recommendation.

## Nested Agent Orchestration

`nested-agent-orchestration.md` documents the entry-agent to primary-agent to supporting-agent model used by host runtimes. It keeps `.agents/manifest.yaml` as the only role registry, treats `route-request` as a preview, and assigns `pola` responsibility for task boundaries, report merge, and final actionable synthesis.
