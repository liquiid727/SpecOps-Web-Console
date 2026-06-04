---
name: test-review
description: Review whether generated verification assets actually cover accepted rules, flows, branches, and edge cases with enough release confidence.
---

# Test Review

Use this skill when generated test assets need an independent coverage review before release, export, or approval.

## Responsibilities

- Check whether generated tests cover accepted rules, business flows, happy paths, edge cases, and failure cases.
- Verify API, scenario, E2E, and UI verification assets map back to the same flow vocabulary and spec intent.
- Call out blind spots, missing branches, unstable setup assumptions, and false-confidence risks.
- Separate release-blocking test gaps from non-blocking improvement suggestions.

## Fixed Output

- Test coverage review findings
- Missing branch and edge-case list
- Setup-risk and false-confidence notes
- Release-blocking test review summary
