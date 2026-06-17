# Project Layout

推荐目录：

```text
src/
  app/
    main.py
    core/
      config.py
      logging.py
      errors.py
      deps.py
    api/
      router.py
      v1/
        health.py
    modules/
      agent_run/
        api/
        application/
        domain/
        infrastructure/
      conversation/
        api/
        application/
        domain/
        infrastructure/
tests/
  unit/
  integration/
  contract/
  e2e/
```

原则：

- 先按领域聚合，再在领域内按层次拆分。
- `core/` 只放跨领域基础设施，不放业务逻辑。
- `api/router.py` 只做总装配，不做复杂逻辑。
