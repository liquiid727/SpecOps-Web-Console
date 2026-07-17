import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pty from "node-pty";
import type { ApplicationDependencies, Clock, Logger, PtyProcess, PtyRuntime } from "./ports.js";
import { createJsonStateRepository } from "./store.js";

const clock: Clock = { now: () => new Date().toISOString() };

export function createProductionDependencies(options: {
  dataDirectory: string;
  readonly: boolean;
  processEnvironment: Readonly<Record<string, string | undefined>>;
}): ApplicationDependencies {
  return {
    stateRepository: createJsonStateRepository({ dataDirectory: options.dataDirectory, clock }),
    transcriptRepository: { async drain() {} },
    ptyRuntime: createNodePtyRuntime(),
    filesystem: {
      stat: (target) => fs.stat(target),
      access: (target) => fs.access(target),
      readFile: (target) => fs.readFile(target)
    },
    gitInspector: { available: false },
    directoryPicker: { available: false },
    profileAdapters: { availableAdapterIds: ["generic"] },
    clock,
    idGenerator: { create: (prefix) => `${prefix}-${randomUUID()}` },
    policy: { readonly: options.readonly, processEnvironment: { ...options.processEnvironment } },
    logger: createConsoleLogger()
  };
}

function createNodePtyRuntime(): PtyRuntime {
  const active = new Set<pty.IPty>();
  return {
    spawn(options): PtyProcess {
      const process = pty.spawn(options.command, options.args, {
        name: options.name,
        cols: options.cols,
        rows: options.rows,
        cwd: options.cwd,
        env: options.env
      });
      active.add(process);
      process.onExit(() => active.delete(process));
      return process;
    },
    async shutdown() {
      const processes = [...active];
      const failures: unknown[] = [];
      for (const process of processes) {
        try {
          process.kill();
          active.delete(process);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) throw new AggregateError(failures, "Failed to stop active PTYs");
    }
  };
}

function createConsoleLogger(): Logger {
  return {
    info: (message, context) => console.log(message, context ?? ""),
    warn: (message, context) => console.warn(message, context ?? ""),
    error: (message, context) => console.error(message, context ?? "")
  };
}
