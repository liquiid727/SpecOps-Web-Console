# Test Specs

`tests/specs/` stores independent, versioned Test Specs derived from approved Feature Specs.

Each Test Spec must include:

- `spec_id`
- exact `source_spec_version`
- source Spec path and immutable hash or revision when available
- `test_spec_version`
- status: `draft`, `in-review`, `approved`, `stale`, or `superseded`
- requirement coverage
- selected API, scenario, UI/E2E, performance, load, stress, concurrency, and security profiles
- test data and environment requirements
- evidence types and release-gate impact
- approval evidence

Test Specs are verification contracts, not executable scripts. Generate test plans, schedules, Bruno collections, browser scenarios, k6 assets, and normalized results downstream.

Mark a Test Spec `stale` whenever its source Feature Spec version or hash changes. Stale Test Specs and mismatched results cannot satisfy review or release gates.
