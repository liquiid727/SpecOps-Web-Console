import http from "node:http";
import { WebSocketServer } from "ws";
import type { Application, Logger } from "./ports.js";
import { ApiHttpError, sendJson, toApiError } from "./api-errors.js";

export interface ServerConfig {
  host: string;
  port: number;
  logger: Logger;
  requestIdFactory: () => string;
  allowedOrigins?: readonly string[];
  allowedHosts?: readonly string[];
  csrfCapability?: string;
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
  let boundPort: number | undefined;

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
      assertAllowedRequest(request, config, boundPort);
      assertCsrf(request, config.csrfCapability);
    } catch (error) {
      handleError(error, request, response, requestId, "/");
      return;
    }
    void application.handleHttp(request, response, url).catch((error) => handleError(error, request, response, requestId, url.pathname));
  });
  const webSockets = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

  server.on("upgrade", (request, socket, head) => {
    let url: URL;
    try {
      assertAllowedRequest(request, config, boundPort, true);
      assertCsrf(request, config.csrfCapability, true);
      url = new URL(request.url ?? "/", `http://${request.headers.host ?? config.host}`);
    } catch {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
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
          boundPort = actual.port;
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

function assertAllowedRequest(request: http.IncomingMessage, config: ServerConfig, actualPort?: number, websocket = false) {
  const host = headerValue(request.headers.host);
  const expectedPort = actualPort ?? config.port;
  if (!host || !(config.allowedHosts ?? [config.host]).some((allowedHost) => isExactHost(host, allowedHost, expectedPort))) throw new ApiHttpError(403, "ORIGIN_NOT_ALLOWED", "Request host is not allowed.");
  const origin = headerValue(request.headers.origin);
  if (config.csrfCapability && !origin && (websocket || !["GET", "HEAD", "OPTIONS"].includes(request.method ?? "GET"))) throw new ApiHttpError(403, "ORIGIN_NOT_ALLOWED", "Request origin is required.");
  if (origin) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new ApiHttpError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
    }
    const allowedOrigins = config.allowedOrigins?.length ? config.allowedOrigins : [`http://${formatHost(config.host)}:${expectedPort}`];
    if (!allowedOrigins.includes(origin)) throw new ApiHttpError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }
}

function assertCsrf(request: http.IncomingMessage, capability: string | undefined, websocket = false) {
  if (!capability) return;
  if (!websocket && ["GET", "HEAD", "OPTIONS"].includes(request.method ?? "GET")) return;
  const token = websocket
    ? new URL(request.url ?? "/", "http://localhost").searchParams.get("capability")
    : headerValue(request.headers["x-specos-csrf-capability"]);
  if (!token || token !== capability) throw new ApiHttpError(403, "ORIGIN_NOT_ALLOWED", "Request capability is not allowed.");
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isExactHost(value: string, configuredHost: string, configuredPort: number) {
  const separator = value.lastIndexOf(":");
  const rawHost = value.startsWith("[") ? value.slice(1, value.indexOf("]")) : separator > -1 ? value.slice(0, separator) : value;
  const rawPort = value.startsWith("[") ? value.slice(value.indexOf("]") + 2) : separator > -1 ? value.slice(separator + 1) : "80";
  if (!rawHost || !rawPort || !/^\d+$/.test(rawPort)) return false;
  return rawHost.toLowerCase() === configuredHost.toLowerCase() && Number(rawPort) === configuredPort;
}

function formatHost(host: string) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}
