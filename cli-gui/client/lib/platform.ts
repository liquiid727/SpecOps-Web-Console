import { useState } from "react";

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface PlatformAdapter {
  readonly kind: "web" | "tauri";
  platformInfo(): Promise<string>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  listDirectory(path: string): Promise<DirEntry[]>;
  pickFolder(): Promise<string | null>;
}

interface TauriGlobal {
  core?: { invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> };
  dialog?: { open(options?: { directory?: boolean; multiple?: boolean }): Promise<string | string[] | null> };
}

function tauriGlobal(): TauriGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
}

export function isTauri(): boolean {
  if (typeof window !== "undefined" && Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__)) return true;
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_TAURI === "true";
}

export class WebPlatformAdapter implements PlatformAdapter {
  readonly kind = "web" as const;
  async platformInfo(): Promise<string> {
    return "web";
  }
  async readTextFile(): Promise<string> {
    throw new Error("fs-read-unavailable-web");
  }
  async writeTextFile(): Promise<void> {
    throw new Error("fs-write-unavailable-web");
  }
  async listDirectory(): Promise<DirEntry[]> {
    throw new Error("fs-list-unavailable-web");
  }
  async pickFolder(): Promise<null> {
    return null;
  }
}

export class TauriPlatformAdapter implements PlatformAdapter {
  readonly kind = "tauri" as const;

  private ensure(): TauriGlobal {
    const global = tauriGlobal();
    if (!global?.core) throw new Error("tauri-runtime-unavailable");
    return global;
  }

  async platformInfo(): Promise<string> {
    return this.ensure().core!.invoke<string>("platform_info");
  }
  async readTextFile(path: string): Promise<string> {
    return this.ensure().core!.invoke<string>("read_text_file", { path });
  }
  async writeTextFile(path: string, contents: string): Promise<void> {
    await this.ensure().core!.invoke("write_text_file", { path, contents });
  }
  async listDirectory(path: string): Promise<DirEntry[]> {
    const entries = await this.ensure().core!.invoke<Array<{ name: string; path: string; is_dir: boolean }>>("list_directory", { path });
    return entries.map((entry) => ({ name: entry.name, path: entry.path, isDir: entry.is_dir }));
  }
  async pickFolder(): Promise<string | null> {
    const dialog = tauriGlobal()?.dialog;
    if (!dialog) return null;
    const result = await dialog.open({ directory: true });
    if (Array.isArray(result)) return result[0] ?? null;
    return result;
  }
}

let cached: PlatformAdapter | undefined;

export function getPlatform(): PlatformAdapter {
  if (!cached) cached = isTauri() ? new TauriPlatformAdapter() : new WebPlatformAdapter();
  return cached;
}

export function usePlatform(): PlatformAdapter {
  const [adapter] = useState(() => getPlatform());
  return adapter;
}
