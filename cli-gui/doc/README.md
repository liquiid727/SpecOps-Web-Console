# CLI GUI Docs

This directory owns the CLI GUI product, design, architecture, and planning documents for the standalone local Web app under `cli-gui/`. Documents are grouped by feature module; each module folder keeps its own PRD → SPEC → Issues delivery chain together.

## Directory Layout

```
doc/
├── README.md            # this index
├── AGENTS.md            # CLI GUI doc/UI-delivery operating notes (incl. i18n rules)
├── mvp01/               # MVP01 main line (Agent Console)
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
