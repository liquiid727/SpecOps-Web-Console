#!/usr/bin/env zsh
set -euo pipefail

root_dir="${0:A:h}/.."

exec ego-browser nodejs <<EOF
const { spawn } = await import("node:child_process");
const fs = await import("node:fs");
const net = await import("node:net");

const root = "$root_dir";
const nodePath = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"].find((candidate) => fs.existsSync(candidate));
if (!nodePath) throw new Error("Could not find a system Node.js executable for the fixture server");

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Unable to allocate an E2E port");
  return port;
}

const port = Number(process.env.EGO_E2E_PORT || await findFreePort());
const BASE_URL = "http://127.0.0.1:" + port;
const TASK_NAME = "cli-gui e2e runner " + Date.now();
const fixtureServer = spawn(nodePath, [root + "/node_modules/tsx/dist/cli.mjs", root + "/e2e/fixture-server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), FORCE_COLOR: "0" },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
fixtureServer.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
fixtureServer.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (fixtureServer.exitCode !== null) throw new Error("Fixture server exited with code " + fixtureServer.exitCode + "\n" + serverOutput);
    try {
      const response = await fetch(BASE_URL + "/");
      if (response.ok) return;
    } catch {
      // The fixture server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Fixture server did not become ready at " + BASE_URL + "\n" + serverOutput);
}

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(selector) {
  return Boolean(await js("document.querySelector(" + JSON.stringify(selector) + ") !== null"));
}

async function text(selector) {
  return String(await js("(() => { const node = document.querySelector(" + JSON.stringify(selector) + "); return node?.textContent ?? ''; })()"));
}

async function hasText(selector, expected) {
  return (await text(selector)).includes(expected);
}

async function attribute(selector, name) {
  return await js("document.querySelector(" + JSON.stringify(selector) + ")?.getAttribute(" + JSON.stringify(name) + ") ?? null");
}

async function waitUntil(predicate, message, timeoutSeconds = 12) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await wait(0.25);
  }
  throw new Error(message);
}

async function waitForExists(selector, timeoutSeconds = 12) {
  await waitUntil(() => exists(selector), "Timed out waiting for " + selector, timeoutSeconds);
}

async function waitForText(selector, expected, timeoutSeconds = 12) {
  await waitUntil(() => hasText(selector, expected), "Timed out waiting for text " + expected + " in " + selector, timeoutSeconds);
}

async function clickExact(expected, selector = "button,[role='option'],[role='tab'],[role='radio'],[role='menuitem']") {
  const clicked = await js("(() => {\n" +
    "  const expected = " + JSON.stringify(expected) + ";\n" +
    "  const node = [...document.querySelectorAll(" + JSON.stringify(selector) + ")].find((item) => (item.getAttribute('aria-label') || item.getAttribute('title') || item.textContent || '').trim() === expected);\n" +
    "  if (!node) return false;\n" +
    "  node.click();\n" +
    "  return true;\n" +
    "})()");
  await assert(clicked, "Could not click exact text: " + expected);
}

async function clickSession(name) {
  const clicked = await js("(() => {\n" +
    "  const name = " + JSON.stringify(name) + ";\n" +
    "  const node = [...document.querySelectorAll('#session-navigator :is(.quest-row-main, .chat-row)')].find((item) => (item.textContent || '').includes(name));\n" +
    "  if (!node) return false;\n" +
    "  node.click();\n" +
    "  return true;\n" +
    "})()");
  await assert(clicked, "Could not activate session: " + name);
}

async function resetPage() {
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await js("localStorage.clear(); sessionStorage.clear();");
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await waitForExists("#session-navigator");
}

async function setViewport(width, height) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await wait(0.15);
}

async function clearViewport() {
  await cdp("Emulation.clearDeviceMetricsOverride", {});
}

async function selectProfile(name) {
  await click('button[aria-label="CLI profile"]');
  await waitForExists('button[role="option"]');
  await clickExact(name, 'button[role="option"]');
}

async function sendPrompt(prompt) {
  await fillInput('textarea[placeholder="Plan, @ for context, / for commands"]', prompt);
  await pressKey("Enter");
}

