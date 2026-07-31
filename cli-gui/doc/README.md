# CLI GUI Docs

This directory owns the CLI GUI product, design, architecture, and planning documents for the standalone local Web app under `cli-gui/`. Documents are grouped by feature module; each module folder keeps its own PRD → SPEC → Issues delivery chain together.

## Directory Layout

```
doc/
├── README.md            # this index
├── AGENTS.md            # CLI GUI doc/UI-delivery operating notes (incl. i18n rules)
├── mvp01/               # MVP01 main line (Agent Console)
├── mvp02/               # terminal replacement (remote control descoped)
├── mvp02-check-qa/       # MVP02 local desktop experience hardening and QA gate
├── workbench/           # three-column workbench module
├── project-quest/       # project entry & New Quest creation module
├── qoder-ui/            # Qoder UI retrofit module (delivered)
├── console-gaps/        # MVP01 leftover/retrenchment gap-closing module
└── design/              # cross-module design truth and idea notes
```

## mvp01/ — MVP01 main line (Agent Console)

- `Agent_Console_MVP01_PRD.md`: **integrated MVP01 entry PRD (v0.3)** — Session Manager + Chat visualization dual core, Runtime Orchestrator layering, MVP01-A/B scope split, §12 traceability mapping. Start here.
- `prd-cli-gui.md`: MVP01 baseline PRD — Workspace / Profile / Session lifecycle and PTY.
- `cli-gui.md`: original Product AI OS MVP01 draft (kept as source draft; superseded by the PRDs).

## mvp02/ — desktop terminal replacement

- `README.md`: MVP02-A scope, delivery gate, and document index (MVP02-B remote
  control is descoped; its Issues #076-#089 were deleted).
- `client-platform-prd.md`: shared Desktop/Remote client product contract.
- `desktop-terminal-replacement-prd.md`: no-external-terminal user journey and acceptance criteria.
- `remote-prd.md`, `remote.md`: remote-control PRD and retained original concept (reference only; descoped).
- `spec/architecture-spec.md`: MVP02 technical entry point and split SPEC index.

The durable cross-release architecture is
`../../design/cli-gui-platform-design.md`. MVP03 owns official App replacement
and differentiated product features; it is not the MVP02 completion gate.

## mvp02-check-qa/ — local desktop experience hardening

- `README.md`: independent QA track positioned after MVP02-A.
- `experience-checklist.md`: startup, Workspace, Session, Chat, Settings, responsive,
  accessibility, i18n, lifecycle and performance checks.
- `qa-gate.md`: execution evidence and gate decision template.

This track supplements MVP02 without changing the existing MVP02 PRD/SPEC or
including MVP03 product enhancements and MVP02-B remote implementation.

## workbench/ — three-column workbench

- `prd-cli-gui-workbench.md`: workbench PRD — transcript persistence/replay, Markdown, composer.
- `spec-cli-gui-workbench.md`: workbench architecture and implementation specification.

## project-quest/ — project entry & New Quest creation

- `prd-cli-gui-project-quest.md`: project entry (Open Folder / Set Up Workspace / Connect SSH), Quest Home, built-in chat.
- `spec-cli-gui-project-quest.md`: technical specification.
- `issues-cli-gui-project-quest.md`: issue breakdown.

## qoder-ui/ — Qoder UI retrofit (delivered)

- `spec-cli-gui-qoder-ui.md`: Qoder-style UI retrofit technical specification.
- `issues-cli-gui-qoder-ui.md`: 10-issue breakdown (delivered; status tracked in `../.loop-state.json`).
- `prompt-full-implementation.md`, `prompt-lean-execution.md`: one-time execution prompts (migration completed; kept as delivery evidence).
- `reference/`: Qoder replica reference set — `qoder-replica-prd.md`, per-panel detail specs (`qoder-sidebar/input/chat/right-panel/knowledge/marketplace-detail.md`), and interactive prototypes (`qoder-quest-replica.html`, `workbuddy-ide.html`).

## console-gaps/ — MVP01 leftover & retrenchment gap closing

- `spec-cli-gui-console-gaps.md`: technical spec for the `doc/todo/0728.md` gap list — chat entry downgrade to terminal, model catalog sync/import, 4-state work mode (default/spec/goal/plan + Ctrl+Tab), centralized shortcuts + Settings table, language switch consolidation, read-only Skills management. Includes traceability back to MVP01 PRD §8/§11, workbench US-024, and project-quest US-B4/B5.
- `issues-cli-gui-console-gaps.md`: 7-issue breakdown (issue #5 is a reference card that executes project-quest issue #8 for voice input & prompt polish).

## design/ — cross-module design truth

- `cli-gui-design.md`: design implementation map; the normative visual contract is `../DESIGN.md`.
- `ideas.md`: merged idea notes — product background, cli-chat target, and Code Star Rail theme material (future, out of MVP01 scope).
