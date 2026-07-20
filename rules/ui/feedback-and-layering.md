# UI Feedback, Native Control, and Layering Rules

## Purpose

Keep user-visible interaction responses consistent across the CLI GUI. Feedback must be understandable, accessible, localized, and visually aligned with the workbench rather than delegated to browser-owned UI.

## Prohibited UI

- Do not use native browser `<select>` controls. Use the local `ui/Select` listbox primitive.
- Do not call `window.alert`, `window.confirm`, or `window.prompt`.
- Do not introduce browser-native or third-party popups that bypass the local theme, focus rules, i18n, or z-index contract.
- Do not place action errors in arbitrary page-level banners, terminal output, or component-local error strings when the failure is an operation response.

## Required Feedback

- Success, failure, warning, and network responses from user actions must use `FeedbackProvider` and `useFeedback`.
- Use Toast for short non-blocking success or completion feedback.
- Use Message for short informational or progress feedback.
- Use Notification for errors, warnings, persistent outcomes, or outcomes with an action.
- Use `Overlay`/`ActionDialog` for confirmation and blocking decisions.
- Runtime state, transcript content, field validation, loading states, empty states, and retry controls may remain contextual. Do not duplicate the same explanatory error in multiple locations.
- API errors must be mapped by stable error code to localized safe copy. Do not expose stack traces, raw exception text, or sensitive filesystem details.
- Repeated background failures must use a stable deduplication key.

## Layer Order

The implementation must preserve this order:

1. Workbench content and terminal.
2. Rail, drawer, and drawer backdrop.
3. Context menus and custom select menus.
4. Toast, Message, and Notification feedback.
5. Modal backdrop and modal content.

Components must consume semantic z-index tokens from the shared stylesheet and must not invent local numeric layers.

## Motion and Accessibility

- Opening and closing menus, selects, drawers, overlays, and feedback use a short opacity/transform transition.
- Expansion must animate visibility and spatial movement together; abrupt interactive disappearance is prohibited.
- Every feedback item has an appropriate `role` and `aria-live` politeness, a visible close action, and an accessible action label when present.
- Custom selects implement listbox semantics, Arrow/Home/End/Escape keyboard behavior, focus restoration, and disabled-option handling.
- `prefers-reduced-motion: reduce` disables non-essential motion without removing state or feedback.

## Verification

- Add component tests for feedback rendering, dismissal, deduplication, and custom select keyboard behavior.
- Verify English and Chinese feedback copy.
- Verify desktop and narrow layouts in Chrome, including feedback placement above the composer and custom select menus above clipped surfaces.
