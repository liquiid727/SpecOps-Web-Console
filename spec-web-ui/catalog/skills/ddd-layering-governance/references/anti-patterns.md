# Anti-Patterns

## Handler or Interface-Level Business Validation

Symptoms:

- handlers contain canonical business legality `switch/if`
- request-schema enums are treated as the final business truth

Risks:

- transport becomes coupled to business law
- the same rule is reimplemented across entry points

## Thick Application Services

Symptoms:

- use cases contain most status guards, alias mapping, and business branching
- application code knows more about business semantics than the domain model

Risks:

- orchestration and business truth blur together
- reviewers cannot quickly identify the canonical rule owner

## Shared or Common Package Owns One Domain's Truth

Symptoms:

- one product or context's status or type rules are moved into a generic shared package for convenience

Risks:

- shared code becomes a shadow domain
- truth ownership drifts

## Entities Without Invariants

Symptoms:

- entities are just field containers
- all state rules live in handlers or use cases

Risks:

- entities lose domain meaning
- invariants are protected inconsistently

## Raw Status or Type Strings Across Layers

Symptoms:

- the same string literals appear in handlers, use cases, repositories, and responses
- multiple spellings or aliases emerge for one concept

Risks:

- magic values spread
- business semantics drift

## Request Constraints Mistaken for Business Truth

Symptoms:

- request validation is considered sufficient, so domain parsing is skipped

Risks:

- protocol rules replace business rules
- non-HTTP or async entry points bypass the canonical validation path

## Persistence Values Define Domain Meaning

Symptoms:

- database or storage constants are treated as the authoritative business enum catalog

Risks:

- storage concerns dictate domain design
- refactoring and compatibility mapping become harder
