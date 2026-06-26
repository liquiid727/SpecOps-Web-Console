# Execution Plan

1. Update root and Codex instructions so `pola` is the coordinator and `.agents/manifest.yaml` remains the registry source of truth.
2. Register the four main primary agents: `architecture-agent`, `implementation-agent`, `deployment-agent`, and `testing-agent`.
3. Document nested dispatch in `.agents/README.md` and `ai/workflows/nested-agent-orchestration.md` as main-agent delegation to specialist agents.
4. Extend request routing to classify architecture/domain signals as architecture work and choose `architecture-agent` as the primary role.
5. Route implementation, testing/QA, and CI/release prompts to `implementation-agent`, `testing-agent`, and `deployment-agent`.
6. Add unit coverage for the updated main-agent routing behavior.
7. Validate with targeted core tests and CLI route preview.
