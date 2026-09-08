# Codex Instructions For SpecOS

## Default Behavior

- Respond in Chinese unless the user asks otherwise.
- Treat SpecOS as a spec-driven orchestration project, not only a frontend app.
- Use `Fairy` as the coordinator identity when managing multi-agent work.
- Read root `AGENTS.md` before making repository changes.
- This file is selected by the SpecOS prompt assembly in `.agents/manifest.yaml`; it is not a standalone Codex auto-loaded instruction file.
- Use `.agents/manifest.yaml` to choose role context for multi-step work.
- When a role is selected, load its `role_prompt`, `canonical`, and the skills and context needed for the current task. A declared optional skill is available, not automatically required; directory entries are discovery scopes, not instructions to read every file.
- Do not expand repository-local or external skills unless they are bound to the selected role or explicitly requested by the user.
- Use `.rules/project.md` as the compact rule entrypoint.

## Planning

- For non-trivial work, identify the source spec, impacted artifacts, validation command, and reviewer role.
- If there is no accepted spec, keep changes draft-scoped or ask whether to promote the draft.
- `/prd-to-spec` produces modular Feature Specs only. After a Feature Spec is approved and versioned, use `spec-to-test` to derive an independent Test Spec for that exact source version.
- After both the child Spec and its Test Design are approved, implementation
  Issues and verification work may proceed as separate tracks. Implementation
  agents may add focused, implementation-coupled unit tests, but independent
  scenario execution and release evidence belong to the testing track. Implementation
  checkpoint review checks current bindings, code, focused tests and closeout; it
  does not wait for evidence assigned to later verification work. Verification
  closeout checks its required evidence; QA acceptance and ship reject stale Test
  Designs or missing blocking delivery evidence. Never promote a scoped review
  into a package acceptance decision.
- Prefer narrow changes that preserve traceability.
- Prefer switching roles or splitting work over adding more skills to a single role context.
- For architecture or cross-domain requests, use `architecture-agent` as the primary role. It may open `ddd-domain-agent` or other registered specialists when independent work would help.
- Treat `route-request` and `classify-request` as routing previews only. Host-side subagent execution is responsible for actually starting agents and merging their reports.

## Requirement Intake

- For non-trivial or ambiguous requests, prefer running or mentally applying `route-request --request "<text>"` before choosing role context.
- For new product requirements and delivery changes, use `docs/spec-modes/GoalSpec/README.md` and `.requirements/README.md` as the intake entrypoints.
- Classify the request before editing as one of: raw requirement, draft-only, active change, implementation, test, review, acceptance, or tooling/configuration.
- For explanation, inspection, review-only, or diagnosis-only requests, read relevant sources and report findings without changing artifacts. Tooling/configuration maintenance authorized by the user may trace to that request and the governing rule; do not manufacture a product Requirement Workspace for it.
- For a raw or exploratory requirement, return a draft proposal or preserve an explicitly requested draft in the applicable Requirement Workspace. Do not mark it approved without approval.
- When a normalized delivery package is needed, create or identify `.requirements/requirements/R0NN-<slug>/` and read its root `prd.md` and `index.yaml`.
- For implementation and independent verification, select the owning `specs/S0N-<slug>/`, read its approved `spec.md`, current `test.md`, and relevant `issues/ISSUE-*.md`, and keep outputs in the owning package.
- Record delivery review and QA acceptance in the existing `review.md`, `evidence/`, and `acceptance.md` chain. Never infer acceptance from implementation or local tests alone.
- In final summaries for requirement work, name the draft or change id, impacted artifacts, validation evidence, assumptions, and any skipped link in the chain.

## Validation Hints

- Frontend package path: `spec-web-ui/`.
- Frontend tests: `npm run test`.
- Frontend build: `npm run build`.
- Spec and rule changes require manual consistency checks across names, links, and scope.

## Safety

- Do not modify `.codex/config.toml` provider settings unless explicitly asked.
- Do not commit, push, or create branches unless explicitly asked.
- Do not add generated caches, secrets, or machine-local artifacts.
