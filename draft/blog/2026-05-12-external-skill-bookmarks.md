# External Skill Bookmarks

Date: 2026-05-12

This note records a small convention for collecting external Codex skills without turning every interesting repository into an active project dependency.

## Placement

Use `skills/README.md` as the lightweight bookmark index for external skills. It is easy to find from the repository root and already describes repository-local reusable agent skills and capability notes.

Use `skills/developer/` only for skills that have been adapted for this repository. Those skills should be stable enough to be referenced by local agent routing or project workflows.

Use `~/.codex/skills/` for skills that should be loaded by Codex as active user-level skills. Installing there is appropriate when the skill is used often enough to justify making it part of the local Codex runtime.

## Current Bookmarks

- `guizang-ppt-skill`: HTML PPT and magazine-style presentation generation.
- `patent-disclosure-skill`: Chinese patent disclosure drafting and patent-point workflow.
- `SoftwareCopyright-Skill`: Chinese software copyright application material generation.

## Rule Of Thumb

Bookmark first, adapt or install later. This keeps the SpecOS repository focused on accepted project assets while still making useful external resources easy to rediscover.
