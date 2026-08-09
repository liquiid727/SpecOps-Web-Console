---
name: sync-upstream
description: Sync the Bugrail fork with upstream CodeG releases. Runs after an upstream codeg release is published or when the user says "同步上游", "sync upstream", "更新 codeg", "update codeg version". Follows the immutable release-tag flow: fetch upstream, verify the tag, merge on a sync branch, auto-resolve the known Bugrail identity conflicts, review, gate, commit, push, and update the parent gitlink.
allowed-tools:
  - Bash(git:*)
  - Bash(node:*)
  - Bash(pnpm:*)
  - Bash(cargo:*)
  - Bash(make:*)
  - Read
  - Edit
  - Write
---

# Code: Bugrail · 同步上游 CodeG release

将上游 CodeG 的新 release 以不可变 tag 的方式并入 Bugrail fork。脚本负责机械步骤
（检查、fetch、校验 tag、建分支、merge、版本号/基线更新），并**只**自动解决已知的
4 个产品身份冲突文件；其余冲突一律停下来人工审查。最终提交永远由人完成。

## 关键不变式（BR-006）

- **只合并已发布的 release tag**，并把 tag 的 peeled commit 记录进 `.bugrail-upstream.json`。
- **检测到 tag 被移动**（peeled commit 与 GitHub 记录不一致）→ 拒绝同步。
- **绝不自动提交 merge**：脚本 `merge --no-commit` 后停在未提交状态，由人审查后提交。
- **产品身份永不回退**：package name、Tauri identifier（`io.liquiid.bugrail`）、数据根
  （`.bugrail`）、keyring、更新端点（`liquiid727/bugrail`）必须保持 Bugrail 侧。
- 脚本只自动解决**已知**身份冲突（4 个文件），任何意外形状都留给人工。

## 工作目录

本 skill 操作的是子模块：`bugrail/`（git 仓库，fork `liquiid727/bugrail`，upstream `xintaofei/codeg`）。
父仓库 `specos-ai` 通过 gitlink 指向 bugrail 的某个提交。所有 git 命令在 `bugrail/` 内执行，
只有最后一步（更新 gitlink）在父仓库执行。

## 前置条件

- bugrail 子模块已初始化（父仓库 `make bugrail-init`）
- `bugrail/` 工作区干净（脚本会强制要求）
- upstream remote 已存在（脚本会自动补，如缺失）

## 工作流

### Step 1: 检查是否有新 release

```bash
# 父仓库，查看最新上游 tag 与当前基线（网络调用，pnpm 包装可能超时，失败时直接用 node）
make bugrail-upstream-status
# 或直接：
node bugrail/scripts/sync-upstream.mjs status
```

- `status: "up-to-date"` → 没有需要做的，结束。
- `status: "update-available"` → 继续 Step 2。
- `status: "tag-moved"` → 上游 tag 被改写，停止并报告，不要继续。

### Step 2: 同步（fetch + 校验 + merge + 自动解决已知冲突）

先在 `bugrail/` 内确认工作区干净：

```bash
git -C bugrail status --short   # 应为空
```

然后触发同步（默认取最新 tag；也可指定 `TAG=vX.Y.Z`）：

```bash
make -C /Users/liquiid/code/specos-ai bugrail-upstream-sync            # 最新
make -C /Users/liquiid/code/specos-ai bugrail-upstream-sync TAG=v0.24.0  # 指定
```

脚本自动完成：
1. 校验 tag → peeled commit 与 GitHub 一致
2. `git fetch upstream --tags --force`
3. 创建/切换到 `sync/upstream-<tag>` 分支
4. `git merge --no-commit <tag>`
5. 自动解决 4 个已知身份冲突文件（见下）
6. 若还有剩余冲突 → **停止**，提示人工解决后再 `finalize`
7. 全部干净 → 自动跑 `finalize`：更新 `.bugrail-upstream.json`、版本号、README 基线、
   跑 upstream-check 测试、暂存身份文件

### Step 3: 审查暂存的 merge

```bash
git -C bugrail status --short
git -C bugrail diff --cached --stat
# 重点确认没有 Bugrail 身份被回退：
git -C bugrail diff --cached | grep -iE "io\.liquiid\.bugrail|name = \"bugrail\"|\"name\": \"bugrail\"|\.bugrail"
```

### Step 4: 跑门禁

