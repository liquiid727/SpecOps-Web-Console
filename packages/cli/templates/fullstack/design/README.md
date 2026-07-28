# Design

Stable platform and system design documents live here.

Rules:

- One platform or system has one canonical design document
- Design docs stay broad and durable
- Feature-level work belongs in `.features/`, not in duplicated design docs
- Feature specs may reference a design doc, but they must not fork it

Recommended shape:

```text
design/
  risk-platform-design.md
  payment-platform-design.md
  auth-gateway-design.md
  _template/
    platform-design.template.md
```
