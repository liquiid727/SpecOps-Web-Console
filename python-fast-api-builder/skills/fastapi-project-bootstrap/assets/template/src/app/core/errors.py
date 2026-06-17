from dataclasses import dataclass, field


@dataclass(slots=True)
class AppError(Exception):
    code: str
    message: str
    details: dict[str, object] = field(default_factory=dict)
