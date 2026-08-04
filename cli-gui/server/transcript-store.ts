import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TranscriptEvent, TranscriptEventKind, TranscriptPage } from "../shared/types.js";
import { isLegacyTranscriptEventKind, LEGACY_KIND_ALIASES, normalizeTranscriptEventKind } from "../shared/transcript.js";
import type { TranscriptRepository } from "./ports.js";

export const MAX_TRANSCRIPT_EVENT_BYTES = 64 * 1024;
export const MAX_TRANSCRIPT_OWN_BYTES = 10 * 1024 * 1024;
export const MAX_TRANSCRIPT_PAGE_BYTES = 1024 * 1024;

export interface JsonTranscriptRepositoryOptions {
  dataDirectory: string;
  readonly?: boolean;
  maxOwnBytes?: number;
}

export class TranscriptRepositoryError extends Error {
  constructor(readonly code: "TRANSCRIPT_CORRUPT" | "TRANSCRIPT_WRITE_FAILED" | "READONLY_MODE", message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TranscriptRepositoryError";
  }
}

interface ReadResult {
  events: TranscriptEvent[];
  incompleteTail: boolean;
}

const writeQueues = new Map<string, Promise<void>>();

export function createJsonTranscriptRepository({ dataDirectory, readonly = false, maxOwnBytes = MAX_TRANSCRIPT_OWN_BYTES }: JsonTranscriptRepositoryOptions): TranscriptRepository {
  const root = path.resolve(dataDirectory, "transcripts");
  const filePath = (sessionId: string) => path.join(root, `${safeSessionId(sessionId)}.jsonl`);

  async function readRecords(sessionId: string): Promise<ReadResult> {
    const target = filePath(sessionId);
    const raw = await fs.readFile(target, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    if (!raw) return { events: [], incompleteTail: false };

    const lines = raw.split("\n");
    const hasTrailingNewline = raw.endsWith("\n");
    const events: TranscriptEvent[] = [];
    let incompleteTail = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as unknown;
        validateEvent(parsed);
        events.push(parsed);
      } catch (error) {
        const isLastUnterminatedLine = index === lines.length - 1 && !hasTrailingNewline;
        if (isLastUnterminatedLine) {
          incompleteTail = true;
          break;
        }
        if (error instanceof TranscriptRepositoryError) throw error;
        throw new TranscriptRepositoryError("TRANSCRIPT_CORRUPT", "Transcript contains a malformed complete record.", { cause: error });
      }
    }
    return { events, incompleteTail };
  }

  async function writeEvents(sessionId: string, events: TranscriptEvent[]) {
    if (readonly) throw new TranscriptRepositoryError("READONLY_MODE", "Readonly mode does not write transcripts.");
    await fs.mkdir(root, { recursive: true });
    const target = filePath(sessionId);
    const temporaryPath = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, events.map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : ""), "utf8");
      await fs.rename(temporaryPath, target);
    } catch (error) {
      throw new TranscriptRepositoryError("TRANSCRIPT_WRITE_FAILED", "Transcript could not be written.", { cause: error });
    } finally {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
  }

  async function applyRetention(sessionId: string, events: TranscriptEvent[], retentionFloorSequence?: number) {
    const ownBytes = events.reduce((sum, event) => sum + event.rawBytes, 0);
    if (ownBytes <= maxOwnBytes) return events;
    const protectedEvents = retentionFloorSequence === undefined ? [] : events.filter((event) => event.sequence <= retentionFloorSequence);
    const protectedBytes = protectedEvents.reduce((sum, event) => sum + event.rawBytes, 0);
    const tail = events.filter((event) => retentionFloorSequence === undefined || event.sequence > retentionFloorSequence);
    const retainedTail: TranscriptEvent[] = [];
    let tailBytes = 0;
    const tailBudget = Math.max(0, maxOwnBytes - protectedBytes);
    for (let index = tail.length - 1; index >= 0; index -= 1) {
      const event = tail[index];
      if (tailBytes + event.rawBytes > tailBudget && retainedTail.length > 0) break;
      retainedTail.unshift(event);
      tailBytes += event.rawBytes;
    }
    const retained = [...protectedEvents, ...retainedTail];
    const retainedIds = new Set(retained.map((event) => event.id));
    const dropped = events.filter((event) => !retainedIds.has(event.id));
    if (!dropped.length) return events;
    const firstDroppedSequence = dropped[0]?.sequence ?? events.at(-1)?.sequence ?? 1;
    const marker: TranscriptEvent = {
      id: `retention-${sessionId}-${firstDroppedSequence}-${randomUUID()}`,
      sessionId,
      sequence: firstDroppedSequence,
      occurredAt: retainedTail[0]?.occurredAt ?? new Date().toISOString(),
      kind: "retention_marker",
      source: "session-manager",
      raw: "Earlier transcript events were removed by retention.",
      rawBytes: Buffer.byteLength("Earlier transcript events were removed by retention.", "utf8"),
      truncated: false,
      metadata: { retention: "own-event-limit" }
    };
    const next = [...retained, marker].sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
    await writeEvents(sessionId, next);
    return next;
  }

  return {
    async append(input) {
      if (readonly) throw new TranscriptRepositoryError("READONLY_MODE", "Readonly mode does not write transcripts.");
      if (!input.sessionId || !input.kind || !input.source) throw new TranscriptRepositoryError("TRANSCRIPT_WRITE_FAILED", "Transcript event has invalid identity.");
      if (isLegacyTranscriptEventKind(input.kind)) {
        throw new TranscriptRepositoryError("TRANSCRIPT_WRITE_FAILED", `Legacy transcript kind "${input.kind}" is read-only; write "${LEGACY_KIND_ALIASES[input.kind]}" instead.`);
      }
      const target = filePath(input.sessionId);
      const previous = writeQueues.get(target) ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(async () => {
        const records = await readRecords(input.sessionId);
        const existing = input.clientMessageId ? records.events.find((event) => event.clientMessageId === input.clientMessageId) : undefined;
        if (existing) return normalizeEvent(existing);

        const originalBytes = Buffer.byteLength(input.raw, "utf8");
        const raw = originalBytes > MAX_TRANSCRIPT_EVENT_BYTES ? truncateUtf8(input.raw, MAX_TRANSCRIPT_EVENT_BYTES) : input.raw;
        const rawBytes = Buffer.byteLength(raw, "utf8");
        const event: TranscriptEvent = {
          id: `event-${safeSessionId(input.sessionId)}-${nextSequence(records.events, input.sequenceOffset)}`,
          sessionId: input.sessionId,
          sequence: nextSequence(records.events, input.sequenceOffset),
          occurredAt: input.occurredAt,
          kind: input.kind,
          source: input.source,
          raw,
          rawBytes,
          truncated: originalBytes > rawBytes,
          metadata: input.metadata,
          component: input.component,
          clientMessageId: input.clientMessageId
        };
        if (records.incompleteTail) {
          await writeEvents(input.sessionId, [...records.events, event]);
        } else {
          await fs.mkdir(root, { recursive: true });
          await fs.appendFile(target, `${JSON.stringify(event)}\n`, "utf8");
        }
        await applyRetention(input.sessionId, [...records.events, event], input.retentionFloorSequence);
        return event;
      });
      writeQueues.set(target, next.then(() => undefined));
      return next;
    },
    async list(sessionId, options = {}): Promise<TranscriptPage> {
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      const afterSequence = Number.isFinite(options.afterSequence) ? Math.max(0, options.afterSequence ?? 0) : 0;
      const limit = Math.max(1, Math.min(options.limit ?? 200, 200));
      const matching = (await readRecords(sessionId)).events.filter((event) => event.sequence > afterSequence).map(normalizeEvent);
      const events: TranscriptEvent[] = [];
      let serializedBytes = 2;
      for (const event of matching.slice(0, limit)) {
        const eventBytes = Buffer.byteLength(JSON.stringify(event), "utf8") + (events.length ? 1 : 0);
        if (events.length > 0 && serializedBytes + eventBytes > MAX_TRANSCRIPT_PAGE_BYTES) break;
        events.push(event);
        serializedBytes += eventBytes;
      }
      const hasMore = matching.length > events.length || events.length < Math.min(limit, matching.length);
      return {
        events,
        hasMore,
        nextAfterSequence: events.at(-1)?.sequence ?? afterSequence,
        visibleStartSequence: (await readRecords(sessionId)).events[0]?.sequence ?? 1,
        retentionTruncated: (await readRecords(sessionId)).events.some((event) => event.kind === "retention_marker")
      };
    },
    async latest(sessionId) {
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      const event = (await readRecords(sessionId)).events.at(-1);
      return event ? normalizeEvent(event) : undefined;
    },
    async findByClientMessageId(sessionId, clientMessageId) {
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      const event = (await readRecords(sessionId)).events.find((candidate) => candidate.clientMessageId === clientMessageId);
      return event ? normalizeEvent(event) : undefined;
    },
    async delete(sessionId) {
      if (readonly) throw new TranscriptRepositoryError("READONLY_MODE", "Readonly mode does not delete transcripts.");
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      await fs.rm(filePath(sessionId), { force: true });
    },
    async drain() {
      await Promise.all([...writeQueues.values()]);
    }
  };
}

