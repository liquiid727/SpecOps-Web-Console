import { expect, test } from "@playwright/test";

const SESSION_ROW = ":is(.quest-row-main, .chat-row)";

test.describe.configure({ mode: "serial" });
test.skip(process.env.SPECOS_E2E_PERF !== "1", "Run with SPECOS_E2E_PERF=1 to provision the product-scale fixture.");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __specosLongTasks?: number[] };
    target.__specosLongTasks = [];
    if ("PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      new PerformanceObserver((list) => {
        target.__specosLongTasks?.push(...list.getEntries().map((entry) => entry.duration));
      }).observe({ type: "longtask", buffered: true });
    }
    window.localStorage.setItem("product-ai-os-cli-gui-language", "en");
  });
});

async function dismissSplash(page: import("@playwright/test").Page) {
  const splash = page.locator(".splash-root");
  await expect(splash).toBeVisible();
  await page.locator(".splash-enter-banner").click();
  await expect(splash).toHaveCount(0);
}

async function openWorkbench(page: import("@playwright/test").Page) {
  await page.goto("/");
  await dismissSplash(page);
}

async function sampleScroll(page: import("@playwright/test").Page, selector: string) {
  return page.evaluate(async (targetSelector) => {
    const element = document.querySelector<HTMLElement>(targetSelector);
    if (!element) throw new Error(`Missing scroll surface: ${targetSelector}`);
    const durations: number[] = [];
    const max = Math.max(0, element.scrollHeight - element.clientHeight);
    for (let index = 0; index <= 10; index += 1) {
      const started = performance.now();
      element.scrollTop = max * (index / 10);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      durations.push(performance.now() - started);
    }
    return { durations, maxScrollTop: max };
  }, selector);
}

async function collectSurfaceMetrics(page: import("@playwright/test").Page, selector: string, locateText: string) {
  return page.evaluate(({ targetSelector, text }) => {
    const element = document.querySelector<HTMLElement>(targetSelector);
    if (!element) throw new Error(`Missing metrics surface: ${targetSelector}`);
    const locateStarted = performance.now();
    const located = Array.from(element.querySelectorAll<HTMLElement>(".transcript-event, .diff-line")).find((candidate) => candidate.textContent?.includes(text));
    const locateMs = performance.now() - locateStarted;
    const target = window as Window & { __specosLongTasks?: number[] };
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      locateMs,
      located: Boolean(located),
      eventDomCount: element.querySelectorAll(".transcript-event").length,
      diffLineDomCount: element.querySelectorAll(".diff-line").length,
      diffLineCount: Number(element.getAttribute("data-line-count") ?? 0),
      diffRenderedLineCount: Number(element.getAttribute("data-rendered-line-count") ?? 0),
      virtualized: element.getAttribute("data-virtualized") === "true",
      descendantDomCount: element.querySelectorAll("*").length,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      longTasks: target.__specosLongTasks ?? [],
      memory: memory ? { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize } : null
    };
  }, { targetSelector: selector, text: locateText });
}

test("renders and navigates a synthetic 50k transcript in the real browser", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const tracePath = testInfo.outputPath("issue-081-transcript.trace.zip");
  let tracingStarted = false;
  try {
    await openWorkbench(page);
    await page.locator(SESSION_ROW).filter({ hasText: "Perf transcript 50k" }).first().click();
    const transcript = page.locator(".transcript-list");
    await expect(transcript).toBeVisible({ timeout: 30_000 });
    await expect(transcript).toHaveAttribute("data-event-count", "200", { timeout: 30_000 });

    const pageDurations: number[] = [];
    const loadMore = page.locator(".transcript-status button");
    const targetEvents = Number(process.env.SPECOS_E2E_PERF_EVENTS ?? 50_000);
    let expectedEvents = 200;
    let pages = 0;
    while (await loadMore.isVisible() && expectedEvents < targetEvents && pages < 260) {
      const started = performance.now();
      const previousEvents = expectedEvents;
      await expect(loadMore).toBeEnabled({ timeout: 30_000 });
      await loadMore.click();
      await expect.poll(async () => Number(await transcript.getAttribute("data-event-count")), { timeout: 30_000 }).toBeGreaterThan(previousEvents);
      expectedEvents = Number(await transcript.getAttribute("data-event-count"));
      pageDurations.push(performance.now() - started);
      pages += 1;
    }
    expect(expectedEvents).toBe(targetEvents);
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    const scroll = await sampleScroll(page, ".transcript-list");
    const metrics = await collectSurfaceMetrics(page, ".transcript-list", `perf-event-${targetEvents}`);
    const result = { surface: "transcript-50k", pages, pageDurations, p95LoadMoreMs: percentile(pageDurations, 0.95), scroll, metrics };
    console.log(`SPECOS_PERF_RESULT ${JSON.stringify(result)}`);
    await testInfo.attach("issue-081-transcript-50k.png", { body: await page.screenshot(), contentType: "image/png" });
    await testInfo.attach("issue-081-transcript-50k.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  } finally {
    if (tracingStarted) {
      await page.context().tracing.stop({ path: tracePath });
      await testInfo.attach("issue-081-transcript-50k.trace.zip", { path: tracePath, contentType: "application/zip" });
    }
  }
});

