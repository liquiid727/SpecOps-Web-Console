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

## Engineering Discipline Gate

Use this focused preflight/closeout gate for one selected R003-style child
package. It validates only Issues that declare `change_profile` (or an
Execution Preflight), writes a JSON report below that package, and never
changes Issue status or QA acceptance.

```bash
node scripts/checks/engineering-discipline.mjs R003-engineering-discipline/S01-engineering-discipline-contract
node scripts/checks/engineering-discipline.mjs R003-engineering-discipline/S01-engineering-discipline-contract --phase closeout
```

The default phase is `preflight`; `closeout` checks completed, verified, or
explicitly blocked opted-in Issues. A non-zero exit and a `blocked` report mean
the owning Issue must be corrected before its existing workflow can advance.
