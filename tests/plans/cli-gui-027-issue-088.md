# Test plan — issue 088

## Scope

Verify the existing Provider management UI and session-level Provider selection in a real browser, including CRUD feedback, protocol-compatible filtering, two independent conversations, and secret redaction.

## Fixture boundary

Set `SPECOS_E2E_PROVIDER_UI=1` to create two configured OpenAI-compatible Providers backed by synthetic read-only `env:` references. The fake headless CLI is local and deterministic. No real provider network or OS credential store is used.

## Scenarios

1. Enter the primary SettingsView, open Models, create a Provider, read it, edit it, confirm deletion, and verify it is removed.
2. Open Advanced create, select the headless Codex profile, and verify the Provider connection list contains only configured compatible Providers A/B.
3. Create a Chat session with Provider A and another with Provider B; complete distinct prompts; switch back and verify transcript isolation.
4. Fetch state and inspect the page/evidence record to ensure synthetic credential values are absent.

## Commands

```text
SPECOS_E2E_PROVIDER_UI=1 npm --prefix cli-gui run test:e2e:playwright -- --workers=1 --timeout=60000 --reporter=line provider-management.spec.ts
SPECOS_E2E_PROVIDER_UI=1 npm --prefix cli-gui run test:e2e:playwright -- --workers=1 --repeat-each=2 --timeout=60000 --reporter=line provider-management.spec.ts
npm --prefix cli-gui run typecheck
npm --prefix cli-gui run lint
npm --prefix cli-gui run ui:check
npm --prefix cli-gui run build
npx specos check
```

## Evidence and acceptance

The test emits PNG, trace, and token-free JSON artifacts under `cli-gui/test-results/`; the normalized result is `tests/results/cli-gui-027.issue-088.local.json`. Browser acceptance is `accepted-with-waiver` because the test engine and credentials are synthetic.
