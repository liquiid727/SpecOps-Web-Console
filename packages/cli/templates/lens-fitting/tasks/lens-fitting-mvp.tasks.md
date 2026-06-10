# Lens Fitting MVP Tasks

## Epic 1: Prescription Intake

- Story: user enters prescription values.
- Task: define validation schema.
- Task: build upload/input UI.

## Epic 2: Lens Recommendation

- Story: user receives matching lens options.
- Task: implement recommendation boundary.
- Task: map catalog rules to recommendation response.

## Epic 3: Order Creation

- Story: user creates an order from recommendation.
- Task: implement idempotent order creation.
- Task: add merchant review status.

## Epic 4: Verification And Deploy

- Task: create API and E2E test plan.
- Task: document staging gate and rollback path.

## Agent Invocation

- `Task -> Code`: route frontend work to `frontend-agent` and backend work to `backend-agent`.
- `Code -> Test`: route verification to `qa-agent`.
- `Test -> Deploy`: route release gates and rollback checks to `ci-editor`.
