// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJsonTranscriptRepository, MAX_TRANSCRIPT_EVENT_BYTES, TranscriptRepositoryError } from "./transcript-store.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

function event(raw: string, clientMessageId?: string) {
  return { sessionId: "session-1", occurredAt: "2026-01-01T00:00:00Z", kind: "user_input" as const, source: "composer" as const, raw, clientMessageId };
}

describe("JSON transcript repository", () => {
  it("allocates ordered events and makes composer appends idempotent", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory });
    const first = await repository.append(event("hello", "client-1"));
    const duplicate = await repository.append(event("different", "client-1"));
    const second = await repository.append(event("world", "client-2"));
    expect(first.sequence).toBe(1);
    expect(duplicate.id).toBe(first.id);
    expect(second.sequence).toBe(2);
    expect((await repository.list("session-1", { limit: 200 })).events).toHaveLength(2);
  });

  it("truncates UTF-8 payloads at the event boundary and paginates", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-size-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory, maxOwnBytes: 20 * 1024 * 1024 });
    const saved = await repository.append(event("中".repeat(MAX_TRANSCRIPT_EVENT_BYTES)));
    expect(saved.truncated).toBe(true);
    expect(saved.rawBytes).toBeLessThanOrEqual(MAX_TRANSCRIPT_EVENT_BYTES);
    expect((await repository.list("session-1", { limit: 1 })).events).toHaveLength(1);
  });

  it("recovers an incomplete tail but rejects a malformed complete record", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-corrupt-"));
    roots.push(dataDirectory);
    const transcriptDirectory = path.join(dataDirectory, "transcripts");
    await fs.mkdir(transcriptDirectory);
    const valid = JSON.stringify(await createJsonTranscriptRepository({ dataDirectory }).append(event("valid")));
    const transcriptPath = path.join(transcriptDirectory, "session-1.jsonl");
    await fs.writeFile(transcriptPath, `${valid}\n{"id":"incomplete"`, "utf8");
    const repository = createJsonTranscriptRepository({ dataDirectory });
    expect((await repository.list("session-1")).events).toHaveLength(1);
    await fs.writeFile(transcriptPath, `${valid}\nnot-json\n`, "utf8");
    await expect(repository.list("session-1")).rejects.toMatchObject<TranscriptRepositoryError>({ code: "TRANSCRIPT_CORRUPT" });
  });

  it("writes a retention marker and does not create files in readonly mode", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-retention-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory, maxOwnBytes: 100 });
    await repository.append(event("a".repeat(80)));
    await repository.append(event("b".repeat(80)));
    const page = await repository.list("session-1");
    expect(page.retentionTruncated).toBe(true);
    expect(page.events.some((item) => item.kind === "retention_marker")).toBe(true);

    const readonlyDirectory = path.join(dataDirectory, "readonly");
    const readonly = createJsonTranscriptRepository({ dataDirectory: readonlyDirectory, readonly: true });
    await expect(readonly.append(event("blocked"))).rejects.toMatchObject<TranscriptRepositoryError>({ code: "READONLY_MODE" });
    await expect(fs.access(readonlyDirectory)).rejects.toThrow();
  });

  it("preserves a forked parent prefix while retaining newer events", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-fork-retention-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory, maxOwnBytes: 100 });
    for (let index = 0; index < 4; index += 1) {
      await repository.append({ sessionId: "parent", occurredAt: `2026-01-01T00:00:0${index}Z`, kind: "cli_output", source: "pty", raw: "x".repeat(40), retentionFloorSequence: 2 });
    }
    const page = await repository.list("parent", { limit: 20 });
    expect(page.events.filter((item) => item.sequence === 1 || item.sequence === 2)).toHaveLength(2);
    expect(page.events.some((item) => item.kind === "retention_marker")).toBe(true);
    expect(page.events.some((item) => item.raw === "x".repeat(40) && item.sequence === 4)).toBe(true);
  });
});
