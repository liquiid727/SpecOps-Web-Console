# @specos/catalog

Owns Catalog values and pure catalog behavior:

- asset types and filters, including engineering packs
- workspace ordering
- recommendations and featured ranking
- comparison summaries
- registry and preset configuration under `config/`

`config/asset-directions.yaml` is the authoritative direction classification for
Agent, Rule, and Skill assets. It maps stable asset IDs to product, business,
frontend, backend, operations, and QA; the catalog validates every referenced
ID and asset type before applying the groups.

Application adapters own storage. The Web adapter loads the registry plus
directory-backed manifests from `assets/`.
