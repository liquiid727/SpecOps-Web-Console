import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const specArg = process.argv[2];
const changeArgIndex = process.argv.indexOf("--change");
const changeId = changeArgIndex >= 0 ? process.argv[changeArgIndex + 1] : undefined;
const cliPath = path.join(rootDir, "packages", "cli", "dist", "main.js");
const plansDir = path.join(rootDir, "tests", "plans");

function loadPlanSpecIds() {
  return readdirSync(plansDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test-plan.json"))
    .map((entry) => {
      const source = readFileSync(path.join(plansDir, entry.name), "utf8");
      return JSON.parse(source).specId;
    })
    .filter(Boolean)
    .sort();
}

const specIds = specArg && !specArg.startsWith("--") ? [specArg] : loadPlanSpecIds();
let failed = false;

for (const specId of specIds) {
  const args = [cliPath, "validate-test-gates", specId];
  if (changeId) {
    args.push("--change", changeId);
  }

  const result = spawnSync("node", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`SPECOS_TEST_GATES_CHECK_OK specs ${specIds.length}`);
