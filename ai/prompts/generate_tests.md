# Generate Tests

Generate tests from a feature spec by following this order:

1. Derive a normalized `test-plan`.
2. Split the plan into API and Scenario/E2E execution assets.
3. Keep happy, edge, error, limit, and flow branches explicit.
4. Normalize execution outputs into one `scenario-result` model for report consumption.

The generated output should remain traceable to:

- `spec_id`
- `spec_version`
- branch type
- related rules
- preconditions and expected results
