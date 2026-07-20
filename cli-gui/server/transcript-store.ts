import fs from "node:fs/promises";
import path from "node:path";
import type { TranscriptEvent, TranscriptPage } from "../shared/types.js";
import type { TranscriptRepository } from "./ports.js";

export interface JsonTranscriptRepositoryOptions {
  dataDirectory: string;
}

const writeQueues = new Map<string, Promise<void>>();

export function createJsonTranscriptRepository({ dataDirectory }: JsonTranscriptRepositoryOptions): TranscriptRepository {
  const root = path.resolve(dataDirectory, "transcripts");

  const filePath = (sessionId: string) => path.join(root, `${safeSessionId(sessionId)}.jsonl`);

  async function readEvents(sessionId: string) {
    const target = filePath(sessionId);
    const raw = await fs.readFile(target, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as TranscriptEvent);
  }

  return {
    async append(input) {
      const target = filePath(input.sessionId);
      const previous = writeQueues.get(target) ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(async () => {
        await fs.mkdir(root, { recursive: true });
        const events = await readEvents(input.sessionId);
        const rawBytes = Buffer.byteLength(input.raw, "utf8");
        const event: TranscriptEvent = {
          id: `event-${input.sessionId}-${events.length + 1}`,
          sessionId: input.sessionId,
          sequence: events.length + 1,
          occurredAt: input.occurredAt,
          kind: input.kind,
          source: input.source,
          raw: input.raw,
          rawBytes,
          truncated: false,
          metadata: input.metadata,
          clientMessageId: input.clientMessageId
        };
        await fs.appendFile(target, `${JSON.stringify(event)}\n`, "utf8");
        return event;
      });
      writeQueues.set(target, next.then(() => undefined));
      return next;
    },
    async list(sessionId, options = {}): Promise<TranscriptPage> {
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      const afterSequence = options.afterSequence ?? 0;
      const limit = Math.max(1, Math.min(options.limit ?? 200, 500));
      const matching = (await readEvents(sessionId)).filter((event) => event.sequence > afterSequence);
      const events = matching.slice(0, limit);
      return {
        events,
        hasMore: matching.length > events.length,
        nextAfterSequence: events.at(-1)?.sequence ?? afterSequence,
        visibleStartSequence: 1,
        retentionTruncated: false
      };
    },
    async latest(sessionId) {
      await (writeQueues.get(filePath(sessionId)) ?? Promise.resolve());
      return (await readEvents(sessionId)).at(-1);
    },
    async delete(sessionId) {
      await fs.rm(filePath(sessionId), { force: true });
    },
    async drain() {
      await Promise.all([...writeQueues.values()]);
    }
  };
}

function safeSessionId(sessionId: string) {
  return sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
}
