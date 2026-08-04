# CLI GUI 020 Mvp02a Rebaseline Gate Report

- Spec ID: `CLI-GUI-020`
- Spec Version: `1.0`
- Change ID: `CLI-GUI-020-mvp02a-rebaseline`
- Decision: blocked

## Required Gates

- cli-gui-020-independent-verification: change-verification, required unit, scenario, concurrency, blocking
- cli-gui-020-specialized-and-release-readiness: release, required specialized, blocking

## Passed Gates

- none

## Failed Gates

- cli-gui-020-independent-verification
- cli-gui-020-specialized-and-release-readiness
- production-standard

## Missing Evidence

- std.p0.api.contract missing normalized evidence
- std.p0.scenario.e2e missing normalized evidence
- std.p1.observability missing normalized evidence
- cli-gui.020.unit missing normalized evidence
- cli-gui.020.concurrency missing normalized evidence
- cli-gui-020-independent-verification missing unit result
- cli-gui-020-independent-verification missing scenario result
- cli-gui-020-independent-verification missing concurrency result
- cli-gui-020-independent-verification missing trace evidence
- cli-gui-020-specialized-and-release-readiness missing specialized result
- cli-gui-020-specialized-and-release-readiness missing raw-report evidence

## Blockers

- none

## Standard Compliance

- std.p0.api.contract: missing, P0, owner test-editor, impact blocking
- std.p0.scenario.e2e: missing, P0, owner playwright-test-agent, impact blocking
- std.p1.observability: missing, P0, owner test-editor, impact blocking
- cli-gui.020.unit: missing, P0, owner unit-test-agent, impact blocking
- cli-gui.020.concurrency: missing, P0, owner concurrency-test-agent, impact blocking
- gate.cli-gui-020-independent-verification.unit: missing, P0, owner unit-test-agent, impact blocking
- gate.cli-gui-020-independent-verification.scenario: missing, P0, owner playwright-test-agent, impact blocking
- gate.cli-gui-020-independent-verification.concurrency: missing, P0, owner concurrency-test-agent, impact blocking
- gate.cli-gui-020-specialized-and-release-readiness.specialized: missing, P0, owner specialized-check-agent, impact blocking

## Risk Summary

- P0: passed 0, failed 0, missing 9, blocked 9
- P1: passed 0, failed 0, missing 0, blocked 0
- P2: passed 0, failed 0, missing 0, blocked 0

## Agent Evidence Summary

- concurrency-test-agent: passed 0, failed 0, missing 2, waived 0
- playwright-test-agent: passed 0, failed 0, missing 2, waived 0
- specialized-check-agent: passed 0, failed 0, missing 1, waived 0
- test-editor: passed 0, failed 0, missing 2, waived 0
- unit-test-agent: passed 0, failed 0, missing 2, waived 0
