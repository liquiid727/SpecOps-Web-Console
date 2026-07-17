import http from "node:http";
import { WebSocketServer } from "ws";
import type { Application, Logger } from "./ports.js";
import { sendJson, toApiError } from "./api-errors.js";

export interface ServerConfig {
  host: string;
  port: number;
  logger: Logger;
  requestIdFactory: () => string;
}

export interface ServerHandle {
  listen(): Promise<{ host: string; port: number }>;
  close(): Promise<void>;
}

export function createServer(application: Application, config: ServerConfig): ServerHandle {
  let address: { host: string; port: number } | undefined;
  let listenPromise: Promise<{ host: string; port: number }> | undefined;
  let closePromise: Promise<void> | undefined;
  let closed = false;

  const handleError = (error: unknown, request: http.IncomingMessage, response: http.ServerResponse, requestId: string, pathname: string) => {
    const mapped = toApiError(error, requestId);
    const context = { requestId, method: request.method ?? "GET", pathname, status: mapped.status, code: mapped.response.error.code, error: String(mapped.cause) };
    if (mapped.status >= 500) config.logger.error("API request failed", context);
    else config.logger.warn("API request rejected", context);
    if (response.headersSent) {
      response.destroy(mapped.cause instanceof Error ? mapped.cause : undefined);
      return;
    }
    sendJson(response, mapped.status, mapped.response);
  };

  const server = http.createServer((request, response) => {
    const requestId = config.requestIdFactory();
    response.setHeader("x-request-id", requestId);
    let url: URL;
    try {
      url = new URL(request.url ?? "/", `http://${request.headers.host ?? config.host}`);
    } catch (error) {
      handleError(error, request, response, requestId, "/");
      return;
    }
    void application.handleHttp(request, response, url).catch((error) => handleError(error, request, response, requestId, url.pathname));
  });
  const webSockets = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? config.host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (client) => application.handleWebSocket(client, request, url));
  });

  return {
    listen() {
      if (closed) return Promise.reject(new Error("server is closed"));
      if (address) return Promise.resolve(address);
      if (listenPromise) return listenPromise;
      listenPromise = new Promise((resolve, reject) => {
        const onError = (error: Error) => {
          server.off("error", onError);
          listenPromise = undefined;
          reject(error);
        };
        server.once("error", onError);
        server.listen(config.port, config.host, () => {
          server.off("error", onError);
          const actual = server.address();
          if (!actual || typeof actual === "string") return reject(new Error("server did not expose a TCP address"));
          address = { host: config.host, port: actual.port };
          resolve(address);
        });
      });
      return listenPromise;
    },
    close() {
      if (closePromise) return closePromise;
      closed = true;
      closePromise = (async () => {
        if (listenPromise && !address) {
          try {
            await listenPromise;
          } catch {
            // A failed bind leaves no transport to close.
          }
        }
        for (const client of webSockets.clients) client.terminate();
        const transportClose = server.listening
          ? new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
          : Promise.resolve();
        const webSocketClose = new Promise<void>((resolve) => webSockets.close(() => resolve()));
        await Promise.all([application.close(), transportClose, webSocketClose]);
      })();
      return closePromise;
    }
  };
}
