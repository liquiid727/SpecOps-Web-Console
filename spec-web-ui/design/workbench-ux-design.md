# SpecOS Web UI Workbench UX Design

## Source

- Product intent: [spec-web-ui/README.md](../README.md)
- Frontend delivery rule: [rules/frontend/react-workbench-delivery.md](../../rules/frontend/react-workbench-delivery.md)
- UI handoff rule: [rules/ui/pencil-prototype-ui.md](../../rules/ui/pencil-prototype-ui.md)
- UI role: [.agents/roles/ui-design-agent.md](../../.agents/roles/ui-design-agent.md)
- Draft template: [spec-draft/_template/feature/ui-handoff.template.md](../../spec-draft/_template/feature/ui-handoff.template.md)

This document is the working UX reference for `spec-web-ui`. It is draft-only until a normalized spec bundle accepts it.

## Product Positioning

`spec-web-ui` is a developer workbench for quickly building a project's AI foundation.

It helps developers discover, select, and assemble the reusable assets needed to start a project with clear AI operating rules:

- rules
- skills
- agent roles
- workflows
- spec templates
- test patterns
- project conventions

The product is not a general admin dashboard. It should not make users feel they are managing a large back office system. Its main job is to help a developer answer:

1. What reusable AI engineering assets exist here?
2. Which assets fit my project?
3. How do I package them into a usable project baseline?

## UX Principle

The interface must be calm, sparse, and obvious.

Every screen should make the next useful action clear without requiring users to understand SpecOS internals first. Dense asset data belongs inside task-specific work areas, not on the home page.

Use this rule of thumb:

- Home page: orientation and starting point.
- Discover: search and understand reusable assets.
- Projects: assemble a project baseline.
- Drafts: edit project intent.
- Exports: review and package the bundle.

## Primary Users

### Solo Developer

Wants to start a new project quickly and avoid rewriting rules, agent responsibilities, skill notes, and test conventions from scratch.

Expected behavior:

- Searches or browses available assets.
- Picks a small set of relevant items.
- Creates or opens a project workspace.
- Exports a baseline that can be installed into the target repo.

### Team Lead

Wants consistent AI project scaffolding across a team.

Expected behavior:

- Reviews reusable rules and agent roles.
- Assembles recommended bundles for common project types.
- Checks conflicts and missing dependencies before handoff.
- Exports a reviewable bundle snapshot.

### Future Project Start Agent

Uses the same catalog and project bundle concepts as retrieval context.

Expected behavior:

- Receives project type, stack, business domain, and team constraints.
- Recommends rules, skills, agents, templates, and workflows.
- Produces an explainable scaffold instead of a black-box generated setup.

## Information Architecture

The product should expose five stable areas.

### Home

Purpose: help users understand what the workbench is and start.

Home should stay minimal:

- one clear headline
- short description
- search input
- one primary path into Discover
- one secondary path into Projects
- a lightweight first-use hint

Home should not include permanent dashboard cards, statistics grids, large catalog previews, or project panels. Those create a false sense that the home page is a content-heavy workspace.

### Discover

Purpose: search and inspect reusable AI engineering assets.

Core tasks:

- Search by title, tag, stack, or source path.
- Filter by type, direction, stack, and tag.
- Inspect asset details.
- Add relevant assets to a project.
- Understand dependencies, conflicts, and recommendations.

Discover can be denser than Home because users arrive there with intent.

### Projects

Purpose: assemble a project-specific AI foundation.

Core tasks:

- Create or open a project workspace.
- See selected assets.
- Resolve missing dependencies and conflicts.
- Connect the project to a draft and export target.

Project screens should show current composition and readiness, not generic marketing content.

### Drafts

Purpose: maintain human-readable project intent before it becomes a normalized spec bundle.

Core tasks:

- Open a project draft.
- Edit structured sections such as background, goals, user flow, system flow, state, rules, and tests.
- Keep draft content traceable to templates and project assets.

### Exports

Purpose: package the selected setup into a reviewable, installable bundle.

