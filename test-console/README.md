# SpecOS Test Console

Independent verification console for spec-driven API and scenario results.

## Data Source

This app reads GoalSpec artifacts directly from each selected child spec:

- `../.requirements/requirements/R0NN-<slug>/specs/SNN-<slug>/evidence/plans/*.json`
- `../.requirements/requirements/R0NN-<slug>/specs/SNN-<slug>/evidence/artifacts/*.json`
- `../.requirements/requirements/R0NN-<slug>/specs/SNN-<slug>/evidence/runs/*.json`

It does not parse Bruno or Playwright native output directly. Those tools should be normalized into `.requirements/` first.

## Local Run

```bash
cd test-console
npm install
npm run dev
```

## Refresh Data

Generate a new normalized result from the repository root:

```bash
node scripts/orchestration/test-runner.mjs R001-R002-goalspec-console/S01-evidence-console/S01-create-order 1.2.0 all
```

Then reload the console to see the newest run.

## Manual Trigger From UI

The home page includes a manual trigger form.

- Choose a child spec from `R0NN-<slug>/SNN-<slug>`
- Choose `API`, `Scenario`, or `API + Scenario`
- Submit the form

The server action will call `scripts/orchestration/test-runner.mjs`, write evidence into the selected child spec, and redirect back to the spec detail page.
