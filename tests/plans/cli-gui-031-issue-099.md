# Independent test plan — CLI-GUI-031 issue 099

- Source: CLI-GUI-031 Feature Spec/Test Spec and `.issues/issue-099-backend-failure-classification-and-side-effect-observation.md`.
- Focused matrix: machine-code classifier, effect fold, parser/stream gaps, same-Attempt transport fallback, vendor/parsed/legacy event redaction, component/metadata canaries, and orchestrator persistence.
- Commands: focused Vitest suite; full Vitest suite; typecheck; lint/ui:check; build; `npx specos check`; `git diff --check`.
- Browser/platform: N/A per Test Spec; no screenshot/trace required or produced.
- Expected gate: accepted-with-waiver when local P0/P1 contract evidence is complete; external engine/package/cross-process boundaries remain explicit waivers.
- Final result: `tests/results/cli-gui-031.issue-099.local.json`.
- Raw evidence: `tests/results/cli-gui-031.issue-099.failure.raw.json`.
