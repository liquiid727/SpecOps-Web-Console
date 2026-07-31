import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ClientRuntimeProvider,
  MockClientRuntime,
  useClientRuntime,
  type EnginePort,
  type EventPort,
  type SessionPort,
  type TerminalPort,
  type WorkspacePort
} from "./client-runtime";

function RuntimeProbe() {
  return <span>{useClientRuntime().kind}</span>;
}

function fakeRuntime() {
  return new MockClientRuntime({
    engines: {} as EnginePort,
    sessions: {} as SessionPort,
    events: {} as EventPort,
    terminal: {} as TerminalPort,
    workspace: {} as WorkspacePort
  });
}

function componentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? componentFiles(path) : entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("ClientRuntime", () => {
  it("provides a deterministic fake runtime to feature components", () => {
    const markup = renderToStaticMarkup(
      <ClientRuntimeProvider runtime={fakeRuntime()}>
        <RuntimeProbe />
      </ClientRuntimeProvider>
    );

    expect(markup).toContain("mock");
  });

  it("keeps direct API imports outside feature components", () => {
    const componentsDirectory = resolve(process.cwd(), "client/components");
    const directTransportImports = componentFiles(componentsDirectory).filter((file) => {
      const source = readFileSync(file, "utf8");
      return [
        /from\s+["'][^"']*\/api["']/,
        /\bfetch\(/,
        /\bnew\s+WebSocket/,
        /\bwindow\.location/,
        /@tauri\//,
        /\binvoke\(/
      ].some((pattern) => pattern.test(source));
    });

    expect(directTransportImports).toEqual([]);
  });
});
