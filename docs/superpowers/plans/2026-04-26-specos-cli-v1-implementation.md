# SpecOS CLI V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first local `@specos/cli` vertical slice with shared artifact validation, deterministic init/generate/check/report commands, and a reusable fullstack template.

**Architecture:** Add npm workspaces at the repository root, then introduce `packages/core`, `packages/cli`, and `packages/templates`. `packages/core` owns artifact contracts and pure filesystem-safe helpers; `packages/cli` owns process arguments and command output; templates are static input copied by `specos init`.

**Tech Stack:** Node.js, TypeScript, Vitest, npm workspaces, no external runtime dependencies for V1.

---

## File Map

- Create `package.json`: root workspace scripts for all packages.
- Create `tsconfig.base.json`: shared TypeScript options.
- Create `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`.
- Create `packages/core/src/artifacts.ts`: artifact types, validators, and deterministic generators.
- Create `packages/core/src/fs.ts`: safe copy/write helpers used by CLI.
- Create `packages/core/src/report.ts`: scenario result normalization for report command.
- Create `packages/core/src/index.ts`: public exports.
- Create `packages/core/src/*.test.ts`: unit tests for validators, generators, and report normalization.
- Create `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/vitest.config.ts`.
- Create `packages/cli/src/main.ts`: `specos` command dispatcher.
- Create `packages/cli/src/commands/*.ts`: `init`, `check`, `generate`, `report`.
- Create `packages/cli/src/main.test.ts`: command tests against temporary project fixtures.
- Create `packages/templates/package.json`.
- Create `packages/templates/fullstack/**`: deterministic files copied by `specos init`.

## Task 1: Workspace And Core Artifact Contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/artifacts.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/src/artifacts.test.ts`

- [ ] **Step 1: Write failing core artifact tests**

Create `packages/core/src/artifacts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDeterministicTestPlan,
  validateManifest,
  validateScenarioResult,
  validateSpec,
  validateTestPlan,
} from "./artifacts";

describe("artifact validation", () => {
  it("accepts a minimal fullstack manifest", () => {
    const result = validateManifest({
      project: { name: "demo", type: "fullstack" },
      stacks: { frontend: "next", backend: "node-api" },
      artifacts: {
        draftsDir: "spec-draft",
        specsDir: "spec",
        testsDir: "tests",
        resultsDir: "tests/results",
      },
      workflows: ["default-fullstack"],
      ci: { checkCommand: "npx specos check" },
    });

    expect(result.ok).toBe(true);
  });

  it("rejects specs without required coverage fields", () => {
    const result = validateSpec({
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("SPECOS_SPEC_INVALID");
  });

  it("builds deterministic happy, limit, error, and flow scenarios from a spec", () => {
    const spec = {
      id: "reward-order",
      version: "1.0.0",
      title: "Reward Order",
      goals: ["Create reward orders"],
      nonGoals: ["Payment"],
      actors: ["member"],
      userFlows: [{ name: "Claim reward", steps: ["Open page", "Click claim", "View result"] }],
      systemFlows: [{ name: "Create order", steps: ["Validate", "Persist", "Respond"] }],
      rules: [{ id: "reward.order.create", description: "Create one order per claim" }],
      edgeCases: ["stock is zero"],
      api: [{ name: "Create reward order", method: "POST", path: "/api/reward-orders" }],
      ui: [{ name: "Reward page", route: "/rewards" }],
      observability: ["trace_id"],
      tests: { requiredBranches: ["happy", "limit", "error", "flow"] },
      traceability: { draft: "spec-draft/reward-order.md" },
    };

    const plan = buildDeterministicTestPlan(spec);
    const validation = validateTestPlan(plan);

    expect(validation.ok).toBe(true);
    expect(plan.specId).toBe("reward-order");
    expect(plan.scenarios.map((scenario) => scenario.branches[0])).toEqual([
      "happy",
      "limit",
      "error",
      "flow",
    ]);
  });

  it("accepts a normalized empty scenario result", () => {
    const result = validateScenarioResult({
      runId: "run-demo",
      specId: "reward-order",
      specVersion: "1.0.0",
      featureName: "Reward Order",
      status: "pending",
      releaseDecision: "blocked",
      startedAt: "2026-04-26T00:00:00.000Z",
      endedAt: "2026-04-26T00:00:00.000Z",
      summary: { apiPassRate: 0, scenarioPassRate: 0, totalEndpoints: 0, totalScenarios: 0 },
      flowResults: [],
      items: [],
    });

    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @specos/core -- --run packages/core/src/artifacts.test.ts`

Expected: FAIL because the workspace and core package do not exist yet.

- [ ] **Step 3: Implement workspace and core artifacts**

Create the root workspace files and implement the exported validators/generator. Validators should return `{ ok: true, errors: [] }` or `{ ok: false, errors: SpecosError[] }`, using stable error codes from the design. The deterministic generator should produce one scenario per required branch and include API/UI endpoint skeleton data.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @specos/core -- --run packages/core/src/artifacts.test.ts`

Expected: PASS.

## Task 2: Template Package And Safe Init Copy

**Files:**
- Create: `packages/templates/package.json`
- Create: `packages/templates/fullstack/.specos/manifest.yaml`
- Create: `packages/templates/fullstack/.specos/workflows/default-fullstack.yaml`
- Create: `packages/templates/fullstack/AGENTS.md`
- Create: `packages/templates/fullstack/rules/README.md`
- Create: `packages/templates/fullstack/skills/README.md`
- Create: `packages/templates/fullstack/ai/agents/README.md`
- Create: `packages/templates/fullstack/spec-draft/README.md`
- Create: `packages/templates/fullstack/spec/README.md`
- Create: `packages/templates/fullstack/tests/README.md`
- Create: `packages/core/src/fs.ts`
- Test: `packages/core/src/fs.test.ts`

- [ ] **Step 1: Write failing safe-copy tests**

Create `packages/core/src/fs.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { copyTemplateDirectory } from "./fs";

