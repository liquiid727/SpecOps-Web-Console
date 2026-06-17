# Release Gates

最低门禁：

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

建议补充：

```bash
uv run pytest tests/contract
uv run pytest tests/e2e -m smoke
```

如果修改了：

- migration：必须跑迁移链路验证
- 错误码：必须校对错误码表
- OpenAPI：必须校对 contract 输出
