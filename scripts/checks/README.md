# Checks

Repository validation commands such as `xcli check`-style gates belong here.

## Spec Test Gates

Use `spec-test-gates.mjs` after building the CLI to validate normalized test evidence for one spec or every `tests/plans/*.test-plan.json` file.

```bash
npm run build
node scripts/checks/spec-test-gates.mjs reward-order
node scripts/checks/spec-test-gates.mjs reward-order --change reward-order-create
node scripts/checks/spec-test-gates.mjs
```

The script delegates to:

```bash
node packages/cli/dist/main.js validate-test-gates <specId> [--change <changeId>]
```

It exits non-zero when required normalized evidence is missing, failed, or mismatched. Missing evidence is a release blocker, not a pass.

When called from the developer test console `gate` scope, this command is recorded in the run session with its stdout/stderr summary and generated `*.gate-report.json` path. The UI must treat a non-ready report as a blocking release signal and keep the command locally reproducible for CI parity.
