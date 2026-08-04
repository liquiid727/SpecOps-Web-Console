import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { createMockClientRuntimeFixture } from "../runtime/mock-client-runtime";
import { ClientRuntimeProvider } from "../runtime/client-runtime";
import { FeedbackProvider } from "./ui/Feedback";
import { ModelRoutingSettings } from "./ModelRoutingSettings";

describe("ModelRoutingSettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("loads provider, deployment, and route resources through runtime ports", async () => {
    const fixture = createMockClientRuntimeFixture();
    await act(async () => {
      root.render(<I18nProvider><FeedbackProvider><ClientRuntimeProvider runtime={fixture.runtime}><ModelRoutingSettings /></ClientRuntimeProvider></FeedbackProvider></I18nProvider>);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector("[data-provider-id='mock-provider']")).not.toBeNull();
    const deploymentsTab = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Deployments") as HTMLButtonElement;
    act(() => deploymentsTab.click());
    expect(container.querySelector("[data-deployment-id='mock-deployment']")).not.toBeNull();

    const edit = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Edit")) as HTMLButtonElement;
    act(() => edit.click());
    expect(container.querySelector("[aria-label='Deployment name']")).not.toBeNull();

    const routesTab = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Routes") as HTMLButtonElement;
    act(() => routesTab.click());
    expect(container.querySelector("[data-route-id='mock-route']")).not.toBeNull();
    expect(container.querySelector("[data-deployment-id='mock-deployment']")).not.toBeNull();

    const routeDelete = container.querySelector<HTMLButtonElement>("[data-model-routing-view='routes'] button[aria-label='Delete']")!;
    act(() => routeDelete.click());
    expect(container.querySelector("[role='dialog']")?.textContent).toContain("Delete route?");
    const closeDialog = container.querySelector<HTMLButtonElement>("[role='dialog'] button[aria-label='Close']")!;
    act(() => closeDialog.click());

    act(() => deploymentsTab.click());
    const deploymentDelete = container.querySelector<HTMLButtonElement>("[data-model-routing-view='deployments'] button[aria-label='Delete']")!;
    act(() => deploymentDelete.click());
    expect(container.querySelector("[role='dialog']")?.textContent).toContain("Delete deployment?");
  });
});
