import { describe, expect, it } from "vitest";

import {
  buildDiscoverSectionToolClassName,
  getCatalogRowTagPreview
} from "@/lib/discover-ui";

describe("buildDiscoverSectionToolClassName", () => {
  it("returns compact monochrome tool controls for rail actions", () => {
    expect(buildDiscoverSectionToolClassName("default")).toContain("control-secondary");
    expect(buildDiscoverSectionToolClassName("default")).toContain("border");
    expect(buildDiscoverSectionToolClassName("danger")).toContain("text-rose-400");
    expect(buildDiscoverSectionToolClassName("accent")).toContain("control-primary");
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
