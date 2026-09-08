#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const profiles = new Set(["mechanical", "behavior", "cross-surface", "high-risk"]);
const surfaces = new Set([
  "source",
  "package-api",
  "cli-config",
  "browser-ui",
  "generated-output",
  "model-visible-output",
  "build-release-artifact",
  "persistence-protocol",
  "security-concurrency-cleanup"
]);
const requiredPreflight = [
  "Confirmed Facts",
  "Unverified Assumptions",
  "Production Consumers / Real Entry Paths",
  "Affected Surfaces and Planned Checks",
  "Unrelated Worktree Changes",
  "Human Decisions Required"
];
const requiredCloseout = [
  "Tests Executed",
  "Evidence References",
  "Alternatives Considered",
  "Checks Skipped",
  "Verified Behavior",
  "Known Limitations / Residual Risk",
  "Intentionally Untouched"
];

function usage() {
  return "Usage: node scripts/checks/engineering-discipline.mjs R0NN-slug/S0N-slug --phase preflight|closeout";
}

function parseArgs(argv) {
  const selector = argv[0];
  const phaseIndex = argv.indexOf("--phase");
  const phase = phaseIndex === -1 ? "preflight" : argv[phaseIndex + 1];
  if (!selector || !/^R\d{3}-[a-z0-9-]+\/S\d{2}-[a-z0-9-]+$/.test(selector)) {
    const error = new Error(usage());
    error.code = "SPECOS_ENGINEERING_DISCIPLINE_SELECTOR_INVALID";
    throw error;
  }
  if (!new Set(["preflight", "closeout"]).has(phase)) {
    const error = new Error(`${usage()}; received phase ${phase ?? "<missing>"}`);
    error.code = "SPECOS_ENGINEERING_DISCIPLINE_PHASE_INVALID";
    throw error;
  }
  return { selector, phase };
}

function section(content, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = content.match(new RegExp(`^## ${escaped}\\s*$`, "m"));
  if (!heading || heading.index === undefined) return "";
  const start = heading.index + heading[0].length;
  const end = content.indexOf("\n## ", start);
  return content.slice(start, end === -1 ? undefined : end).trim();
}

function fieldValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^${escaped}:[ \\t]*(.*)$`, "m"));
  if (!match) return "";
  if (match[1].trim()) return match[1].trim();
  const after = content.slice((match.index ?? 0) + match[0].length);
  return after.match(/^\n(?:[ \t]*\n)*(-\s+[^\n]+)/)?.[1]?.trim() ?? "";
}

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  return Object.fromEntries(match[1].split("\n").flatMap((line) => {
    const item = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*(?:#.*)?$/);
    return item ? [[item[1], item[2]]] : [];
  }));
}

function nonEmpty(value) {
  return Boolean(value && !/^[-*]?\s*(?:<[^>]+>|\.\.\.|)$/m.test(value.trim()));
}

function errorFor(errors, issue, code, message) {
  errors.push({ issue: issue.id, path: issue.relativePath, code, message });
}

function surfaceRows(preflight) {
  const lines = preflight.split("\n").filter((line) => line.trim().startsWith("|"));
  return lines.slice(2).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3 && !cells.every((cell) => /^-+$/.test(cell)));
}

function checkPreflight(issue, errors) {
  const preflight = section(issue.content, "Execution Preflight");
  if (!preflight) {
    errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_PREFLIGHT_MISSING", "Execution Preflight is required.");
    return;
  }
  for (const label of requiredPreflight) {
    if (label === "Affected Surfaces and Planned Checks") continue;
    if (!nonEmpty(fieldValue(preflight, label))) {
      const code = label === "Production Consumers / Real Entry Paths"
        ? "SPECOS_ENGINEERING_DISCIPLINE_CONSUMER_ENTRY_MISSING"
        : label === "Affected Surfaces and Planned Checks"
          ? "SPECOS_ENGINEERING_DISCIPLINE_SURFACE_PLAN_MISSING"
          : "SPECOS_ENGINEERING_DISCIPLINE_PREFLIGHT_FIELD_MISSING";
      errorFor(errors, issue, code, `${label} must have a value.`);
    }
  }
  const rows = surfaceRows(preflight);
  if (rows.length === 0 && issue.profile === "mechanical") {
    errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_SURFACE_PLAN_MISSING", "Affected Surfaces and Planned Checks needs a concrete row or an explicit mechanical rationale.");
  }
  if (issue.profile !== "mechanical" && rows.length === 0) {
    errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_SURFACE_PLAN_MISSING", "A semantic Issue needs a concrete affected-surface row.");
  }
  for (const [surface, consumer, plannedCheck] of rows) {
    if (!surfaces.has(surface)) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_SURFACE_INVALID", `Unsupported surface: ${surface}.`);
    }
    if (!nonEmpty(consumer) || /^not applicable/i.test(consumer)) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_CONSUMER_ENTRY_MISSING", `Surface ${surface || "<unknown>"} has no real consumer or entry path.`);
    }
    if (!nonEmpty(plannedCheck) || /^not applicable/i.test(plannedCheck)) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_SURFACE_PLAN_MISSING", `Surface ${surface || "<unknown>"} has no planned verification.`);
    }
  }
}

function checkCloseout(issue, errors) {
  const closeout = section(issue.content, "Completion Record");
  if (!closeout) {
    errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_CLOSEOUT_MISSING", "Completion Record is required for closeout.");
    return;
  }
  for (const label of requiredCloseout) {
    if (!nonEmpty(fieldValue(closeout, label))) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_CLOSEOUT_FIELD_MISSING", `${label} must have a value at closeout.`);
    }
  }
  if (/^(?:.*\n)*QA acceptance:\s*accepted\b/im.test(closeout) || /\bready to ship\b/i.test(closeout)) {
    errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_UNSUPPORTED_COMPLETION_CLAIM", "Issue Completion Record must not claim QA acceptance or shipment readiness.");
  }
}

async function requirementsDir(root) {
  const manifest = await readFile(path.join(root, ".specos", "manifest.yaml"), "utf8");
  const configured = manifest.match(/^\s*requirementsDir:\s*([^#\n]+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  return path.resolve(root, configured || ".requirements/requirements");
}

async function main() {
  const root = process.cwd();
  const { selector, phase } = parseArgs(process.argv.slice(2));
  const [requirement, specPackage] = selector.split("/");
  const issueDir = path.join(await requirementsDir(root), requirement, "specs", specPackage, "issues");
  const issueNames = (await readdir(issueDir)).filter((name) => /^ISSUE-.*\.md$/.test(name)).sort();
  const issues = await Promise.all(issueNames.map(async (name) => {
    const issuePath = path.join(issueDir, name);
    const content = await readFile(issuePath, "utf8");
    const meta = frontmatter(content);
    return { id: meta.id ?? name.replace(/\.md$/, ""), profile: meta.change_profile, status: meta.status, content, relativePath: path.relative(root, issuePath) };
  }));
  const errors = [];
  for (const issue of issues) {
    const optedIn = issue.profile || section(issue.content, "Execution Preflight");
    if (!optedIn) continue;
    if (!issue.profile) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_PROFILE_MISSING", "Execution Preflight requires change_profile.");
      continue;
    }
    if (!profiles.has(issue.profile)) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_PROFILE_INVALID", `Unsupported change_profile: ${issue.profile}.`);
      continue;
    }
    if (issue.profile === "mechanical" && !/mechanical[^\n]*(?:reason|because|理由)/i.test(section(issue.content, "Execution Preflight"))) {
      errorFor(errors, issue, "SPECOS_ENGINEERING_DISCIPLINE_MECHANICAL_RATIONALE_MISSING", "Mechanical changes need an explicit no-semantic-effect rationale.");
    }
    checkPreflight(issue, errors);
    if (phase === "closeout" && ["implemented_pending_verification", "verified", "blocked"].includes(issue.status)) checkCloseout(issue, errors);
  }
  const report = {
    schemaVersion: "specos-engineering-discipline/v1",
    selector,
    phase,
    checkedAt: new Date().toISOString(),
    status: errors.length === 0 ? "ready" : "blocked",
    issues: issues.filter((issue) => issue.profile || section(issue.content, "Execution Preflight")).map((issue) => ({ id: issue.id, path: issue.relativePath, changeProfile: issue.profile ?? null })),
    surfaceCounts: Object.fromEntries([...surfaces].map((surface) => [surface, issues
      .filter((issue) => issue.profile)
      .flatMap((issue) => surfaceRows(section(issue.content, "Execution Preflight")))
      .filter(([declared]) => declared === surface).length])),
    errors
  };
  const reportDir = path.join(await requirementsDir(root), requirement, "specs", specPackage, "evidence", "gates");
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, `engineering-discipline.${phase}.json`), `${JSON.stringify(report, null, 2)}\n`);
  if (errors.length > 0) {
    console.error(`SPECOS_ENGINEERING_DISCIPLINE_BLOCKED ${errors.map((error) => error.code).join(",")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`SPECOS_ENGINEERING_DISCIPLINE_CHECK_OK ${selector} ${phase}`);
}

main().catch((error) => {
  console.error(`${error.code ?? "SPECOS_ENGINEERING_DISCIPLINE_INTERNAL_ERROR"} ${error.message}`);
  process.exitCode = 1;
});
