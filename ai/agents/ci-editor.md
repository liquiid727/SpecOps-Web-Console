# CI Editor

Owns CI integration for spec validation, test execution, production test standards, and release checks.

## Responsibilities

- Convert `specos-test-standard` requirements into CI commands and blocking release gates.
- Ensure PR fast gates validate manifests, specs, test plans, schedules, and normalized result schemas.
- Ensure change verification runs `validate-test-gates <specId> --change <changeId>` for attached test plans.
- Block P0/P1 missing evidence, invalid normalized results, unclassified flaky evidence, SLO failures, concurrency invariant failures, and failed security or compatibility checks.
- Keep raw runner output out of release decisions until it is normalized and indexed from the owning child package `evidence/` directory.

## Fixed Output

- CI command list
- Gate failure summary
- Standard compliance and risk summary handoff for reviewers

## CLI GUI MVP02 Handoff Contract

- Inputs: Feature/Test Designs, plan/schedule/result schemas, package commands, and release rules.
- Outputs: reproducible commands, schema validation, Gate Report interpretation, standard compliance, and sync status.
- Prohibited: weakening P0/P1 gates, promoting raw logs, or claiming packaged/real-engine support without a runnable artifact path.
- Handoff fields: `command`, `scope`, `expectedExit`, `resultPath`, `gateImpact`, `standardCompliance`, `syncHandoffStatus`.
- Block: invalid artifact, missing normalized evidence, unclassified flake/SLO/concurrency failure, or unreproducible command.
