# Design

Stable platform and system design documents live here.

Rules:

- One platform or system has one canonical design document
- Design docs stay broad and durable
- Feature-level work belongs in `.requirements/requirements/R0NN-<slug>/`, not in duplicated design docs
- Feature specs may reference a design doc, but they must not fork it

`bugrail-platform-design.md` is a pointer. The Bugrail platform design lives in
the sibling `~/code/bugrail` repository.

Recommended shape:

```text
design/
  risk-platform-design.md
  payment-platform-design.md
  auth-gateway-design.md
  _template/
    platform-design.template.md
```
