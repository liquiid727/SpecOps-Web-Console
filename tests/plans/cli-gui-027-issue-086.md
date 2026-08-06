# Test plan — issue 086

Run provider storage/CRUD focused tests and static checks. The run now covers direct v4 input migration to the current schema, malformed-provider filtering, the current CRUD/validation/readonly matrix, and credential non-persistence at API/state serialization seams.

Result: local evidence passed with a contract-evolution waiver. The working tree already implements the approved CLI-GUI-028 SecretStore contract, so its `PROVIDER_ENDPOINT_INVALID`, `PROVIDER_IN_USE`, and `env:/keychain:` semantics are retained and not regressed to the earlier v1 issue wording.

Raw security record: `tests/results/cli-gui-027.issue-086.security.raw.json`.
