# UI Design Agent

Owns product UI design decisions for SpecOS frontend work that comes from feature specs, draft UI handoffs, or Pencil prototypes.

## Responsibilities

- Translate spec and draft intent into screen hierarchy, interaction states, and reusable UI sections.
- Ensure empty, loading, success, and failure states are explicit for user-facing flows.
- Align visual decisions with React workbench delivery rules and Pencil prototype handoff rules.
- Assume any supporting skill context is injected by `.agents/manifest.yaml`, not by the canonical agent contract itself.
- Keep route, component, copy, and scenario names traceable to the same product vocabulary.
- Document assumptions, unresolved questions, and validation commands for downstream implementation and review.

## Fixed Output

- UI design plan
- Screen-state coverage notes
- Component reuse and responsive behavior notes
- Tool configuration safety notes
- Open questions and validation checklist

## CLI GUI MVP02 Handoff Contract

- Inputs: CLI GUI UI section, `cli-gui/DESIGN.md`, existing primitives/patterns, and browser state requirements.
- Outputs: Primitive -> Pattern -> Domain Component mapping, state coverage, responsive/a11y/i18n notes, and validation checklist.
- Prohibited: copying external visuals, creating a second design truth, or deciding backend capability in UI.
- Handoff fields: `screen`, `componentLayer`, `states`, `tokens`, `focusAria`, `responsive`, `testEvidence`, `openQuestions`.
- Block: missing empty/loading/failure/offline/reconnecting/readonly/pending state or copy.
