# Content Creator Skills

这里存放面向自媒体创作者、视频作者和内容生产角色的通用 Skill。当前共 6 个。此分类与 `skills/developer/` 分离，避免内容制作能力被误配给开发成员。

## 写作与内容编辑

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`humanize-it`](./humanize-it/SKILL.md) | 在多个中文自然化 Skill 之间自动选择并迭代改写。 | 不确定该使用哪种去 AI 味策略，或者需要对整篇文档反复优化。 |
| [`humanizer-zh`](./humanizer-zh/SKILL.md) | 识别并修复常见 AI 写作模式，让中文表达更自然。 | 通用文章、说明文、评论、口播稿和非正式内容的自然化编辑。 |
| [`humanize-chinese`](./humanize-chinese/SKILL.md) | 提供中文 AI 痕迹评分、学术降 AIGC 和风格转换流程。 | 论文、学术材料、检测导向改写或需要量化评估的中文内容。 |

## 视觉、音频与视频

| Skill | 主要作用 | 适用场景 |
| --- | --- | --- |
| [`article-icons`](./article-icons/SKILL.md) | 从 itshover 获取图标，并以干净的内联 SVG 装饰文章。 | Markdown 或 HTML 文章需要章节图标、概念图标和视觉提示。 |
| [`listenhub-tts`](./listenhub-tts/SKILL.md) | 调用 ListenHub API 完成快速、多角色或长文本语音合成。 | 文章朗读、播客脚本、多角色对话、长文本转音频。 |
| [`web-video-presentation`](./web-video-presentation/SKILL.md) | 将文章或口播稿制作成点击驱动的 16:9 网页视频演示，可选合成口播音频。 | B 站、YouTube、视频号录屏教程、产品演示、交互式解说和电影感技术 Talk。 |

## 使用约定

- 每个 Skill 的 `SKILL.md` 是功能、流程和触发条件的事实来源。
- 项目角色需要在 `.agents/manifest.yaml` 中显式引用 `skills/content-creator/<skill-name>/SKILL.md`。
- 新增自媒体 Skill 时，优先按内容生产阶段归类，例如选题、脚本、视觉、音频、视频、发布和复盘。
- 不要把以软件实现、测试或交付为主要目标的 Skill 放在此目录。
