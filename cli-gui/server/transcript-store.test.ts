// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TranscriptEvent, TranscriptEventKind } from "../shared/types.js";
import { LEGACY_KIND_ALIASES } from "../shared/transcript.js";
import { createJsonTranscriptRepository, MAX_TRANSCRIPT_EVENT_BYTES, TranscriptRepositoryError } from "./transcript-store.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

function event(raw: string, clientMessageId?: string) {
  return { sessionId: "session-1", occurredAt: "2026-01-01T00:00:00Z", kind: "user_message" as const, source: "composer" as const, raw, clientMessageId };
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

describe("canonical kind protocol", () => {
  const canonicalKinds: TranscriptEventKind[] = [
    "user_message", "assistant_message", "tool_activity", "file_change", "pty_output",
    "lifecycle", "error", "approval_request", "approval_response", "retention_marker"
  ];

  function storedEvent(sequence: number, kind: string): TranscriptEvent {
    const raw = `payload-${sequence}`;
    return {
      id: `event-session-legacy-${sequence}`, sessionId: "session-legacy", sequence, occurredAt: "2026-01-01T00:00:00Z",
      kind: kind as TranscriptEventKind, source: "composer", raw, rawBytes: Buffer.byteLength(raw, "utf8"), truncated: false,
      clientMessageId: kind === "user_input" ? `client-${sequence}` : undefined
    };
  }

  async function seedLegacyFile(dataDirectory: string, kinds: string[]) {
    const transcriptDirectory = path.join(dataDirectory, "transcripts");
    await fs.mkdir(transcriptDirectory, { recursive: true });
    const target = path.join(transcriptDirectory, "session-legacy.jsonl");
    const content = kinds.map((kind, index) => JSON.stringify(storedEvent(index + 1, kind))).join("\n") + "\n";
    await fs.writeFile(target, content, "utf8");
    return { target, content };
  }

  it("accepts every canonical kind on the write side", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-kinds-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory });
    for (const kind of canonicalKinds) {
      const saved = await repository.append({ sessionId: "session-kinds", occurredAt: "2026-01-01T00:00:00Z", kind, source: "session-manager", raw: kind });
      expect(saved.kind).toBe(kind);
    }
    const replay = await repository.list("session-kinds", { limit: 200 });
    expect(replay.events.map((item) => item.kind)).toEqual(canonicalKinds);
  });

  it("normalizes legacy kinds on every read exit while keeping disk bytes identical", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-legacy-"));
    roots.push(dataDirectory);
    const { target, content } = await seedLegacyFile(dataDirectory, ["user_input", "markdown", "permission_request", "lifecycle"]);
    const repository = createJsonTranscriptRepository({ dataDirectory });

    const page = await repository.list("session-legacy", { limit: 200 });
    expect(page.events.map((item) => item.kind)).toEqual(["user_message", "assistant_message", "approval_request", "lifecycle"]);
    expect((await repository.latest("session-legacy"))?.kind).toBe("lifecycle");
    await seedLegacyFile(dataDirectory, ["user_input"]);
    expect((await repository.latest("session-legacy"))?.kind).toBe("user_message");
    expect((await repository.findByClientMessageId?.("session-legacy", "client-1"))?.kind).toBe("user_message");

    await seedLegacyFile(dataDirectory, ["user_input", "markdown", "permission_request", "lifecycle"]);
    await repository.list("session-legacy", { limit: 200 });
    await repository.latest("session-legacy");
    expect(await fs.readFile(target, "utf8")).toBe(content);
  });

  it("rejects legacy kinds on the write side as a defect fuse", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-fuse-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory });
    for (const legacy of Object.keys(LEGACY_KIND_ALIASES)) {
      await expect(repository.append({ sessionId: "session-fuse", occurredAt: "2026-01-01T00:00:00Z", kind: legacy as TranscriptEventKind, source: "composer", raw: legacy }))
        .rejects.toMatchObject<Partial<TranscriptRepositoryError>>({ code: "TRANSCRIPT_WRITE_FAILED" });
    }
    await expect(fs.access(path.join(dataDirectory, "transcripts", "session-fuse.jsonl"))).rejects.toThrow();
  });

  it("passes unknown kinds through unchanged for forward compatibility", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-unknown-"));
    roots.push(dataDirectory);
    await seedLegacyFile(dataDirectory, ["future_kind", "user_input"]);
    const repository = createJsonTranscriptRepository({ dataDirectory });
    const page = await repository.list("session-legacy", { limit: 200 });
    expect(page.events.map((item) => item.kind)).toEqual(["future_kind", "user_message"]);
  });

  it("keeps replayed kinds identical to the freshly appended live event", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cli-gui-transcript-live-"));
    roots.push(dataDirectory);
    const repository = createJsonTranscriptRepository({ dataDirectory });
    const live = await repository.append({ sessionId: "session-live", occurredAt: "2026-01-01T00:00:00Z", kind: "assistant_message", source: "profile-adapter", raw: "answer", clientMessageId: "client-live" });
    const replayed = (await repository.list("session-live", { limit: 200 })).events;
    expect(replayed).toHaveLength(1);
    expect(replayed[0].kind).toBe(live.kind);
    expect(replayed[0].id).toBe(live.id);
    const deduplicated = await repository.append({ sessionId: "session-live", occurredAt: "2026-01-01T00:00:00Z", kind: "assistant_message", source: "profile-adapter", raw: "answer", clientMessageId: "client-live" });
    expect(deduplicated.kind).toBe(live.kind);
  });
});
