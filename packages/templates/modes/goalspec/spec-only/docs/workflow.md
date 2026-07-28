# GoalSpec Workflow

GoalSpec runs a versioned dual-track workflow as the project's standard delivery chain:

```
/prd -> /prd-to-spec -> approved Feature Spec
  ├── /to-issues -> implementation
  └── /spec-to-test -> approved Test Spec -> /to-issues -> verification
      -> /review-it -> /ship-it
```

| Step | Command | Output |
| --- | --- | --- |
| Plan | `/prd` | PRD in `spec-draft/` |
| Specify | `/prd-to-spec` | One or more modular, approved Feature Specs in `specs/` |
| Split implementation | `/to-issues` | Implementation Issues linked to the exact Feature Spec version |
| Specify verification | `/spec-to-test` | Independent Test Spec in `tests/specs/`, bound to the approved Feature Spec version |
| Split verification | `/to-issues` | Verification Issues linked to the exact Test Spec version |
| Execute | host agent or `/loop-it` | Implementation and verification evidence |
| Review | `/review-it` | `specs/RP-xxx/review.md` |
| Ship | `/ship-it` | Commit, PR, merge, `specs/RP-xxx/changelog.md`, issue closed |

Even a small feature keeps one approved Feature Spec. A Test Spec may be lightweight, but it must identify the source Feature Spec version whenever independent verification is required.

Batch multiple issues with `/loop-it` when several independent issues are ready to run back to back.
