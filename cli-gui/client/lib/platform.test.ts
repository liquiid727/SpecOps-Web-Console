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

  it("reports web mode and rejects filesystem access without a native bridge", async () => {
    expect(isTauri()).toBe(false);
    const web = new WebPlatformAdapter();
    expect(web.kind).toBe("web");
    expect(await web.platformInfo()).toBe("web");
    await expect(web.readTextFile("/tmp/x")).rejects.toThrow(/web/);
    expect(await web.pickFolder()).toBeNull();
  });

  it("routes filesystem calls through the Tauri bridge when present", async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "platform_info") return "9.9.9";
      if (cmd === "list_directory") return [{ name: "a", path: "/a", is_dir: true }];
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
    const entries = await tauri.listDirectory("/");
    expect(entries[0]).toEqual({ name: "a", path: "/a", isDir: true });
    expect(invoke).toHaveBeenCalledWith("platform_info");
  });
});
