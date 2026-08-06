import { expect, test } from "@playwright/test";

const SESSION_ROW = ":is(.quest-row-main, .chat-row)";

test.skip(process.env.SPECOS_E2E_MODEL_SYNC !== "1", "Run with SPECOS_E2E_MODEL_SYNC=1 to provision the isolated Codex config fixture.");

test("shows a model from the isolated CLI config in the new-session composer", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const tracePath = testInfo.outputPath("issue-085-model-sync.trace.zip");
  let tracingStarted = false;
  await page.addInitScript(() => window.localStorage.setItem("product-ai-os-cli-gui-language", "en"));
  try {
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    await page.goto("/");
    await expect(page.locator(".splash-root")).toBeVisible();
    await page.locator(".splash-enter-banner").click();
    await expect(page.locator(".splash-root")).toHaveCount(0);

    await page.locator("button.new-quest-button").click();
    const composer = page.locator(".quest-home-input");
    await expect(composer).toBeVisible();
    await composer.getByRole("button", { name: "CLI profile", exact: true }).click();
    await page.getByRole("option", { name: "Fixture headless", exact: true }).click();

    const model = composer.getByRole("button", { name: "Model", exact: true });
    await expect(model).toBeEnabled({ timeout: 30_000 });
    await model.click();
    await expect(page.getByRole("option", { name: "fixture-auto-model", exact: true })).toBeVisible({ timeout: 30_000 });
    const screenshotPath = testInfo.outputPath("issue-085-model-sync.png");
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach("issue-085-model-sync.png", { path: screenshotPath, contentType: "image/png" });
    await testInfo.attach("issue-085-model-sync.json", { body: JSON.stringify({ profile: "Fixture headless", model: "fixture-auto-model", source: "isolated ~/.codex/config.toml" }, null, 2), contentType: "application/json" });

    // The fixture session is also available for a persisted-state check after
    // the new-session composer assertion, without mutating the real workspace.
    await page.getByRole("option", { name: "fixture-auto-model", exact: true }).click();
    await expect(model).toContainText("fixture-auto-model");
    await expect(page.locator(SESSION_ROW).filter({ hasText: "Model sync fixture" }).first()).toBeVisible();
  } finally {
    if (tracingStarted) {
      await page.context().tracing.stop({ path: tracePath });
      await testInfo.attach("issue-085-model-sync.trace.zip", { path: tracePath, contentType: "application/zip" });
    }
  }
});
