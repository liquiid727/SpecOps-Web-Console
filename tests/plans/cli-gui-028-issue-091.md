# Test Plan — Issue 091

## Scope

Validate CLI-GUI-028 Provider resolution, pre-spawn failure, persistent runtime argument handling, redaction, and concurrent launch isolation.

## Matrix

- Terminal: resolver call and final PTY env/args; missing credential produces no PTY spawn.
- Backend chat: resolver call, launch env/args, resume path, and canary-free state/API/logger.
- Persistent chat: resolver call, transient provider args before `mcp-server`, first-spawn-only behavior, env injection, and missing credential before runtime.
- Security: canary-free state/API/transcript/logger/runtime snapshot plus distinct Provider isolation.
- Boundary: fake runtime results are local evidence; real Codex/provider/platform/package results remain explicitly blocked.

## Commands

```text
npm --prefix cli-gui run test -- --run server/codex-mcp-runtime.test.ts server/application.test.ts server/chat-api.test.ts
npm --prefix cli-gui run test -- --run
npm --prefix cli-gui run typecheck
npm --prefix cli-gui run lint
npm --prefix cli-gui run ui:check
npm --prefix cli-gui run build
npx specos check
git diff --check
/Users/liquiid/.claude/skills/review-it/scripts/review-it
```

## Acceptance

The local matrix is complete and independently rerun: 71/71 focused tests and 471/471 full tests passed. QA remains blocked until real engine, platform, cross-process, and packaged-host evidence is available.
