---
name: prd
description: "Generate an accepted Product Requirements Document with stable requirement identifiers, verifiable acceptance criteria, scope boundaries, and an explicit feature-versus-epic classification. Use when planning a feature or complex initiative, starting a project, or converting a product idea into input for prd-to-spec. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out, 写PRD, 需求文档, 需求分析, 规格说明."
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, testable, and ready for Spec decomposition. After approval, always use `/prd-to-spec` to decide whether the PRD maps to one Feature Spec or multiple modular Feature Specs.

---

## The Job

1. Receive a feature description from the user
2. Ask clarifying questions to cover key ambiguities — scale the count to complexity, not a fixed number (see Step 1)
3. Generate a structured PRD based on answers
4. **Present PRD to user for review** — ask "Please review the PRD. Let me know if any adjustments are needed, or reply OK to confirm."
5. Classify the PRD as `feature`, `epic`, or `system`
6. Apply adjustments and save to the repository intake directory
7. Suggest `/prd-to-spec` as the next step

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. **Scale the number of questions to the feature's complexity — the goal is covering key ambiguities, not hitting a fixed count:**

- **Simple, well-scoped feature:** 2-3 questions
- **Typical feature:** 3-5 questions
- **Complex feature** (multiple user roles, cross-system integration, significant ambiguity): 6-8 questions

If a dimension is already unambiguous from the user's input, skip it — don't ask filler questions just to reach a number. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Other: [please specify]

2. Who is the target user?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Just the backend/API
   D. Just the UI
```

This lets users respond with "1A, 2C, 3B" for quick iteration. Remember to indent the options.

---

## Edge Cases & Fallback

| Scenario | Handling |
|----------|----------|
| User skips clarifying questions (e.g., replies "whatever", "just write it") | Fill with reasonable defaults, mark with `[Assumption]` in PRD, prompt user to confirm during review |
| User input is too vague (e.g., "add a feature") | Ask once for specifics; if still vague, infer from project context and mark assumptions |
| Repository declares `.specos/manifest.yaml` `artifacts.draftsDir` | Save the PRD there; this manifest value always wins over legacy conventions |
| No manifest, but legacy `spec-draft/` exists with content | Save the PRD there as the project intake source |
| No project intake convention exists | Save to `.prd/prd-[feature-name].md` |
| User asks for a custom PRD location | Save there, write the directory back to `artifacts.draftsDir` in `.specos/manifest.yaml`, and record a project configuration memory so later sessions reuse it |
| feature-name is hard to extract from input | Ask the user directly: "Suggested PRD filename is prd-XXX.md, please confirm or modify" |
| User requests PRD changes after review | Apply changes and re-save without re-running the clarification flow |
| PRD contains multiple outcomes, owners, release units, or dependency stages | Classify it as `epic` or `system`; let `prd-to-spec` design the Feature Spec decomposition |
| User declines to proceed | Save the PRD without generating Specs |

---

## Step 2: PRD Structure

Generate the PRD with these sections:

### 1. Introduction/Overview
Brief description of the feature and the problem it solves. Use plain language — avoid jargon or explain it. Assume the reader may be a junior developer or AI agent.

### 2. Goals
Specific, measurable objectives (bullet list).

### 3. User Stories
Each story needs:
- **Title:** Short descriptive name
- **Description:** "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria:** Verifiable checklist of what "done" means

**Numbering rule:** US-001, US-002, US-003... (three digits, starting from 001). Each US should be independently implementable and small enough to complete within one focused agent session.

**Acceptance criteria self-check template:** Each criterion must satisfy at least one of the following, otherwise it is considered "vague" and must be rewritten:
- Observable: describes a specific UI state or API response (e.g., "button shows confirmation dialog")
- Testable: has clear input/output pairs (e.g., "entering an empty email shows a red warning")
- Verifiable: can be checked by tools (e.g., "Typecheck/lint passes")
- ❌ Bad example: "works correctly", "good user experience", "excellent performance" → these are unverifiable

**Format:**
```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] Typecheck/lint passes
- [ ] **[UI stories only]** Verify in a browser (e.g., via the `run` skill)
```

**Important:**
- Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any story with UI changes:** Always include "Verify in a browser" as acceptance criteria (e.g., via the `run` skill). This ensures visual verification of frontend work.

### 4. Functional Requirements
Numbered list of specific functionalities:
- "FR-1: The system must allow users to..."
- "FR-2: When a user clicks X, the system must..."

**FR specification:** Each FR starts with `FR-N:` (N increments from 1), uses "system must / system shall" phrasing, and describes **one** specific behavior. Avoid combining multiple "and"-linked behaviors in a single FR.

### 5. Non-Goals (Out of Scope)
What this feature will NOT include. Critical for managing scope.

### 6. Design Considerations (Optional)
- UI/UX requirements
- Link to mockups if available
- Relevant existing components to reuse

### 7. Technical Considerations (Optional)
- Known constraints or dependencies
- Integration points with existing systems
- Performance requirements

### 8. Success Metrics
How will success be measured?
- "Reduce time to complete X by 50%"
- "Increase conversion rate by 10%"

### 9. Open Questions
Remaining questions or areas needing clarification.

### 10. Scope Classification

Record:

- `feature`: one independently reviewable, verifiable, and shippable outcome
- `epic`: multiple related Feature Specs with an explicit dependency or release order
- `system`: broad platform intent that needs stable design decisions and multiple epics or Feature Specs

List the evidence for the classification. Do not split solely because the document is long.

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** resolve in order — explicit user request > `.specos/manifest.yaml` `artifacts.draftsDir` > legacy populated `spec-draft/` (or `tasks/`) > default `.prd/` (see `rules/shared/artifact-locations.md`)
- **Filename:** stable kebab-case name (`prd-<slug>.md`)

---

## Step 3: Next Steps

After the PRD is saved, suggest the user:

```
✅ PRD saved and classified as [feature | epic | system]

