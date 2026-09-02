# Nested Agent Orchestration

## Status

Accepted contract for host-side multi-agent execution. It describes how a host
uses registered SpecOS roles; it does not implement an agent runner.

## Goal

Keep project instructions in AGENTS.md and agent registry, prompt assembly,
skills, ownership and outputs in .agents/manifest.yaml.

## Roles

SpecOS uses pola as coordinator; it routes to one main agent
(architecture-agent, implementation-agent, testing-agent or qa-agent), which
opens registered specialists on demand.

Each specialist task names its role, exact source rule or artifact, owned
surfaces, narrow question, expected short output and non-goals. pola merges
findings, rejects false positives and produces one actionable recommendation.

## Canonical Artifact Flow

    Idea
    → R0NN root PRD
    → S01/S02 child Spec Packages
    → approved child Test Designs
    → implementation / verification Issue files
    → Code + Evidence + Review
    → child QA acceptance
    → root PRD acceptance
    → Ship

For a selected Issue, agents read root prd.md/index.yaml, the selected
specs/S0N-<slug>/spec.md and test.md, one issues/ISSUE-*.md file, then the
stage-appropriate review.md, evidence/ and acceptance.md records.

The workspace remains co-located under one R0NN directory and does not
assume PRD 1:1 Spec or Spec 1:1 Issue.

The handoff is ordered: `spec-editor` produces a child Spec and stops for Spec
approval; `testing-agent`/`test-editor` derives and reviews the independent Test
Design; only then may implementation and verification Issues be generated.
Implementation-owned unit tests remain focused local checks and cannot be used
as the independent verification result.

## Main Agent Ownership

- architecture-agent: PRD, architecture decisions and cross-surface impact.
- implementation-agent: one child Issue at a time, frontend/backend execution.
- testing-agent: independent test strategy and evidence orchestration.
- qa-agent: review reconciliation, QA decision and release/deployment readiness.

## Output Shape

pola returns the source artifacts, selected main/specialist
roles, actionable findings, rejected findings, required preconditions,
validation/acceptance gates and Sync Handoff status.

## Non-Goals

- route-request and classify-request are previews, not execution.
- Do not invent roles outside .agents/manifest.yaml.
- Do not merge every specialist report into the final answer.
