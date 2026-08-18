# Implement cancellation, retry, and approval controls for Chat turns

## Description
Expose safe controls for running Chat turns while preserving the next prompt draft and enforcing a single terminal transition for cancellation races.

## Acceptance Criteria
- [x] Stop is available while a turn is running and is idempotent.
- [x] Retry is explicit after a failure or interruption and does not duplicate user messages.
- [x] Draft edits remain possible during a running turn but duplicate submit is prevented.
- [x] Approval cards show operation, target, source, risk, and expiration; first Allow or Deny freezes the decision.
- [x] Expired and replayed approvals remain understandable and high-permission defaults require confirmation.

## Dependencies
Issues #062, #066, #067

## Type
fullstack

## Local Review Status

- Accepted on 2026-07-30: Orchestrator implements enterWaitingApproval/settleApproval/expireApproval.
- cancelTurn idempotent (TURN_NOT_ACTIVE after terminal state); cancel during approval settles as deny.
- ApprovalCard.tsx 5-state rendering (pending/loading/decided/expired/replay).
- orchestrator.test.ts covers: suspend+allow, deny+write-stdin, expire+timeout, cancel-during-approval.
- TURN_IN_PROGRESS rejects duplicate submits (409).

## Priority
high

## SPEC Reference
CLI-GUI-023; desktop PRD TR-005, FR-TR-5; UI interaction SPEC Sections 3-5.

## Validation
- Integration coverage for cancel race, retry, approval allow/deny, expiry, and draft preservation.
