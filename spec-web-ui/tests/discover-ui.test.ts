import { describe, expect, it } from "vitest";

import {
  buildDiscoverSectionToolClassName,
  getCatalogRowTagPreview
} from "@/lib/discover-ui";

describe("buildDiscoverSectionToolClassName", () => {
  it("returns lightweight toolbar button recipes instead of heavy card actions", () => {
    expect(buildDiscoverSectionToolClassName("default")).toContain("border-line/60");
    expect(buildDiscoverSectionToolClassName("default")).toContain("text-slate-500");
    expect(buildDiscoverSectionToolClassName("danger")).toContain("text-rose-300");
    expect(buildDiscoverSectionToolClassName("accent")).toContain("border-accent/50");
  });
});

describe("getCatalogRowTagPreview", () => {
  it("caps visible tags for dense result rows and reports overflow", () => {
    expect(getCatalogRowTagPreview(["a", "b", "c", "d", "e"], 4)).toEqual({
      hiddenCount: 1,
      visibleTags: ["a", "b", "c", "d"]
    });
  });
});
