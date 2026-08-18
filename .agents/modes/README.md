# Agent Modes

Mode-specific agent differences live here.

Use this structure:

- shared base: `.agents/roles/` and `ai/agents/`
- mode overlay: `.agents/modes/<mode>/roles/` and `ai/agents/modes/<mode>/`

Resolve `<mode>` from `.specos/manifest.yaml` `projectMode` before loading any overlay prompt.

Load order:

1. `.specos/manifest.yaml` `projectMode`
2. `.agents/modes/<mode>/manifest.overlay.yaml`
3. shared role prompt
4. shared canonical agent prompt
5. selected mode overlay role prompt
6. selected mode overlay canonical prompt

Only keep differences in mode overlays. Do not copy full shared prompts unless the mode truly replaces the shared behavior.
