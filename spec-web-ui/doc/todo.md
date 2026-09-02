spec UI
这个是个面向内部的工具站点，你可以理解为一个 spec kit / asset workbench。

它维护平时积累的 spec 模板、agent 模板、workflow 模板、skill 内容、rules 和 test patterns。它不承载某个目标项目的需求生命周期；目标项目自己的需求流程仍然在目标项目仓库里走 `.requirements/` 的 Requirement Package 模型（`.requirements/requirements/R0NN-<slug>/{prd.md, index.yaml, specs/S0N-<slug>/{spec.md, test.md, issues/ISSUE-*.md}}`，沿 prd-author → spec-generate → spec-review → spec-test-generate → test-review → issue-generate → issue-execute → feature-verify 推进）。

UI spec：

user goal
用户进入webui，可以快速的搜索、浏览、选择、自定义
spec模版、agent、workflow方式（agent流程）、skill内容
方便用户快速搭建一套适合自己项目，或者用于自己的开发的agent和spec规范

page role
主页：简单快速介绍用途和用法，方便用直观的知道用于什么和如何快速的挑选已有的模版快速构建自己的spec模版提示和agent体系

User actions
用户进入主页，查看项目介绍和内容，可以快速的浏览到已经现成的项目构造和海报，快速的了解和知道这个网页上用于什么的
用户可以通过导航栏，快速进入spec模版仓库 agent模版仓库， work flow模版仓库
- 可以快速自由的选择sepc模版 agent模版 workflow模版
- 同时每个界面可以用户自定义预输入自己的agent模版内容（用户可以自己输入对应的规范，可以快速的形成自己的需要的模版内容和roles）
- 用户选择自己需要的spec模版 agent模版等之后，可以一键预览项目和导出项目配置
（一键预览项目，会有对应的目录结构和流程图，方便用户快速的了解各组件的作用和关系，这个搭建之后对应的workflow是怎样的）


System Behaviors
    - 用户进入首页，根据地区和时间，显示不同的语言和对应的白天/夜晚风格
    - 用户进入首页，加载对应的首页海报、项目一览等等



UI States（界面状态机）
- 导航栏右上角有主页/spec模版/agent模版/workflow模版（暂时不支持）/配置工作区/
- 右上角还有语言切换和日夜模式切换，对应的，做成点击类型icon，点击之后下拉切换对应的语言类型和日/夜
- 界面要简单，除了上面的导航栏和上面模版的搜索/筛选栏目 后面的内容模块都不要带有负责界面设计
    - 现在的内容模块似乎是复用了card，左右两侧都有对应的类似终端和apple的元素在这里，显得界面非常臃肿
    

Feedback（反馈机制）
- loading （当进入界面的时候，数据可能需要加载，这里要有对应的loading动画）


Future Todo：specosai-agent
- 后续增加一个 `specosai-agent`，作为用户创建项目 agent/rule/skill 体系时的智能入口。
- 用户可以通过自然语言描述、PRD、技术文档、接口文档、数据库设计文档或现有项目说明，让 `specosai-agent` 先判断项目类型、需求类型、技术栈、测试要求和治理要求。
- `specosai-agent` 根据判断结果，推荐并选择需要放置到目标项目里的文件：
  - `.agents/manifest.yaml`
  - `.agents/roles/*.md`
  - `ai/agents/*.md`
  - `.codex/skills/*`
  - `skills/developer/*`
  - `.rules/rule-map.yaml`
  - `rules/**/*.md`
  - `.requirements/` 相关模板（prd / spec / test / issues）与 `.rules/`
- 该 agent 需要输出一份可预览的安装计划，说明每个 agent、skill、rule 为什么需要、放在哪个路径、是否会覆盖已有文件、是否需要用户确认。
- 未来上线之后再把这一套能力开发完整：从“用户描述/文档输入”到“自动选择 agent/rule/skill 文件”再到“一键导出或安装到目标项目”。
