# GoalSpec

`GoalSpec` is the workflow-driven mode built around a versioned, dual-track delivery loop.

```
/prd -> /prd-to-spec -> approved Feature Spec
  ├── /to-issues -> implementation
  └── /spec-to-test -> approved Test Spec -> /to-issues -> verification
      -> /review-it -> /ship-it
```

Keep an issue index alongside the feature workspace:

```text
README.md
current/
design/
docs/workflow.md
.features/
  roadmap.md
  issues/
    README.md
  RP-001-example/
tests/
  .features/
.agents/
```
