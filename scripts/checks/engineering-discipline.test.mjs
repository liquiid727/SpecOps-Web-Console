import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const checker = path.resolve(import.meta.dirname, "engineering-discipline.mjs");
const selector = "R003-fixtures/S01-discipline";

function issue({ profile = "behavior", preflight = basePreflight(), closeout = baseCloseout() } = {}) {
  return `---
id: ISSUE-R003-S01-001
change_profile: ${profile}
status: verified
---

# Fixture

## Execution Preflight

${preflight}

## Completion Record

${closeout}
`;
}

function basePreflight() {
  return `Confirmed Facts:
- fixture fact

Unverified Assumptions:
- None — fixture is local

Production Consumers / Real Entry Paths:
- node scripts/checks/engineering-discipline.mjs

Affected Surfaces and Planned Checks:

| Surface | Consumer / real entry | Planned verification | Required evidence | Gate impact |
|---|---|---|---|---|
| source | checker CLI | node --test scripts/checks/engineering-discipline.test.mjs | report | blocking |

Unrelated Worktree Changes:
- None

Human Decisions Required:
- None — fixture only`;
}

function baseCloseout() {
  return `Tests Executed: node --test scripts/checks/engineering-discipline.test.mjs
Evidence References: evidence/gates/engineering-discipline-closeout.json
Alternatives Considered: parser stays dependency-free
Checks Skipped: None
Verified Behavior: fixture result is reported
Known Limitations / Residual Risk: None
Intentionally Untouched: no hosted runner`;
}

async function fixture(content) {
  const root = await mkdtemp(path.join(os.tmpdir(), "specos-engineering-discipline-"));
  const issueDir = path.join(root, ".requirements", "requirements", "R003-fixtures", "specs", "S01-discipline", "issues");
  await mkdir(path.join(root, ".specos"), { recursive: true });
  await mkdir(issueDir, { recursive: true });
  await writeFile(path.join(root, ".specos", "manifest.yaml"), "artifacts:\n  requirementsDir: .requirements/requirements\n");
  await writeFile(path.join(issueDir, "ISSUE-R003-S01-001.md"), content);
  return root;
}

async function run(content, phase) {
  const root = await fixture(content);
  try {
    const result = spawnSync(process.execPath, [checker, selector, "--phase", phase], { cwd: root, encoding: "utf8" });
    const report = JSON.parse(await readFile(path.join(root, ".requirements", "requirements", "R003-fixtures", "specs", "S01-discipline", "evidence", "gates", `engineering-discipline.${phase}.json`), "utf8"));
    return { result, report };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("engineering discipline accepts and rejects the controlled fixture matrix", async () => {
  const cases = [
    ["behavior preflight passes", issue(), "preflight", 0],
    ["cross-surface preflight passes", issue({ profile: "cross-surface" }), "preflight", 0],
    ["high-risk preflight passes", issue({ profile: "high-risk" }), "preflight", 0],
    ["mechanical preflight accepts explicit rationale", issue({ profile: "mechanical", preflight: `${basePreflight()}\n\nMechanical reason: generated mirror has no semantic effect.` }), "preflight", 0],
    ["invalid profile fails", issue({ profile: "unknown" }), "preflight", 1, "PROFILE_INVALID"],
    ["mechanical without rationale fails", issue({ profile: "mechanical" }), "preflight", 1, "MECHANICAL_RATIONALE_MISSING"],
    ["missing preflight fails", issue({ preflight: "" }), "preflight", 1, "PREFLIGHT_MISSING"],
    ["missing confirmed facts fails", issue({ preflight: basePreflight().replace("- fixture fact", "") }), "preflight", 1, "PREFLIGHT_FIELD_MISSING"],
    ["missing assumptions fails", issue({ preflight: basePreflight().replace("- None — fixture is local", "") }), "preflight", 1, "PREFLIGHT_FIELD_MISSING"],
    ["missing consumer fails", issue({ preflight: basePreflight().replace("- node scripts/checks/engineering-discipline.mjs", "") }), "preflight", 1, "CONSUMER_ENTRY_MISSING"],
    ["missing human decision fails", issue({ preflight: basePreflight().replace("- None — fixture only", "") }), "preflight", 1, "PREFLIGHT_FIELD_MISSING"],
    ["missing profile fails", issue({ profile: "", preflight: basePreflight() }), "preflight", 1, "PROFILE_MISSING"],
    ["missing surface check fails", issue({ preflight: basePreflight().replace("node --test scripts/checks/engineering-discipline.test.mjs", "Not applicable") }), "preflight", 1, "SURFACE_PLAN_MISSING"],
    ["invalid surface fails", issue({ preflight: basePreflight().replace("| source |", "| imaginary |") }), "preflight", 1, "SURFACE_INVALID"],
    ["complete closeout passes", issue(), "closeout", 0],
    ["missing verified behavior fails", issue({ closeout: baseCloseout().replace("Verified Behavior: fixture result is reported", "Verified Behavior:") }), "closeout", 1, "CLOSEOUT_FIELD_MISSING"],
    ["missing untouched area fails", issue({ closeout: baseCloseout().replace("Intentionally Untouched: no hosted runner", "Intentionally Untouched:") }), "closeout", 1, "CLOSEOUT_FIELD_MISSING"]
  ];

  for (const [name, content, phase, expectedStatus, code] of cases) {
    const { result, report } = await run(content, phase);
    assert.equal(result.status, expectedStatus, `${name}: ${result.stderr} ${JSON.stringify(report.errors)}`);
    assert.equal(report.status, expectedStatus === 0 ? "ready" : "blocked", name);
    assert.equal(report.schemaVersion, "specos-engineering-discipline/v1", name);
    assert.equal(typeof report.surfaceCounts.source, "number", name);
    if (code) assert.ok(report.errors.some((error) => error.code.includes(code)), name);
  }
});

test("engineering discipline rejects invalid selector and phase", () => {
  for (const args of [["invalid", "--phase", "preflight"], [selector, "--phase", "invalid"]]) {
    const result = spawnSync(process.execPath, [checker, ...args], { cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /SPECOS_ENGINEERING_DISCIPLINE_(SELECTOR|PHASE)_INVALID/);
  }
});
