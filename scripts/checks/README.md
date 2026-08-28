# Checks

Repository validation commands such as `xcli check`-style gates belong here.

## Spec Test Gates

Use `spec-test-gates.mjs` to validate normalized test evidence for one canonical child selector.

```bash
npm run build
node scripts/checks/spec-test-gates.mjs R002-goalspec-console/S01-evidence-console
node scripts/checks/spec-test-gates.mjs R002-goalspec-console/S01-evidence-console --change evidence-console
```

It exits non-zero when required normalized evidence is missing, failed, or mismatched. Missing evidence is a release blocker, not a pass.

When called from the developer test console `gate` scope, this command is recorded in the run session with its stdout/stderr summary and generated `*.gate-report.json` path. The UI must treat a non-ready report as a blocking release signal and keep the command locally reproducible for CI parity.
