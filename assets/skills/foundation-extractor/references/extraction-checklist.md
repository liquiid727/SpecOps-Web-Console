# Extraction Checklist

## Candidate Discovery

- identify error handling, logging, config, transport, runtime, and template candidates
- look for repeated rules across modules, not one-off business logic
- inspect whether the candidate already has tests, docs, or examples that can be generalized

## Boundary Decision

- is the rule generic across products
- does it require a product codebook
- does it require a bounded-context state machine
- can a different repository understand it without reading source-private paths

## Artifact Placement

- `docs/standards`: engineering rules and governance
- `docs/contracts`: small stable contracts
- `core`: framework-neutral primitives
- `adapters`: technical integrations and transport rendering
- `templates`: copyable starter assets
- `examples`: minimal usage samples
- `maintainers`: provenance, extraction notes, and non-public mapping

## Final Review

- public docs do not require source-repository context
- maintainer notes preserve provenance
- non-goals explicitly say the source repository is not the forced migration target
- adapters stay technical and do not own product workflows
