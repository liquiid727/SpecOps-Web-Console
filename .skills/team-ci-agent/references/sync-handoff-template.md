# Sync Handoff Template

Use this template when a semantic change may affect specs, rules, agents, workflows, tests, checks, generated artifacts, or release evidence.

```markdown
## Sync Handoff
source_spec_or_rule: <spec, draft, rule, or workflow path>
changed_surface:
  - <paths changed in this task>
neighbor_assets_checked:
  - <path or surface checked, with short result>
updated_assets:
  - <path updated, or none>
waived_assets:
  - <path or surface not updated + reason>
open_sync_risks:
  - <risk, or none>
owner_agent: <registered role from .agents/manifest.yaml, or pola>
next_gate: <review | test | ci | qa | promote | none>
```

Status guidance for `CI Record`:

- `pass`: all relevant neighbor assets were updated or explicitly waived.
- `partial`: sync evidence exists, but at least one relevant neighbor asset is unresolved.
- `fail`: sync evidence is missing for a semantic change, or a known required neighbor update is absent.
- `not_applicable`: the edit is typo-only, formatting-only, or otherwise non-semantic, and the reason is recorded.
