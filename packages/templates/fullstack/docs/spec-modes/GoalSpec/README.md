# GoalSpec

`GoalSpec` is the workflow-driven operating mode for this project.

Use it when:

- the team wants repeatable, modular requirement/design/implementation/verification handoffs
- implementation and verification Issues should stay small and independently reviewable
- review and ship gates matter, but full role-separated QA/audit governance does not (yet)

Core shape:

```text
project/
  README.md
  docs/spec-modes/
  docs/workflow.md
  current/
  design/
  specs/
    roadmap.md
    issues/
      README.md
    RP-001-example/
      spec.md
      tasks.md
      tests.md
      review.md
      changelog.md
  implementation/
  tests/
    specs/
  .agents/
```

Dual-track delivery loop:

```
/prd -> /prd-to-spec -> approved Feature Spec
  ├── /to-issues -> implementation
  └── /spec-to-test -> approved Test Spec -> /to-issues -> verification
      -> /review-it -> /ship-it
```

Recommended agent loading order:

1. `README.md`
2. `current/`
3. `design/`
4. `specs/issues/`
5. `specs/RP-xxx/`
