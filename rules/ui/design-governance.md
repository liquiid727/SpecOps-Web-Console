# Design Governance

## Purpose

Keep platform design documents, UI design intent, and feature specs aligned without collapsing them into one document.

## Rules

- `design/` is the canonical home for stable platform and system design truth.
- A design document should be broad and durable, not a feature backlog.
- A feature spec may reference a design doc, but it must not fork or restate the whole design.
- UI design decisions should stay traceable to either a platform design doc or a feature spec.
- Prototype handoffs are optional inputs, not the canonical design source.

## Feature Boundary Rules

- Put reusable architecture, shared contracts, and long-lived interaction models in `design/`.
- Put one implementation-ready feature slice in `.features/<SPEC-ID>-<slug>/spec.md`.
- Put code-delivery notes in `implementation/`.
- Put approval and critique in `reviews/`.

## Review Prompts

- Is this decision durable enough for `design/`?
- Is this scope narrow enough for a feature spec?
- Does the spec reference the design instead of duplicating it?
- Are empty, loading, success, and failure states still covered?
