import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { installBundle } from "./index.js";

describe("installer interface", () => {
  it("installs mapped files and records the installed bundle", async () => {
    const root = await mkdtemp(join(tmpdir(), "specos-installer-"));
    const bundleRoot = join(root, "bundle");
    const targetRoot = join(root, "project");
    await mkdir(join(bundleRoot, "files", "agent-teams", "example"), { recursive: true });
    await writeFile(
      join(bundleRoot, "files", "agent-teams", "example", "README.md"),
      "# Example Team\n",
      "utf8"
    );

    const result = await installBundle({
      bundleRoot,
      targetRoot,
      installedAt: new Date("2026-07-27T00:00:00.000Z"),
      manifest: {
        id: "example-bundle",
        version: "1.0.0",
        installs: [
          {
            target: "agent-teams/",
            from: "files/agent-teams/"
          }
        ],
        workflow: {
          default: "spec-driven-default"
        }
      }
    });

    await expect(
      readFile(join(targetRoot, "agent-teams", "example", "README.md"), "utf8")
    ).resolves.toBe("# Example Team\n");
    await expect(readFile(result.installedRecordPath, "utf8")).resolves.toContain(
      "installedAt: 2026-07-27T00:00:00.000Z"
    );
    expect(result.installedFiles).toBe(1);
  });
});
