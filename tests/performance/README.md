# Performance Tests

This directory stores spec-derived latency, throughput, SLO, and baseline-regression assets.

Execution tools such as k6, Artillery, autocannon, or wrk are adapters. Their raw output must be normalized into `tests/results/*.json` before the test console or CI gates consume it.
