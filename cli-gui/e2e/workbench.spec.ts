import { expect, test } from "@playwright/test";

const NAVIGATOR = "#session-navigator";
const INSPECTOR = "#session-inspector";
const SESSION_ROW = ".quest-row-main";

test("loads the disposable workbench shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".utility-rail")).toHaveCount(0);
  await expect(page.locator(NAVIGATOR)).toBeVisible();
  await expect(page.locator(NAVIGATOR).getByText("Quests", { exact: true })).toBeVisible();
  await expect(page.locator(`${NAVIGATOR} ${SESSION_ROW}`).filter({ hasText: "Fixture session" }).first()).toBeVisible();
});

test("keeps the Qoder desktop shell in one full-height row", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2048, height: 1024 });
  await page.goto("/");
  const sidebar = await page.locator(NAVIGATOR).boundingBox();
  const main = await page.locator(".qoder-main-column").boundingBox();
  expect(sidebar).toMatchObject({ x: 0, y: 0, width: 286, height: 1024 });
  expect(main).toMatchObject({ x: 286, y: 44, width: 1762, height: 980 });
  await expect(page.locator(".navigator-backdrop")).toBeHidden();

  await page.locator(SESSION_ROW).filter({ hasText: "Fixture session" }).first().click();
  const composer = await page.locator(".chat-composer").boundingBox();
  expect(composer?.width).toBeLessThanOrEqual(904);
  expect(Math.abs((composer?.x ?? 0) + (composer?.width ?? 0) / 2 - (286 + 1762 / 2))).toBeLessThanOrEqual(1);
  await testInfo.attach("qoder-desktop-2048x1024", { body: await page.screenshot(), contentType: "image/png" });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".qoder-main-column")).toBeVisible();
  const regularMain = await page.locator(".qoder-main-column").boundingBox();
  expect(regularMain).toMatchObject({ x: 286, y: 44, width: 1154, height: 856 });
  await testInfo.attach("qoder-desktop-1440x900", { body: await page.screenshot(), contentType: "image/png" });

  await page.setViewportSize({ width: 390, height: 844 });
  const pageMetrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(pageMetrics.clientWidth);
  await testInfo.attach("qoder-mobile-390x844", { body: await page.screenshot(), contentType: "image/png" });
});

test("supports the accessible session context menu", async ({ page }) => {
  await page.goto("/");
  const row = page.locator(`${NAVIGATOR} ${SESSION_ROW}`).filter({ hasText: "Fixture session" }).first();
  await row.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Session actions" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem").nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("keeps the navigator usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await page.getByRole("button", { name: "Close session list" }).click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("keeps mobile session controls inside the viewport and drawers focusable", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Activating the fixture session on a narrow viewport closes the navigator and opens the inspector.
    await page.locator(SESSION_ROW).filter({ hasText: "Fixture session" }).first().click();
    await expect(page.locator(NAVIGATOR)).toHaveCount(0);

    // The active session view stays within the viewport (no horizontal scroll).
    const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);

    // The composer exposes three launch pills (permission, mode, model).
    await expect(page.locator(".prompt-composer .custom-select")).toHaveCount(3);

    // The inspector opens after selecting a session; Escape closes it.
    const inspector = page.locator(INSPECTOR);
    await expect(inspector).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(inspector).toHaveCount(0);

    // Reopen the inspector via the right-panel toggle; Escape restores focus to that toggle.
    const rightToggle = page.getByRole("button", { name: "Toggle right panel" });
    await rightToggle.click();
    await expect(inspector).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(inspector).toHaveCount(0);
    await expect(rightToggle).toBeFocused();

    // The navigator drawer re-opens and Escape restores focus to its toggle.
    const sidebarToggle = page.getByRole("button", { name: "Toggle sidebar" });
    await sidebarToggle.click();
    await expect(page.locator(NAVIGATOR)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(NAVIGATOR)).toHaveCount(0);
    await expect(sidebarToggle).toBeFocused();
  }
});