```bash
# 前端 lint / 单测 / 构建（若 pnpm 网络策略超时，直接用 node_modules/.bin 下的二进制）
pnpm --dir bugrail lint
pnpm --dir bugrail test
pnpm --dir bugrail build
# 后端
cargo check --manifest-path bugrail/src-tauri/Cargo.toml
node --test bugrail/scripts/sync-upstream.test.mjs   # 同步脚本自身单测
```

### Step 5: 提交 merge

```bash
git -C bugrail add -A
git -C bugrail commit -m "merge: integrate upstream CodeG <tag>"
```

> 注意：finalize 已按显式路径暂存了身份文件；`add -A` 前先 `git status` 确认没有
> 混入无关文件（之前出过 `.todo/` 笔记被误扫进的教训）。

### Step 6: 推送并更新父仓库 gitlink

```bash
git -C bugrail push origin sync/upstream-<tag>
# 合并回主分支（fast-forward）：
git -C bugrail checkout feature/bugrail-bootstrap
git -C bugrail merge --ff-only sync/upstream-<tag>
git -C bugrail push origin feature/bugrail-bootstrap

# 父仓库更新 gitlink 指向新提交：
git -C /Users/liquiid/code/specos-ai add bugrail
git -C /Users/liquiid/code/specos-ai commit -m "chore: bump bugrail submodule to CodeG <tag>"
```

## 已知身份冲突文件（脚本自动解决）

| 文件 | 规则 |
|------|------|
| `src-tauri/Cargo.toml` | 保留 head 的 `name = "bugrail"` / authors，采用 merge 的 version |
| `src-tauri/tauri.conf.json` | 保留 `io.liquiid.bugrail` identifier / productName，采用 merge 的 version |
| `package.json` | 保留 `"name": "bugrail"`，采用 merge 的 version |
| `src-tauri/Cargo.lock` | 丢弃上游 `codeg` 包条目，保留/保留 bugrail 条目，版本号在 finalize 中提升 |

**如果脚本报告剩余冲突**：手动审查，遵循“身份字段取 Bugrail 侧，功能内容取上游侧”的
原则解决，然后运行 `node bugrail/scripts/sync-upstream.mjs finalize --tag <tag>`。

## 身份保留检查清单（Merge 后人工抽查）

- `src-tauri/Cargo.toml` → `name = "bugrail"`，`default-run = "codeg"`（二进制名保持 codeg）
- `src-tauri/tauri.conf.json` → `productName: "Bugrail"`，`identifier: "io.liquiid.bugrail"`
- `src-tauri/src-tauri` 内产品标识点：keyring service、更新端点（`liquiid727/bugrail`）、
  数据根（`.bugrail`）、`commands/windows.rs`、`notification.rs`、`lark.rs`、`paths.rs`、
  `product/mod.rs`、`update/version.rs`、`git_credential.rs`、`preferences.rs`、`codeg_server.rs`
- `README.md` 顶部基线行 → `CodeG release \`vX.Y.Z\``
- `.bugrail-upstream.json` → `baselineTag` / `baselineCommit` 为新 tag

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| `status` 报 `tag-moved` | 上游改写了 tag，停止并报告，不继续 merge |
| `prepare` 报工作区不干净 | 先 commit/stash bugrail 内改动，再重试 |
| 剩余冲突需要人工 | 按上表原则解决 → `finalize --tag <tag>` |
| pnpm 网络策略超时 | 绕过 pnpm 包装，用 `node` / `./node_modules/.bin/*` 直接跑 |
| merge 后身份被回退 | 用 Step 4 的 grep 检查，手动恢复 Bugrail 侧字段 |

## 完整示例（v0.23.2 → v0.23.3）

```bash
make bugrail-upstream-status              # 检查 → update-available
git -C bugrail status --short             # 确认干净
make bugrail-upstream-sync                # prepare+finalize：merge --no-commit 并暂存
git -C bugrail diff --cached --stat       # 审查（约百来文件，身份字段无回退）
pnpm --dir bugrail lint && pnpm --dir bugrail build
cargo check --manifest-path bugrail/src-tauri/Cargo.toml
git -C bugrail add -A && git -C bugrail commit -m "merge: integrate upstream CodeG v0.23.3"
git -C bugrail push origin sync/upstream-v0.23.3
# fast-forward 到 feature/bugrail-bootstrap 并推送，然后在父仓库更新 gitlink
```
