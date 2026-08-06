import fs from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const TOKEN_A = "fixture-provider-a-token";
const TOKEN_B = "fixture-provider-b-token";
const SESSION_ROW = ":is(.quest-row-main, .chat-row)";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("product-ai-os-cli-gui-language", "en"));
});

async function enter(page: Page) {
  await page.goto("/");
  await page.locator(".splash-enter-banner").click();
  await expect(page.locator(".splash-root")).toHaveCount(0);
}

async function choose(page: Locator | Page, label: string, option: string) {
  const trigger = page.getByRole("button", { name: label, exact: true });
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function openQuestHome(page: Page) {
  const home = page.locator("button.sidebar-link").filter({ hasText: "Better Loop" });
  await expect(home).toBeVisible();
  await home.click();
  await expect(page.locator("button.advanced-create-link")).toBeVisible();
}

async function createSession(page: Page, name: string, provider: string) {
  await page.locator("button.advanced-create-link").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Session name").fill(name);
  await choose(dialog, "CLI profile", "Fixture headless");
  await choose(dialog, "Interaction mode", "Chat");
  await choose(dialog, "Provider connection", provider);
  await expect(dialog.getByRole("button", { name: "Confirm and start", exact: true })).toBeEnabled({ timeout: 10_000 });
  await dialog.getByRole("button", { name: "Confirm and start", exact: true }).click();
  await expect(page.locator(SESSION_ROW).filter({ hasText: name })).toBeVisible();
  await page.locator(SESSION_ROW).filter({ hasText: name }).click();
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.fill(`${provider}-prompt`);
  await prompt.press("Enter");
  await expect(page.locator(".chat-messages")).toContainText(`reply:${provider}-prompt`, { timeout: 10_000 });
}

test("proves provider CRUD, filtering, and isolated provider conversations", async ({ page }, testInfo) => {
  const tracePath = testInfo.outputPath("provider-management.trace.zip");
  await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await enter(page);

  // Meta/Ctrl+5 enters the primary SettingsView, avoiding the legacy settings overlay.
  await page.keyboard.press("Control+5");
  await expect(page.locator(".settings-view")).toBeVisible();
  await page.getByRole("button", { name: "Models", exact: true }).click();
  const providers = page.locator('[data-model-routing-view="providers"]');
  await expect(providers).toBeVisible();
  await expect(providers.locator('[data-provider-id="provider-a"]')).toContainText("Credential configured");
  await expect(providers.locator('[data-provider-id="provider-b"]')).toContainText("Credential configured");

  const id = `provider-test-${Date.now()}`;
  await page.getByLabel("Provider id").fill(id);
  await page.getByLabel("Provider name").fill("Browser CRUD Provider");
  await page.getByLabel("Endpoint").fill("https://provider-test.invalid/v1");
  await page.getByPlaceholder("env:PROVIDER_KEY").fill("env:FIXTURE_PROVIDER_A_KEY");
  await page.getByLabel("Models (comma separated)").fill("browser-model");
  await page.getByRole("button", { name: "Add provider", exact: true }).click();
  const created = providers.locator(`[data-provider-id="${id}"]`);
  await expect(created).toContainText("Browser CRUD Provider");
  await expect(created).not.toContainText(TOKEN_A);
  await expect(created).not.toContainText(TOKEN_B);
  await created.getByRole("button", { name: "Edit", exact: true }).click();
  await created.getByLabel("Provider name").fill("Browser CRUD Updated");
  await created.getByRole("button", { name: "Save", exact: true }).click();
  await expect(created).toContainText("Browser CRUD Updated");
  await created.getByRole("button", { name: "Delete", exact: true }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(created).toHaveCount(0);
  const crudScreenshot = testInfo.outputPath("provider-crud.png");
  await page.screenshot({ path: crudScreenshot, fullPage: true });
  await testInfo.attach("provider-crud.png", { path: crudScreenshot, contentType: "image/png" });

  await openQuestHome(page);
  await page.locator("button.advanced-create-link").click();
  const dialog = page.getByRole("dialog");
  await choose(dialog, "CLI profile", "Fixture headless");
  await choose(dialog, "Interaction mode", "Chat");
  await choose(dialog, "Provider connection", "Fixture Provider A");
  await dialog.getByRole("button", { name: "Provider connection", exact: true }).click();
  const options = page.getByRole("listbox", { name: "Provider connection" }).getByRole("option");
  await expect(options).toContainText(["Fixture Provider A", "Fixture Provider B"]);
  await dialog.getByRole("button", { name: "Provider connection", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

  await createSession(page, "Provider A conversation", "Fixture Provider A");
  await openQuestHome(page);
  await createSession(page, "Provider B conversation", "Fixture Provider B");

  const sessionA = page.locator(SESSION_ROW).filter({ hasText: "Provider A conversation" }).first();
  await sessionA.click();
  await expect(page.locator(".chat-messages")).toContainText("reply:Fixture Provider A-prompt", { timeout: 10_000 });
  await expect(page.locator(".chat-messages")).not.toContainText("Fixture Provider B-prompt");

  const state = await page.evaluate(async () => (await (await fetch("/api/state")).json()) as { sessions: Array<{ name: string; providerId?: string }>; csrfCapability: string });
  const a = state.sessions.find((session) => session.name === "Provider A conversation");
  const b = state.sessions.find((session) => session.name === "Provider B conversation");
  expect(a?.providerId).toBe("provider-a");
  expect(b?.providerId).toBe("provider-b");
  const evidence = JSON.stringify({ providerIds: [a?.providerId, b?.providerId], tokenFree: true });
  expect(evidence).not.toContain(TOKEN_A);
  expect(evidence).not.toContain(TOKEN_B);
  await expect(page.locator("body")).not.toContainText(TOKEN_A);
  await expect(page.locator("body")).not.toContainText(TOKEN_B);
  const conversationScreenshot = testInfo.outputPath("provider-conversations.png");
  await page.screenshot({ path: conversationScreenshot, fullPage: true });
  await testInfo.attach("provider-conversations.png", { path: conversationScreenshot, contentType: "image/png" });
  const evidencePath = testInfo.outputPath("provider-management.token-free.json");
  await fs.writeFile(evidencePath, evidence, "utf8");
  await testInfo.attach("provider-management.token-free.json", { path: evidencePath, contentType: "application/json" });
  } finally {
    try {
      await page.context().tracing.stop({ path: tracePath });
      await testInfo.attach("provider-management.trace.zip", { path: tracePath, contentType: "application/zip" });
    } catch {
      // Playwright may close the context after a hard test timeout; preserve the original failure.
    }
  }
});