Core tasks:

- Generate or inspect export snapshots.
- Review included files and generated bundle structure.
- Compare changes before handoff.
- Confirm the bundle can be installed by CLI or copied into a target project.

## Core Flow

```text
Open workbench
-> Search or enter Discover
-> Understand available assets
-> Add assets to a project
-> Resolve dependencies and conflicts
-> Edit or confirm project draft
-> Export bundle
-> Install baseline into target project
```

The UI should keep this flow visible through labels and navigation, but should avoid turning every step into a large home-page module.

## Interaction Design

### Home Interaction

Home is an onboarding surface, not a dashboard.

Expected interaction:

- User sees one clear explanation of the workbench.
- User can search immediately.
- User can enter Discover or Projects.
- First-use hint gives the simple path: Discover -> Projects -> Exports.

Avoid:

- three large action cards that remain visible forever
- decorative statistics
- duplicated navigation links
- multiple side-by-side sections competing for attention
- long explanations of internal workflows

### Search Interaction

Search should feel like the fastest way to start.

Expected behavior:

- A search from Home routes to Discover with the query.
- Placeholder copy should mention concrete asset types: rules, templates, agent roles.
- Empty query should still open Discover.

### Asset Selection Interaction

Selection should make consequences visible.

Expected behavior:

- Adding an asset updates the project composition.
- Missing dependencies are called out near the selected asset or project summary.
- Conflicts are explicit and actionable.
- Recommended assets explain why they are recommended.

### Export Interaction

Export is a review step, not a blind download.

Expected behavior:

- Users see what files will be included.
- Generated `.specos-bundle/` structure is visible.
- Differences and warnings are reviewable before handoff.

## Visual Design Direction

The visual language can keep the current terminal/workbench personality, but it must remain restrained.

Use:

- compact panels for task surfaces
- clear headings and short descriptions
- subdued borders and surfaces
- monospaced labels for source-like metadata
- primary buttons only for the next useful action

Avoid:

- module walls
- dashboard-style metric cards on Home
- large repeated cards for navigation
- excessive tags in first-level views
- visual decoration that implies product complexity

## State Coverage

Every user-facing flow should define these states.

### Empty

- No catalog assets found.
- No project exists yet.
- No selected assets in a project.
- No export snapshot exists.

Empty states should tell users the next action, not describe the system.

### Loading

- Loading catalog.
- Loading project workspace.
- Generating export preview.
- Validating dependencies or conflicts.

Loading states should preserve layout stability.

### Success

- Asset added to project.
- Project workspace created.
- Draft saved.
- Export snapshot generated.

Success states should confirm the result and expose the next step.

### Failure

- Catalog load failed.
- Project save failed.
- Dependency validation failed.
- Export generation failed.

Failure states should state what failed, why it matters, and what the user can do next.

## Responsive Behavior

Home should remain one-column or near one-column on most screen sizes. It should not split into competing left/right work areas.

Task pages may use multiple columns when useful:

- Discover can use filters and result panels.
- Projects can use composition and detail panels.
- Exports can use file list and preview/diff panels.

On mobile, each route should preserve the same task order:

1. Purpose
2. Primary action
3. Current state
4. Secondary details

## Copy Rules

Use plain developer-facing language.

Prefer:

- "搜索规则、模板、Agent 角色"
- "组合项目上下文"
- "导出 Bundle"
- "查看依赖和冲突"

Avoid:

- vague product claims
- long workflow theory on Home
- internal-only terms without context
- repeated labels that duplicate navigation

## Open Questions

- Should Home eventually support a guided project-start wizard, or should that stay in Projects?
- Should agent and skill configuration become a dedicated route, or remain catalog assets inside Discover?
- Should bundle presets be first-class project templates?
- How much of the future `project-start-agent` flow should be visible before RAG automation exists?

## Validation Notes

UI changes derived from this document should run:

```bash
cd spec-web-ui
npm run test
npm run build
```

For route or layout changes, also verify the affected page in the browser at `http://localhost:3001`.
