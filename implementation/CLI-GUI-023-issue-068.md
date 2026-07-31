# CLI-GUI-023 Issue 068 Implementation Notes

## Meta

- Spec ID: `CLI-GUI-023`
- Source Issue: `.issues/issue-068-turn-control-and-approval-flow.md`
- Status: `accepted_local`

## Delivered Files

- `cli-gui/server/orchestrator.ts`: `enterWaitingApproval` / `settleApproval` / `expireApproval` with single-pending model; timeout treated as deny.
- `cli-gui/server/application.ts` L1194-1200: `respondApproval` API endpoint wired to orchestrator.
- `cli-gui/client/components/cards/ApprovalCard.tsx`: 5-state approval card (pending/loading/decided/expired/replay).
- `cli-gui/client/components/StructuredCardList.tsx`: Routes approval_request events to ApprovalCard with onApprove/onDeny callbacks.
- `cli-gui/server/orchestrator.test.ts`: Approval suspend/resume, expiry, and cancel race tests.
- `cli-gui/server/contract-security.test.ts`: Approval replay idempotency assertion.

## Design Decisions

- Single-pending approval model: only one approval can be outstanding per session at a time.
- Approval timeout (configurable, default 60s) auto-denies to prevent indefinite hangs.
- `cancelTurn` is idempotent — second cancel on same turn is a no-op (SIGTERM already sent).
- Draft editing is not blocked during a running turn; only duplicate submit is prevented (409 TURN_IN_PROGRESS).
- `buildApprovalResponse` wiring only enabled for profiles with `supportsApproval: true`.

## Validation

- `npm --prefix cli-gui run test -- --run`: 50 files, 388 tests passed.
- Orchestrator tests cover: approval allow/deny, expiry timeout, cancel race, idempotent cancel.
- Contract suite verifies approval state stability under replay.
