# Test Plans

This directory stores normalized `test-plan` artifacts derived from SpecOS Contracts.

Each plan should define:

- `spec_id`
- `spec_version`
- feature name
- Project Memory vs draft source
- business `flows` with ordered `stages`
- endpoint list with branch coverage, preconditions, expected results, and related rule
- scenario list with steps, branches, preconditions, and expected results

`test-plan` is the semantic bridge between SpecOS Contracts and concrete execution assets such as Bruno collections or scenario scripts.
