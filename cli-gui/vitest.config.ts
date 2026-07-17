import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/test/setup.ts"],
    include: ["server/**/*.test.ts", "client/**/*.test.tsx"]
  }
});
