# Agent Mode Overlays

Mode-specific canonical agent differences live here.

Shared role responsibilities stay in `ai/agents/`.

Mode overlays only add or tighten behavior for the selected project mode.

The selected project mode comes from `.specos/manifest.yaml` and should align with `.agents/modes/<mode>/manifest.overlay.yaml`.
