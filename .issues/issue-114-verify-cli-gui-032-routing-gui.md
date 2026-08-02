# Verify CLI-GUI-032 Model Routing GUI and Recovery UX

## Traceability

- Spec ID: `CLI-GUI-032`
- Source Spec: `.features/CLI-GUI-032-model-routing-gui/spec.md`
- Test Spec: `.features/CLI-GUI-032-model-routing-gui/test-spec.md`
- Test Spec Version: `1.0`
- Test Plan: `tests/plans/CLI-GUI-032.test-plan.json`
- Source Spec Hash: `55c097fdebff4722bf7601ce7af9098bd720effb02c71a9a1a22809bd66780f6`
- Test Spec Hash: `1c06216ce8b095b0ce21f0a34e1fac2dcb33864cab56c58f27d5317662d671e7`

## Scope

Run Settings CRUD, server-resolved route display, fixed-once clearing, second-send inheritance, Attempt timeline/recovery, empty/loading/failure/readonly states, EN/ZH, keyboard focus/order, 1280/900/640 responsive checks, and the browser journey from issue-107.

## Gate

Blocking: server-fact-only routing, send/fixed clearing, Attempt recovery, accessibility/focus, no-overflow, EN/ZH, and browser evidence. Chrome/OS gaps remain explicit blockers.

## Status

Ready for independent test execution; browser assertions and secret-canary evidence are not claimed until Chrome runs successfully.
