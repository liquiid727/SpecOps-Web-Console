// i18n 缺 key 走查（issue-016 / frontend-spec §7）：静态比对 t("key") 用法与 i18n 字典，EN/ZH 对称性一并校验
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "client/i18n.tsx"), "utf8");
const dictionaryKeys = [...source.matchAll(/^ {2,}([a-zA-Z][a-zA-Z0-9]*): "/gm)].map((m) => m[1]);
const half = Math.floor(dictionaryKeys.length / 2);
const en = new Set(dictionaryKeys.slice(0, half));
const zh = new Set(dictionaryKeys.slice(half));
const all = new Set(dictionaryKeys);

const used = new Set();
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|ts)$/.test(entry.name) && !entry.name.includes(".test.")) {
      const text = fs.readFileSync(full, "utf8");
      for (const match of text.matchAll(/[^a-zA-Z.]t\("([a-zA-Z][a-zA-Z0-9]*)"[,)]/g)) used.add(match[1]);
    }
  }
}
walk(path.join(root, "client"));

const missing = [...used].filter((key) => !all.has(key));
const enOnly = [...en].filter((key) => !zh.has(key));
const zhOnly = [...zh].filter((key) => !en.has(key));
console.log(`dictionary keys: ${en.size} en / ${zh.size} zh | used t() keys: ${used.size}`);
console.log(`missing from dictionary: ${JSON.stringify(missing)}`);
console.log(`en-only: ${JSON.stringify(enOnly)} | zh-only: ${JSON.stringify(zhOnly)}`);
if (missing.length > 0 || enOnly.length > 0 || zhOnly.length > 0) process.exit(1);
console.log("i18n key check passed.");
