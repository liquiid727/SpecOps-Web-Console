# Test Plan — Issue 093

Verify the Deployment registry and API contract against the CLI-GUI-029 spec, including deterministic eligibility and mutation safety.

## Domain and API matrix

- Test Provider/Profile protocol and engine compatibility, verified model catalog, SecretStatus, unknown/disabled/invalid/archived eligibility and exclusion codes.
- Test GET list/detail, POST/PATCH/DELETE, duplicate ID and tuple identity, missing references, unknown model, missing credential, readonly, Origin/CSRF, and secret-free response/state/logger boundaries.
- Test archive tombstone, active Route/Session/binding protection, archived re-enable rejection, and PATCH field validation.

## Concurrency matrix

- Serialize same-tuple POST and concurrent archive/delete in one application process; assert one authoritative winner and stable conflict code.
- Require a separate cross-process runner before claiming multi-process lock safety.

## Release boundary

Browser/platform are N/A for the feature-specific test spec. Real external Provider and packaged-host behavior are not inferred from synthetic fixtures; missing evidence keeps the QA decision blocked.
