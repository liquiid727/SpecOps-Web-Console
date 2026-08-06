# Test Plan — Issue 089

## Scope

Verify SecretStore contract behavior, read-only environment references, concurrent memory mutations, typed adapter failures, and available platform lifecycle evidence.

## Commands

```text
npm --prefix cli-gui run test -- --run server/secret-store.test.ts server/application.test.ts server/store.test.ts
macOS security CLI isolated put/resolve/replace/delete/final-missing canary
npm --prefix cli-gui run typecheck
npm --prefix cli-gui run lint
npm --prefix cli-gui run ui:check
npm --prefix cli-gui run build
```

## Acceptance

Local mock/concurrency and macOS canary evidence are recorded. Windows Credential Manager, Linux Secret Service, and packaged Tauri evidence are required before changing the current decision from `blocked`.
