# Sync Handoff

source_spec_or_rule: `specs/changes/sync-handoff-gateway/spec.md`

changed_surface:

- `specs/changes/sync-handoff-gateway/`
- `ai/workflows/`
- `.skills/team-ci-agent/`
- `.agents/README.md`
- `rules/ci/spec-release-gates.md`

neighbor_assets_checked:

- `.agents/manifest.yaml`: no role registry change required; existing `ci-editor` already owns `team-ci-agent`.
- `ai/workflows/nested-agent-orchestration.md`: updated to require `pola` sync judgment for semantic changes.
- `ai/workflows/README.md`: updated to list the new gateway.
- `.agents/README.md`: updated shared rule for role users.
- `.skills/team-ci-agent/SKILL.md`: updated read order and sync rules.
- `.skills/team-ci-agent/references/ci-record-template.md`: updated stable CI Record schema.
- `rules/ci/spec-release-gates.md`: updated PR fast gate and promote gate expectations.

updated_assets:

- `ai/workflows/sync-handoff-gateway.md`
- `.skills/team-ci-agent/references/sync-handoff-template.md`
- `.skills/team-ci-agent/SKILL.md`
- `.skills/team-ci-agent/references/ci-record-template.md`
- `ai/workflows/README.md`
- `ai/workflows/nested-agent-orchestration.md`
- `.agents/README.md`
- `rules/ci/spec-release-gates.md`

waived_assets:

- `.agents/manifest.yaml`: waived because no new role or skill binding is needed; `ci-editor` already binds `team-ci-agent`.
- `scripts/checks/`: waived for this slice because semantic judgment is documented first; machine checks can be added after teams use the handoff format.
- `tests/`: waived because this is a documentation and CI record schema contract change without runnable behavior in this slice.

open_sync_risks:

- Future automation may need a script check for required `Sync Handoff` sections, but the first slice keeps the gate human-readable.

owner_agent: `pola`

next_gate: `ci`
