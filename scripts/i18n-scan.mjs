// Scans src/**/*.tsx with the TypeScript AST and reports user-visible English
// string literals that are not routed through t(). Read-only.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const ATTRS = new Set(["label","placeholder","title","helperText","aria-label","alt","description","headerName","primary","secondary","tooltip","subtitle","text","message","emptyMessage","noRowsLabel"]);
const looksEnglish = (s) => /[A-Za-z]{2,}/.test(s) && !/^[a-z]+([A-Z][a-z]+)+$/.test(s) && !/^[\w./:#%-]+$/.test(s.replace(/ /g,"_")) === false || /\s/.test(s) && /[A-Za-z]{3,}/.test(s);

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["__tests__","test","node_modules"].includes(e.name)) walk(p, out); }
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
};

const report = [];
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const usesT = /useTranslation|i18n\.t\(/.test(src);
  const found = [];
  const visit = (n) => {
    if (ts.isJsxText(n)) {
      const t = n.getText().replace(/\s+/g, " ").trim();
      if (t && /[A-Za-z]{2,}/.test(t)) found.push(["jsx", t]);
    } else if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText())) {
      const t = n.initializer.text.trim();
      if (/[A-Za-z]{2,}/.test(t) && /\s|^[A-Z]/.test(t)) found.push(["attr:" + n.name.getText(), t]);
    } else if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText())) {
      const t = n.initializer.text.trim();
      if (/[A-Za-z]{2,}/.test(t) && /\s|^[A-Z]/.test(t)) found.push(["prop:" + n.name.getText(), t]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (found.length) report.push({ file: path.relative(ROOT, file), usesT, count: found.length, found });
}
report.sort((a, b) => b.count - a.count);
const total = report.reduce((s, r) => s + r.count, 0);
const uniq = new Set(report.flatMap((r) => r.found.map((f) => f[1])));
console.log(`files with hardcoded English: ${report.length}  | literals: ${total}  | unique strings: ${uniq.size}`);
console.log(`  of which files already using t(): ${report.filter((r) => r.usesT).length} (partially translated)`);
const byDir = {};
for (const r of report) { const d = r.file.split("/").slice(0, 2).join("/"); byDir[d] = (byDir[d] || 0) + r.count; }
console.log("by area:"); Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([d, c]) => console.log("  " + String(c).padStart(4), d));
if (process.argv[2] === "--json") fs.writeFileSync(process.argv[3] || "/tmp/i18n-scan.json", JSON.stringify(report, null, 1));
