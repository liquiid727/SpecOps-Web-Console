# Reward Order Ready Gate Report

- Spec ID: `reward-order`
- Spec Version: `1.2.0`
- Change ID: `reward-order-ready`
- Decision: blocked

## Required Gates

- reward-order-ready-gate: release, required api, scenario, performance, concurrency, blocking

## Passed Gates

- none

## Failed Gates

- reward-order-ready-gate
- production-standard

## Missing Evidence

- none

## Blockers

- std.p0.api.contract failed: happy/error 断言通过，limit 分支通过但 p95 偏高
- std.p1.security.api failed: happy/error 断言通过，limit 分支通过但 p95 偏高
- reward-order-ready-gate api failed: happy/error 断言通过，limit 分支通过但 p95 偏高

## Standard Compliance

- std.p0.api.contract: passed, P0, owner test-editor, impact blocking
- std.p0.api.contract: passed, P0, owner test-editor, impact warning
- std.p0.api.contract: failed, P0, owner test-editor, impact blocking
- std.p0.api.contract: passed, P0, owner test-editor, impact warning
- std.p0.scenario.e2e: passed, P0, owner playwright-test-agent, impact blocking
- std.p0.scenario.e2e: passed, P0, owner playwright-test-agent, impact blocking
- std.p0.performance.slo: passed, P0, owner performance-test-agent, impact blocking
- std.p0.concurrency.invariant: passed, P0, owner concurrency-test-agent, impact blocking
- std.p1.security.api: passed, P0, owner test-editor, impact blocking
- std.p1.security.api: passed, P0, owner test-editor, impact warning
- std.p1.security.api: failed, P0, owner test-editor, impact blocking
- std.p1.security.api: passed, P0, owner test-editor, impact warning
- std.p0.api.contract: passed, P0, owner test-editor, impact blocking
- std.p0.api.contract: passed, P0, owner test-editor, impact warning
- std.p0.api.contract: failed, P0, owner test-editor, impact blocking
- std.p0.api.contract: passed, P0, owner test-editor, impact warning
- std.p0.scenario.e2e: passed, P0, owner playwright-test-agent, impact blocking
- std.p0.scenario.e2e: passed, P0, owner playwright-test-agent, impact blocking
- std.p0.performance.slo: passed, P0, owner performance-test-agent, impact blocking
- std.p0.concurrency.invariant: passed, P0, owner concurrency-test-agent, impact blocking

## Risk Summary

- P0: passed 17, failed 3, missing 0, blocked 3
- P1: passed 0, failed 0, missing 0, blocked 0
- P2: passed 0, failed 0, missing 0, blocked 0

## Agent Evidence Summary

- test-editor: passed 9, failed 3, missing 0, waived 0
- concurrency-test-agent: passed 2, failed 0, missing 0, waived 0
- performance-test-agent: passed 2, failed 0, missing 0, waived 0
- playwright-test-agent: passed 4, failed 0, missing 0, waived 0
