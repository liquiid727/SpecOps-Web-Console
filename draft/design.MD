# Spec 设计草案

## 1. 核心定位

人负责表达业务意图，Spec 系统负责把这些意图结构化、规范化、版本化。

一句话概括：

> Spec = 人机协作完成的标准化产物

---

## 2. 基本流程

```text
Human（业务提供者）
    ↓
spec-draft（非结构化 / 半结构化）
    ↓
Spec-Agent（规范化）
    ↓
标准 Spec（结构化）
    ↓
测试 / 代码 / CI
```

这个流程的重点不是让人一开始就把内容写得很“标准”，而是先把业务意图写清楚，再由 Agent 负责整理成机器和工程体系都能消费的标准 Spec。

---

## 3. 责任边界

| 内容 | 负责方 |
| --- | --- |
| 业务意图 | 人 |
| 格式规范 | Agent |
| 版本与变更记录 | Agent |
| 目录结构 | Agent |
| 完整性校验 | Agent |

原则很简单：

- 人只负责“想表达什么”
- Agent 负责“整理成什么格式”

---

## 4. spec-draft 应该长什么样

`spec-draft` 的目标不是完整，而是清晰。

推荐使用极简写法，只保留业务上真正必要的信息。

### 示例：登录注册

```markdown
# 登录注册

## 目标

手机号验证码登录，没有账号自动注册

## 流程

用户输入手机号 -> 获取验证码 -> 登录

## 接口

POST /auth/send-code
POST /auth/login

## 规则

验证码 5 分钟有效
60 秒限流

## 备注

需要支持多设备登录
```

这个层级已经足够让 Agent 理解业务意图并继续向下编译。

---

## 5. draft 里不要写什么

在 `draft` / `spec-draft` 里，不要提前写这些内容：

- JSON Schema
- 数据库表结构
- 错误码规范
- Header 规范
- 版本号
- 目录结构设计

这些都应该交给 Agent 自动补全和统一。

---

## 6. Spec-Agent 的角色

Spec-Agent 的本质不是“帮忙润色文档”，而是一个：

> Spec Compiler（规范编译器）

它负责把人类可读、业务导向的 draft，转换成工程系统可以持续消费的标准 Spec。

---

## 7. Agent 输入与输出

### 输入

```text
/spec-draft/auth/login.md
```

### 输出

```text
/spec/auth/login/
├── spec.md          # 标准化 Spec
├── openapi.yaml     # API 定义
├── bruno/           # 测试集合
├── model.md         # 数据模型
└── changelog.md     # 变更记录
```

这样做的好处是：

- 人只维护业务意图
- Agent 负责标准产物
- 后续测试、代码、CI 都围绕统一 Spec 运转

---

## 8. Agent 的处理流程

Spec-Agent 可以直接被实现为一条标准 pipeline。

### 8.1 结构补全

Agent 自动补齐以下模块：

- Meta
- System Flow
- API Contract
- Data Model
- Rules
- Errors
- Security
- Observability

### 8.2 规范注入

这是最关键的一步。Agent 不只是“补章节”，还要把仓库级规范注入到每份 Spec 中，例如：

- Token 统一结构
- Header 统一规范
- 错误码统一前缀
- Redis Key 命名规则

这些规范统一来自：

```text
/spec/_rules
```

---

## 9. 设计目标

这个设计最终要解决的是三个问题：

1. 人写业务意图时负担太重
2. 不同功能的 Spec 风格不统一
3. 测试、代码、CI 缺少统一上游输入

因此，理想形态是：

- 人写 draft
- Agent 编译成标准 Spec
- 标准 Spec 继续驱动测试、代码与 CI
