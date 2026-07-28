# Agent Template Catalog

Agent template assets for the SpecOS web UI belong here.

Each agent asset can provide an `asset.json` manifest so the tool site can render it as a reusable catalog item.

Role assets that map to `.agents/manifest.yaml` roles also carry layered-model metadata:

- `tier`: `main` for the four routable main agents (`architecture-agent`, `implementation-agent`, `testing-agent`, `qa-agent`), `specialist` for on-demand subagent roles.
- `managedBy`: the main agent that owns a `specialist` role and opens it on demand.

Assets outside the registered role hierarchy (for example the `agent-go-pack-*` team pack and standalone reviewer prompts) do not carry these fields.
