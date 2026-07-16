# Spec System Learning and Capability Backlog

## Record Status

- Status: `open-research`
- Scope: study only; no implementation or adoption is authorized
- Parent research: [SpecOS, Trellis, and Claude-Mem comparison](./specos-trellis-claude-mem-comparison.md)
- Goal: understand the strongest ideas from adjacent projects and use the findings to improve future SpecOS design decisions

## Learning Objective

Study how specification truth, active task state, execution context, historical memory, and delivery evidence can remain separate but interoperable.

The research should answer:

```text
What must remain canonical?
What can be generated automatically?
What should be session-scoped?
What may be recalled as untrusted history?
What evidence is required before knowledge is promoted?
```

## Research Tracks

### R1. Canonical Truth and Memory Boundary

- Compare authoritative specs with AI-generated observations.
- Define how stale, contradictory, or superseded knowledge should be identified.
- Determine what evidence is required before a discovery becomes a design, rule, or feature-spec change.
- Preserve the rule that remembered completion never replaces review or test evidence.

Expected output: a trust-level and promotion model for project knowledge.

### R2. Active Task and Workflow State

- Study Trellis session-scoped active-task pointers.
- Compare task state with SpecOS `current/` and Spec ID lifecycle.
- Evaluate whether implementation and review should load different context manifests.
- Identify the minimum state required to resume a task without replaying the previous conversation.

Expected output: an active-delivery context model aligned with SpecOS modes.

### R3. Context Manifest and Progressive Loading

- Study Trellis `implement.jsonl` and `check.jsonl` context manifests.
- Study Claude-Mem search, timeline, and detail recall layers.
- Compare deterministic context injection with semantic retrieval.
- Define ordering rules that always prioritize canonical project sources over recalled memory.

Expected output: a token-aware context-loading strategy.

### R4. Observation and Session Learning

- Study hook-based capture of prompts, tool calls, results, and session summaries.
- Identify which event types produce durable technical knowledge.
- Define what should be skipped because it is routine, noisy, private, or easily derived from Git.
- Evaluate observer-agent separation from the primary implementation agent.

Expected output: a minimal observation taxonomy and capture policy.

### R5. Knowledge Lifecycle

- Explore candidate, verified, promoted, rejected, stale, and superseded states.
- Define source references, confidence, ownership, timestamps, and sensitivity metadata.
- Determine how repeated discoveries may become reusable rules without automatic mutation.
- Define deletion, retention, and privacy expectations.

Expected output: a lifecycle schema for non-canonical project knowledge.

### R6. Multi-Agent and Evidence Integration

- Determine how `pola` should judge observations from implementation, review, test, and specialist agents.
- Separate runtime learning from implementation handoff and release evidence.
- Explore how memory can point to a Spec ID, task, commit, test run, review, or artifact.
- Ensure tests and release gates continue to consume normalized evidence rather than memory summaries.

Expected output: a traceability map from runtime activity to governed delivery artifacts.

## Evaluation Criteria

Each researched capability should be judged against:

| Criterion | Question |
| --- | --- |
| Traceability | Can the information be linked to a Spec ID, task, source, or evidence artifact? |
| Authority | Is it clear whether the information is canonical, verified, or merely recalled? |
| Context cost | Does it reduce unnecessary context loading? |
| Freshness | Can stale or superseded knowledge be detected? |
| Privacy | Can sensitive content be excluded, deleted, or retained safely? |
| Auditability | Can a reviewer understand where the conclusion came from? |
| Portability | Does the idea work across supported agent hosts? |
| Complexity | Is the operational cost proportional to the value? |

## Deferred Decisions

The following decisions are intentionally deferred until the research tracks are complete:

- Whether SpecOS needs a runtime memory service.
- Whether memory should be file-based, database-backed, or hybrid.
- Whether semantic vector search is necessary.
- Whether hooks should automatically capture agent activity.
- Whether any Trellis or Claude-Mem implementation should be reused.
- Where future memory artifacts would live in the repository.

## Completion Condition

This research record is complete only when the findings produce a concise recommendation that includes:

- capabilities worth adopting,
- ideas that should remain external references,
- rejected approaches and reasons,
- trust and promotion boundaries,
- expected changes to SpecOS design and workflow,
- implementation cost and validation requirements.

Any accepted recommendation must then enter the normal flow:

```text
Research TODO -> Design Decision -> Roadmap/Feature Spec -> Implementation -> Review -> Test Evidence
```
