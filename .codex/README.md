# Codex Local Configuration

This directory contains Codex-specific project configuration and operating notes.

## Files

- `config.toml`: local Codex runtime profile configuration.
- `instructions.md`: project-specific behavior for Codex sessions.
- `skills/`: Codex-only project skills that must be discovered directly by Codex.
- `../skills/developer/`: repository-wide developer Skill library; roles load these through `.agents/manifest.yaml`.

## Usage

- Keep machine/runtime settings in `config.toml`.
- Keep repository behavior and workflow guidance in `instructions.md` and root `AGENTS.md`.
- Add reusable developer capabilities under `skills/developer/<skill-name>/SKILL.md`, then bind only the roles that need them in `.agents/manifest.yaml`.
- Keep content-creator, education, and Codex-customization Skills in their matching top-level `skills/` collections instead of binding them to developer roles.
- Do not store secrets or personal tokens in this directory.
