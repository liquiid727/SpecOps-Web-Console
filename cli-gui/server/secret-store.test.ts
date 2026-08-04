// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createCompositeSecretStore, createEnvironmentSecretStore, createMacKeychainSecretStore, createMemorySecretStore, SecretStoreError } from "./secret-store.js";

describe("secret stores", () => {
  it("keeps environment credentials read-only", async () => {
    const store = createEnvironmentSecretStore({ PROVIDER_KEY: "env-canary" });
    await expect(store.resolve("env:PROVIDER_KEY")).resolves.toBe("env-canary");
    await expect(store.status("env:PROVIDER_KEY")).resolves.toBe("legacy-environment");
    await expect(store.put({ providerId: "provider" }, "secret")).rejects.toMatchObject({ code: "SECRET_STORE_UNAVAILABLE" });
  });

  it("uses a keychain ref without exposing the value through the adapter contract", async () => {
    const values = new Map<string, string>();
    const exec = vi.fn(async (args: string[]) => {
      const action = args[0];
      const account = args[args.indexOf("-a") + 1];
      if (action === "add-generic-password") {
        values.set(account, args[args.indexOf("-w") + 1]);
        return { stdout: "", stderr: "" };
      }
      if (action === "find-generic-password") {
        const value = values.get(account);
        if (args.includes("-w")) return { stdout: `${value ?? ""}\n`, stderr: "" };
        if (!value) throw new Error("missing");
        return { stdout: "metadata", stderr: "" };
      }
      values.delete(account);
      return { stdout: "", stderr: "" };
    });
    const store = createMacKeychainSecretStore({ platform: "darwin", exec });
    const ref = await store.put({ providerId: "provider-1" }, "keychain-canary");
    expect(ref).toMatch(/^keychain:specos\/provider-1\//);
    expect(await store.status(ref)).toBe("configured");
    expect(await store.resolve(ref)).toBe("keychain-canary");
    await store.remove(ref);
    expect(await store.status(ref)).toBe("missing");
    expect(exec.mock.calls.some(([args]) => args.includes("keychain-canary"))).toBe(true);
  });

  it("routes env and keychain refs through a composite store", async () => {
    const environment = createEnvironmentSecretStore({ PROVIDER_KEY: "env-secret" });
    const keychain = createMemorySecretStore();
    const composite = createCompositeSecretStore(environment, keychain);
    await expect(composite.resolve("env:PROVIDER_KEY")).resolves.toBe("env-secret");
    const ref = await composite.put({ providerId: "provider" }, "memory-secret");
    await expect(composite.resolve(ref)).resolves.toBe("memory-secret");
  });

  it("preserves stable typed errors for an unavailable host adapter", async () => {
    const store = createMacKeychainSecretStore({ platform: "linux" });
    await expect(store.put({ providerId: "provider" }, "secret")).rejects.toBeInstanceOf(SecretStoreError);
    await expect(store.status("keychain:missing")).resolves.toBe("store-unavailable");
  });
});