test("runs the disposable session through transcript, terminal, inspector, and picker flows", async ({ page }) => {
  await page.goto("/");
  // Activate the fixture session.
  await page.locator(SESSION_ROW).filter({ hasText: "Fixture session" }).first().click();

  // Resume the stopped session, then the Stop control appears.
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible({ timeout: 10_000 });

  // Send a prompt and confirm it shows up in the live transcript.
  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await prompt.fill("hello fixture");
  await prompt.press("Enter");
  await expect(page.locator(".chat-messages")).toContainText("hello fixture", { timeout: 10_000 });

  // The current Qoder chat path preserves Transcript / Terminal as alternate center views.
  const centerTabs = page.locator(".chat-header-actions");
  await centerTabs.getByRole("tab", { name: "Terminal" }).click();
  await expect(page.locator(".chat-terminal .terminal-host")).toBeVisible();
  await centerTabs.getByRole("tab", { name: "Transcript" }).click();
  await expect(page.locator(".chat-messages")).toContainText("hello fixture");

  // Open the inspector and verify the terminal surface.
  await page.getByRole("button", { name: "Toggle right panel" }).click();
  await expect(page.locator(INSPECTOR)).toBeVisible();
  await page.locator(".right-panel-tabs").getByRole("tab", { name: "Terminal" }).click();
  await expect(page.locator(".terminal-host")).toBeVisible();

  // Files tab -> files sub-tab -> README.md -> preview.
  await page.locator(".right-panel-tabs").getByRole("tab", { name: "Files" }).click();
  await page.locator(".files-subtabs").getByRole("tab", { name: "Files" }).click();
  await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.locator(".file-preview")).toContainText("fixture");

  // Close the inspector before the picker/settings flows.
  await page.getByRole("button", { name: "Toggle right panel" }).click();
  await expect(page.locator(INSPECTOR)).toHaveCount(0);

  // Open folder (web fallback picks nothing) must not raise an alert.
  await page.getByRole("button", { name: "Open folder" }).first().click();
  await expect(page.locator(".alert")).toHaveCount(0);

  // Settings -> Appearance -> Neo theme.
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

// issue-011：多会话冒烟（2 chat + 1 terminal 并行，内容互不串台；test-spec §4.2）
test("keeps concurrent chat and terminal sessions isolated (multi-session smoke)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const state = await (await fetch("/api/state")).json();
    const headers = { "content-type": "application/json", "x-specos-csrf-capability": state.csrfCapability } as Record<string, string>;
    for (const name of ["Chat quest A", "Chat quest B"]) {
      const response = await fetch("/api/sessions", { method: "POST", headers, body: JSON.stringify({ name, workspaceId: "workspace-fixture", profileId: "profile-headless", start: true, confirmed: true }) });
      if (response.status !== 201) throw new Error(`create failed: ${response.status}`);
    }
  });
  await page.reload();

  // 终端 fixture 会话与两个 chat 会话同时运行（此前用例可能已把 fixture 会话置为运行中，按需 Resume）
  await page.locator(SESSION_ROW).filter({ hasText: "Fixture session" }).first().click();
  const stopButton = page.getByRole("button", { name: "Stop", exact: true });
  const resumeButton = page.getByRole("button", { name: "Resume", exact: true });
  await expect(stopButton.or(resumeButton)).toBeVisible({ timeout: 10_000 });
  if (await resumeButton.isVisible()) await resumeButton.click();
  await expect(stopButton).toBeVisible({ timeout: 10_000 });

  const prompt = page.getByRole("textbox", { name: "Prompt" });
  await page.locator(SESSION_ROW).filter({ hasText: "Chat quest A" }).first().click();
  await prompt.fill("alpha task");
  await prompt.press("Enter");
  await expect(page.locator(".chat-messages")).toContainText("reply:alpha task", { timeout: 10_000 });

  await page.locator(SESSION_ROW).filter({ hasText: "Chat quest B" }).first().click();
  await prompt.fill("beta task");
  await prompt.press("Enter");
  await expect(page.locator(".chat-messages")).toContainText("reply:beta task", { timeout: 10_000 });
  await expect(page.locator(".chat-messages")).not.toContainText("alpha task");

  // 切回 A：只包含自己的轮次，无 B 的内容
  await page.locator(SESSION_ROW).filter({ hasText: "Chat quest A" }).first().click();
  await expect(page.locator(".chat-messages")).toContainText("reply:alpha task", { timeout: 10_000 });
  await expect(page.locator(".chat-messages")).not.toContainText("beta task");

  // 终端会话的 transcript 不含任何 chat 回复
  await page.locator(SESSION_ROW).filter({ hasText: "Fixture session" }).first().click();
  await expect(page.locator(".chat-messages")).not.toContainText("reply:");
});
