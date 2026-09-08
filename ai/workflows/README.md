# Workflows

SpecOS uses peer requirement entries and a direct Spec execution flow:

```text
PRD or Issue entry
  → approved Spec Package
  → direct implementation
  → optional independent Test Design
  → Evidence / Review
  → QA or product Acceptance
```

A PRD is a broad product entry. An Issue is a precise bug, regression, or local
change entry. They are not implementation task queues. A child Spec owns the
executable contract; implementation reads it directly. `test.md` is an
independent verification design and is not a prerequisite for ordinary
implementation. `evidence/implementation.md` records implementation facts and
minimal checks; formal runs, gaps, review, and acceptance evidence live under
the same package.

Implementation is the default mode. Do not add broad tests or repeat checks
without a failure, new change, concrete risk, or explicit request for testing,
QA, regression, release, or production readiness.

- `product-architect-agent`: raw idea or product entry → PRD.
- `to-issues` (owned by `spec-editor`): precise bug, regression, or local change
  → root `issue.md` and index entry → reuse the approved Spec or define/revise
  the contract → implementation → evidence and acceptance.
- `spec-editor`: PRD/Issue entry → child Spec Packages.
- `implementation-agent`: direct execution from approved Spec.
- `testing-agent` / `test-editor`: independent Test Design and verification.
- `qa-agent`: review evidence and record acceptance decisions.

Historical Issue-loop records remain readable but are not required for new
Spec execution.
