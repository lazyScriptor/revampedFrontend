#!/usr/bin/env node
// i18n-check — static consistency checks for the translation system.
//
//   node scripts/i18n-check.mjs            report problems (exit 1 if any errors)
//   node scripts/i18n-check.mjs --prune    also delete keys nothing references
//   node scripts/i18n-check.mjs --prune --keep=old-en.json   …but never delete keys present in that file
//
// Errors  : key used in code but missing from en.json • {{placeholder}} the string
//           needs but the call does not pass • si.json missing a key or changing
//           placeholders / <tags> • si.json identical to en (untranslated)
// Warnings: values passed that the string never uses • keys nothing references
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const LOC = path.join(SRC, "i18n/locales");
const PRUNE = process.argv.includes("--prune");
const KEEP_ARG = (process.argv.find((a) => a.startsWith("--keep=")) || "").slice(7);
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(LOC, f), "utf8"));
const flat = (o, p = "", a = {}) => { for (const k of Object.keys(o)) { const v = o[k]; const key = p ? `${p}.${k}` : k; if (v && typeof v === "object") flat(v, key, a); else a[key] = v; } return a; };
const en = flat(readJson("en.json"));
const si = fs.existsSync(path.join(LOC, "si.json")) ? flat(readJson("si.json")) : {};

const PLURAL = /_(zero|one|two|few|many|other)$/;
const baseOf = (k) => k.replace(PLURAL, "");
const variantsOf = (key) => Object.keys(en).filter((k) => k === key || (baseOf(k) === key && PLURAL.test(k)));
const placeholders = (s) => new Set([...String(s).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((m) => m[1]));
const tags = (s) => [...String(s).matchAll(/<\/?([a-zA-Z][\w]*)\s*\/?>/g)].map((m) => m[0]).sort().join("");

const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!["__tests__", "test", "node_modules", "locales"].includes(e.name)) walk(p, o); } else if (/\.tsx?$/.test(p) && !p.endsWith(".d.ts")) o.push(p); } return o; };

const used = new Set();            // every key string referenced anywhere
const calls = [];                  // {file,line,keys[],provided:Set|null}
const errors = [];
const warns = [];

const strings = (e) => { // string literals reachable as the *value* of an expression (handles ternaries)
  const out = [];
  const go = (x) => {
    if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) out.push(x.text);
    else if (ts.isConditionalExpression(x)) { go(x.whenTrue); go(x.whenFalse); }
    else if (ts.isParenthesizedExpression(x) || ts.isAsExpression(x)) go(x.expression);
    else if (ts.isBinaryExpression(x)) { go(x.left); go(x.right); }
  };
  go(e);
  return out;
};
const objKeys = (o) => (o && ts.isObjectLiteralExpression(o) ? new Set(o.properties.map((p) => (ts.isShorthandPropertyAssignment(p) ? p.name.text : p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null)).filter(Boolean)) : null);

