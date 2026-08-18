# @specos/catalog

Owns Catalog values and pure catalog behavior:

- asset types and filters, including engineering packs
- workspace ordering
- recommendations and featured ranking
- comparison summaries
- registry and preset configuration under `config/`

Application adapters own storage. The Web adapter loads the registry plus
directory-backed manifests from `assets/`.
