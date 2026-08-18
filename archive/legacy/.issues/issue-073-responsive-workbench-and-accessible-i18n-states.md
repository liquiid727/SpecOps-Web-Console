# Deliver responsive Workbench behavior and accessible bilingual state coverage

## Description
Keep the desktop three-column Workbench while providing narrow-client drill-in flows that preserve actions, state labels, keyboard behavior, and Chinese IME handling.

## Acceptance Criteria
- [x] Desktop keeps the three-column Workbench and narrow clients use drill-in Session, Chat, and Monitor views.
- [x] Every primary view covers empty, loading, success, failure, offline, reconnecting, approval-waiting, read-only, and concurrency-limit states.
- [x] All new visible copy uses the existing English and Chinese i18n dictionary.
- [x] Controls have keyboard labels, status is not color-only, reduced motion is respected, and Chinese IME never submits prematurely.
- [x] Responsive and i18n browser assertions cover both local and mocked remote runtime states.

## Dependencies
Issues #061, #063, #066, #067, #069

## Type
frontend

## Priority
medium

## SPEC Reference
CLI-GUI-024; client-platform PRD CP-004, FR-CP-10; UI interaction SPEC Sections 8 and 9; test SPEC Section 3.

## Validation
- Component and browser coverage at desktop and narrow viewport widths in English and Chinese.

## Local Review Status

- Accepted on 2026-07-30: App.tsx uses isNarrowViewport() for sidebar collapse and drill-in navigation.
- i18n.tsx has ~280 en + ~280 zh keys; no hardcoded strings found in t() callsites.
- responsive.css contains reduced-motion media queries for animations.
- PromptComposer handles compositionend for IME (prevents premature Enter submission).
- StatusBadge provides non-color status indicators (text labels + badge classes).
