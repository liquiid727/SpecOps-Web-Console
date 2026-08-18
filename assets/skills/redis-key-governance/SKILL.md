---
name: redis-key-governance
description: Define, review, and document Redis key families for backend services without publishing one product's key catalog as a shared foundation truth. Use when adding or changing Redis keys, TTLs, projections, leases, rate limits, replay guards, or hot-read paths.
version: 1.0.0
category: governance
tags:
  - redis
  - governance
  - keys
  - backend
---

# Redis Key Governance

Use this skill when the task is to design, review, or document Redis key usage.

## Default Assumption

The repository keeps its own Redis key families. This skill standardizes how to design and review them; it does not publish the current repository's catalog as a universal foundation artifact.

## Workflow

1. Read `references/naming-and-shape.md`.
2. Read `references/ttl-and-truth.md`.
3. Read `references/review-checklist.md`.
4. Read `references/anti-patterns.md`.
5. Output:
   - key family owner
   - structure and TTL
   - truth and fallback semantics
   - observability and doc-sync requirements

## Required Rules

- every key family must declare owner, structure, and TTL policy
- every key family must say whether Redis is runtime truth, projection, or coordination only
- changes must update infra or runtime docs in the owning repository
- do not reuse an old key family for a new meaning

## Non-Goals

- turning a product key catalog into foundation public truth
- hiding business state-machine semantics inside generic key names
