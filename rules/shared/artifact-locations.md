# Artifact Locations

## Purpose

Keep every spec-chain artifact in a predictable, configurable PRD Workspace.
A workspace keeps related work below one R0NN directory without forcing a
single Spec or Issue file to represent many independent delivery units.

## Single Source Of Truth

.specos/manifest.yaml artifacts is the authoritative declaration of the
Requirement Workspace root. Under GoalSpec, a root PRD Workspace contains
child Spec Packages:

    artifacts:
      requirementsDir: .requirements/requirements
      templatesDir: .requirements/templates

The manifest identifies the root only. Within each R0NN workspace, paths
are fixed by the GoalSpec standard:

    R0NN-<slug>/
    ├── prd.md
    ├── index.yaml
    ├── acceptance.md
    └── specs/S0N-<slug>/
        ├── spec.md
        ├── test.md
        ├── issues/ISSUE-*.md
        ├── review.md
        ├── acceptance.md
        └── evidence/

Evidence for a child Spec Package MUST live or be referenced under that
package's evidence/ directory. Do not create a competing workspace-level
test or result store for new packages.

## Path Resolution Order

Every skill that reads or writes spec-chain artifacts resolves paths in this
order:

1. An explicit location from the user.
2. .specos/manifest.yaml artifact values.
3. Built-in `.requirements/requirements` and `.requirements/templates` defaults.

Never invent a directory outside this order.

## Customization Protocol

When a user asks for a non-default root location:

1. Update the matching .specos/manifest.yaml artifacts key.
2. Record the durable project configuration for later agents.
3. Continue using the manifest rather than guessing paths per session.
