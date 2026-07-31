import { describe, expect, it, vi, afterEach } from "vitest";
import { WebPlatformAdapter, TauriPlatformAdapter, isTauri } from "./platform";

interface TauriGlobal {
  core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  dialog?: { open: (options?: { directory?: boolean }) => Promise<string | string[] | null> };
}

describe("PlatformAdapter", () => {
  afterEach(() => {
    delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    vi.restoreAllMocks();
  });

  it("reports web mode without exposing arbitrary filesystem access", async () => {
    expect(isTauri()).toBe(false);
    const web = new WebPlatformAdapter();
    expect(web.kind).toBe("web");
    expect(await web.platformInfo()).toBe("web");
    expect(await web.pickFolder()).toBeNull();
  });

  it("routes the native folder picker through the Tauri bridge", async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "platform_info") return "9.9.9";
      return null;
    });
    const open = vi.fn(async () => "/Users/me/project");
    const bridge: TauriGlobal = { core: { invoke }, dialog: { open } };
    (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ = bridge;

    expect(isTauri()).toBe(true);
    const tauri = new TauriPlatformAdapter();
    expect(tauri.kind).toBe("tauri");
    expect(await tauri.platformInfo()).toBe("9.9.9");
    expect(await tauri.pickFolder()).toBe("/Users/me/project");
    expect(invoke).toHaveBeenCalledWith("platform_info");
  });

  it("returns null when Tauri dialog is cancelled (returns null)", async () => {
    const open = vi.fn(async () => null);
    (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ = { core: { invoke: vi.fn() }, dialog: { open } };
    const tauri = new TauriPlatformAdapter();
    expect(await tauri.pickFolder()).toBeNull();
  });

  it("returns first path when Tauri dialog returns an array", async () => {
    const open = vi.fn(async () => ["/path/one", "/path/two"]);
    (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ = { core: { invoke: vi.fn() }, dialog: { open } };
    const tauri = new TauriPlatformAdapter();
    expect(await tauri.pickFolder()).toBe("/path/one");
  });

  it("returns null when Tauri dialog module is unavailable", async () => {
    (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ = { core: { invoke: vi.fn() } };
    const tauri = new TauriPlatformAdapter();
    expect(await tauri.pickFolder()).toBeNull();
  });

});
