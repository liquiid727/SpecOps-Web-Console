# Complete accessible three-column shell and drawers

## Description
Extend the existing utility rail, navigator, center workspace, and inspector into a persistent accessible three-column shell.

## Acceptance Criteria
- [x] Preserve the existing componentized shell and tokenized CSS.
- [x] Toggle left and right panels independently with buttons and existing shortcuts.
- [x] Expose aria-expanded and aria-controls on panel toggles.
- [x] Keep the center usable with either or both panels closed.
- [x] Render responsive side panels as drawers with clickable backdrops and focus restoration.
- [x] Persist panel visibility through UI preferences.
- [x] Respect reduced motion and add English and Chinese strings.
- [x] Verify desktop, <1280px, <900px, and <640px layouts in browser tests.

## Dependencies
Issues #30, #31

## Type
frontend

## Priority
high

## SPEC Reference
SPEC §2.3; PRD US-005

## Source

- Traceability: legacy/unmapped
