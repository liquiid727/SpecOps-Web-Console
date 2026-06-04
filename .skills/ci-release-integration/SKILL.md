---
name: ci-release-integration
description: Wire spec validation, test execution, bundle checks, and manual approval gates into CI so releases stay aligned with accepted specs.
---

# CI Release Integration

Use this skill when a repository needs CI entrypoints and release checks that keep specs, generated artifacts, tests, and bundle outputs aligned.

## Responsibilities

- Integrate spec validation, test execution, and bundle checks into CI entrypoints.
- Verify generated specs, contracts, tests, and bundle outputs stay aligned with accepted spec decisions.
- Mark which failing scenarios are release-blocking for affected flows.
- Surface the referenced spec version or bundle id in release evidence.
- Keep manual approval steps explicit before irreversible workflow actions.

## Fixed Output

- CI pipeline and gate checklist
- Blocking test and release condition matrix
- Manual approval and handoff notes
- Validation/reporting integration summary
