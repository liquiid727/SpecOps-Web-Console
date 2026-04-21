"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  saveExportReviewNoteAction,
  setExportReviewDecisionAction,
  toggleExportReviewTodoAction
} from "@/app/actions";
import {
  buildExportHandoffSummary,
  extractExportReviewTodos,
  filterExportReviewGroups,
  parseReviewNoteMarkdown,
  summarizeExportReviewNotes
} from "@/lib/export-client";
import { buildShellCommandTitle } from "@/lib/shell";
import type { ExportReviewDecision, ExportReviewGroup, ExportTreeNode } from "@/lib/types";

function toAnchorId(path: string) {
  return path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ExportTree({
  nodes
}: {
  nodes: ExportTreeNode[];
}) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.path}>
          <div className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-slate-400">
            {node.file ? (
              <a href={`#${toAnchorId(node.path)}`} className="font-medium text-slate-200 hover:text-ink">
                {node.name}
              </a>
            ) : (
              <span className="font-semibold text-ink">{node.name}/</span>
            )}
          </div>
          {node.children?.length ? (
            <div className="ml-4 mt-2 border-l border-line pl-3">
              <ExportTree nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function NoteMarkdownPreview({
  note,
  compact = false
}: {
  note: string;
  compact?: boolean;
}) {
  const blocks = parseReviewNoteMarkdown(note);

  if (!blocks.length) {
    return null;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p key={`${block.kind}-${index}`} className="text-sm font-semibold text-ink">
              {block.text}
            </p>
          );
        }

        if (block.kind === "bullet") {
          return (
            <p key={`${block.kind}-${index}`} className="text-sm leading-6 text-slate-300">
              - {block.text}
            </p>
          );
        }

        if (block.kind === "todo") {
          return (
            <p key={`${block.kind}-${index}`} className="text-sm leading-6 text-slate-300">
              {block.checked ? "[x]" : "[ ]"} {block.text}
            </p>
          );
        }

        return (
          <p key={`${block.kind}-${index}`} className="text-sm leading-6 text-slate-300">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

const statusFilters = ["all", "changes", "new", "changed", "removed", "synced"] as const;
const decisionFilters = ["all", "pending", "accepted", "needs_work", "blocked"] as const;
const noteFilters = ["all", "with_notes"] as const;

const decisionCopy: Record<ExportReviewDecision, { label: string; tone: string }> = {
  accepted: {
    label: "accepted",
    tone: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
  },
  blocked: {
    label: "blocked",
    tone: "border border-rose-500/40 bg-rose-500/10 text-rose-300"
  },
  needs_work: {
    label: "needs work",
    tone: "border border-amber-500/40 bg-amber-500/10 text-amber-300"
  },
  pending: {
    label: "pending",
    tone: "border border-line bg-sand text-slate-300"
  }
};

export function ExportReviewClient({
  projectId,
  reviewGroups,
  exportTree,
  manifestPreview
}: {
  projectId: string;
  reviewGroups: ExportReviewGroup[];
  exportTree: ExportTreeNode[];
  manifestPreview: {
    status: string;
    lines: Array<{ kind: string; content: string }>;
  };
}) {
  const storageKey = `spec-web-ui:exports:${projectId}:review`;
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [decisionFilter, setDecisionFilter] = useState<(typeof decisionFilters)[number]>("all");
  const [noteFilter, setNoteFilter] = useState<(typeof noteFilters)[number]>("all");
  const [collapsedDirectories, setCollapsedDirectories] = useState<string[]>([]);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      reviewGroups.flatMap((group) => group.files.map((file) => [file.targetPath, file.note ?? ""]))
    )
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        statusFilter?: (typeof statusFilters)[number];
        decisionFilter?: (typeof decisionFilters)[number];
        noteFilter?: (typeof noteFilters)[number];
        collapsedDirectories?: string[];
      };

      if (saved.statusFilter && statusFilters.includes(saved.statusFilter)) {
        setStatusFilter(saved.statusFilter);
      }

      if (saved.decisionFilter && decisionFilters.includes(saved.decisionFilter)) {
        setDecisionFilter(saved.decisionFilter);
      }

      if (saved.noteFilter && noteFilters.includes(saved.noteFilter)) {
        setNoteFilter(saved.noteFilter);
      }

      if (saved.collapsedDirectories) {
        setCollapsedDirectories(saved.collapsedDirectories);
      }
    } catch {
      // Ignore corrupted local UI state and fall back to defaults.
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ statusFilter, decisionFilter, noteFilter, collapsedDirectories })
    );
  }, [collapsedDirectories, decisionFilter, noteFilter, statusFilter, storageKey]);

  const filteredGroups = useMemo(
    () => filterExportReviewGroups(reviewGroups, statusFilter, decisionFilter, noteFilter),
    [decisionFilter, noteFilter, reviewGroups, statusFilter]
  );
  const todoItems = useMemo(() => extractExportReviewTodos(filteredGroups), [filteredGroups]);
  const handoffSummary = useMemo(() => buildExportHandoffSummary(reviewGroups), [reviewGroups]);

  const toggleDirectory = (directory: string) => {
    setCollapsedDirectories((current) =>
      current.includes(directory)
        ? current.filter((entry) => entry !== directory)
        : [...current, directory].sort((left, right) => left.localeCompare(right))
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("ls", "review.controls/")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={
                  statusFilter === filter
                    ? "rounded-md border border-accent bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-accent-strong"
                    : "rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400 hover:bg-sand"
                }
              >
                {filter}
              </button>
            ))}
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
            {buildShellCommandTitle("ls", "review-state/")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {decisionFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDecisionFilter(filter)}
                className={
                  decisionFilter === filter
                    ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-emerald-300"
                    : "rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400 hover:bg-sand"
                }
              >
                {filter === "needs_work" ? "needs work" : filter}
              </button>
            ))}
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
            {buildShellCommandTitle("ls", "notes/")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {noteFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setNoteFilter(filter)}
                className={
                  noteFilter === filter
                    ? "rounded-md border border-accent bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-accent-strong"
                    : "rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400 hover:bg-sand"
                }
              >
                {filter === "with_notes" ? "with notes" : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("tree", "bundle/")}
          </p>
          <div className="mt-4">
            <ExportTree nodes={exportTree} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("cat", "todos.md")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-slate-400">
              {todoItems.filter((item) => !item.checked).length} open
            </span>
            <span className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-slate-400">
              {todoItems.filter((item) => item.checked).length} done
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {todoItems.length ? (
              todoItems.map((item) => (
                <div
                  key={`${item.targetPath}-${item.itemIndex}-${item.text}`}
                  className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <a href={`#${toAnchorId(item.targetPath)}`} className="block flex-1">
                      <p className="font-mono text-xs font-semibold text-ink">{item.targetPath}</p>
                      <p className="mt-1 leading-6">
                        {item.checked ? "[x]" : "[ ]"} {item.text}
                      </p>
                    </a>
                    <form action={toggleExportReviewTodoAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                      <input type="hidden" name="targetPath" value={item.targetPath} />
                      <input type="hidden" name="itemIndex" value={String(item.itemIndex)} />
                      <input type="hidden" name="checked" value={String(!item.checked)} />
                      <button
                        type="submit"
                        className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                      >
                        {item.checked ? "Reopen" : "Done"}
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No todo items parsed from the visible notes.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                {buildShellCommandTitle("cat", "handoff.md")}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {handoffSummary.totalNotes} notes, {handoffSummary.totalTodos} todos ready to share.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(handoffSummary.markdown);
                setCopiedSummary(true);
                window.setTimeout(() => setCopiedSummary(false), 1600);
              }}
              className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
            >
              {copiedSummary ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            readOnly
            value={handoffSummary.markdown}
            rows={16}
            className="mt-4 w-full rounded-xl border border-line bg-canvas px-4 py-4 font-mono text-xs leading-6 text-slate-300 outline-none"
          />
        </div>
      </div>

      <div className="space-y-6">
        {filteredGroups.map((group) => {
          const collapsed = collapsedDirectories.includes(group.directory);
          const groupTargetPaths = group.files.map((file) => file.targetPath);
          const noteSummary = summarizeExportReviewNotes(group);

          return (
            <div
              key={group.directory}
              className="rounded-2xl border border-line bg-panel p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
                    {buildShellCommandTitle("ls", `${group.directory}/`)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{group.directory}/</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-line px-3 py-1 font-mono text-[11px] text-slate-400">
                    {group.files.length} files
                  </span>
                  {noteSummary.notedFileCount ? (
                    <span className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent-strong">
                      {noteSummary.notedFileCount} notes
                    </span>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {(["accepted", "needs_work", "blocked"] as const).map((decision) => (
                      <form key={decision} action={setExportReviewDecisionAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                        {groupTargetPaths.map((targetPath) => (
                          <input key={targetPath} type="hidden" name="targetPath" value={targetPath} />
                        ))}
                        <button
                          type="submit"
                          name="decision"
                          value={decision}
                          className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                        >
                          Mark {decision === "needs_work" ? "needs work" : decision}
                        </button>
                      </form>
                    ))}
                    <form action={setExportReviewDecisionAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                      {groupTargetPaths.map((targetPath) => (
                        <input key={targetPath} type="hidden" name="targetPath" value={targetPath} />
                      ))}
                      <button
                        type="submit"
                        name="decision"
                        value="pending"
                        className="rounded-md border border-line px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 hover:bg-sand"
                      >
                        Reset
                      </button>
                    </form>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDirectory(group.directory)}
                    className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                  >
                    {collapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>

              {!collapsed ? (
                <div className="mt-4 space-y-4">
                  {noteSummary.notedFileCount ? (
                    <div className="rounded-xl border border-line bg-canvas p-4">
                      <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                        {buildShellCommandTitle("cat", `${group.directory}.notes`)}
                      </p>
                      <div className="mt-3 space-y-3">
                        {noteSummary.noteHighlights.map((highlight) => (
                          <a
                            key={highlight.targetPath}
                            href={`#${toAnchorId(highlight.targetPath)}`}
                            className="block rounded-xl border border-line bg-panel px-4 py-3 text-sm text-slate-300"
                          >
                            <p className="font-mono text-xs font-semibold text-ink">{highlight.targetPath}</p>
                            <div className="mt-2">
                              <NoteMarkdownPreview note={highlight.note} compact />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {group.files.map((file) => (
                    <details
                      key={`${file.sourcePath}-${file.targetPath}`}
                      id={toAnchorId(file.targetPath)}
                      open={file.diff.status !== "synced"}
                      className="rounded-xl border border-line bg-canvas p-4"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-semibold text-ink">{file.targetPath}</p>
                            <p className="mt-1 text-sm text-slate-500">Source: {file.sourcePath}</p>
                          </div>
                          <span
                            className={
                              file.diff.status === "new"
                                ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                                : file.diff.status === "changed"
                                  ? "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                                  : file.diff.status === "removed"
                                    ? "rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300"
                                    : "rounded-md border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong"
                            }
                          >
                            {file.diff.status}
                          </span>
                          <span
                            className={`rounded-md px-3 py-1 text-xs font-medium ${decisionCopy[file.decision ?? "pending"].tone}`}
                          >
                            {decisionCopy[file.decision ?? "pending"].label}
                          </span>
                          {file.note?.trim() ? (
                            <span className="rounded-md border border-line px-3 py-1 text-xs font-medium text-slate-400">
                              note
                            </span>
                          ) : null}
                        </div>
                      </summary>
                      {file.owners?.length ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {file.owners.map((owner) => (
                            <Link
                              key={owner.id}
                              href={`/discover/${owner.id}?projectId=${projectId}`}
                              className="rounded-md border border-line px-3 py-1 text-xs font-medium text-slate-300 hover:bg-sand"
                            >
                              Asset: {owner.title}
                            </Link>
                          ))}
                          <Link
                            href={`/projects/${projectId}/draft`}
                            className="rounded-md border border-line px-3 py-1 text-xs font-medium text-slate-300 hover:bg-sand"
                          >
                            Continue in Draft
                          </Link>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(["accepted", "needs_work", "blocked"] as const).map((decision) => (
                          <form key={decision} action={setExportReviewDecisionAction}>
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                            <input type="hidden" name="targetPath" value={file.targetPath} />
                            <button
                              type="submit"
                              name="decision"
                              value={decision}
                              className={
                                file.decision === decision
                                  ? "rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent-strong"
                                  : "rounded-md border border-line px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                              }
                            >
                              {decision === "needs_work" ? "Needs work" : decision}
                            </button>
                          </form>
                        ))}
                        <form action={setExportReviewDecisionAction}>
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                          <input type="hidden" name="targetPath" value={file.targetPath} />
                          <button
                            type="submit"
                            name="decision"
                            value="pending"
                            className="rounded-md border border-line px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 hover:bg-sand"
                          >
                            Reset
                          </button>
                        </form>
                      </div>
                      <form action={saveExportReviewNoteAction} className="mt-4 space-y-3">
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="redirectTo" value={`/projects/${projectId}/exports`} />
                        <input type="hidden" name="targetPath" value={file.targetPath} />
                        <label className="block space-y-2">
                          <span className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                            {buildShellCommandTitle("cat", "review-note.md")}
                          </span>
                          <textarea
                            name="note"
                            value={noteDrafts[file.targetPath] ?? ""}
                            onChange={(event) =>
                              setNoteDrafts((current) => ({
                                ...current,
                                [file.targetPath]: event.target.value
                              }))
                            }
                            rows={3}
                            placeholder={"Use markdown. Example:\n# Follow-up\n- [ ] Add request example"}
                            className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                          />
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            {file.noteUpdatedAt
                              ? `Saved ${new Date(file.noteUpdatedAt).toLocaleString()}`
                              : "No review note saved yet."}
                          </p>
                          <button
                            type="submit"
                            className="rounded-md border border-line px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-300 hover:bg-sand"
                          >
                            Save note
                          </button>
                        </div>
                      </form>
                      {(noteDrafts[file.targetPath] ?? "").trim() ? (
                        <div className="mt-4 rounded-xl border border-line bg-panel p-4">
                          <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500">
                            {buildShellCommandTitle("preview", "markdown")}
                          </p>
                          <div className="mt-3">
                            <NoteMarkdownPreview note={noteDrafts[file.targetPath] ?? ""} />
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-[#09090b]">
                        <div className="overflow-x-auto">
                          <div className="min-w-full text-sm leading-7 text-slate-100">
                            {file.diffLines.map((line, index) => (
                              <div
                                key={`${file.targetPath}-${index}`}
                                className={
                                  line.kind === "add"
                                    ? "bg-emerald-500/15 px-5 py-0.5 text-emerald-100"
                                    : line.kind === "remove"
                                      ? "bg-rose-500/15 px-5 py-0.5 text-rose-100"
                                      : line.kind === "meta"
                                        ? "bg-slate-900 px-5 py-0.5 text-slate-400"
                                        : line.kind === "hunk"
                                          ? "bg-sky-500/10 px-5 py-0.5 text-sky-100"
                                          : "px-5 py-0.5 text-slate-100"
                                }
                              >
                                <span className="font-mono">{line.content || " "}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="rounded-2xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">
            {buildShellCommandTitle("diff", "project-manifest.yaml")}
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-[#09090b]">
            {manifestPreview.lines.map((line, index) => (
              <div
                key={`manifest-${index}`}
                className={
                  line.kind === "add"
                    ? "bg-emerald-500/15 px-5 py-0.5 text-emerald-100"
                    : line.kind === "remove"
                      ? "bg-rose-500/15 px-5 py-0.5 text-rose-100"
                      : line.kind === "meta"
                        ? "bg-slate-900 px-5 py-0.5 text-slate-400"
                        : line.kind === "hunk"
                          ? "bg-sky-500/10 px-5 py-0.5 text-sky-100"
                          : "px-5 py-0.5 text-slate-100"
                }
              >
                <span className="font-mono text-sm leading-7">{line.content || " "}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
