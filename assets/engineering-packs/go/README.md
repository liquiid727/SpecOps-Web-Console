# Go Engineering Pack

The Go pack is the reusable project baseline for API services, gRPC services,
workers, schedulers, gateways, and CLI programs.

Its current constraint document covers project layout, toolchain and version
management, build and test gates, CI/CD, release, security, observability, and
the `goforge` CLI scaffold contract.

The pack manifest is [pack.json](pack.json). The long-form constraint source is
under `constraints/` and is exported to the target project's `rules/` tree.
