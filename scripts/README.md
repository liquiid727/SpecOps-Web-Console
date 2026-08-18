# Scripts

Local execution and automation entrypoints live here.

## Request Routing

Use the CLI request router before starting non-trivial requirement work:

```bash
npm run build --workspace @specos/cli
node packages/cli/dist/main.js route-request --request "强化测试 UI，覆盖 API、E2E、性能、并发，并接入 CI gate"
```

The router classifies the request and returns the primary agent, supporting agents, rules, role-bound skills, and whether the request must be attached to a Requirement Package under `.requirements/requirements/R0NN-<slug>/` (`prd.md` → `spec.md` → `test.md` → `issues.md`).
