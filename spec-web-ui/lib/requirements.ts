import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import { repoRoot } from "@/lib/server-paths";
import type { RequirementDocument, RequirementDocumentData, RequirementFileState, RequirementGateStatus, RequirementPackageDetail, RequirementPackageSummary, RequirementSpecDetail, RequirementSpecSummary, RequirementStatus, RequirementType } from "@/lib/types";

const packageRoot = path.join(repoRoot, ".requirements", "requirements");
const packageIdPattern = /^R\d{3,}-[a-z0-9][a-z0-9-]*$/;
const specIdPattern = /^S\d{2,}-[a-z0-9][a-z0-9-]*$/;
const specDocuments = ["spec", "test", "review", "issues"] as const;
type SpecDocument = (typeof specDocuments)[number];

function metadata(source: string): Record<string, unknown> {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return {};
  const parsed = parseYaml(match[1]);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}
function value(data: Record<string, unknown>, key: string) { return typeof data[key] === "string" ? (data[key] as string).trim() : ""; }
function title(source: string, fallback: string) { return value(metadata(source), "title") || source.match(/^#\s+[^\n—-]+[—-]\s*(.+)$/m)?.[1]?.trim() || source.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback; }
function status(raw: string): RequirementStatus { return ["draft", "review", "approved", "implementing", "done", "example"].includes(raw) ? raw as RequirementStatus : "draft"; }
function type(raw: string): RequirementType { return ["feature", "change", "bug", "refactor"].includes(raw) ? raw as RequirementType : "feature"; }
function countIds(source: string, prefix: string) { return new Set(source.match(new RegExp(`${prefix}-[A-Z0-9-]+`, "g")) ?? []).size; }
function issueCounts(sources: string[]) { const blocks = sources.flatMap((source) => source.split(/^##\s+ISSUE-[^\n]+$/m).slice(1)); return { total: blocks.length, done: blocks.filter((block) => /^Status:\s*(DONE|done)\s*$/im.test(block)).length }; }
function state(document: RequirementDocument, source?: string): RequirementFileState { if (!source) return { present: false, ids: 0 }; return { present: true, status: value(metadata(source), "status") || undefined, ids: countIds(source, document === "prd" ? "REQ" : document === "issues" ? "ISSUE" : document.toUpperCase()) }; }
function fileData(document: RequirementDocument, entry: { path: string; source: string }): RequirementDocumentData { return { document, path: entry.path, source: entry.source, metadata: metadata(entry.source) }; }
function gate(source: string | undefined, expected = "approved"): RequirementGateStatus { if (!source) return "block"; const actual = value(metadata(source), "status"); return actual === expected || ((actual === "implementing" || actual === "done") && expected === "approved") ? "pass" : "warn"; }

export function parseRequirementPackage(input: { id: string; slug?: string; index: { path: string; source: string }; prd: { path: string; source: string }; acceptance?: { path: string; source: string }; specs: RequirementSpecSummary[]; issueSources?: string[] }): RequirementPackageDetail {
  const prdMeta = metadata(input.prd.source);
  const files = { prd: state("prd", input.prd.source), acceptance: state("acceptance", input.acceptance?.source), spec: state("spec"), test: state("test"), review: state("review"), issues: state("issues") } as Record<RequirementDocument, RequirementFileState>;
  const counts = issueCounts(input.issueSources ?? []);
  const warnings: string[] = [];
  if (!input.index.source) warnings.push("缺少 index.yaml");
  if (!input.prd.source) warnings.push("缺少 prd.md");
  if (!input.acceptance?.source) warnings.push("缺少 acceptance.md");
  if (!input.specs.length) warnings.push("缺少 specs/SNN-* 子规格");
  return { id: input.id, slug: input.slug ?? input.id.replace(/^R\d{3,}-/, ""), title: value(prdMeta, "title") || title(input.prd.source, input.id), type: type(value(prdMeta, "type")), status: status(value(prdMeta, "status")), priority: value(prdMeta, "priority") || undefined, updatedAt: value(prdMeta, "updated_at") || undefined, files, issueCounts: counts, gates: { package: warnings.length ? "block" : "pass", prd: gate(input.prd.source), spec: input.specs.length ? "pass" : "block", test: input.specs.every((spec) => spec.documents.test.present) ? "pass" : "warn", feature: counts.total > 0 && counts.done === counts.total ? "pass" : "warn" }, warnings, specCount: input.specs.length, index: fileData("acceptance", input.index), documents: { prd: fileData("prd", input.prd), ...(input.acceptance ? { acceptance: fileData("acceptance", input.acceptance) } : {}) }, specs: input.specs };
}

async function readText(filePath: string) { try { return { path: path.relative(repoRoot, filePath), source: await fs.readFile(filePath, "utf8") }; } catch { return null; } }
async function readSpecSummary(packageId: string, directory: string, entry: string): Promise<RequirementSpecSummary | null> {
  if (!specIdPattern.test(entry)) return null;
  const specRoot = path.join(directory, "specs", entry);
  const spec = await readText(path.join(specRoot, "spec.md"));
  if (!spec) return null;
  const meta = metadata(spec.source);
  const docs = Object.fromEntries(await Promise.all(specDocuments.map(async (doc) => [doc, state(doc, (await readText(path.join(specRoot, `${doc}.md`)))?.source)]))) as RequirementSpecSummary["documents"];
  return { id: entry, slug: entry.replace(/^S\d{2,}-/, ""), title: value(meta, "title") || title(spec.source, entry), status: value(meta, "status") || "draft", path: spec.path, documents: docs };
}
async function readPackageDirectory(entry: string) {
  const directory = path.join(packageRoot, entry);
  const index = await readText(path.join(directory, "index.yaml"));
  const prd = await readText(path.join(directory, "prd.md"));
  const acceptance = await readText(path.join(directory, "acceptance.md"));
  let specEntries: string[] = [];
  try { specEntries = await fs.readdir(path.join(directory, "specs")); } catch { /* surfaced as an incomplete package */ }
  const specs = (await Promise.all(specEntries.map((candidate) => readSpecSummary(entry, directory, candidate)))).filter(Boolean) as RequirementSpecSummary[];
  return parseRequirementPackage({ id: entry, index: index ?? { path: path.relative(repoRoot, path.join(directory, "index.yaml")), source: "" }, prd: prd ?? { path: path.relative(repoRoot, path.join(directory, "prd.md")), source: "" }, acceptance: acceptance ?? undefined, specs, issueSources: [] });
}
export async function listRequirementPackages(): Promise<RequirementPackageSummary[]> { try { const entries = await fs.readdir(packageRoot, { withFileTypes: true }); return (await Promise.all(entries.filter((entry) => entry.isDirectory() && packageIdPattern.test(entry.name)).map((entry) => readPackageDirectory(entry.name)))).sort((a, b) => a.id.localeCompare(b.id)); } catch { return []; } }
export async function loadRequirementPackage(requirementId: string) { if (!packageIdPattern.test(requirementId)) return null; try { return (await fs.stat(path.join(packageRoot, requirementId))).isDirectory() ? readPackageDirectory(requirementId) : null; } catch { return null; } }
export async function loadRequirementSpec(requirementId: string, specId: string): Promise<RequirementSpecDetail | null> { if (!packageIdPattern.test(requirementId) || !specIdPattern.test(specId)) return null; const root = path.join(packageRoot, requirementId, "specs", specId); const spec = await readText(path.join(root, "spec.md")); if (!spec) return null; const summary = await readSpecSummary(requirementId, path.join(packageRoot, requirementId), specId); if (!summary) return null; const sources = Object.fromEntries(await Promise.all(specDocuments.filter((doc) => doc !== "spec").map(async (doc) => { const data = await readText(path.join(root, `${doc}.md`)); return [doc, data ? fileData(doc, data) : undefined]; }))) as RequirementSpecDetail["sources"]; let evidence: string[] = []; try { evidence = await fs.readdir(path.join(root, "evidence")); } catch { /* optional evidence */ } return { ...summary, requirementId, sources: { spec: fileData("spec", spec), ...sources }, evidence }; }
export function getRequirementDocumentLabel(document: RequirementDocument) { return { prd: "PRD", acceptance: "Acceptance", spec: "Spec", test: "Spec-Test", review: "Review", issues: "Issues" }[document]; }
