// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createServer } from "./http-server.js";
import { sendJson } from "./api-errors.js";

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function createSecuredServer() {
  const server = createServer({
    async handleHttp(_request, response) { sendJson(response, 200, { ok: true }); },
    handleWebSocket(client) { client.close(1000, "test"); },
    close: async () => undefined
  }, {
    host: "127.0.0.1",
    port: 0,
    csrfCapability: "process-capability",
    allowedOrigins: ["http://127.0.0.1:3000"],
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    requestIdFactory: () => "request-test"
  });
  servers.push(server);
  return server;
}

function request(port: number, headers: Record<string, string>) {
  return new Promise<number>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: "/api/state", method: "GET", headers }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode ?? 0));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("loopback transport authorization", () => {
  it("requires exact Host and Origin and permits a configured read", async () => {
    const server = createSecuredServer();
    const address = await server.listen();
    expect(await request(address.port, { host: `127.0.0.1:${address.port}`, origin: "http://127.0.0.1:3000" })).toBe(200);
    expect(await request(address.port, { host: `localhost:${address.port}`, origin: "http://127.0.0.1:3000" })).toBe(403);
    expect(await request(address.port, { host: `127.0.0.1:${address.port}`, origin: "http://evil.example" })).toBe(403);
    expect(await request(address.port, { host: `127.0.0.1:${address.port}` })).toBe(200);
  });

  it("rejects mutation and WebSocket upgrades without the process capability", async () => {
    const server = createSecuredServer();
    const address = await server.listen();
    const status = await new Promise<number>((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port: address.port, path: "/api/state", method: "POST", headers: { host: `127.0.0.1:${address.port}`, origin: "http://127.0.0.1:3000" } }, (response) => { response.resume(); response.on("end", () => resolve(response.statusCode ?? 0)); });
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);

    await new Promise<void>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws?sessionId=session-1&capability=wrong`, { origin: "http://127.0.0.1:3000" });
      socket.once("error", () => resolve());
      socket.once("close", () => resolve());
    });
  });
});
