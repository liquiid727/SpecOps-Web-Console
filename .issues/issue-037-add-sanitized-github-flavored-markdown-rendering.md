# Add sanitized GitHub-flavored Markdown rendering

## Description
Render recognized Plan, Skill, and Markdown-rich transcript content without enabling unsafe HTML.

## Acceptance Criteria
- [ ] Add react-markdown and remark-gfm in cli-gui.
- [ ] Render headings, lists, task lists, tables, quotes, links, inline code, and fenced code.
- [ ] Do not install rehype-raw or use dangerouslySetInnerHTML.
- [ ] Allow only http, https, mailto, relative, and fragment links.
- [ ] Apply safe external-link attributes.
- [ ] Bound rendered input to 256 KiB and show raw/truncation fallback.
- [ ] Preserve raw source and add copy controls.
- [ ] Test Plan, Skill, malformed Markdown, malicious HTML, unsafe URLs, and oversized fixtures.

## Dependencies
Issue #36

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §5.5, §12

## Source
- `tasks/prd-cli-gui-workbench.md`
- `tasks/spec-cli-gui-workbench.md`
