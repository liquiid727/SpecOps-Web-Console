import { describe, expect, it } from "vitest";
import { commandPreview, requireArgs, requireText } from "./domain.js";

describe("session domain helpers", () => {
  it("requires non-empty text fields", () => {
    expect(requireText(" Backend ", "name")).toBe("Backend");
    expect(() => requireText("  ", "name")).toThrow("name is required");
  });

  it("normalizes and validates profile arguments", () => {
    expect(requireArgs(undefined)).toEqual([]);
    expect(requireArgs(["--model", "opus"])).toEqual(["--model", "opus"]);
    expect(() => requireArgs(["--model", 42])).toThrow("args must be an array of strings");
  });

  it("builds a safe command preview", () => {
    expect(commandPreview("codex", ["--model", "gpt-5"])).toBe('"codex" "--model" "gpt-5"');
  });
});
