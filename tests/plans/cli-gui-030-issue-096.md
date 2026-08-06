# Test Plan — Issue 096

Verify the pure Route Resolver precedence, provenance, candidate exclusions, fixed-target safety, and dependency boundary from `CLI-GUI-030`.

## Matrix

- Precedence: undefined inheritance and system < global < project < session, with stable sourceTrace and run override provenance.
- Exclusions: every public RouteExclusionCode; Route disabled/archived and Deployment-level multi-cause combinations; stable deduplication and original candidate order/position.
- Fixed target: eligible, non-member, missing, disabled, archived, provider-disabled, credential-missing, engine-incompatible, model-unverified, and empty values; no silent fallback.
- Semantics: no-route legacy, no-route fixed block, missing bound Route, no executable candidate, and 1/8/9 pure input candidates.
- Purity: production resolver has type-only imports and no filesystem, repository, CLI, network, UI, Agent, or SecretStore dependency.

## Commands

- `npm --prefix cli-gui run test -- --run server/model-route-resolver.test.ts`
- `npm --prefix cli-gui run test -- --run`
- `npm --prefix cli-gui run typecheck`
- `npm --prefix cli-gui run lint`
- `npm --prefix cli-gui run ui:check`
- `npm --prefix cli-gui run build`
- `npx specos check`
- `git diff --check`
- `bash /Users/liquiid/.claude/skills/review-it/scripts/review-it`

Browser and platform are N/A per the CLI-GUI-030 Test Spec. API/session/preflight, Attempt, packaged-host, cross-process, and real Provider/engine behavior are outside this issue.
