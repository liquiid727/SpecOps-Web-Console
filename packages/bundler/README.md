# @specos/bundler

Builds an immutable bundle plan from a project and selected Catalog assets.

The module owns manifest generation, generated workflow payloads,
source-to-target file planning, and install-target configuration. It performs no
file-system writes.

Primary interface:

```ts
buildBundlePlan(project, selectedAssets, issueSummary)
```
