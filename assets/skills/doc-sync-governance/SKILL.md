---
name: doc-sync-governance
description: Reuse a generic documentation-sync governance workflow with fact-source priority, sync triggers, and target-layer selection. Use when a repository needs a repeatable rule for when code, docs, prompts, or specs must be updated together.
version: 1.0.0
category: maintenance
tags:
  - docs
  - sync
  - governance
---

# Doc Sync Governance

Use this skill to standardize when and how documentation truth is synchronized.

## Workflow

1. Read `references/fact-priority.md`.
2. Read `references/sync-triggers.md`.
3. Read `references/target-selection.md`.
4. Read `references/anti-patterns.md`.
5. Output:
   - what changed semantically
   - which doc layers must update
   - which stale references must be removed

## Required Rules

- docs must reflect upstream truth, not invent it
- semantic changes must update the right layer in the same change
- sync rules must distinguish code truth, public docs, design drafts, and stable specs

## Non-Goals

- treating one documentation layer as universal truth for every repository
- updating docs without checking actual upstream facts
