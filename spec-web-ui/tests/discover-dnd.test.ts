import { describe, expect, it } from "vitest";

import * as discoverDnd from "@/features/catalog/dnd";

describe("getCollectionDropPlacement", () => {
  it("returns before in the upper half and after in the lower half", () => {
    const getCollectionDropPlacement = (discoverDnd as Record<string, unknown>).getCollectionDropPlacement as
      | ((pointerY: number, rect: { top: number; height: number }) => "before" | "after")
      | undefined;

    expect(typeof getCollectionDropPlacement).toBe("function");
    expect(getCollectionDropPlacement?.(110, { top: 100, height: 80 })).toBe("before");
    expect(getCollectionDropPlacement?.(170, { top: 100, height: 80 })).toBe("after");
  });

  it("computes autoscroll deltas near viewport edges", () => {
    const getDragAutoScrollDelta = (discoverDnd as Record<string, unknown>).getDragAutoScrollDelta as
      | ((
          pointerY: number,
          viewport: { top: number; height: number },
          options?: { edgeThreshold?: number; maxStep?: number }
        ) => number)
      | undefined;

    expect(typeof getDragAutoScrollDelta).toBe("function");
    expect(
      getDragAutoScrollDelta?.(110, { top: 100, height: 600 }, { edgeThreshold: 80, maxStep: 24 })
    ).toBeLessThan(0);
    expect(
      getDragAutoScrollDelta?.(660, { top: 100, height: 600 }, { edgeThreshold: 80, maxStep: 24 })
    ).toBeGreaterThan(0);
    expect(
      getDragAutoScrollDelta?.(350, { top: 100, height: 600 }, { edgeThreshold: 80, maxStep: 24 })
    ).toBe(0);
  });

  it("reports whether a drag target is allowed or restricted by collection scope", () => {
    const getCollectionDragFeedback = (discoverDnd as Record<string, unknown>).getCollectionDragFeedback as
      | ((
          dragPayload: { scope: string; itemId: string } | null,
          dropTarget: { scope: string; itemId: string }
        ) => "allowed" | "restricted" | "ignore")
      | undefined;

    expect(typeof getCollectionDragFeedback).toBe("function");
    expect(
      getCollectionDragFeedback?.(
        { scope: "favorites", itemId: "rule-go-backend" },
        { scope: "favorites", itemId: "agent-openapi" }
      )
    ).toBe("allowed");
    expect(
      getCollectionDragFeedback?.(
        { scope: "favorites", itemId: "rule-go-backend" },
        { scope: "presets", itemId: "backend-api-starter" }
      )
    ).toBe("restricted");
    expect(
      getCollectionDragFeedback?.(
        { scope: "favorites", itemId: "rule-go-backend" },
        { scope: "favorites", itemId: "rule-go-backend" }
      )
    ).toBe("ignore");
  });
});
