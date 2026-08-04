# CLI GUI 025 Mvp02a Rebaseline Gate Report

- Spec ID: `CLI-GUI-025`
- Spec Version: `1.0`
- Change ID: `CLI-GUI-025-mvp02a-rebaseline`
- Decision: blocked

## Required Gates

- cli-gui-025-independent-verification: change-verification, required scenario, compatibility, security, concurrency, blocking
- cli-gui-025-specialized-and-release-readiness: release, required specialized, compatibility, security, blocking

## Passed Gates

- none

## Failed Gates

- cli-gui-025-independent-verification
- cli-gui-025-specialized-and-release-readiness
- production-standard

## Missing Evidence

- std.p0.api.contract missing normalized evidence
- std.p0.scenario.e2e missing normalized evidence
- std.p1.observability missing normalized evidence
- cli-gui.025.compatibility missing normalized evidence
- cli-gui.025.security missing normalized evidence
- cli-gui.025.concurrency missing normalized evidence
- cli-gui-025-independent-verification missing scenario result
- cli-gui-025-independent-verification missing compatibility result
- cli-gui-025-independent-verification missing security result
- cli-gui-025-independent-verification missing concurrency result
- cli-gui-025-independent-verification missing trace evidence
- cli-gui-025-specialized-and-release-readiness missing specialized result
- cli-gui-025-specialized-and-release-readiness missing compatibility result
- cli-gui-025-specialized-and-release-readiness missing security result
- cli-gui-025-specialized-and-release-readiness missing raw-report evidence

## Blockers

- none

## Standard Compliance

- std.p0.api.contract: missing, P0, owner test-editor, impact blocking
- std.p0.scenario.e2e: missing, P0, owner playwright-test-agent, impact blocking
- std.p1.observability: missing, P0, owner test-editor, impact blocking
- cli-gui.025.compatibility: missing, P0, owner specialized-check-agent, impact blocking
- cli-gui.025.security: missing, P0, owner specialized-check-agent, impact blocking
- cli-gui.025.concurrency: missing, P0, owner concurrency-test-agent, impact blocking
- gate.cli-gui-025-independent-verification.scenario: missing, P0, owner playwright-test-agent, impact blocking
- gate.cli-gui-025-independent-verification.compatibility: missing, P0, owner test-editor, impact blocking
- gate.cli-gui-025-independent-verification.security: missing, P0, owner test-editor, impact blocking
- gate.cli-gui-025-independent-verification.concurrency: missing, P0, owner concurrency-test-agent, impact blocking
- gate.cli-gui-025-specialized-and-release-readiness.specialized: missing, P0, owner specialized-check-agent, impact blocking
- gate.cli-gui-025-specialized-and-release-readiness.compatibility: missing, P0, owner test-editor, impact blocking
- gate.cli-gui-025-specialized-and-release-readiness.security: missing, P0, owner test-editor, impact blocking

## Risk Summary

- P0: passed 0, failed 0, missing 13, blocked 13
- P1: passed 0, failed 0, missing 0, blocked 0
- P2: passed 0, failed 0, missing 0, blocked 0

## Agent Evidence Summary

- concurrency-test-agent: passed 0, failed 0, missing 2, waived 0
- playwright-test-agent: passed 0, failed 0, missing 2, waived 0
- specialized-check-agent: passed 0, failed 0, missing 3, waived 0
- test-editor: passed 0, failed 0, missing 6, waived 0
