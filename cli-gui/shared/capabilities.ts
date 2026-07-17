import type { CliAdapterId } from "./state.js";

export interface CliOptionDefinition {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  requiresRestart: boolean;
}

export interface CliProfileCapabilities {
  adapterId: CliAdapterId;
  detectedVersion?: string;
  compatibility: "supported" | "unknown-version" | "unavailable";
  permissions: CliOptionDefinition[];
  modes: CliOptionDefinition[];
  models: CliOptionDefinition[];
  supportsComposer: boolean;
  supportsStructuredRecognition: boolean;
}

export type GitFileStatus = "unmodified" | "added" | "deleted" | "modified" | "renamed" | "copied" | "untracked" | "ignored" | "conflicted";
export type WorkspaceVisibilitySource = "git" | "fallback-exclusions";

export interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  gitStatus?: GitFileStatus;
}

export interface FileTreePage {
  path: string;
  entries: FileTreeEntry[];
  nextCursor?: string;
  omittedCount: number;
  visibilitySource: WorkspaceVisibilitySource;
}

export interface FilePreview {
  path: string;
  kind: "text" | "binary" | "oversized";
  size: number;
  encoding?: "utf-8";
  content?: string;
  truncated: boolean;
  shownBytes: number;
}

export interface LanguageSummaryEntry {
  language: string;
  files: number;
  bytes: number;
  share: number;
}

export interface LanguageSummaryResponse {
  entries: LanguageSummaryEntry[];
  partial: boolean;
  partialReason?: "file-limit" | "byte-limit" | "time-limit";
  visibilitySource: WorkspaceVisibilitySource;
}

export interface GitStatusEntry {
  path: string;
  previousPath?: string;
  staged: GitFileStatus;
  unstaged: GitFileStatus;
  conflicted: boolean;
}

export interface GitStatusResponse {
  repository: boolean;
  branch?: string;
  detachedHead?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  clean: boolean;
  entries: GitStatusEntry[];
  truncated: boolean;
}

export interface DiffLine {
  kind: "context" | "addition" | "deletion" | "meta";
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath?: string;
  newPath?: string;
  status: "added" | "deleted" | "modified" | "renamed" | "binary" | "conflicted";
  hunks: DiffHunk[];
}

export interface GitDiffResponse {
  scope: "unstaged" | "staged";
  files: DiffFile[];
  truncated: boolean;
  originalBytes: number;
  shownLines: number;
}
