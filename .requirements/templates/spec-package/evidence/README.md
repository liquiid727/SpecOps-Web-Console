# Evidence — S01 <Spec Package Name>

Store or reference immutable execution evidence here, grouped by run or gate.

Every evidence record MUST identify:

- related `TEST-*`, `SPEC-*`, and `ISSUE-*` IDs;
- source Spec version/hash and commit;
- execution environment and timestamp;
- result: passed | failed | blocked | flaky;
- artifact location for report, trace, screenshot, video, or log;
- retry and flaky classification when relevant.

Use one record per evidence item. A minimal record contains:

```yaml
test_id: TEST-R001-S01-001
spec_id: SPEC-R001-S01-001
issue_id: ISSUE-R001-S01-001
source_spec_version: 1.0.0
source_spec_hash: <sha256>
commit: <commit-sha>
environment: <environment>
executed_at: YYYY-MM-DDThh:mm:ssZ
result: passed
artifact: ./run-<id>/report.json
flake: none
```

Raw output becomes QA-gate evidence only when the owning `acceptance.md`
references it with a result and scope.
