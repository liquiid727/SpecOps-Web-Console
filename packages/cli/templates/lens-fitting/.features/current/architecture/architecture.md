# Architecture Spec

## Style

Use a modular fullstack architecture where Spec branches drive implementation ownership.

## Modules

- Prescription Intake
- Recommendation
- Lens Catalog
- Order
- Merchant Review

## Boundaries

- Product Architect owns draft-level Idea-to-Spec.
- `spec-editor` normalizes the change package.
- `frontend-agent`, `backend-agent`, and `qa-agent` orchestrate delivery from the Spec branches.
- Domain, API, database, UI design, and specialized tests stay as specialist contexts loaded by those orchestrating agents.
