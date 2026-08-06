// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createCompositeSecretStore, createEnvironmentSecretStore, createMacKeychainSecretStore, createMemorySecretStore, SecretStoreError } from "./secret-store.js";

describe("secret stores", () => {
  it("keeps environment credentials read-only", async () => {
    const store = createEnvironmentSecretStore({ PROVIDER_KEY: "env-canary" });
    await expect(store.resolve("env:PROVIDER_KEY")).resolves.toBe("env-canary");
    await expect(store.status("env:PROVIDER_KEY")).resolves.toBe("legacy-environment");
    await expect(store.put({ providerId: "provider" }, "secret")).rejects.toMatchObject({ code: "SECRET_STORE_UNAVAILABLE" });
    await expect(store.remove("env:PROVIDER_KEY")).resolves.toBeUndefined();
    await expect(store.resolve("env:PROVIDER_KEY")).resolves.toBe("env-canary");
    await expect(store.status("env:PROVIDER_KEY")).resolves.toBe("legacy-environment");
  });

  it("keeps concurrent memory writes independently resolvable", async () => {
    const store = createMemorySecretStore();
    const refs = await Promise.all(
      Array.from({ length: 16 }, (_, index) => store.put({ providerId: `provider-${index % 2}` }, `memory-secret-${index}`)),
    );

    expect(new Set(refs).size).toBe(refs.length);
    await expect(Promise.all(refs.map((ref) => store.status(ref)))).resolves.toEqual(Array(refs.length).fill("configured"));
    await expect(Promise.all(refs.map((ref) => store.resolve(ref)))).resolves.toEqual(
      Array.from({ length: refs.length }, (_, index) => `memory-secret-${index}`),
    );
  });

  it("keeps replace and delete results consistent when operations interleave", async () => {
    const store = createMemorySecretStore();
    const original = await store.put({ providerId: "provider" }, "original-secret");
    const replacementRefs = await Promise.all(
      Array.from({ length: 8 }, (_, index) => store.put({ providerId: "provider" }, `replacement-secret-${index}`)),
    );

    await Promise.all([
      store.remove(original),
      ...replacementRefs.slice(0, 4).map((ref) => store.remove(ref)),
    ]);

    await expect(store.status(original)).resolves.toBe("missing");
    await expect(Promise.all(replacementRefs.slice(0, 4).map((ref) => store.status(ref)))).resolves.toEqual(
      Array(4).fill("missing"),
    );
    await expect(Promise.all(replacementRefs.slice(4).map((ref) => store.resolve(ref)))).resolves.toEqual([
      "replacement-secret-4",
      "replacement-secret-5",
      "replacement-secret-6",
      "replacement-secret-7",
    ]);
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

  it("maps macOS adapter execution failures to stable errors and status", async () => {
    const exec = vi.fn(async () => { throw new Error("fixture execution failure"); });
    const store = createMacKeychainSecretStore({ platform: "darwin", exec });

    await expect(store.put({ providerId: "provider" }, "fixture-secret")).rejects.toMatchObject({ code: "SECRET_WRITE_FAILED" });
    await expect(store.remove("keychain:fixture-ref")).rejects.toMatchObject({ code: "SECRET_DELETE_FAILED" });
    await expect(store.resolve("keychain:fixture-ref")).rejects.toMatchObject({ code: "PROVIDER_SECRET_MISSING" });
    await expect(store.status("keychain:fixture-ref")).resolves.toBe("missing");
    expect(exec).toHaveBeenCalledTimes(4);
  });
});