Next steps:
  /prd-to-spec  →  Generate one Feature Spec or an approved modular Spec decomposition
  /spec-to-test →  Run only after each Feature Spec is approved
```

If the user wants to proceed, invoke the corresponding skill.

---

## Example PRD

```markdown
# PRD: Task Priority System

## Introduction

Add priority levels to tasks so users can focus on what matters most. Tasks can be marked as high, medium, or low priority, with visual indicators and filtering to help users manage their workload effectively.

## Goals

- Allow assigning priority (high/medium/low) to any task
- Provide clear visual differentiation between priority levels
- Enable filtering and sorting by priority
- Default new tasks to medium priority

## User Stories

### US-001: Add priority field to database
**Description:** As a developer, I need to store task priority so it persists across sessions.

**Acceptance Criteria:**
- [ ] Add priority column to tasks table: 'high' | 'medium' | 'low' (default 'medium')
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Display priority indicator on task cards
**Description:** As a user, I want to see task priority at a glance so I know what needs attention first.

**Acceptance Criteria:**
- [ ] Each task card shows colored priority badge (red=high, yellow=medium, gray=low)
- [ ] Priority visible without hovering or clicking
- [ ] Typecheck passes
- [ ] Verify in a browser (e.g., via the `run` skill)

### US-003: Add priority selector to task edit
**Description:** As a user, I want to change a task's priority when editing it.

**Acceptance Criteria:**
- [ ] Priority dropdown in task edit modal
- [ ] Shows current priority as selected
- [ ] Saves immediately on selection change
- [ ] Typecheck passes
- [ ] Verify in a browser (e.g., via the `run` skill)

### US-004: Filter tasks by priority
**Description:** As a user, I want to filter the task list to see only high-priority items when I'm focused.

**Acceptance Criteria:**
- [ ] Filter dropdown with options: All | High | Medium | Low
- [ ] Filter persists in URL params
- [ ] Empty state message when no tasks match filter
- [ ] Typecheck passes
- [ ] Verify in a browser (e.g., via the `run` skill)

## Functional Requirements

- FR-1: Add `priority` field to tasks table ('high' | 'medium' | 'low', default 'medium')
- FR-2: Display colored priority badge on each task card
- FR-3: Include priority selector in task edit modal
- FR-4: Add priority filter dropdown to task list header
- FR-5: Sort by priority within each status column (high to medium to low)

## Non-Goals

- No priority-based notifications or reminders
- No automatic priority assignment based on due date
- No priority inheritance for subtasks

## Technical Considerations

- Reuse existing badge component with color variants
- Filter state managed via URL search params
- Priority stored in database, not computed

## Success Metrics

- Users can change priority in under 2 clicks
- High-priority tasks immediately visible at top of lists
- No regression in task list performance

## Open Questions

- Should priority affect task ordering within a column?
- Should we add keyboard shortcuts for priority changes?

## Scope Classification

- Classification: `feature`
- Rationale: one independently reviewable and shippable user outcome
```

---

## Checklist

Before saving the PRD:

- [ ] Asked clarifying questions with lettered options
- [ ] Incorporated user's answers
- [ ] User stories are small and specific
- [ ] Functional requirements are numbered and unambiguous
- [ ] Non-goals section defines clear boundaries
- [ ] Classified as `feature`, `epic`, or `system` with rationale
- [ ] Saved to the repository intake directory
- [ ] Suggested `/prd-to-spec` as the required next step
