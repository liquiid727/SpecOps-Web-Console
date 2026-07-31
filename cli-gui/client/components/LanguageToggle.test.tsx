import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

describe("LanguageToggle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("defaults to Chinese and persists English mode", () => {
    act(() => root.render(<I18nProvider><LanguageToggle /></I18nProvider>));

    // 默认语言已改中文（QA 调节）：无存储偏好时首渲染即 zh
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(container.querySelector(".active")?.textContent).toBe("中文");

    act(() => container.querySelector("button")!.click());

    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("product-ai-os-cli-gui-language")).toBe("en");
    expect(container.querySelector(".active")?.textContent).toBe("EN");
  });
});
