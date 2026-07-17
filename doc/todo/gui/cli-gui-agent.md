# CLI GUI Agent Knowledge

## Agent

`cli-gui-agent` owns frontend/product UI guidance for the standalone `cli-gui/` app and related Product AI OS GUI notes under `doc/todo/gui/`.

## Mandatory i18n Rule

- Default UI language is English (`en`).
- The UI must support Chinese (`zh`) and English (`en`) through the shared i18n layer.
- Every new or modified user-facing UI string in `cli-gui/client/**` must be added to `cli-gui/client/i18n.tsx` for both `en` and `zh`.
- Components must consume copy through `useI18n().t(...)` or a dedicated helper such as `statusLabel(...)`; do not hardcode English or Chinese text directly in JSX.
- Language choice must remain user-switchable and persisted in `localStorage`.
- The document language must stay synchronized with the selected mode through `document.documentElement.lang`.
- Tests that render translated components must wrap them in `I18nProvider`.

## Current Implementation Pointers

- i18n provider and dictionary: `cli-gui/client/i18n.tsx`
- language switcher: `cli-gui/client/components/LanguageToggle.tsx`
- provider mount: `cli-gui/client/main.tsx`
- translated UI surfaces include App shell, session navigator, workspace, inspector, settings drawer, action dialogs, and new session dialog.

## Future UI Change Checklist

1. Add or update English and Chinese keys in `cli-gui/client/i18n.tsx` before wiring JSX copy.
2. Use stable semantic keys, not component-local ad hoc labels.
3. Keep dynamic text parameterized with `{{name}}` style placeholders.
4. Keep status labels routed through `statusLabel(...)`.
5. Run `npm --prefix cli-gui run build` and, when tool access allows, `npm --prefix cli-gui run test`.
6. If browser-verifying GUI copy, open `http://127.0.0.1:3000/` in Google Chrome and check both EN and 中文 modes.
