import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import path from "node:path";

const script = path.join(import.meta.dirname, "test-runner.mjs");

test("runner rejects a legacy flat spec id", () => {
  const result = spawnSync(process.execPath, [script, "legacy-flat-spec"], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /R###-slug\/S##-slug/);
});
