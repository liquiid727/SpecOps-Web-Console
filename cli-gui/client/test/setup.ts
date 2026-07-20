import { afterEach, beforeEach, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const storage = new Map<string, string>();
const localStorage = {
  clear: vi.fn(() => storage.clear()),
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  key: vi.fn((index: number) => [...storage.keys()][index] ?? null),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  setItem: vi.fn((key: string, value: string) => storage.set(key, String(value))),
  get length() {
    return storage.size;
  }
};

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorage
  });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});
