# Test Engineering Platform Execution Plan

## Completed Slices

1. Core schema extension for production test plans and normalized results.
2. CLI adapter commands for API, performance, and concurrency execution.
3. CLI gate report generation and CI check wrapper.
4. Test-console readiness summary and overview/spec detail surfacing.
5. Performance and concurrency test agent role registration.

## Remaining Slices

1. Add dedicated test-console subroutes:
    - `/spec/[specId]/plan`
    - `/spec/[specId]/api`
   - `/spec/[specId]/scenario`
    - `/spec/[specId]/performance`
    - `/spec/[specId]/concurrency`
    - `/spec/[specId]/gates`
2. Add route-level tests for those pages.
3. Integrate ready gate reports into `promote-change`.
4. Add migration or compatibility handling for old `tests/results/*.json`.

## Newly Completed Slices

6. Dedicated test-console subroutes for plan, API, scenario/E2E, performance, concurrency, and gates.
7. Route-level tests for the dedicated test-console pages.
8. Promotion gate check requiring ready gate reports for change-attached test plans.

## Validation Commands

```bash
npm test
npm run build
cd test-console && npm run test && npm run build
node scripts/checks/spec-test-gates.mjs reward-order
```
