import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: "npm run build && PORT=3101 npx tsx e2e/fixture-server.ts",
    url: "http://127.0.0.1:3101",
    timeout: 120_000,
    reuseExistingServer: false
  }
});
