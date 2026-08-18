---
name: foundation-extractor
description: Extract team-level backend standards and reusable foundation modules from an existing repository without turning the source repository into the migration target. Use when the task is to identify which error, DDD, logging, API response, config, or runtime rules can become standalone foundation docs, adapters, templates, examples, or maintainer-only provenance.
version: 1.0.0
category: architecture
tags:
  - foundation
  - extraction
  - standards
  - backend
---

# Foundation Extractor

Use this skill to turn repository-local backend patterns into standalone-ready foundation artifacts.

## Default Assumption

The source repository is an extraction sample, not the required adopter. Do not default to migration plans, replacement plans, or compatibility retrofits inside the source repository unless the user explicitly asks for them.

## Workflow

1. Read `references/boundary-rules.md` to decide what can enter foundation.
2. Read `references/extraction-checklist.md` and identify candidate rules or modules.
3. Classify outputs into `docs`, `core`, `adapters`, `templates`, `examples`, or `maintainers` using `references/artifact-shapes.md`.
4. Check `references/anti-patterns.md` before proposing public artifacts.
5. Output:
   - extraction candidates
   - boundary decisions
   - public artifacts
   - maintainer-only provenance
   - non-goals

## Required Behavior

- Prefer extracting rules, contracts, and minimal default implementations over copying repository packages wholesale.
- Keep public foundation docs independent from source-repository private paths.
- Push source-specific provenance into maintainer-only files.
- If a candidate contains business state-machine truth, product-specific error catalogs, or repository-private conventions, keep it out of public foundation.

## Typical Targets

- error code governance
- DDD layering rules
- structured logging contracts
- API error response and envelope adapters
- config and runtime helper contracts
- starter templates and minimal examples

## Non-Goals

- rewriting the source repository to consume the extracted foundation
- treating the source repository as the first mandatory adopter
- publishing one business codebook for every product
