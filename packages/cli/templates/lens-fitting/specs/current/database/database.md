# Database Spec

## MVP Entities

- `user_profile`
- `prescription`
- `lens_product`
- `recommendation`
- `order`

## Notes

- Prescription data requires validation and audit timestamps.
- Recommendation output should reference the prescription and lens products used.
- Order creation must be idempotent for duplicate submissions.
