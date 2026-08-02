import { randomUUID } from "node:crypto";
import type { SecretRef, SecretStatus, SecretStore } from "../shared/model-provider.js";

export { type SecretRef, type SecretStatus, type SecretStore } from "../shared/model-provider.js";

export class SecretStoreError extends Error {
  constructor(readonly code: "SECRET_STORE_UNAVAILABLE" | "PROVIDER_SECRET_MISSING" | "SECRET_WRITE_FAILED" | "SECRET_DELETE_FAILED", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SecretStoreError";
  }
}

function isSecretRef(value: string): value is SecretRef {
  return value.startsWith("keychain:") || /^env:[A-Z][A-Z0-9_]*$/.test(value);
}

export function createEnvironmentSecretStore(environment: Readonly<Record<string, string | undefined>>): SecretStore {
  return {
    async put() { throw new SecretStoreError("SECRET_STORE_UNAVAILABLE", "The system credential store is unavailable; environment credentials are read-only."); },
    async resolve(ref) {
      if (!isSecretRef(ref) || !ref.startsWith("env:")) throw new SecretStoreError("PROVIDER_SECRET_MISSING", "The provider credential is unavailable.");
      const value = environment[ref.slice(4)];
      if (!value) throw new SecretStoreError("PROVIDER_SECRET_MISSING", "The provider credential is missing.");
      return value;
    },
    async remove(ref) {
      if (ref.startsWith("keychain:")) throw new SecretStoreError("SECRET_DELETE_FAILED", "The system credential store is unavailable.");
    },
    async status(ref) {
      if (!isSecretRef(ref)) return "missing";
      if (ref.startsWith("env:")) return environment[ref.slice(4)] ? "legacy-environment" : "missing";
      return "store-unavailable";
    }
  };
}

export function createMemorySecretStore(initial: Record<string, string> = {}): SecretStore {
  const values = new Map<string, string>();
  for (const [ref, value] of Object.entries(initial)) values.set(ref.startsWith("keychain:") ? ref : `keychain:${ref}`, value);
  return {
    async put({ providerId }, secret) {
      if (!secret) throw new SecretStoreError("SECRET_WRITE_FAILED", "Credential must not be empty.");
      const ref = `keychain:specos/${providerId}/${randomUUID()}` as SecretRef;
      values.set(ref, secret);
      return ref;
    },
    async resolve(ref) {
      const value = values.get(ref);
      if (!value) throw new SecretStoreError("PROVIDER_SECRET_MISSING", "The provider credential is missing.");
      return value;
    },
    async remove(ref) {
      values.delete(ref);
    },
    async status(ref) {
      return values.has(ref) ? "configured" : "missing";
    }
  };
}

export function createUnavailableSecretStore(): SecretStore {
  return {
    async put() { throw new SecretStoreError("SECRET_STORE_UNAVAILABLE", "The system credential store is unavailable."); },
    async resolve() { throw new SecretStoreError("SECRET_STORE_UNAVAILABLE", "The system credential store is unavailable."); },
    async remove() { throw new SecretStoreError("SECRET_DELETE_FAILED", "The system credential store is unavailable."); },
    async status() { return "store-unavailable"; }
  };
}

/** Composite resolver: env: is always read-only; keychain refs use the injected secure store. */
export function createCompositeSecretStore(environment: SecretStore, keychain: SecretStore): SecretStore {
  return {
    put: (scope, secret) => keychain.put(scope, secret),
    resolve: (ref) => ref.startsWith("env:") ? environment.resolve(ref) : keychain.resolve(ref),
    remove: (ref) => ref.startsWith("env:") ? environment.remove(ref) : keychain.remove(ref),
    status: (ref) => ref.startsWith("env:") ? environment.status(ref) : keychain.status(ref)
  };
}