const tempDirs: string[] = [];

async function tempProject() {
  const dir = await mkdtemp(join(tmpdir(), "specos-copy-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("copyTemplateDirectory", () => {
  it("copies template files into an empty project", async () => {
    const source = await tempProject();
    const target = await tempProject();
    await writeFile(join(source, "AGENTS.md"), "template agents\n");

    const result = await copyTemplateDirectory(source, target);

    expect(result.written).toEqual(["AGENTS.md"]);
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("template agents\n");
  });

  it("does not overwrite existing files without overwrite", async () => {
    const source = await tempProject();
    const target = await tempProject();
    await writeFile(join(source, "AGENTS.md"), "template agents\n");
    await writeFile(join(target, "AGENTS.md"), "human agents\n");

    const result = await copyTemplateDirectory(source, target);

    expect(result.skipped).toEqual(["AGENTS.md"]);
    await expect(readFile(join(target, "AGENTS.md"), "utf8")).resolves.toBe("human agents\n");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @specos/core -- --run packages/core/src/fs.test.ts`

Expected: FAIL because `copyTemplateDirectory` does not exist.

- [ ] **Step 3: Implement safe template copying and static template files**

Implement recursive copy with deterministic sorted paths. Preserve existing files unless `overwrite: true` is passed. Return lists of written and skipped relative paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @specos/core -- --run packages/core/src/fs.test.ts`

Expected: PASS.

## Task 3: CLI Init And Check Commands

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/src/main.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/check.ts`
- Test: `packages/cli/src/main.test.ts`

- [ ] **Step 1: Write failing CLI tests for init and check**

Create `packages/cli/src/main.test.ts` with tests that call `runCli(["init"], { cwd })`, assert `.specos/manifest.yaml` and `AGENTS.md` are created, call init twice and assert existing files are skipped, then call `runCli(["check"], { cwd })` and expect exit code `0`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @specos/cli -- --run packages/cli/src/main.test.ts`

Expected: FAIL because CLI package does not exist.

- [ ] **Step 3: Implement `runCli`, `init`, and `check`**

`runCli` should return `{ exitCode, stdout, stderr }` instead of exiting in tests. The executable entrypoint can call `process.exitCode = result.exitCode`. `init` copies `packages/templates/fullstack` into `cwd`. `check` validates `.specos/manifest.yaml`, discovers `spec/**/*.yaml`, and reports missing or invalid artifacts with stable error codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @specos/cli -- --run packages/cli/src/main.test.ts`

Expected: PASS.

## Task 4: Generate And Report Commands

**Files:**
- Create: `packages/core/src/report.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/src/report.test.ts`
- Create: `packages/cli/src/commands/generate.ts`
- Create: `packages/cli/src/commands/report.ts`
- Modify: `packages/cli/src/main.ts`
- Modify: `packages/cli/src/main.test.ts`

- [ ] **Step 1: Write failing tests for generate and report**

Extend CLI tests to create `spec/reward-order.yaml`, run `generate`, assert `tests/plans/reward-order.test-plan.json`, `tests/bruno/reward-order/README.md`, and `tests/playwright/reward-order.spec.ts` exist. Then run `report` and assert `tests/reports/specos-report.json` exists with empty API/UI collections when no scenario results exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @specos/cli -- --run packages/cli/src/main.test.ts`

Expected: FAIL because `generate` and `report` are not implemented.

- [ ] **Step 3: Implement deterministic generate and report**

`generate` should parse accepted spec YAML or JSON, call `buildDeterministicTestPlan`, write JSON with stable indentation, and write Bruno/Playwright skeleton files. If no provider config exists, print that AI enhancement is skipped. `report` should read `tests/results/*.json`, normalize them through core helpers, and write `tests/reports/specos-report.json`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @specos/cli -- --run packages/cli/src/main.test.ts`

Expected: PASS.

## Task 5: Package Build And Repository Validation

**Files:**
- Modify: root `package.json`
- Modify: `packages/core/package.json`
- Modify: `packages/cli/package.json`
- Create: `packages/cli/README.md`
- Create: `packages/core/README.md`

- [ ] **Step 1: Add package-level build scripts and docs**

Ensure every package has `build` and `test` scripts. Add short README files documenting the V1 commands and artifact ownership.

- [ ] **Step 2: Run full validation**

Run:

```bash
npm install
npm test --workspaces --if-present
npm run build --workspaces --if-present
```

Expected: all commands exit `0`.

- [ ] **Step 3: Inspect git diff**

Run: `git diff --stat` and verify only `docs/superpowers/plans`, root workspace files, and `packages/**` changed.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add package.json package-lock.json tsconfig.base.json packages docs/superpowers/plans/2026-04-26-specos-cli-v1-implementation.md
git commit -m "feat: add SpecOS CLI v1 workspace"
```

Expected: commit succeeds on `feature/specos-cli-v1`.

## Self-Review

- Spec coverage: The plan covers npm CLI package shape, core artifacts, init/check/generate/report commands, fullstack templates, deterministic generation, report normalization, and validation.
- Placeholder scan: No TBD/TODO placeholders are intentionally left.
- Type consistency: The plan consistently uses `validateManifest`, `validateSpec`, `validateTestPlan`, `validateScenarioResult`, `buildDeterministicTestPlan`, `copyTemplateDirectory`, and `runCli`.
