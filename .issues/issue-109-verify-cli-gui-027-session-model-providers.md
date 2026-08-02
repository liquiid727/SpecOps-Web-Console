# Verify CLI-GUI-027 Session Model Providers

## Traceability

- Spec ID: `CLI-GUI-027`
- Source Spec: `.features/CLI-GUI-027-session-model-providers/spec.md`
- Test Spec: `.features/CLI-GUI-027-session-model-providers/test-spec.md`
- Test Spec Version: `1.0`
- Test Plan: `tests/plans/CLI-GUI-027.test-plan.json`
- Source Spec Hash: `58adb167ab70d94016e3404d54e63862fa71523bbdb6d4f9e67077160f641319`
- Test Spec Hash: `04dcfef362350afb75a4a7f8e0097eec1e9a2536154659db04182f2d02a77382`

## Scope

Run provider CRUD, v4-to-v5 migration, protocol launch injection, missing-credential blocking, model merge, session isolation, and secret-canary scans. Browser grouping is a warning gate until Chrome evidence exists.

## Gate

Blocking: migration, launch isolation, missing credentials, redaction, no-provider compatibility, and concurrency. Warning: provider/session browser grouping.

## Status

Ready for independent test execution; no normalized result is claimed until the commands and evidence artifacts are recorded.
