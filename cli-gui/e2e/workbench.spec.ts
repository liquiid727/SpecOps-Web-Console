import { expect, test } from "@playwright/test";

test("loads the disposable workbench shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".utility-rail")).toBeVisible();
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
  await expect(page.getByText("hello fixture", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Open session details" }).click();
  await page.getByRole("tab", { name: "Files" }).click();
  await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.locator(".file-preview")).toContainText("fixture");

  await page.getByRole("button", { name: "Open folder" }).first().click();
  await expect(page.locator(".alert")).toHaveCount(0);

  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await expect(page.getByText("This settings category is reserved for a later release.", { exact: true })).toBeVisible();
  await page.locator(".overlay-panel[role='dialog']").getByRole("button", { name: "Close", exact: true }).click();
});
