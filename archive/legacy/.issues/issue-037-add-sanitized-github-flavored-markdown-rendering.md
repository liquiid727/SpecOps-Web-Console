# Add sanitized GitHub-flavored Markdown rendering

## Description
Render recognized Plan, Skill, and Markdown-rich transcript content without enabling unsafe HTML.

## Acceptance Criteria
- [x] Add react-markdown and remark-gfm in cli-gui.
- [x] Render headings, lists, task lists, tables, quotes, links, inline code, and fenced code.
- [x] Do not install rehype-raw or use dangerouslySetInnerHTML.
- [x] Allow only http, https, mailto, relative, and fragment links.
- [x] Apply safe external-link attributes.
- [x] Bound rendered input to 256 KiB and show raw/truncation fallback.
- [x] Preserve raw source and add copy controls.
- [x] Test Plan, Skill, malformed Markdown, malicious HTML, unsafe URLs, and oversized fixtures.

## Dependencies
Issue #36

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §5.5, §12

## Source

- Traceability: legacy/unmapped