async function expectNoHorizontalOverflow() {
  const metrics = await js("({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })");
  await assert(metrics.scrollWidth <= metrics.clientWidth, "Horizontal overflow detected: " + JSON.stringify(metrics));
}

async function openSessionMenu(name) {
  const opened = await js("(() => {\n" +
    "  const name = " + JSON.stringify(name) + ";\n" +
    "  const node = [...document.querySelectorAll('#session-navigator :is(.quest-row-main, .chat-row)')].find((item) => (item.textContent || '').includes(name));\n" +
    "  if (!node) return false;\n" +
    "  node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));\n" +
    "  return true;\n" +
    "})()");
  await assert(opened, "Could not open session menu: " + name);
  await waitForExists('[role="menu"]');
}

let task;
try {
  await waitForServer();
  task = await useOrCreateTaskSpace(TASK_NAME);
  await openOrReuseTab(BASE_URL + "/", { wait: true, timeout: 20 });
  await waitForExists("#session-navigator");
  await assert(await hasText("#session-navigator", "Quests"), "Workbench navigator is missing Quests");
  await assert(await hasText("#session-navigator", "Fixture session"), "Fixture session is missing");

  await setViewport(2048, 1024);
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await expectNoHorizontalOverflow();
  await setViewport(390, 844);
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await expectNoHorizontalOverflow();
  await click('button[aria-label="Toggle sidebar"]');
  await click('button[aria-label="Toggle sidebar"]');
  await clearViewport();
  cliLog("shell and responsive checks passed");

  await resetPage();
  await selectProfile("Fixture headless");
  const firstPrompt = "ego smoke first " + Date.now();
  await sendPrompt(firstPrompt);
  await waitForText(".chat-messages", "reply:" + firstPrompt, 15);
  await sendPrompt("ego smoke second");
  await waitForText(".chat-messages", "reply:ego smoke second", 15);
  const sessionName = firstPrompt;

  await sendPrompt("slow:ego cancel");
  await waitForExists('button[aria-label="Stop turn"]', 10);
  await click('button[aria-label="Stop turn"]');
  await waitUntil(() => exists('button[aria-label="Stop turn"]').then((value) => !value), "Stop turn remained visible", 12);

  await clickExact("Terminal", 'button,[role="radio"]');
  await waitForText(".pty-replay", "cli-raw " + firstPrompt, 12);
  await clickExact("Transcript", 'button,[role="radio"]');
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await clickSession(sessionName);
  await waitForText(".chat-messages", "reply:" + firstPrompt, 15);

  await openSessionMenu(sessionName);
  await clickExact("Archive", '[role="menuitem"]');
  await waitForExists('[role="dialog"]');
  await clickExact("Archive", "button");
  await waitUntil(() => hasText("#session-navigator", sessionName).then((value) => !value), "Archived session remained visible", 12);
  cliLog("chat-first, multi-turn, cancel, replay, reload, and archive checks passed");

  await resetPage();
  await selectProfile("Fixture PTY");
  const downgradePrompt = "ego downgrade " + Date.now();
  await sendPrompt(downgradePrompt);
  await waitForText(".feedback-notice", "terminal mode", 12);
  await waitForText("#session-navigator", downgradePrompt, 12);
  cliLog("terminal-only downgrade check passed");

  await resetPage();
  await click('button[aria-label="Open settings"]');
  await clickExact("Appearance", '[role="tab"]');
  await click('[data-theme-choice="classic"]');
  await waitUntil(() => attribute("html", "data-theme").then((value) => value === "classic"), "Classic theme was not applied");
  await gotoAndWait(BASE_URL + "/", { wait: true, timeout: 20 });
  await waitUntil(() => attribute("html", "data-theme").then((value) => value === "classic"), "Classic theme did not persist after reload");
  cliLog("theme persistence check passed");

  await clearViewport();
  cliLog("ego-browser E2E passed at " + BASE_URL);
} finally {
  if (task) await completeTaskSpace(task.id, { keep: false });
  if (!fixtureServer.killed) fixtureServer.kill("SIGTERM");
  await new Promise((resolve) => fixtureServer.once("close", resolve));
}
EOF
