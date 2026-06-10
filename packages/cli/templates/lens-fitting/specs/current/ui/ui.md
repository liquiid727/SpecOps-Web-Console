# UI Spec

## Surfaces

- Prescription upload
- Recommendation result
- Order confirmation
- Merchant review

## Required States

- Empty: no prescription uploaded.
- Loading: recommendation pending.
- Success: order created.
- Failure: invalid prescription or recommendation failed.

## Analytics

- `prescription_submitted`
- `recommendation_viewed`
- `order_created`
