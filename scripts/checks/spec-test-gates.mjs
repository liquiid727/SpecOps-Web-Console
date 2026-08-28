import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const selector = process.argv[2];
const changeArgIndex = process.argv.indexOf("--change");
const changeId = changeArgIndex >= 0 ? process.argv[changeArgIndex + 1] : undefined;

function resolveSelector(value) {
  const match = /^(R\d{3}-[a-z0-9-]+)\/(S\d{2}-[a-z0-9-]+)$/i.exec(value ?? "");
  if (!match) throw new Error(`Invalid GoalSpec child selector: ${value ?? ""}`);
  const specDir = path.join(rootDir, ".requirements", "requirements", match[1], "specs", match[2]);
  return {
    id: value,
    specDir,
    specId: match[2],
    plansDir: path.join(specDir, "evidence", "plans"),
    runsDir: path.join(specDir, "evidence", "artifacts"),
    gatesDir: path.join(specDir, "evidence", "gates"),
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function listJsonFiles(directory) {
  try {
    return (await readdir(directory))
      .filter((entry) => entry.endsWith(".json"))
      .sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
}

async function main() {
  const paths = resolveSelector(selector);
  const planPath = path.join(paths.plansDir, `${paths.specId}.test-plan.json`);
  const issues = [];
  let plan;

  try {
    plan = await readJson(planPath);
    if (plan.standardVersion !== "specos-test-standard") {
      issues.push("test plan must declare specos-test-standard");
    }
  } catch {
    issues.push(`test plan not found: ${path.relative(rootDir, planPath)}`);
  }

  const runFiles = await listJsonFiles(paths.runsDir);
  if (runFiles.length === 0) {
    issues.push("no normalized test result found");
  } else {
    const latestRun = await readJson(path.join(paths.runsDir, runFiles[0]));
    if (changeId && latestRun.changeId !== changeId) {
      issues.push(`latest result changeId does not match ${changeId}`);
    }
    if (latestRun.status !== "pass" || latestRun.releaseDecision !== "ready") {
      issues.push("latest normalized result is not release-ready");
    }
  }

  await mkdir(paths.gatesDir, { recursive: true });
  const reportPath = path.join(paths.gatesDir, `${paths.specId}.${changeId ?? "latest"}.gate-report.json`);
  const report = {
    schemaVersion: "specos-test-standard",
    selector: paths.id,
    changeId: changeId ?? null,
    status: issues.length === 0 ? "ready" : "blocked",
    checkedAt: new Date().toISOString(),
    plan: plan ? path.relative(rootDir, planPath) : null,
    issues,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (issues.length > 0) {
    console.error(`SPECOS_TEST_GATES_BLOCKED ${issues.join("; ")}`);
    console.log(reportPath);
    process.exitCode = 1;
    return;
  }

  console.log(`SPECOS_TEST_GATES_CHECK_OK ${paths.id}`);
  console.log(reportPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
