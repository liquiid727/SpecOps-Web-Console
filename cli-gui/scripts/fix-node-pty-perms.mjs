// node-pty 预编译包解压后 spawn-helper 可能丢失可执行位（表现为 posix_spawnp failed →
// PTY 回退管道 → codex 报 "stdin is not a terminal"）；postinstall 兜底补齐权限。
import { chmodSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const prebuilds = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "node-pty", "prebuilds");

try {
  for (const platform of readdirSync(prebuilds)) {
    const helper = join(prebuilds, platform, "spawn-helper");
    try {
      if (statSync(helper).isFile()) chmodSync(helper, 0o755);
    } catch {
      // 该平台无 spawn-helper（如 win32）
    }
  }
} catch {
  // node-pty 未安装时静默跳过
}
