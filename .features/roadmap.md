# Spec Roadmap

Use this file as the only canonical index for epic grouping, release sequencing, and feature-spec dependencies.

## SpecOS Platform

### Repository Architecture

- `SPECOS-001 Repository Modularization`

## Example Structure

### Risk Platform

#### Foundation

- `RP-001 Event Ingestion`
- `RP-002 Decision API`
- `RP-003 Risk Profile`
- `RP-004 Entity Profile`

#### Rule Engine

- `RP-010 Policy`
- `RP-011 Rule`
- `RP-012 Condition`

#### Admin

- `RP-020 User Risk`
- `RP-021 List Management`

## Release Order

### Release v0.1

1. `RP-001 Event Ingestion`
2. `RP-003 Risk Profile`
3. `RP-002 Decision API`

## Dependency Notes

- `RP-002` depends on `RP-003` and `RP-004`
- `RP-010` depends on `RP-002`
