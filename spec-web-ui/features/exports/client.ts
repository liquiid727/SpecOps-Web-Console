import type { ExportReviewDecision, ExportReviewGroup } from "@/lib/types";

const todoPattern = /^[-*]\s+\[( |x|X)\]\s+(.*)$/;
const bulletPattern = /^[-*]\s+(.*)$/;
const headingPattern = /^(#{1,3})\s+(.*)$/;

export function filterExportReviewGroups(
  groups: ExportReviewGroup[],
  mode: "all" | "changes" | "new" | "changed" | "removed" | "synced",
  decision: "all" | ExportReviewDecision = "all",
  noteMode: "all" | "with_notes" = "all"
) {
  return groups
    .map((group) => ({
      ...group,
      files: group.files.filter((file) => {
        const matchesStatus =
          mode === "all"
            ? true
            : mode === "changes"
              ? file.diff.status !== "synced"
              : file.diff.status === mode;
        const matchesDecision =
          decision === "all" ? true : (file.decision ?? "pending") === decision;
        const matchesNote = noteMode === "with_notes" ? Boolean(file.note?.trim()) : true;

        return matchesStatus && matchesDecision && matchesNote;
      })
    }))
    .filter((group) => group.files.length > 0);
}

export function summarizeExportReviewNotes(group: ExportReviewGroup) {
  const noteHighlights = group.files
    .filter((file) => file.note?.trim())
    .map((file) => ({
      targetPath: file.targetPath,
      note: String(file.note).trim()
    }));

  return {
    notedFileCount: noteHighlights.length,
    noteHighlights
  };
}

export function buildExportHandoffSummary(groups: ExportReviewGroup[]) {
  const noteSections = groups.flatMap((group) =>
    group.files
      .filter((file) => file.note?.trim())
      .map((file) => {
        const decisionLine = `Decision: ${file.decision ?? "pending"}`;
        const noteBody = String(file.note).trim();

        return `### ${file.targetPath}\n${decisionLine}\n\n${noteBody}`;
      })
  );
  const todos = extractExportReviewTodos(groups);
  const directories = groups
    .filter((group) => group.files.some((file) => file.note?.trim()))
    .map((group) => `## ${group.directory}`)
    .join("\n\n");
  const sections = [
    "# Export Review Handoff",
    `Notes: ${noteSections.length}`,
    `Todos: ${todos.length}`,
    directories,
    noteSections.join("\n\n"),
    todos.length
      ? ["## Todo Checklist", ...todos.map((todo) => `- [${todo.checked ? "x" : " "}] ${todo.text}`)].join("\n")
      : ""
  ].filter(Boolean);

  return {
    totalNotes: noteSections.length,
    totalTodos: todos.length,
    markdown: sections.join("\n\n")
  };
}

export function parseReviewNoteMarkdown(note: string) {
  return note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const headingMatch = line.match(headingPattern);

      if (headingMatch) {
        return {
          kind: "heading" as const,
          text: headingMatch[2]
        };
      }

      const todoMatch = line.match(todoPattern);

      if (todoMatch) {
        return {
          kind: "todo" as const,
          text: todoMatch[2],
          checked: todoMatch[1].toLowerCase() === "x"
        };
      }

      const bulletMatch = line.match(bulletPattern);

      if (bulletMatch) {
        return {
          kind: "bullet" as const,
          text: bulletMatch[1]
        };
      }

      return {
        kind: "paragraph" as const,
        text: line
      };
    });
}

export function extractExportReviewTodos(groups: ExportReviewGroup[]) {
  return groups.flatMap((group) =>
    group.files.flatMap((file) =>
      parseReviewNoteMarkdown(file.note ?? "")
        .map((block, itemIndex) => ({ block, itemIndex }))
        .filter(({ block }) => block.kind === "todo")
        .map(({ block, itemIndex }) => ({
          directory: group.directory,
          itemIndex,
          targetPath: file.targetPath,
          text: block.text,
          checked: Boolean(block.checked)
        }))
    )
  );
}

export function toggleReviewNoteTodo(note: string, itemIndex: number, checked: boolean) {
  return note
    .split("\n")
    .map((line, index) => {
      if (index !== itemIndex) {
        return line;
      }

      const todoMatch = line.match(todoPattern);

      if (!todoMatch) {
        return line;
      }

      return `- [${checked ? "x" : " "}] ${todoMatch[2]}`;
    })
    .join("\n");
}
