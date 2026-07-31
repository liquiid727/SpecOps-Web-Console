import { useState } from "react";

export interface PlatformAdapter {
  readonly kind: "web" | "tauri";
  platformInfo(): Promise<string>;
  pickFolder(): Promise<string | null>;
  notify(title: string, body?: string): Promise<boolean>;
  copyText(text: string): Promise<boolean>;
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
  async pickFolder(): Promise<null> {
    return null;
  }
  async notify(title: string, body?: string): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    new Notification(title, { body });
    return true;
  }
  async copyText(text: string): Promise<boolean> {
    if (!globalThis.navigator?.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
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
  async pickFolder(): Promise<string | null> {
    const dialog = tauriGlobal()?.dialog;
    if (!dialog) return null;
    const result = await dialog.open({ directory: true });
    if (Array.isArray(result)) return result[0] ?? null;
    return result;
  }
  async notify(title: string, body?: string): Promise<boolean> {
    return new WebPlatformAdapter().notify(title, body);
  }
  async copyText(text: string): Promise<boolean> {
    return new WebPlatformAdapter().copyText(text);
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
