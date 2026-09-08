---
name: prd-to-spec
description: Use when converting an approved PRD or precise Issue entry into independently deliverable child Spec Packages.
---

# Entry to Spec — GoalSpec

Transform a peer requirement entry (`prd.md` or `issue.md`) into executable
system contracts. A Spec Package is the direct implementation authority. This
skill does not create implementation work and does not require a Test Design
before implementation can begin.

## Inputs and output

Read repository rules, `index.yaml`, the selected entry, relevant design/code,
and existing evidence. For each genuinely independent business outcome write
one `specs/S0N-<slug>/spec.md`, and update only the aggregate index. Record
`source_entry` and `source_entry_kind: prd|issue`. Split only for independent
ownership, lifecycle, or acceptance; never by technical layer or file.

## Handoff

For a bug already covered by an approved Spec, reuse the existing contract and
hand off to implementation. Create or revise a Spec only for a missing or
changed behavior contract; preserve existing acceptance and historical evidence.

```text
approved PRD or Issue → child spec.md → direct implementation
                                      ↘ spec-to-test when verification is requested
```

The Spec must define observable behavior, invariants, constraints, errors,
side effects, risk, non-goals, and acceptance mapping. It must not contain test
results, execution notes, or duplicate Evidence. When an Issue changes public
behavior, revise and version the affected Spec rather than letting the Issue
become a competing contract.
