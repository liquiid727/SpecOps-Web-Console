# Agent Templates

Role-specific agent instructions for SpecOS workflows.

Document responsibilities, inputs, outputs, and review gates for each agent role.

Shared canonical prompts live in `ai/agents/`.

Mode-specific canonical differences live in `ai/agents/modes/<mode>/`.

Host prompt assembly should resolve `projectMode` first, then load the matching overlay manifest and canonical overlay prompts.
