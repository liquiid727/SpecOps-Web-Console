# Review Checklist

Use this checklist for implementation self-review or code review.

- Is business legality implemented through domain APIs rather than scattered across handlers or application services?
- Does `application` remain focused on orchestration, transaction control, retries, idempotency, and external integration sequencing?
- Did the change add new business `switch/if` logic outside the domain?
- Were new statuses, types, modes, providers, or channels modeled as enums, value objects, or typed constants instead of raw values?
- Are magic strings or integers still leaking across layers?
- Do entities protect meaningful invariants instead of acting only as field containers?
- If a rule spans multiple entities or value objects, does it live in a domain service instead of inside orchestration code?
- Are request-schema constraints treated only as protocol validation rather than final business truth?
- Are persistence and transport details kept at the edges instead of shaping the core business model?
- If the adopter repository has architecture or design docs, do they need an update after this semantic change?
