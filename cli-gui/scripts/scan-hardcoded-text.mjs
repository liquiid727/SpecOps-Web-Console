// 一次性排查脚本：扫描 client 下所有非测试 tsx/ts，找疑似未走 i18n 的用户可见文案
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../client", import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { if (entry !== "node_modules") walk(full); continue; }
    if (!/\.(tsx|ts)$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    if (/(i18n\.tsx|mock-client-runtime\.ts|contract-fixtures)/.test(entry)) continue;
    files.push(full);
  }
})(root);

// 非用户可见的属性名单
const IGNORE_ATTRS = new Set(["className", "id", "key", "type", "role", "rel", "href", "target", "name", "variant", "appearance", "value", "lang", "dir", "autoComplete", "loading", "wrap", "icon", "data-testid", "size", "width", "height", "viewBox", "fill", "stroke", "d", "points", "x", "y", "cx", "cy", "r", "transform", "path", "mode", "kind", "src", "as", "method", "action", "htmlFor", "form", "inputMode", "align"]);

const findings = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    // 1) JSX 文本节点：>text< 之间的非表达式文本（含字母且不止是符号/数字）
    for (const match of line.matchAll(/>([^<>{}\n]+)</g)) {
      const text = match[1].trim();
      if (!text || !/[A-Za-z\u4e00-\u9fff]{2,}/.test(text)) continue;
      findings.push({ file, line: index + 1, kind: "jsx-text", text, source: trimmed.slice(0, 160) });
    }
    // 2) 字符串属性：attr="Some words"（≥1 个含 2+ 字母的词，排除白名单属性）
    for (const match of line.matchAll(/([A-Za-z-]+)=\{?"([^"]+)"\}?/g)) {
      const [, attr, text] = match;
      if (IGNORE_ATTRS.has(attr) || attr.startsWith("data-") || attr.startsWith("aria-hidden")) continue;
      if (!/[A-Za-z\u4e00-\u9fff]{2}/.test(text)) continue;
      if (/^[a-z0-9-_:./#%()[\]]+$/.test(text)) continue; // 纯标识符/路径/token
      findings.push({ file, line: index + 1, kind: `attr:${attr}`, text, source: trimmed.slice(0, 160) });
    }
    // 3) 模板/三元里的英文短语字面量："Two words" 形式（首字母大写 + 空格）
    for (const match of line.matchAll(/"([A-Z][a-z]+(?: [A-Za-z'][a-z]*)+[.…!?]?)"/g)) {
      const text = match[1];
      findings.push({ file, line: index + 1, kind: "string-literal", text, source: trimmed.slice(0, 160) });
    }
  });
}

const seen = new Set();
for (const finding of findings) {
  const dedupe = `${finding.file}:${finding.line}:${finding.text}`;
  if (seen.has(dedupe)) continue;
  seen.add(dedupe);
  console.log(`${relative(root, finding.file)}:${finding.line} [${finding.kind}] "${finding.text}"`);
  console.log(`    ${finding.source}`);
}
console.log(`\n${seen.size} findings in ${files.length} files`);
