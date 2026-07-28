# API Spec

## MVP Endpoints

- `POST /api/prescriptions`
- `POST /api/recommendations`
- `POST /api/orders`
- `GET /api/orders/{orderId}`

## Error Semantics

- `validation_error`
- `recommendation_unavailable`
- `order_conflict`

## Events

- `order_created`
- `merchant_review_requested`
