import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../server/index.js";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "specos-cli-gui-e2e-"));
const dataDirectory = path.join(root, "data");
const workspacePath = path.join(root, "workspace");
await fs.mkdir(workspacePath, { recursive: true });
await fs.mkdir(dataDirectory, { recursive: true });
await fs.writeFile(path.join(workspacePath, "README.md"), "# fixture\n", "utf8");
await fs.mkdir(path.join(workspacePath, ".git"), { recursive: true });
const fixtureCliPath = path.join(root, "fixture-cli.sh");
await fs.writeFile(fixtureCliPath, `#!/bin/sh
while IFS= read -r line; do
  printf 'fixture:%s\\n' "$line"
done
`, "utf8");
await fs.chmod(fixtureCliPath, 0o755);
await fs.writeFile(path.join(dataDirectory, "state.json"), JSON.stringify({
  schemaVersion: 2,
  state: {
    workspaces: [{ id: "workspace-fixture", name: "Fixture project", path: workspacePath, createdAt: "2026-01-01T00:00:00Z" }],
    profiles: [{ id: "profile-fixture", name: "Fixture PTY", command: "/bin/sh", args: [fixtureCliPath], adapterId: "generic", createdAt: "2026-01-01T00:00:00Z" }],
    sessions: [{ id: "session-fixture", workspaceId: "workspace-fixture", profileId: "profile-fixture", name: "Fixture session", runtimeStatus: "stopped", organizationStatus: "active", pinned: false, manualOrder: 1000, launchConfig: { permission: null, mode: null, model: null }, revision: 1, createdAt: "2026-01-01T00:00:00Z", lastActiveAt: "2026-01-01T00:00:00Z" }]
  }
}), "utf8");
process.env.SPECOS_DATA_DIRECTORY = dataDirectory;
process.env.SPECOS_E2E_PICKER_PATH = workspacePath;

let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  await fs.rm(root, { recursive: true, force: true });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void cleanup().finally(() => process.exit(0)); });
}

await main();
