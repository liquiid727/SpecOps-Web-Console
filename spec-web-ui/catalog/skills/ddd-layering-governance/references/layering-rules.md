# Layering Rules

## Layer Ownership

- `domain`
  - owns entities, value objects, domain services, invariants, business legality, and business normalization
- `application`
  - owns use-case orchestration, transaction boundaries, cross-repository scheduling, idempotency coordination, retries, and external integration flow control
- `interfaces`
  - owns protocol parsing, request binding, response rendering, and transport-level error mapping
- `infrastructure`
  - owns persistence, cache, messaging, external clients, and concrete repository implementations

## Thin Application Standard

`application` should behave like an orchestration shell, not a second business-rules layer.

Good fits for `application`:

- coordinating multiple repositories or domain services
- opening and committing transactions
- retry, idempotency, and event orchestration
- external system sequencing
- adapting domain errors to use-case context

Bad fits for `application`:

- canonical business legality `switch/if`
- hard-coded status semantics
- compatibility aliases that belong to the domain model
- treating request-schema constraints as final business truth

## Layering Decision Rule

- If the rule answers "is this business value legal?" or "what does this value mean?" it belongs in `domain`.
- If the rule answers "how do we orchestrate this request end-to-end?" it belongs in `application`.
- If the rule answers "how do we parse or render this protocol?" it belongs in `interfaces`.
- If the rule answers "how do we store or fetch this data?" it belongs in `infrastructure`.

## Common Prohibitions

### interfaces

- do not implement canonical business validation
- do not let request DTOs become the business truth model
- do not normalize business enums only at the transport edge

### application

- do not duplicate validation already owned by value objects or entities
- do not become a dumping ground for business guards
- do not bypass domain constructors just because the caller already parsed the request

### infrastructure

- do not let persistence constants define business semantics
- do not hide business rules inside repositories or client adapters

## Practical Heuristics

- When adding a new business input, first ask whether it needs a value object or parser.
- When adding a new business state, first ask whether it should become a typed enum instead of a raw string.
- When reviewing a large use case, check whether it still reads like orchestration rather than a pile of business law.
