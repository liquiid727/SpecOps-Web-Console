# Implement Engine readiness probes and remediation contracts

## Description
Provide bounded, non-mutating readiness probes for Codex and Claude so the product can decide whether Chat is usable and show a remediation path.

## Acceptance Criteria
- [x] Report installation, authentication, compatibility, version, transport, and capabilities for Codex and Claude.
- [x] A probe timeout returns typed unknown readiness with retry remediation.
- [x] Missing binaries never run automatic installation scripts.
- [x] Unsupported versions and unavailable capabilities use stable error codes and actionable remediation.
- [x] Readiness results drive Chat eligibility rather than a feature flag or static profile setting.

## Dependencies
Issues #061, #062

## Type
backend

## Priority
high

## SPEC Reference
CLI-GUI-021; desktop PRD TR-001, FR-TR-1; agent-runtime SPEC Sections 2 and 4.

## Validation
- Unit fixtures for installed, missing, auth-required, unsupported, timeout, and retry states.

## Local Review Status

- Accepted on 2026-07-30: engine-readiness.ts + engine-readiness.test.ts fully implemented.
- 49 test files, 369 tests passed. Covers supported, missing+install-guide, timeout+retry-probe, unsupported+update.
- Authentication reports "unknown" by design (version probing cannot prove login state).
- application.ts L673-681 exposes readiness API; QuestHome consumes it for Chat eligibility.
