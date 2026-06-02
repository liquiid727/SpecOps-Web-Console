# TTL And Truth

- temporary tokens, guards, and rate limits need TTL by default
- no-TTL families require explicit ownership and cleanup expectations
- document whether Redis is hot-read truth, projection, or coordination layer
- document fallback rules to durable storage or lack thereof
