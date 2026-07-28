# CLI GUI 想法与主题草稿（合并归档）

> 本文件合并自 4 个碎片草稿，原文保留：
> `design/idea.md`、`cli-chat设计.md`、`bugrail-idea.md`、
> `design/hardness-bug-coderail主题setup.md`（原文件已删除）。
> 产品定位与架构部分已被 `mvp01/Agent_Console_MVP01_PRD.md` §1-§2 吸收，
> 此处仅作原始记录；星穹铁道主题为未来独立 PRD 的素材（MVP01 Out of Scope）。

---

## 1. 产品背景和设计（原 `design/idea.md`）

背景
> 市面上的ide过于重，都是ele架构，非常重
而且codex 5.6 最新的模型脱离codex架构会更合适 单纯使用cli效果会更好
因此需要一个比较纯净的一个codex app但是tarui架构

大概其实就是qcoder的风格+ UI
zed一样的架构（功能）
实现一个纯净版本的codex app

并且增设自己的hardness的东西和内容

mvp版本
tarui 复刻qcoder这里的内容即可

---

## 2. cli-chat 目标定义（原 `cli-chat设计.md`）

target:
一个统一的 Agent Runtime + Chat UI + Session Manager + Tool Execution Layer

比如：
Codex App = GUI + Codex CLI Runtime
Claude Desktop/Claude Code = GUI + Claude Runtime
Cursor = IDE + Agent Runtime
OpenCode = 多 CLI Agent Orchestrato

---

## 3. Code Star Rail 主题（原 `bugrail-idea.md`）

1. tarui -开屏动画
code-star rail
使用三月七看板娘的状态，一起来打开

具体的思考和构想，放到健身的时候好好思考一些，整理好写好对应的文案整理一下吧l

对应的背景信息就是要思考下对应的元素和主题；
主线：
开拓- 项目的终末；

三月七-记忆系统
丹恒：检索查询 RAG
姬子：领航员/hardness（把控）
星期日：协调/消息传递
瓦尔特：黑洞-不知道，暂定
你/开拓者：coder
帕姆：setting 设置

命途和agent：

大黑塔：

报社： gemini 狸之类的 狸猫agent一整套

狸/迷迷/ 特色的语气注入

整个主题色彩的布局和设置

---

## 4. hardness / bug-coderail 主题 setup（原 `design/hardness-bug-coderail主题setup.md`）

3. 主题- hardness增设 - code starrail
根据崩坏星穹铁道的主题，内置一整套主题结构
根据其游戏的历史背景
比如 bug：若虫
比如 来古士：超级管理员agent
增设几个人物比如
主角：星穹：具备开拓，探索的潜质，是一个 xx
三月七：
丹恒：搜索agent/文库agent/ 专门负责处理文本工作
星期日：负责协调多个agent
