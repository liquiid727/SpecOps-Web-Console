# SpecOS, Trellis, and Claude-Mem Comparison

## Record Status

- Status: `research-only`
- Decision: no capability adoption or implementation is approved by this record
- Purpose: preserve the key concepts, workflows, and boundaries for later study
- Reviewed projects:
  - [SpecOS](../../README.md)
  - [mindfold-ai/Trellis](https://github.com/mindfold-ai/Trellis)
  - [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

## One-Line Positioning

| Project | Position | Main Question |
| --- | --- | --- |
| SpecOS | Spec-driven delivery and governance system | What is the authoritative requirement, and what evidence proves delivery? |
| Trellis | Task and execution-context workflow for coding agents | What is the active task, phase, and required context? |
| Claude-Mem | Automatic cross-session memory capture and recall system | What happened before, and what past knowledge may be relevant now? |

In short:

```text
SpecOS     = specification and delivery truth
Trellis    = task state and execution context
Claude-Mem = historical memory and recall
```

## SpecOS

### Project Focus

SpecOS connects product intent, stable design, feature specs, agent implementation, reviews, tests, and release decisions into one traceable delivery chain.

### Main Content

```text
docs/spec-modes/   operating modes and governance level
current/           active delivery status and handoff
spec-draft/        non-canonical requirement drafts
design/            stable system design truth
specs/             roadmap and feature specs
implementation/    implementation status and handoff
reviews/           review findings and approval evidence
tests/             normalized verification evidence
rules/             reusable engineering and delivery rules
ai/agents/         canonical agent responsibilities
.agents/           role registration, routing, and context assembly
```

### Key Chain

```text
Draft
  -> Design
  -> Roadmap/Epic
  -> Feature Spec
  -> Agent Implementation
  -> Review
  -> Test Evidence
  -> Merge/Release
```

### Essential Insight

Agent output must remain traceable to an authoritative requirement, and completion must be supported by review and test evidence.

### Strong Points

- Complete specification and delivery lifecycle.
- Clear separation between draft intent, stable design, implementation, and evidence.
- LiteSpec, GoalSpec, and EnterpriseSpec support different governance levels.
- Agent roles, review responsibilities, and test evidence can be traced by Spec ID.

### Current Learning Gap

- Runtime task state is less automated than Trellis.
- Cross-session continuity depends mainly on explicit files and handoff notes.
- Automatic capture and selective recall of discoveries are not yet first-class capabilities.

## Trellis

### Project Focus

Trellis organizes coding-agent work around explicit tasks, workflow phases, context manifests, checks, and developer journals.

### Main Content

```text
.trellis/spec/       project engineering conventions
.trellis/tasks/      active and archived task artifacts
.trellis/workspace/  per-developer session journals
.trellis/.runtime/   session-scoped active-task pointers
```

A task can contain:

```text
task.json
prd.md
design.md
implement.md
research/
implement.jsonl
check.jsonl
```

### Key Chain

```text
Create Task
  -> Clarify/Plan
  -> Assemble Implement Context
  -> Implement
  -> Assemble Check Context
  -> Verify
  -> Finish/Archive
  -> Update Spec and Journal
```

The high-level lifecycle is:

```text
Plan -> Implement -> Verify -> Finish
```

### Essential Insights

1. `Specs injected, not remembered`: agents reload explicit specifications instead of trusting conversational memory.
2. Context manifests explain which files an implement or check agent must read and why.
3. Active-task state is session-aware, so a new turn can recover the current workflow phase.
4. Task completion feeds durable learnings back into specifications and journals.

### Strong Points

- Clear active-task and workflow-phase state.
- Small task directories suited to continuous agent execution.
- Different context sets for implementation and checking.
- File-based records are easy to review, version, and share through Git.

### Limits Relative to SpecOS

- Focuses on coding tasks more than complete product delivery governance.
- Test evidence and release gates are less formal than SpecOS.
- Journals preserve continuity but do not provide Claude-Mem-style automatic semantic recall.

## Claude-Mem

### Project Focus

Claude-Mem observes agent sessions through lifecycle hooks, compresses useful activity into structured memories, and recalls relevant history in later sessions.

### Main Components

```text
Lifecycle Hooks
Worker Service
Observer LLM
SQLite and FTS5
Chroma semantic index
MCP recall tools
Web viewer
```

Structured memories can contain:

```text
type
title
subtitle
facts
narrative
concepts
files_read
files_modified
source/session/time metadata
```

Common memory types include bug fixes, features, refactors, discoveries, decisions, and security observations.

### Key Chain

```text
User Prompt / Tool Result
  -> Lifecycle Hook
  -> Background Worker
  -> Observer LLM Compression
  -> Observation / Session Summary
  -> SQLite and Semantic Index
  -> Search / Timeline / Detail Recall
  -> Future Session Context
```

### Progressive Recall

```text
Layer 1: compact search index
Layer 2: surrounding timeline
Layer 3: full observation details
```

This avoids injecting all historical content before its relevance is known.

### Essential Insights

1. Separate the working agent from the observer that records durable knowledge.
2. Compress raw activity into structured observations instead of replaying full transcripts.
3. Show a low-cost index first and retrieve details only when needed.
4. Preserve source and session metadata so memories can be inspected later.

### Strong Points

- Automatic cross-session continuity.
- Structured memory and semantic retrieval.
- Progressive disclosure controls context-token cost.
- Broad platform integration through hooks and MCP.

### Risks and Limits

- AI-generated observations may be incomplete or wrong.
- Memories can become stale after code or requirements change.
- Tool output and prompts may contain sensitive or hostile content.
- Remembered test success is not equivalent to normalized test evidence.
- Automatic memory must not become authoritative specification truth without review.

## Combined View

| Stage | SpecOS | Trellis | Claude-Mem |
| --- | --- | --- | --- |
| Requirement intake | `spec-draft/` | `prd.md` | records user prompts |
| Stable design | `design/` | `design.md` | records decisions |
| Task definition | roadmap and feature spec | `task.json` and subtasks | project/session grouping |
| Context preparation | source-of-truth loading order | `implement.jsonl` | search and timeline recall |
| Implementation | implementation agent and handoff | implement agent | captures tool activity |
| Verification | reviews and normalized tests | check agent | records discoveries and fixes |
| Completion | merge/release gate | finish/archive | session summary |
| Learning | promote into design, specs, or rules | update spec and journal | persist observations |
| Trust model | authoritative specs and evidence | explicit task files | AI-generated historical signals |

## Critical Boundary

```text
SpecOS determines what is authoritative.
Trellis determines what should be done now.
Claude-Mem helps recall what happened before.
```

Automatic memories are candidate context only. They must not silently overwrite `design/`, `specs/`, `rules/`, `reviews/`, or normalized test evidence.
