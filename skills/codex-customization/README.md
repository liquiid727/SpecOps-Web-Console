# Codex Customization Skills

这里存放以 Codex 本身的外观、角色和个性化资产为主要产出的通用 Skill。当前共 1 个。

## Skill 清单

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`hatch-pet`](./hatch-pet/SKILL.md) | 创建、修复、验证并打包 Codex v2 动画宠物及其精灵图。 | 新建 Codex 宠物、品牌吉祥物、修复已有宠物或制作 8×11 spritesheet。 |

## 使用约定

- 每个 Skill 的 `SKILL.md` 是功能、流程和触发条件的事实来源。
- 项目角色需要在 `.agents/manifest.yaml` 中显式引用 `skills/codex-customization/<skill-name>/SKILL.md`。
- 只有主要产出是 Codex 个性化资产或运行体验扩展的 Skill 才放入此目录。
