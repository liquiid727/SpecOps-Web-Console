# Boundary Rules

Use these rules to decide whether something belongs in public foundation output.

## Can Enter Foundation

- transport-neutral contracts
- generic technical adapters
- naming, layering, and packaging standards
- reusable templates and starter examples
- minimal default implementations that do not require source-repository business truth

## Must Stay Out Of Public Foundation

- business state machines
- bounded-context truth
- product-specific error codebooks
- repository-private response fields that only make sense in one product
- runtime-owner rules tied to one deployment topology
- migration instructions that assume the source repository must adopt the extracted package

## Maintainer-Only Material

Move these to provenance or extraction notes instead of public docs:

- source repository package paths
- historical compatibility wrappers
- migration leftovers
- "this originally came from package X" notes
- repository-specific shortcuts that are not suitable as public guidance
