import { afterEach, beforeEach, vi } from "vitest";
import { resetClientStores } from "../app/store";

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
  // 默认语言已改中文（QA 调节）：测试断言基于英文文案，统一种入 en 偏好；默认语言行为由 i18n.test 单独覆盖
  storage.set("product-ai-os-cli-gui-language", "en");
  // Zustand store 是模块级单例：先清 storage 再重置，避免用例间状态泄漏
  resetClientStores();
});

afterEach(() => {
  vi.clearAllMocks();
});
