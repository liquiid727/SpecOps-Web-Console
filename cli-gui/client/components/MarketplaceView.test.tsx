import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { MarketplaceView } from "./MarketplaceView";

function byText(container: HTMLElement, text: string): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>("*")).find((element) => element.textContent?.trim() === text);
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("MarketplaceView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<I18nProvider><MarketplaceView /></I18nProvider>));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders categories and the plugin grid", () => {
    expect(container.textContent).toContain("Productivity");
    expect(byText(container, "Quest Scheduler")).toBeTruthy();
    expect(byText(container, "Theme Studio")).toBeTruthy();
  });

  it("filters plugins by category", () => {
    act(() => byText(container, "Themes")!.click());
    expect(byText(container, "Theme Studio")).toBeTruthy();
    expect(byText(container, "Quest Scheduler")).toBeFalsy();
  });

  it("toggles install state on a plugin card", () => {
    const installButton = byText(container, "Install") as HTMLButtonElement;
    expect(installButton).toBeTruthy();
    act(() => installButton.click());
    expect(byText(container, "Installed")).toBeTruthy();
  });

  it("filters plugins by search query", () => {
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => setInput(input, "diff"));
    expect(byText(container, "Diff Reviewer")).toBeTruthy();
    expect(byText(container, "Quest Scheduler")).toBeFalsy();
  });
});
