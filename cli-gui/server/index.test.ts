// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readAllowedOrigins } from "./index.js";

describe("desktop sidecar origin configuration", () => {
  it("uses configured packaged/dev origins without widening the fallback", () => {
    expect(readAllowedOrigins(
      "tauri://localhost, http://127.0.0.1:3000,tauri://localhost",
      ["http://fallback.invalid"]
    )).toEqual(["tauri://localhost", "http://127.0.0.1:3000"]);
    expect(readAllowedOrigins(undefined, ["http://127.0.0.1:3000"])).toEqual(["http://127.0.0.1:3000"]);
  });
});
