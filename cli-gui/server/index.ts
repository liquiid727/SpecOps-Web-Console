import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createApplication } from "./application.js";
import { createServer } from "./http-server.js";
import { sanitizeCliEnvironment } from "./profile-adapters.js";
import { createProductionDependencies } from "./production.js";

export async function main() {
  const host = "127.0.0.1";
  const port = Number(process.env.PORT ?? 3001);
  const guiPort = readPort(process.env.SPECOS_GUI_PORT, 3000);
  const dependencies = createProductionDependencies({
    dataDirectory: path.resolve(process.env.SPECOS_DATA_DIRECTORY ?? path.resolve(process.cwd(), "data")),
    readonly: process.env.SPECOS_RUNTIME_MODE === "readonly",
    // 剔除 npm run 注入的 node_modules/.bin PATH 项，避免陈旧本地包遮蔽全局 CLI
    processEnvironment: sanitizeCliEnvironment(process.env)
  });
  const application = await createApplication(dependencies);
  const server = createServer(application, {
    host,
    port,
    logger: dependencies.logger,
    requestIdFactory: () => dependencies.idGenerator.create("request"),
    allowedHosts: [host, "localhost"],
    csrfCapability: dependencies.policy.csrfCapability,
    allowedOrigins: [
      `http://${host}:${port}`,
      `http://localhost:${port}`,
      `http://${host}:${guiPort}`,
      `http://localhost:${guiPort}`
    ]
  });
  const address = await server.listen();
  dependencies.logger.info(`Product AI OS listening on http://${address.host}:${address.port}`);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await server.close();
    } catch (error) {
      dependencies.logger.error("Product AI OS shutdown failed", { error: String(error) });
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export function isDirectExecution(moduleUrl: string, argvEntry: string | undefined) {
  if (!argvEntry) return false;
  return moduleUrl === pathToFileURL(path.resolve(argvEntry)).href;
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export const modulePath = fileURLToPath(import.meta.url);

function readPort(value: string | undefined, fallback: number) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : fallback;
}