for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file);
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const name = n.expression.getText(sf);
      if ((name === "t" || name === "i18n.t") && n.arguments[0]) {
        const keys = strings(n.arguments[0]);
        keys.forEach((k) => used.add(k));
        const opts = n.arguments[1] && !ts.isStringLiteral(n.arguments[1]) ? n.arguments[1] : null;
        calls.push({ rel, line: line(n), keys, provided: objKeys(opts), hasSpread: opts && ts.isObjectLiteralExpression(opts) && opts.properties.some(ts.isSpreadAssignment), dynamic: keys.length === 0 });
      } else if (name === "tk" && n.arguments[0]) strings(n.arguments[0]).forEach((k) => used.add(k));
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "Trans") {
      const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
      const ik = attrs.find((a) => a.name.getText(sf) === "i18nKey");
      const vals = attrs.find((a) => a.name.getText(sf) === "values");
      if (ik?.initializer && ts.isStringLiteral(ik.initializer)) {
        used.add(ik.initializer.text);
        const obj = vals?.initializer && ts.isJsxExpression(vals.initializer) ? vals.initializer.expression : null;
        calls.push({ rel, line: line(n), keys: [ik.initializer.text], provided: objKeys(obj) || new Set(), trans: true });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// 1+2. keys exist, placeholders match
for (const c of calls) {
  for (const k of c.keys) {
    const vs = variantsOf(k);
    if (!vs.length) { errors.push(`${c.rel}:${c.line}  missing key "${k}"`); continue; }
    if (c.provided === null && !c.dynamic) { // t("key") with no values
      const need = new Set(vs.flatMap((v) => [...placeholders(en[v])]));
      if (need.size) errors.push(`${c.rel}:${c.line}  "${k}" needs {{${[...need].join("}}, {{")}}} but call passes no values`);
      continue;
    }
    if (c.provided && !c.hasSpread) {
      const need = new Set(vs.flatMap((v) => [...placeholders(en[v])]));
      if (vs.some((v) => PLURAL.test(v))) need.add("count");
      const have = c.provided;
      const miss = [...need].filter((p) => !have.has(p) && !(p === "count" && have.has("count")));
      const realMiss = miss.filter((p) => !(p === "count" && !vs.some((v) => placeholders(en[v]).has("count")) && true));
      if (realMiss.length) errors.push(`${c.rel}:${c.line}  "${k}" needs {{${realMiss.join("}}, {{")}}} — not passed`);
      const extra = [...have].filter((p) => !need.has(p) && p !== "lng" && p !== "defaultValue" && p !== "count" && p !== "context" && p !== "ns" && !c.trans);
      if (extra.length) warns.push(`${c.rel}:${c.line}  "${k}" passes unused value(s): ${extra.join(", ")}`);
    }
  }
}

// 3. si parity
if (Object.keys(si).length) {
  const ALLOW_SAME = /^(common\.appName|login\.brand|.*\.(brand|appName))$/;
  for (const k of Object.keys(en)) {
    if (!(k in si)) { errors.push(`si.json missing "${k}"`); continue; }
    const a = [...placeholders(en[k])].sort().join(","), b = [...placeholders(si[k])].sort().join(",");
    if (a !== b) errors.push(`si.json "${k}" placeholders differ  en:{${a}} si:{${b}}`);
    if (tags(en[k]) !== tags(si[k])) errors.push(`si.json "${k}" markup tags differ  en:${tags(en[k])} si:${tags(si[k])}`);
    if (si[k] === en[k] && /[A-Za-z]{3,}/.test(en[k].replace(/\{\{[^}]+\}\}|<[^>]+>/g, "")) && !ALLOW_SAME.test(k)) warns.push(`si.json "${k}" is identical to English`);
  }
  for (const k of Object.keys(si)) if (!(k in en)) warns.push(`si.json has extra key "${k}" (not in en.json)`);
}

// 4. unused keys
const keep = KEEP_ARG ? flat(JSON.parse(fs.readFileSync(KEEP_ARG, "utf8"))) : {};
const unused = Object.keys(en).filter((k) => !used.has(baseOf(k)) && !used.has(k) && !(k in keep));
const dynPrefixes = [...used].filter((k) => k.endsWith(".")); // none today
if (unused.length) warns.push(`${unused.length} key(s) in en.json are not referenced by any t()/tk()/<Trans>`);
if (PRUNE && unused.length) {
  for (const f of ["en.json", "si.json"]) {
    const fp = path.join(LOC, f);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    const obj = JSON.parse(raw);
    const ind = raw.match(/\n( +)"/)[1].length;
    for (const k of unused) { const p = k.split("."); let o = obj; for (let i = 0; i < p.length - 1 && o; i++) o = o[p[i]]; if (o) delete o[p.at(-1)]; }
    const prune = (o) => { for (const k of Object.keys(o)) if (o[k] && typeof o[k] === "object") { prune(o[k]); if (!Object.keys(o[k]).length) delete o[k]; } };
    prune(obj);
    fs.writeFileSync(fp, JSON.stringify(obj, null, ind) + "\n");
  }
  console.log(`pruned ${unused.length} unused keys`);
}

errors.forEach((e) => console.log("ERROR  " + e));
if (process.argv.includes("--verbose")) warns.forEach((w) => console.log("warn   " + w));
console.log(`\n${Object.keys(en).length} en keys · ${Object.keys(si).length} si keys · ${calls.length} t() calls checked · ${errors.length} errors · ${warns.length} warnings`);
if (unused.length && !PRUNE) console.log(`   (run with --prune to remove ${unused.length} unreferenced keys)`);
process.exit(errors.length ? 1 : 0);
