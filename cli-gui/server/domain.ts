import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validationError } from "./api-errors.js";

export function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function now() {
  return new Date().toISOString();
}

export function requireText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw validationError(`${field} is required`, { field });
  }
  return value.trim();
}

export function requireArgs(value: unknown) {
  if (value === undefined) return [] as string[];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw validationError("args must be an array of strings", { field: "args" });
  }
  return value;
}

export async function validateWorkspacePath(input: string) {
  const resolved = path.resolve(input);
  const stat = await fs.stat(resolved).catch(() => undefined);
  if (!stat?.isDirectory()) {
    throw new Error("workspace path must be an existing directory");
  }
  await fs.access(resolved).catch(() => {
    throw new Error("workspace path is not accessible");
  });
  return resolved;
}

export function commandPreview(command: string, args: string[]) {
  return [command, ...args].map((part) => JSON.stringify(part)).join(" ");
}
