import fs from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { repoRoot } from "@/lib/server-paths";
import type {
  RequirementDocument,
  RequirementDocumentData,
  RequirementFileState,
  RequirementGateStatus,
  RequirementPackageDetail,
  RequirementPackageSummary,
  RequirementStatus,
  RequirementType
} from "@/lib/types";

const packageRoot = path.join(repoRoot, ".requirements", "requirements");
const documents: RequirementDocument[] = ["prd", "spec", "test", "issues"];
const packageIdPattern = /^(R\d{3,})-([a-z0-9][a-z0-9-]*)$/;

function parseFrontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return {};

  const parsed = parseYaml(match[1]);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function firstHeading(source: string) {
  return source.match(/^#\s+(?:PRD|Spec(?:-Test)?|Issues)\s*[—-]?\s*(.+)$/im)?.[1]?.trim();
}

function stringValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: string): RequirementStatus {
  return ["draft", "review", "approved", "implementing", "done", "example"].includes(value)
    ? (value as RequirementStatus)
    : "draft";
}

function normalizeType(value: string): RequirementType {
  return ["feature", "change", "bug", "refactor"].includes(value)
    ? (value as RequirementType)
    : "feature";
}

function countIds(source: string, prefix: string) {
  return new Set(source.match(new RegExp(`${prefix}-[A-Z0-9-]+`, "g")) ?? []).size;
}

function issueCounts(source: string) {
  const blocks = source.split(/^##\s+ISSUE-[^\n]+$/m).slice(1);
  const done = blocks.filter((block) => /^Status:\s*DONE\s*$/im.test(block) || /^Status:\s*done\s*$/im.test(block)).length;
  return { total: blocks.length, done };
}

function gateFor(status: string | undefined, expected: string): RequirementGateStatus {
  if (!status) return "block";
  if (status === expected) return "pass";
  if ((status === "implementing" || status === "done") && expected === "approved") return "pass";
  return "warn";
}

function buildFileState(document: RequirementDocument, source: string | undefined): RequirementFileState {
  if (!source) return { present: false, ids: 0 };
  const prefix = document === "prd" ? "REQ" : document === "spec" ? "SPEC" : document === "test" ? "TEST" : "ISSUE";
  const metadata = parseFrontmatter(source);
  return {
    present: true,
    status: stringValue(metadata, "status") || undefined,
    ids: countIds(source, prefix)
  };
}

function packageSlug(id: string) {
  const match = id.match(packageIdPattern);
  return match?.[2] ?? id;
}

export function parseRequirementPackage(input: {
  id: string;
  slug?: string;
  documents: Partial<Record<RequirementDocument, { path: string; source: string }>>;
}): RequirementPackageDetail {
  const metadata = parseFrontmatter(input.documents.prd?.source ?? "");
  const id = input.id;
  const slug = input.slug ?? packageSlug(input.id);
  const title = stringValue(metadata, "title") || firstHeading(input.documents.prd?.source ?? "") || input.id;
  const status = normalizeStatus(stringValue(metadata, "status"));
  const type = normalizeType(stringValue(metadata, "type"));
  const files = Object.fromEntries(
    documents.map((document) => [document, buildFileState(document, input.documents[document]?.source)])
  ) as Record<RequirementDocument, RequirementFileState>;
  const issuesSource = input.documents.issues?.source;
  const counts = issueCounts(issuesSource ?? "");
  const warnings: string[] = [];

  if (!files.prd.present) warnings.push("缺少 prd.md");
  if (!files.spec.present) warnings.push("缺少 spec.md");
  if (!files.test.present) warnings.push("缺少 test.md");
  if (!files.issues.present) warnings.push("缺少 issues.md");

  const packageGate: RequirementGateStatus = warnings.length ? "block" : "pass";
  const featureGate: RequirementGateStatus = !files.issues.present
    ? "block"
    : counts.total > 0 && counts.done === counts.total && status === "done"
      ? "pass"
      : "warn";

  return {
    id,
    slug,
    title,
    type,
    status,
    priority: stringValue(metadata, "priority") || undefined,
    updatedAt: stringValue(metadata, "updated_at") || undefined,
    files,
    issueCounts: counts,
    gates: {
      package: packageGate,
      prd: gateFor(files.prd.status, "approved"),
      spec: gateFor(files.spec.status, "approved"),
      test: gateFor(files.test.status, "approved"),
      feature: featureGate
    },
    warnings,
    documents: Object.fromEntries(
      documents
        .filter((document) => input.documents[document])
        .map((document) => [
          document,
          {
            document,
            path: input.documents[document]?.path ?? "",
            source: input.documents[document]?.source ?? "",
            metadata: parseFrontmatter(input.documents[document]?.source ?? "")
          } satisfies RequirementDocumentData
        ])
    ) as Partial<Record<RequirementDocument, RequirementDocumentData>>
  };
}

async function readPackageDirectory(entry: string) {
  const directory = path.join(packageRoot, entry);
  const packageDocuments: Partial<Record<RequirementDocument, { path: string; source: string }>> = {};

  for (const document of documents) {
    const filePath = path.join(directory, `${document}.md`);
    try {
      packageDocuments[document] = {
        path: path.relative(repoRoot, filePath),
        source: await fs.readFile(filePath, "utf8")
      };
    } catch {
      // Incomplete packages are surfaced as blocked summaries instead of failing the whole list.
    }
  }

  const match = entry.match(packageIdPattern);
  return parseRequirementPackage({ id: entry, slug: match?.[2], documents: packageDocuments });
}

export async function listRequirementPackages(): Promise<RequirementPackageSummary[]> {
  try {
    const entries = await fs.readdir(packageRoot, { withFileTypes: true });
    const packages = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && packageIdPattern.test(entry.name))
        .map((entry) => readPackageDirectory(entry.name))
    );
    return packages.sort((left, right) => left.id.localeCompare(right.id));
  } catch {
    return [];
  }
}

export async function loadRequirementPackage(requirementId: string): Promise<RequirementPackageDetail | null> {
  if (!packageIdPattern.test(requirementId)) return null;
  try {
    const entries = await fs.readdir(packageRoot, { withFileTypes: true });
    const entry = entries.find((candidate) => candidate.isDirectory() && candidate.name === requirementId);
    return entry ? readPackageDirectory(entry.name) : null;
  } catch {
    return null;
  }
}

export function getRequirementDocumentLabel(document: RequirementDocument) {
  return { prd: "PRD", spec: "Spec", test: "Spec-Test", issues: "Issues" }[document];
}
