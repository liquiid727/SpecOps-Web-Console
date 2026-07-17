import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, api } from "./api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("API compatibility client", () => {
  it("handles 204 without parsing JSON", async () => {
    const json = vi.fn();
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 204, headers: new Headers(), json })) as typeof fetch;

    await expect(api.deleteSession("session-1")).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("preserves structured error metadata", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      headers: new Headers({ "x-request-id": "request-header" }),
      json: async () => ({ error: { code: "WORKSPACE_IN_USE", message: "Workspace has sessions.", details: { count: 1 }, requestId: "request-body" } })
    })) as typeof fetch;

    const error = await api.deleteWorkspace("workspace-1").catch((cause) => cause);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 409, code: "WORKSPACE_IN_USE", requestId: "request-body", message: "Workspace has sessions.", details: { count: 1 } });
  });

  it("uses a safe fallback for malformed error responses", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: new Headers({ "x-request-id": "request-header" }),
      json: async () => { throw new Error("<html>sensitive path</html>"); }
    })) as typeof fetch;

    const error = await api.state().catch((cause) => cause);
    expect(error).toMatchObject({ code: "INTERNAL_ERROR", requestId: "request-header", message: "Request failed with status 500." });
    expect(error.message).not.toContain("sensitive path");
  });
});
