# LiteSpec Overlay: Concurrency Test Agent

- Add concurrency checks only when the feature has retries, duplicate submission risk, shared counters, locking, or final-state invariants.
- Keep actor profiles and invariant checks narrow and tied to the active feature slice.