function nextSequence(events: TranscriptEvent[], offset = 0) {
  return Math.max(offset ?? 0, ...events.map((event) => event.sequence)) + 1;
}

/** Read-side legacy kind normalization (storage-spec §4). Disk records stay untouched. */
function normalizeEvent(event: TranscriptEvent): TranscriptEvent {
  const normalized = normalizeTranscriptEventKind(event.kind);
  return normalized === event.kind ? event : { ...event, kind: normalized as TranscriptEventKind };
}

function validateEvent(value: unknown): asserts value is TranscriptEvent {
  if (!value || typeof value !== "object") throw new Error("event is not an object");
  const event = value as Partial<TranscriptEvent>;
  if (typeof event.id !== "string" || typeof event.sessionId !== "string" || typeof event.sequence !== "number" || !Number.isInteger(event.sequence) || event.sequence < 0 || typeof event.occurredAt !== "string" || typeof event.kind !== "string" || typeof event.source !== "string" || typeof event.raw !== "string" || typeof event.rawBytes !== "number" || typeof event.truncated !== "boolean") {
    throw new Error("event has invalid fields");
  }
}

function truncateUtf8(value: string, maxBytes: number) {
  const bytes = Buffer.from(value, "utf8");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let end = Math.min(maxBytes, bytes.length);
  while (end > 0) {
    try {
      return decoder.decode(bytes.subarray(0, end));
    } catch {
      end -= 1;
    }
  }
  return "";
}

function safeSessionId(sessionId: string) {
  return sessionId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "session";
}
