# 10｜数据持久化与恢复：SQLite、Transcript、Snapshot、Backup

## 本篇目标

Agent 工作台的数据不是普通 CRUD：一条 turn 可能先以 live delta 出现，再写入 transcript；
一个 session 可能断线；一个 task 可能重试多代；一次 restore 可能发生在数据库正在
使用、文件正在写入、外部 Agent 历史还未导入的情况下。

Codeg 的学习重点是把数据分成「产品持久化」「运行时状态」「外部来源」「恢复中间态」，
再为每一类选择一致性策略。

## 1. 四类数据 ownership

| 数据 | 典型内容 | 事实来源 | 断线/重启行为 |
| --- | --- | --- | --- |
| 产品数据库 | folder、conversation、settings、task、provider | SQLite/SeaORM | 应保留，可迁移、备份、恢复 |
| Agent transcript | 外部 CLI 原始会话或 ACP append-only 事件 | 本地 Agent 目录 / Codeg transcript | 可重新导入或重建 projection |
| Runtime state | connection、pid、pending request、live delta | 内存/事件流 | 断线后由 snapshot/replay 或重新 handshake 恢复 |
| Recovery state | backup manifest、staging、pending marker、`.part` | backup/restore subsystem | 启动阶段继续或回滚 |

不要把 runtime state 全部写进数据库，也不要把用户可见历史只保存在内存。两种错误
分别导致重启丢数据和恢复状态污染。

## 2. SQLite 的启动与运行分层

Codeg 的数据库启动流程可以归纳为：

```text
resolve CODEG_HOME / DATA_DIR
  -> create data directory
  -> apply pending backup restore
  -> one connection runs migrations
  -> close migration connection
  -> runtime pool starts
  -> load registry / workspace links / settings
```

运行时使用 SQLite + SeaORM；migration 使用单 connection，运行时再使用有限连接池。
SQLite pragma 包含 WAL、busy timeout、foreign keys、cache size 和 `synchronous=NORMAL`。

源码：

