# Test plan — issue 109

## Aggregate scope

Re-run the independent gates for CLI-GUI-027 in dependency order: provider storage/migration, launch injection/isolation, then browser Provider flow. The aggregate must use fresh commands and source evidence, not stale issue checkboxes.

## Commands

```text
npm --prefix cli-gui run test -- --run server/store.test.ts server/application.test.ts server/profile-adapters.test.ts server/model-catalog.test.ts
SPECOS_E2E_PROVIDER_UI=1 npm --prefix cli-gui run test:e2e:playwright -- --workers=1 --timeout=60000 --reporter=line provider-management.spec.ts
npm --prefix cli-gui run typecheck
npm --prefix cli-gui run lint
npm --prefix cli-gui run ui:check
npm --prefix cli-gui run build
npx specos check
```

## Acceptance

Accept the local aggregate only when all three source gates and static checks pass, with inherited limitations preserved in the normalized result. Current decision: `accepted-with-waiver`.
