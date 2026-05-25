# Domain Modeling Rules

## Value Objects

Use value objects for:

- business legality of a value
- normalization and canonicalization
- enum-like business concepts
- compatibility aliases
- reusable business rules that do not depend on identity

Common shapes:

- `ParseXxx(raw string) (Xxx, error)`
- `NormalizeXxx(raw string) string`
- `NewXxx(...) (Xxx, error)`
- `IsValidXxx(...) bool`

Good candidates:

- status
- type
- mode
- provider
- source
- channel
- policy names

## Entities

Entities should not be mere field bags. They should protect identity-bearing business objects and the invariants around their state changes.

Good entity responsibilities:

- state transition guards
- behavior methods such as `Activate`, `Cancel`, `Approve`, `Bind`, `Expire`
- rules that depend on the entity's own lifecycle

If an "entity" only mirrors persistence fields and all state rules live elsewhere, either the model is incomplete or it is really just a storage model.

## Domain Services

Use a domain service when:

- the rule spans multiple entities or value objects
- the rule clearly belongs to the business domain
- the rule does not fit naturally inside one entity or one value object

Do not use a domain service for:

- transport parsing
- transaction control
- repository orchestration
- external callback coordination
- retry policy

## Domain-Owned Validation

Business validation should enter through domain APIs because this:

- keeps one canonical source of legality
- avoids drift across handlers, use cases, and repositories
- lets interface layers remain protocol-focused
- lets application layers remain orchestration-focused

## Enum and Magic-Value Elimination

Prefer this order:

1. typed enum or value object in the domain
2. typed constant in the domain plus constructor or parser
3. local constant only for truly local technical concerns

Avoid:

- raw strings such as `"pending"`, `"paid"`, `"running"`, or `"wechat"` scattered across layers
- raw integers with undocumented semantics
- direct persistence values leaking into business decisions

Migration pattern:

1. find repeated magic values
2. introduce a domain type
3. add parser, constructor, or normalizer
4. update callers to use the domain type or domain API
5. leave transport and persistence conversion at the edges

## Quick Decision Table

- "Is this value legal?" -> value object or domain API
- "Can this entity perform this action now?" -> entity method or domain service
- "Do multiple domain objects satisfy this business rule together?" -> domain service
- "In what order do we call collaborators?" -> application
- "How do we bind or serialize this field?" -> interfaces
