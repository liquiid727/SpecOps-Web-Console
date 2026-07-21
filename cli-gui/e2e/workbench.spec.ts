import { expect, test } from "@playwright/test";

test("loads the disposable workbench shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".utility-rail")).toHaveCount(0);
  await expect(page.locator(".app-sidebar")).toBeVisible();
  await expect(page.locator("#session-navigator")).toBeVisible();
  await expect(page.getByText("Sessions", { exact: true })).toBeVisible();
  await expect(page.locator(".session-navigator .session-row").getByText("Fixture session", { exact: true })).toBeVisible();
});

test("keeps the navigator usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle sessions" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("button", { name: "Close session list" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("keeps mobile session controls inside the viewport and drawers focusable", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const toggle = page.getByRole("button", { name: "Toggle sessions" });
    await toggle.click();
    await expect(page.locator("#session-navigator")).toHaveCount(0);
    await expect(page.locator(".prompt-composer .custom-select")).toHaveCount(3);

    const pageWidth = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth);

    const inspectorTrigger = page.getByRole("button", { name: "Open session details" });
    await inspectorTrigger.click();
    await expect(page.locator("#session-inspector")).toBeVisible();
    await expect(page.locator("#session-navigator")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator("#session-inspector")).toHaveCount(0);
    await expect(inspectorTrigger).toBeFocused();

    await toggle.click();
    await expect(page.locator("#session-navigator")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#session-navigator")).toHaveCount(0);
    await expect(toggle).toBeFocused();
  }
});

test("runs the disposable session through transcript, terminal, inspector, and picker flows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Resume session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("tab", { name: /Terminal/ }).click();
  await expect(page.locator(".terminal-host")).toBeVisible();
  await page.getByRole("tab", { name: /Transcript/ }).click();
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.fill("hello fixture");
  await prompt.press("Enter");
  await expect(page.getByLabel("Transcript").getByText("hello fixture", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Open session details" }).click();
  await page.getByRole("tab", { name: "Files" }).click();
  await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.locator(".file-preview")).toContainText("fixture");

  await page.getByRole("button", { name: "Open folder" }).first().click();
  await expect(page.locator(".alert")).toHaveCount(0);

  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("radio", { name: /Neo/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neo");
  await page.locator(".overlay-panel[role='dialog']").getByRole("button", { name: "Close", exact: true }).click();
});

test("persists the appearance theme after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("radio", { name: /Classic/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
});