- [`db/mod.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/mod.rs)
- [`db/test_helpers.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/db/test_helpers.rs)
- [`db/migration`](https://github.com/xintaofei/codeg/tree/v0.23.1/src-tauri/src/db/migration)

### 为什么 migration 不直接复用运行时池

连续 DDL 在多连接池里执行时，连接之间可能看到不同的 schema cache；Codeg 选择在
单连接上完成迁移，再让运行时连接池读取稳定 schema。这是一个具体的 SQLite 约束，
不是“连接池越多越好”。

学习时记录：

- migration 失败是否阻止 app 启动；
- backup pending marker 在 migration 前还是后处理；
- 新版本打开旧 DB 时如何判断 schema version；
- migration 中途退出后，下一次启动能否继续或安全失败；
- downgrade 是否支持，还是只支持 forward migration。

## 3. WAL 与 `synchronous=NORMAL` 是取舍

WAL 有利于读写并发，busy timeout 给短暂锁竞争留下等待窗口；`synchronous=NORMAL`
偏向日常性能，但不能被解释为“任何断电都不丢数据”。

因此备份和恢复不能只依赖文件复制：

```text
live SQLite file
  -> consistent snapshot operation
  -> archive / hash / optional encryption
  -> atomic file delivery
```

在 SpecOS 或其他 Agent 产品中，数据库 pragma 应写入运行假设和恢复目标，而不是只
存在于初始化代码里。

## 4. Transcript 是原始事实，UI timeline 是投影

```text
Agent raw session / ACP event
  -> parser / normalizer
  -> append-only transcript or event log
  -> session state / snapshot
  -> conversation/message projection
  -> React timeline
```

原始 transcript 适合诊断和重新解析；UI message 适合快速读取和交互。两者不一定
一一对应：一个 tool call 可能由多个事件组成，一个 live delta 也可能在完成后合并
为一个 content block。

相关源码：

- [`acp_transcript.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp_transcript.rs)
- [`acp/session_state.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/session_state.rs)
- [`acp/event_stream.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/acp/event_stream.rs)
- [`models/message.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/models/message.rs)

### Append-only 的收益

- 原始顺序可追溯；
- parser 变化后可以重新生成 projection；
- 重连和诊断有事件依据；
- unknown event 可以保留而不是在 UI 层静默丢失。

### Append-only 的代价

- 文件和数据库增长；
- 重放时间变长；
- raw event 可能包含敏感内容；
- parser 版本差异可能导致同一 transcript 得到不同 UI；
- 需要 watermark、checkpoint 或 summary cache 控制成本。

## 5. Snapshot 与 Replay 的边界

事件流恢复协议可以写成：

```text
snapshot(seq = S)
  -> subscribe(last_seq = S)
  -> replay S+1 ... current
  -> live events
  -> gap/oversize -> new snapshot(seq = T)
```

Snapshot 应包含用户下一步需要的 live facts：

- 当前 turn 和 tool 状态；
- pending permission/question；
- delegation child metadata；
- current event sequence；
- connection/session capability；
- error/terminal state。

Snapshot 不必包含所有 raw transcript；否则恢复 payload 会无界增长。它与 transcript 的
关系是“快速恢复的当前投影 + 可选的历史来源”。

## 6. Backup 不是复制一个 db 文件

Codeg backup 可以按下面的阶段阅读：

```text
collect metadata
  -> VACUUM INTO consistent SQLite snapshot
  -> collect files / transcripts / skills / settings
  -> manifest with version / migration / size / SHA-256
  -> optional passphrase encryption
  -> archive to .part
  -> atomic rename to final artifact
```

相关源码：

- [`commands/backup/core.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/core.rs)
- [`commands/backup/manifest.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/manifest.rs)
- [`commands/backup/archive.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/archive.rs)
- [`commands/backup/crypto.rs`](https://github.com/xintaofei/codeg/blob/v0.23.1/src-tauri/src/commands/backup/crypto.rs)

需要关注的设计点：

- manifest 是否明确标记是否包含 secrets；
- hash 是针对源文件、压缩文件还是解密后的内容；
- 大文件是否流式处理；
- 中途失败是否留下可误识别的“成功备份”；
- backup 自身是否被纳入下一次 backup；
- desktop keyring 的 secrets 是否与普通数据一起恢复。

## 7. Restore 是 stage-then-swap

直接覆盖正在使用的 database 会产生不可控风险。Codeg 的 restore 路径采用：

```text
input archive
  -> decrypt / verify / extract to staging
  -> validate manifest / migration / files
  -> write pending marker
  -> process exits or restarts
  -> before opening DB, swap staged data
  -> clear marker / record failure
```

这是一种“小型两阶段提交”：archive validation 和 live replacement 分开，真正切换点
在下一次启动的受控阶段。

对外部 Agent transcript，恢复到原始 CLI 目录还会带来冲突：原始文件可能已经变化、
版本不同或被用户编辑。因此“导入 Codeg 的 side location”和“写回 Agent 原目录”应
是两个显式策略，而不是一个默认覆盖动作。

## 8. 数据恢复的异常矩阵

| 阶段 | 失败 | 保护措施 |
| --- | --- | --- |
| snapshot | DB busy / 读失败 | timeout、保持 live DB、返回失败原因 |
| archive | 磁盘不足 / 权限 | `.part` 隔离、清理临时文件 |
| hash | 内容被篡改 | fail closed，不进入 staging commit |
| decrypt | passphrase 错误 | 不覆盖现有数据 |
| migration | 版本不兼容 | 不打开错误 schema，保留诊断 |
| swap | 进程退出/断电 | pending marker + safety backup |
| transcript import | external file 冲突 | side location 或显式 merge policy |
| UI restore | snapshot 旧于 live sequence | 忽略旧 snapshot，重新拉取 |

## 9. 实验与验收

### 实验 A：migration race

对比多连接并发 DDL 与单连接 DDL，记录 schema error、耗时和恢复结果。实验只用临时
SQLite，不接 Codeg 用户数据。

### 实验 B：snapshot/replay 一致性

从同一 event log：

1. 连续 apply 全部事件；
2. apply 到 S 得 snapshot，再 replay S+1；
3. 对比最终 state、timeline、pending request 和 sequence。

### 实验 C：restore crash injection

分别在 extract、manifest verify、marker 写入、startup swap 四个点强制退出，验证：

- 原 live DB 仍可打开；
- staging 不会被误当成正式数据；
- 下一次启动能继续或安全报错；
- 失败 artifact 不会被 UI 显示为成功备份。

### 实验 D：transcript 重解析

给同一 raw JSONL 写两个 parser 版本，比较 projection 差异，确定哪些字段必须稳定，
哪些字段允许随 renderer/parser 升级变化。

本篇验收：

- 能区分数据库、transcript、runtime、recovery 四类数据；
- 能解释单连接 migration、WAL、snapshot/replay 和 stage-then-swap 的关系；
- 能设计包含 hash、版本、secret 标记和失败恢复的 backup manifest；
- 能说明 transcript、UI timeline 和 snapshot 为什么不是同一份数据。
