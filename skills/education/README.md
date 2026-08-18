# Education Skills

这里存放面向教学、学习和知识训练场景的通用 Skill。当前共 1 个。

## Skill 清单

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`teach`](./teach/SKILL.md) | 在工作区内组织持续、多会话的教学过程和学习资料。 | 技术培训、概念学习、课程辅导，以及需要记录长期学习目标和进度的场景。 |

## 使用约定

- 每个 Skill 的 `SKILL.md` 是功能、流程和触发条件的事实来源。
- 项目角色需要在 `.agents/manifest.yaml` 中显式引用 `skills/education/<skill-name>/SKILL.md`。
- 教学 Skill 可以服务开发人员，但其主要产出应是学习过程和教学资料，而不是软件交付物。