test("bounds a synthetic 6k-line Diff in the real browser", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const tracePath = testInfo.outputPath("issue-081-diff.trace.zip");
  let tracingStarted = false;
  try {
    await openWorkbench(page);
    await page.locator(SESSION_ROW).filter({ hasText: "Perf diff 6k" }).first().click();
    await page.getByRole("button", { name: "Toggle right panel" }).click();
    await expect(page.locator("#session-inspector")).toBeVisible();
    await page.locator(".right-panel-tabs").getByRole("tab", { name: "Files" }).click();
    await page.locator(".files-subtabs").getByRole("tab", { name: "Diff" }).click();
    const diff = page.locator(".diff-view");
    await expect(diff).toBeVisible();
    await expect(diff).toHaveAttribute("data-line-count", "6003", { timeout: 30_000 });
    await expect.poll(() => diff.locator(".diff-line").count(), { timeout: 30_000 }).toBeLessThan(200);
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    const scroll = await sampleScroll(page, ".diff-view");
    const metrics = await collectSurfaceMetrics(page, ".diff-view", "changed-6001");
    const result = { surface: "diff-6001-lines", scroll, metrics };
    console.log(`SPECOS_PERF_RESULT ${JSON.stringify(result)}`);
    await testInfo.attach("issue-081-diff-6k.png", { body: await page.screenshot(), contentType: "image/png" });
    await testInfo.attach("issue-081-diff-6k.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  } finally {
    if (tracingStarted) {
      await page.context().tracing.stop({ path: tracePath });
      await testInfo.attach("issue-081-diff-6k.trace.zip", { path: tracePath, contentType: "application/zip" });
    }
  }
});

test("keeps four product-scale workbench surfaces usable together", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const tracePath = testInfo.outputPath("issue-081-four-session.trace.zip");
  const additionalPages = await Promise.all([page.context().newPage(), page.context().newPage(), page.context().newPage()]);
  const views = [page, ...additionalPages];
  let tracingStarted = false;
  try {
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    tracingStarted = true;
    const startedAt = Date.now();
    const sessionNames = ["Perf transcript 50k", "Perf diff 6k", "Perf chat C", "Perf chat D"];
    await Promise.all(views.map(async (view, index) => {
      await view.addInitScript(() => window.localStorage.setItem("product-ai-os-cli-gui-language", "en"));
      await openWorkbench(view);
      const sessionName = sessionNames[index];
      await view.locator(SESSION_ROW).filter({ hasText: sessionName }).first().click();
      if (index === 0) await expect.poll(async () => Number(await view.locator(".transcript-list").getAttribute("data-event-count")), { timeout: 30_000 }).toBeGreaterThanOrEqual(200);
      await expect.poll(async () => (await view.locator(".transcript-list").isVisible()) || (await view.locator(".terminal-host").isVisible()) || (await view.locator(".chat-messages").isVisible()) || (await view.getByText("No transcript yet", { exact: true }).isVisible()), { timeout: 30_000 }).toBe(true);
    }));

    const diffPage = views[1];
    await diffPage.getByRole("button", { name: "Toggle right panel" }).click();
    await expect(diffPage.locator("#session-inspector")).toBeVisible();
    await diffPage.locator(".right-panel-tabs").getByRole("tab", { name: "Files" }).click();
    await diffPage.locator(".files-subtabs").getByRole("tab", { name: "Diff" }).click();
    await expect(diffPage.locator(".diff-view")).toHaveAttribute("data-line-count", "6003", { timeout: 30_000 });
    const startupLongTasks = await Promise.all(views.map((view) => view.evaluate(() => (window as Window & { __specosLongTasks?: number[] }).__specosLongTasks ?? [])));
    await Promise.all(views.map((view) => view.evaluate(() => { (window as Window & { __specosLongTasks?: number[] }).__specosLongTasks = []; })));
    const scroll = await Promise.all([sampleScroll(views[0], ".transcript-list"), sampleScroll(diffPage, ".diff-view")]);
    await Promise.all(views.map((view) => view.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))));
    const surfaces = await Promise.all(views.map((view, index) => view.evaluate((expectedSession) => ({
      session: expectedSession,
      transcriptEvents: Number(document.querySelector(".transcript-list")?.getAttribute("data-event-count") ?? 0),
      diffLines: Number(document.querySelector(".diff-view")?.getAttribute("data-line-count") ?? 0),
      renderedDiffLines: Number(document.querySelector(".diff-view")?.getAttribute("data-rendered-line-count") ?? 0),
      longTasks: (window as Window & { __specosLongTasks?: number[] }).__specosLongTasks ?? []
    }), sessionNames[index])));
    const result = { surface: "four-workbench-surfaces", startupMs: Date.now() - startedAt, startupLongTasks, scroll, surfaces };
    console.log(`SPECOS_PERF_RESULT ${JSON.stringify(result)}`);
    await testInfo.attach("issue-081-four-session.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
    await testInfo.attach("issue-081-four-session.png", { body: await diffPage.screenshot(), contentType: "image/png" });
    expect(surfaces).toHaveLength(4);
    expect(surfaces[1]?.diffLines).toBe(6003);
    expect(surfaces[1]?.renderedDiffLines).toBeLessThan(200);
    expect(surfaces.every((surface) => surface.longTasks.length === 0)).toBe(true);
  } finally {
    if (tracingStarted) {
      await page.context().tracing.stop({ path: tracePath });
      await testInfo.attach("issue-081-four-session.trace.zip", { path: tracePath, contentType: "application/zip" });
    }
    await Promise.all(additionalPages.map((view) => view.close()));
  }
});

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)] ?? 0;
}
