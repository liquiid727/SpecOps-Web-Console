import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri expects a fixed dev port and should not clear the Vite log output.
// TAURI_ENV_* variables are injected by the Tauri CLI during desktop builds.
const host = process.env.TAURI_DEV_HOST;
const guiPort = readPort(process.env.SPECOS_GUI_PORT, 3000);
const apiPort = readPort(process.env.SPECOS_API_PORT, 3001);

export default defineConfig({
  plugins: [react()],
  // Prevent Vite from obscuring Rust compiler errors during `tauri dev`.
  clearScreen: false,
  // Expose TAURI_ENV_* to the client so PlatformAdapter can detect the desktop shell.
  envPrefix: ["VITE_", "TAURI_ENV_"],
  server: {
    port: guiPort,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host ? { protocol: "ws", host, port: apiPort } : undefined,
    // Ignore the Rust source tree so Vite does not reload on Cargo artifacts.
    watch: { ignored: ["**/src-tauri/**"] },
    proxy: {
      "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      "/ws": {
        target: `ws://127.0.0.1:${apiPort}`,
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
    // Tauri v2 targets modern webviews; align with its minimum runtime.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG)
  }
});

function readPort(value: string | undefined, fallback: number) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : fallback;
}
