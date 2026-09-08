# Codex Local Configuration

This directory contains Codex-specific project configuration and operating notes.

## Files

- `config.toml` (optional; not currently checked in): local Codex runtime configuration.
- `instructions.md`: project behavior selected by SpecOS role prompt assembly; Codex does not automatically load it by filename. Root `AGENTS.md` is the automatic project instruction entrypoint.
- `skills/`: project skills discovered by the current host. Verify the session skill list after changing hosts; do not create duplicate installations to force discovery.
- `../skills/developer/`: repository-wide developer Skill library; roles load these through `.agents/manifest.yaml`.

## Usage

- Keep machine/runtime settings in `config.toml`.
- Keep repository behavior and workflow guidance in `instructions.md` and root `AGENTS.md`.
- Add reusable developer capabilities under `skills/developer/<skill-name>/SKILL.md`, then bind only the roles that need them in `.agents/manifest.yaml`.
- Keep content-creator, education, and Codex-customization Skills in their matching top-level `skills/` collections instead of binding them to developer roles.
- Do not store secrets or personal tokens in this directory.

## Workflow Skill Maintenance

For `prd`, `prd-to-spec`, `spec-to-test`, `to-issues`, `to-design`, `loop-it`,
`review-it`, `feature-verify`, and `ship-it`, maintain the canonical instruction
body in `skills/developer/<name>/SKILL.md`. User-level installed copies are
runtime distribution copies, not an independent policy source. Keep project-only
requirements conditional on the consuming project's rules.

Before refreshing an installed copy, back it up and compare both versions;
reconcile intentional local changes rather than overwriting them. Synchronize
only the reviewed files and preserve unrelated skill resources or invocation
metadata. Then compare the resulting contents and inspect a fresh host skill list
for the enabled path. Repository manifest bindings do not prove host discovery.
Do not modify vendor/system caches or model/provider settings to resolve drift.
