import { describe, expect, it } from "vitest";

import * as exportClient from "@/lib/export-client";

describe("export review note filters", () => {
  it("supports showing only files with notes and summarizes directory note snippets", () => {
    const groups = [
      {
        directory: "ai",
        files: [
          {
            sourcePath: "ai/agents/spec-editor.md",
            targetPath: "ai/agents/spec-editor.md",
            diff: { status: "changed" as const, preview: "" },
            diffLines: [],
            decision: "needs_work" as const,
            note: "Clarify example payloads."
          },
          {
            sourcePath: "ai/agents/openapi-agent.md",
            targetPath: "ai/agents/openapi-agent.md",
            diff: { status: "new" as const, preview: "" },
            diffLines: [],
            decision: "accepted" as const
          }
        ]
      }
    ];

    const filtered = exportClient.filterExportReviewGroups(groups, "all", "all", "with_notes");

    expect(filtered).toEqual([
      {
        directory: "ai",
        files: [
          {
            sourcePath: "ai/agents/spec-editor.md",
            targetPath: "ai/agents/spec-editor.md",
            diff: { status: "changed", preview: "" },
            diffLines: [],
            decision: "needs_work",
            note: "Clarify example payloads."
          }
        ]
      }
    ]);

    const summarizeExportReviewNotes = (exportClient as Record<string, unknown>).summarizeExportReviewNotes as
      | ((group: {
          directory: string;
          files: Array<{ targetPath: string; note?: string }>;
        }) => {
          notedFileCount: number;
          noteHighlights: Array<{ targetPath: string; note: string }>;
        })
      | undefined;

    expect(typeof summarizeExportReviewNotes).toBe("function");
    expect(
      summarizeExportReviewNotes?.({
        directory: "ai",
        files: [
          { targetPath: "ai/agents/spec-editor.md", note: "Clarify example payloads." },
          { targetPath: "ai/agents/openapi-agent.md" },
          { targetPath: "ai/agents/db-migration-agent.md", note: "Call out rollback path." }
        ]
      })
    ).toEqual({
      notedFileCount: 2,
      noteHighlights: [
        {
          targetPath: "ai/agents/spec-editor.md",
          note: "Clarify example payloads."
        },
        {
          targetPath: "ai/agents/db-migration-agent.md",
          note: "Call out rollback path."
        }
      ]
    });
  });

  it("extracts markdown todo items and lightweight preview blocks from review notes", () => {
    const extractExportReviewTodos = (exportClient as Record<string, unknown>).extractExportReviewTodos as
      | ((groups: Array<{
          directory: string;
          files: Array<{ targetPath: string; note?: string }>;
        }>) => Array<{
          directory: string;
          targetPath: string;
          text: string;
          checked: boolean;
        }>)
      | undefined;
    const parseReviewNoteMarkdown = (exportClient as Record<string, unknown>).parseReviewNoteMarkdown as
      | ((note: string) => Array<{ kind: string; text: string; checked?: boolean }>)
      | undefined;

    expect(typeof extractExportReviewTodos).toBe("function");
    expect(typeof parseReviewNoteMarkdown).toBe("function");

    expect(
      extractExportReviewTodos?.([
        {
          directory: "ai",
          files: [
            {
              targetPath: "ai/agents/spec-editor.md",
              note: "# Follow-up\n- [ ] Add request example\n- [x] Align response fields"
            }
          ]
        }
      ])
    ).toEqual([
      {
        directory: "ai",
        itemIndex: 1,
        targetPath: "ai/agents/spec-editor.md",
        text: "Add request example",
        checked: false
      },
      {
        directory: "ai",
        itemIndex: 2,
        targetPath: "ai/agents/spec-editor.md",
        text: "Align response fields",
        checked: true
      }
    ]);

    expect(
      parseReviewNoteMarkdown?.("# Follow-up\n\n- bullet\n- [ ] Add request example\nParagraph")
    ).toEqual([
      { kind: "heading", text: "Follow-up" },
      { kind: "bullet", text: "bullet" },
      { kind: "todo", text: "Add request example", checked: false },
      { kind: "paragraph", text: "Paragraph" }
    ]);

    const toggleReviewNoteTodo = (exportClient as Record<string, unknown>).toggleReviewNoteTodo as
      | ((note: string, itemIndex: number, checked: boolean) => string)
      | undefined;

    expect(typeof toggleReviewNoteTodo).toBe("function");
    expect(
      toggleReviewNoteTodo?.(
        "# Follow-up\n- [ ] Add request example\n- [x] Align response fields",
        1,
        true
      )
    ).toBe("# Follow-up\n- [x] Add request example\n- [x] Align response fields");
  });

  it("builds a handoff-ready summary from note and todo content", () => {
    const buildExportHandoffSummary = (exportClient as Record<string, unknown>).buildExportHandoffSummary as
      | ((groups: Array<{
          directory: string;
          files: Array<{
            targetPath: string;
            decision?: string;
            note?: string;
          }>;
        }>) => {
          totalNotes: number;
          totalTodos: number;
          markdown: string;
        })
      | undefined;

    expect(typeof buildExportHandoffSummary).toBe("function");
    const summary = buildExportHandoffSummary?.([
      {
        directory: "ai",
        files: [
          {
            targetPath: "ai/agents/spec-editor.md",
            decision: "needs_work",
            note: "# Follow-up\n- [ ] Add request example\n- [x] Align response fields"
          },
          {
            targetPath: "ai/agents/openapi-agent.md",
            decision: "accepted",
            note: "Ready for handoff."
          }
        ]
      }
    ]);

    expect(summary?.totalNotes).toBe(2);
    expect(summary?.totalTodos).toBe(2);
    expect(summary?.markdown).toContain("## ai");
    expect(summary?.markdown).toContain("### ai/agents/spec-editor.md");
    expect(summary?.markdown).toContain("- [ ] Add request example");
    expect(summary?.markdown).toContain("Decision: accepted");
  });
});
