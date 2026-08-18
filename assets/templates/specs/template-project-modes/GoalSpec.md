# GoalSpec

`GoalSpec` is the workflow-driven mode built around a versioned, dual-track delivery loop.

```
/prd -> /prd-to-spec -> approved Feature Spec
  ├── /to-issues -> implementation
  └── /spec-to-test -> approved Test Spec -> /to-issues -> verification
      -> /review-it -> /ship-it
```

Use it when:

- the team wants repeatable, modular requirement/design/implementation/verification handoffs
- implementation and verification Issues should stay small and independently reviewable
- explicit review and ship gates matter, but full role-separated QA/audit governance does not (yet)
