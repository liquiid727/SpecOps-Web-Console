# Issues

Index of Issues produced by `/to-issues`, one entry per implementation or verification Issue.

Each entry should stay small, explicit, and independently reviewable.

| Issue | Track | Source ID | Source Version | Status | Depends on |
| --- | --- | --- | --- | --- | --- |
| | implementation / verification | | | open / in-progress / in-review / shipped | |

Status transitions map to the dual-track loop:

1. `/prd` -> spec-draft accepted
2. `/prd-to-spec` -> versioned Feature Spec approved
3. `/to-issues` -> implementation Issues added as `open`
4. `/spec-to-test` -> version-bound Test Spec approved; `/to-issues` adds verification Issues
5. The host agent or `/loop-it` executes both tracks and collects evidence
6. `/review-it` -> Issue stays `in-review` until findings and blocking evidence gaps are resolved
7. `/ship-it` -> Issue moves to `shipped` and is closed
