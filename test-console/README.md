# SpecOS Test Console

Independent verification console for spec-driven API and scenario results.

## Data Source

This app reads repository artifacts directly from:

- `../.requirements/plans/*.json`
- `../.requirements/*.json`

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
node scripts/orchestration/test-runner.mjs reward-order 1.2.0 all
```

Then reload the console to see the newest run.

## Manual Trigger From UI

The home page includes a manual trigger form.

- Choose a spec from `.requirements/plans/*.json`
- Choose `API`, `Scenario`, or `API + Scenario`
- Submit the form

The server action will call `scripts/orchestration/test-runner.mjs`, write a new normalized result into `.requirements/`, and redirect back to the spec detail page.
