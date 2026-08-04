import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WorkspaceProfileManager } from "./WorkspaceProfileManager";
import { I18nProvider } from "../i18n";
import { ThemeProvider } from "../theme";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WorkspaceProfileManager appearance settings", () => {
  let root: Root | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = undefined;
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("exposes language and theme controls inside Appearance", async () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    root = createRoot(element);
    await act(async () => root?.render(
      <I18nProvider>
        <ThemeProvider><WorkspaceProfileManager
          profiles={[]}
          readonly={false}
          sessions={[]}
          workspaces={[]}
          onClose={vi.fn()}
          onCreateProfile={vi.fn(async () => undefined)}
          onCreateWorkspace={vi.fn(async () => undefined)}
          onOpenFolder={vi.fn(async () => undefined)}
          onDeleteProfile={vi.fn()}
          onDeleteWorkspace={vi.fn()}
        /></ThemeProvider>
      </I18nProvider>
    ));

    expect(document.body.querySelector(".overlay-panel.drawer-left")).toBeTruthy();
    await act(async () => document.body.querySelector<HTMLButtonElement>("[role='tab'][data-settings-category='appearance']")?.click());
    expect(document.body.querySelector("[aria-label='Theme']")).toBeTruthy();
    expect(document.body.querySelector("[data-theme-choice='qoder-light']")?.getAttribute("aria-checked")).toBe("true");
    await act(async () => document.body.querySelector<HTMLButtonElement>("[data-theme-choice='classic']")?.click());
    expect(document.documentElement.dataset.theme).toBe("classic");
    expect(document.body.querySelector("[data-language-choice='en']")?.getAttribute("aria-checked")).toBe("true");
    await act(async () => document.body.querySelector<HTMLButtonElement>("[data-language-choice='zh']")?.click());
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
