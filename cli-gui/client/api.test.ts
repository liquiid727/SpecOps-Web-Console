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
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 204, headers: new Headers(), json })) as unknown as typeof fetch;

    await expect(api.deleteSession("session-1")).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it("preserves structured error metadata", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      headers: new Headers({ "x-request-id": "request-header" }),
      json: async () => ({ error: { code: "WORKSPACE_IN_USE", message: "Workspace has sessions.", details: { count: 1 }, requestId: "request-body" } })
    })) as unknown as typeof fetch;

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
    })) as unknown as typeof fetch;

    const error = await api.state().catch((cause) => cause);
    expect(error).toMatchObject({ code: "INTERNAL_ERROR", requestId: "request-header", message: "Request failed with status 500." });
    expect(error.message).not.toContain("sensitive path");
  });

  it("sends typed session lifecycle and composer requests", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: "session-1" }), { status: 200, headers: { "content-type": "application/json" } }));
    globalThis.fetch = fetch as typeof globalThis.fetch;

    await api.renameSession("session-1", "Next", 7);
    await api.updateLaunchConfig("session-1", { model: "gpt-5" }, 7);
    await api.pinSession("session-1", true, 8);
    await api.completeSession("session-1", 9);
    await api.sendMessage("session-1", { clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true });
    await api.transcript("session-1", 4);
    await api.workspaceFiles("workspace-1");
    await api.filePreview("workspace-1", "README.md");
    await api.languageSummary("workspace-1");
    await api.gitStatus("workspace-1");
    await api.gitDiff("workspace-1", "staged");
    await api.pickWorkspace();
    await api.reorderSessions(["session-2", "session-1"], { "session-1": 7, "session-2": 3 });

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/sessions/session-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "Next", expectedRevision: 7 }) }));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/sessions/session-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ launchConfig: { model: "gpt-5" }, expectedRevision: 7 }) }));
    expect(fetch).toHaveBeenNthCalledWith(3, "/api/sessions/session-1/pin", expect.objectContaining({ method: "POST", body: JSON.stringify({ pinned: true, expectedRevision: 8 }) }));
    expect(fetch).toHaveBeenNthCalledWith(4, "/api/sessions/session-1/complete", expect.objectContaining({ method: "POST", body: JSON.stringify({ expectedRevision: 9 }) }));
    expect(fetch).toHaveBeenNthCalledWith(5, "/api/sessions/session-1/messages", expect.objectContaining({ method: "POST", body: JSON.stringify({ clientMessageId: "client-1", content: "hello", startIfStopped: true, confirmedStart: true }) }));
    expect(fetch).toHaveBeenNthCalledWith(6, "/api/sessions/session-1/transcript?afterSequence=4", expect.objectContaining({ headers: expect.any(Object) }));
    expect(fetch).toHaveBeenNthCalledWith(7, "/api/workspaces/workspace-1/files", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(8, "/api/workspaces/workspace-1/preview?path=README.md", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(9, "/api/workspaces/workspace-1/languages", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(10, "/api/workspaces/workspace-1/git/status", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(11, "/api/workspaces/workspace-1/git/diff?scope=staged", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(12, "/api/workspaces/pick", expect.objectContaining({ method: "POST" }));
    expect(fetch).toHaveBeenNthCalledWith(13, "/api/sessions/reorder", expect.objectContaining({ method: "POST" }));
  });
});
