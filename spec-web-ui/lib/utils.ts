import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

export function sortStrings(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}
