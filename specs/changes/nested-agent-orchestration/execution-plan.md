# Execution Plan

1. Update root and Codex instructions so `pola` is the coordinator and `.agents/manifest.yaml` remains the registry source of truth.
2. Document nested dispatch in `.agents/README.md` and `ai/workflows/nested-agent-orchestration.md`.
3. Extend request routing to classify architecture/domain signals as architecture work and choose `ddd-domain-agent` as the primary role.
4. Add unit coverage for architecture orchestration routing.
5. Validate with targeted core tests and CLI route preview.
