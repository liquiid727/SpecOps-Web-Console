# Artifact Shapes

## docs

Use for standards, contracts, guides, and patterns. These files define public truth for adopters.

## core

Use for framework-neutral primitives such as failure modeling, runtime helpers, or config contracts.

## adapters

Use for concrete HTTP, gRPC, auth, Redis, or observability integrations. Adapters may render transport output but must not own business truth.

## templates

Use for copyable starter shapes that show recommended layering, request/response design, and error handling flows.

## examples

Use for minimal demonstrations of how one extracted contract or adapter is consumed.

## maintainers

Use for source-package maps, extraction notes, compatibility leftovers, and other provenance that should not leak into public documentation.
