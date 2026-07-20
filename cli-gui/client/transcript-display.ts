import type { TranscriptEvent } from "../shared/types";

export interface TranscriptDisplayItem {
  id: string;
  event: TranscriptEvent;
  content: string;
  raw: string;
  truncated: boolean;
}

/**
 * Build the readable session projection without changing the raw transcript.
 * PTY chunks are transport data, so adjacent chunks are joined before escape
 * sequences are removed. This also handles an ANSI sequence split at a chunk
 * boundary.
 */
export function projectTranscriptEvents(events: TranscriptEvent[]): TranscriptDisplayItem[] {
  const projected: TranscriptDisplayItem[] = [];
  let ptyGroup: TranscriptEvent[] = [];

  function flushPtyGroup() {
    if (!ptyGroup.length) return;
    const raw = ptyGroup.map((event) => event.raw).join("");
    const content = sanitizePtyOutput(raw);
    if (content) {
      const first = ptyGroup[0];
      projected.push({ id: first.id, event: first, content, raw, truncated: ptyGroup.some((event) => event.truncated) });
    }
    ptyGroup = [];
  }

  for (const event of events) {
    if (event.kind === "pty_output") {
      ptyGroup.push(event);
      continue;
    }
    flushPtyGroup();
    projected.push({ id: event.id, event, content: event.raw, raw: event.raw, truncated: event.truncated });
  }
  flushPtyGroup();
  return projected;
}

export function sanitizePtyOutput(value: string) {
  const withoutEscapeSequences = value
    .replace(/\u001b\](?:[\s\S]*?)(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b(?:[ -/]*[@-~]|.)/g, "")
    .replace(/\u001b/g, "");

  const normalized = normalizeCarriageReturns(withoutEscapeSequences)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u0080-\u009f]/g, "")
    .replace(/\n{3,}/g, "\n\n");

  return normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function normalizeCarriageReturns(value: string) {
  let result = "";
  let line = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\r") {
      if (value[index + 1] !== "\n") line = "";
      continue;
    }
    if (character === "\n") {
      result += `${line}\n`;
      line = "";
      continue;
    }
    if (character === "\b") {
      line = line.slice(0, -1);
      continue;
    }
    line += character;
  }
  return result + line;
}
