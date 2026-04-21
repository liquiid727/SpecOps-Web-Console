import { describe, expect, it } from "vitest";

import { buildShellBreadcrumbs, buildShellCommandTitle } from "@/lib/shell";

describe("buildShellBreadcrumbs", () => {
  it("builds a workspace-style breadcrumb trail from a route path", () => {
    expect(buildShellBreadcrumbs("/discover")).toEqual([
      { href: "/", label: "~" },
      { href: "/discover", label: "discover" }
    ]);

    expect(buildShellBreadcrumbs("/projects/reward-engine/exports")).toEqual([
      { href: "/", label: "~" },
      { href: "/projects", label: "projects" },
      { href: "/projects/reward-engine", label: "reward-engine" },
      { href: "/projects/reward-engine/exports", label: "exports" }
    ]);
  });
});

describe("buildShellCommandTitle", () => {
  it("formats command-style section titles without extra whitespace", () => {
    expect(buildShellCommandTitle("cat", "README.md")).toBe("$ cat README.md");
    expect(buildShellCommandTitle("ls", "resources/")).toBe("$ ls resources/");
    expect(buildShellCommandTitle("pwd")).toBe("$ pwd");
  });
});
