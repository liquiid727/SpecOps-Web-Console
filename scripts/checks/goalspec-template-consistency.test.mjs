import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("GoalSpec template mirrors match canonical sources", async () => {
  const mirrors = [
    [".requirements/templates/prd.md", "assets/templates/specs/template-requirement-workspace/prd.md"],
    [".requirements/templates/prd.md", "packages/templates/fullstack/.requirements/templates/prd.md"],
    [".requirements/templates/prd.md", "packages/templates/spec-only/.requirements/templates/prd.md"],
    [".requirements/templates/README.md", "assets/templates/specs/template-requirement-workspace/README.md"],
    [".requirements/templates/README.md", "packages/templates/fullstack/.requirements/templates/README.md"],
    [".requirements/templates/README.md", "packages/templates/spec-only/.requirements/templates/README.md"],
    [".requirements/templates/spec-package/spec.md", "assets/templates/specs/template-spec-package/spec.md"],
    [".requirements/templates/spec-package/test.md", "assets/templates/specs/template-spec-package/test.md"],
    [".requirements/templates/spec-package/spec.md", "packages/templates/fullstack/.requirements/templates/spec-package/spec.md"],
    [".requirements/templates/spec-package/test.md", "packages/templates/fullstack/.requirements/templates/spec-package/test.md"],
    [".requirements/templates/spec-package/spec.md", "packages/templates/spec-only/.requirements/templates/spec-package/spec.md"],
    [".requirements/templates/spec-package/test.md", "packages/templates/spec-only/.requirements/templates/spec-package/test.md"],
    [".requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md", "assets/templates/specs/template-issue/issue.example.md"],
    [".requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md", "packages/templates/fullstack/.requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md"],
    [".requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md", "packages/templates/spec-only/.requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md"]
  ];

  for (const [source, mirror] of mirrors) {
    assert.equal(await read(mirror), await read(source), `${mirror} differs from ${source}`);
  }
});

test("GoalSpec templates expose executable contract fields", async () => {
  const spec = await read(".requirements/templates/spec-package/spec.md");
  const testDesign = await read(".requirements/templates/spec-package/test.md");
  const issue = await read(".requirements/templates/spec-package/issues/ISSUE-R001-S01-001-example.md");

  for (const field of ["Public Seam", "Error Semantics", "Observability", "Risk and Gate Impact", "Agent Behavior Contract"]) {
    assert.match(spec, new RegExp(field));
  }
  for (const field of ["source_spec_id", "source_spec_hash", "qualityProfile", "riskTier", "Test Data and Environment", "CI/CD Gate Matrix", "Agent Eval Plan", "Given:", "When:", "Then:"]) {
    assert.match(testDesign, new RegExp(field.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }
  for (const field of ["source_spec_id", "source_test_id", "source_test_hash", "Acceptance Criteria", "Required Evidence", "AI Draft Review"]) {
    assert.match(issue, new RegExp(field));
  }
});

test("Skill pressure prompt IDs are unique and valid JSON", async () => {
  const promptFiles = [
    "skills/developer/prd/test-prompts.json",
    "skills/developer/prd-to-spec/test-prompts.json",
    "skills/developer/spec-to-test/test-prompts.json",
    "skills/developer/to-issues/test-prompts.json"
  ];
  const ids = new Set();
  for (const file of promptFiles) {
    const prompts = JSON.parse(await read(file));
    assert.ok(Array.isArray(prompts), `${file} must contain an array`);
    for (const prompt of prompts) {
      assert.ok(prompt.id !== undefined, `${file} prompt is missing id`);
      assert.equal(typeof prompt.prompt, "string");
      assert.equal(typeof prompt.expected, "string");
      const key = `${file}:${prompt.id}`;
      assert.equal(ids.has(key), false, `duplicate prompt id: ${key}`);
      ids.add(key);
    }
  }
});
