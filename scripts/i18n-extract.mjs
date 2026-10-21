#!/usr/bin/env node
// i18n-extract — wraps hardcoded English UI text in t() and registers the keys.
//
//   node scripts/i18n-extract.mjs                 dry run (report only)
//   node scripts/i18n-extract.mjs --write         rewrite files + add keys to en.json
//   node scripts/i18n-extract.mjs --write --only=features/customers
//   node scripts/i18n-extract.mjs --report=out.json   dump the manual-review list
//
// What it converts (only when it is provably safe):
//   • JSX text children            <Button>Save</Button>
//   • string attributes            label="Name"  placeholder="Search…"  title=…
//   • object props                 { headerName: "Client", label: "Active" }
// What it refuses and reports instead:
//   • text mixed with {expressions}/inline markup (needs {{interpolation}})
//   • strings outside a component/hook (module-level constants)
//   • places where `t` is shadowed (e.g. items.map(t => …))
//
// After converting it also: adds `const { t } = useTranslation()` to the owning
// component, imports useTranslation, and appends `t` to useMemo/useCallback
// dependency arrays so labels re-render when the language changes.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const EN_FILE = path.join(SRC, "i18n/locales/en.json");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ONLY = args.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const MIXED = args.includes("--mixed"); // convert text+{value} runs to interpolated keys
const EXPR = args.includes("--expr"); // strings in toasts, ternaries, || fallbacks, template literals
const MODULE_LEVEL = args.includes("--module-level"); // convert module constants to tk("key")
const REPORT = (args.find((a) => a.startsWith("--report=")) || "").slice(9);

const ATTRS = new Set([
  "label", "placeholder", "title", "helperText", "aria-label", "alt", "description",
  "subtitle", "tooltip", "text", "emptyMessage", "noRowsLabel", "headerName", "primary",
  "secondary", "caption", "heading", "hint", "subheader", "emptyTitle", "emptyDescription",
  "noOptionsText", "loadingText", "confirmLabel", "cancelLabel", "buttonLabel",
  "eyebrow", "mobileLabel", "sublabel", "overline", "kicker",
]);
const PROPS = new Set([
  "label", "headerName", "title", "text", "subtitle", "message", "description",
  "placeholder", "helperText", "tooltip", "caption", "heading", "primary", "secondary",
  "emptyMessage", "hint",
]);
const SKIP_TOKENS = new Set(["LKR", "Rs", "Rs.", "PDF", "CSV", "XLSX", "QR", "NIC", "GearGrid", "SMS", "API", "URL", "JSON", "USD", "ID", "N/A", "GearGrid Print Agent"]);
const NEVER = new Set(["English", "සිංහල (Sinhala)", "தமிழ் (Tamil)", "Français", "Español", "Deutsch"]);
const NEVER_RE = /\((ISO|DMY|MDY)\)|^\d{4}-\d\d|^\d\d\/\d\d|^\d{1,2} [A-Z][a-z]{2} \d{4}$/;
// calls whose string arguments are shown to the user
const UI_CALL = /^(show(Toast|Success|Error|Warning|Info|Message|Snackbar)?|toast(\.\w+)?|enqueueSnackbar|notify|alert|confirm|set\w*?(Error|Err|Message|Msg|Notice|Notification|Snack\w*|Feedback|StatusText|StatusMessage|Toast|Warning|Info))$/;
// attributes that must never be translated even in expression mode
const IGNORE_ATTR = new Set(["className","sx","style","key","id","name","type","variant","color","size","severity","href","src","to","component","role","target","rel","value","field","testid","data-testid","autoComplete","inputMode","icon","tone","status","kind","mode","align","scope","as","tag","format","pattern","accept","lang","dir","method","path","width","height","display","fontFamily"]);
const SKIP_ELEMENTS = new Set(["style", "script", "code", "pre"]);

const enRaw = fs.readFileSync(EN_FILE, "utf8");
const en = JSON.parse(enRaw);
const INDENT = (enRaw.match(/\n( +)"/) || [, "  "])[1].length; // preserve the file's own indent
const flat = (o, p = "", a = {}) => {
  for (const k of Object.keys(o)) {
    const v = o[k];
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flat(v, key, a);
    else a[key] = v;
  }
  return a;
};
const byValue = new Map();
for (const [k, v] of Object.entries(flat(en))) {
  if (typeof v !== "string") continue;
  const cur = byValue.get(v);
  if (!cur || (k.startsWith("common.") && !cur.startsWith("common."))) byValue.set(v, k);
}
const newKeys = {}; // key -> text (added this run)
const usedKeys = new Set(Object.keys(flat(en)));

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", hellip: "…", mdash: "—", ndash: "–", bull: "•", copy: "©", rarr: "→", larr: "←", times: "×" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g) => {
    if (g[0] === "#") return String.fromCodePoint(g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10));
    return entities[g.toLowerCase()] ?? m;
  });

const camel = (s) => {
  const words = s.replace(/\{\{[^}]*\}\}/g, " ").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return "text";
  const out = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
  return out.slice(0, 40) || "text";
};
const areaOf = (rel) => {
  const parts = rel.split("/");
  const toCamel = (x) => x.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (parts[0] === "features") return toCamel(parts[1]);
  if (parts[0] === "routes") return "pages";
  if (parts[0] === "components") return "shared";
  return "app";
};
const keyFor = (text, rel) => {
  const existing = byValue.get(text);
  if (existing) return existing;
  const base = `${areaOf(rel)}.${path.basename(rel).replace(/\.\w+$/, "")}.${camel(text)}`;
  let key = base;
  let n = 2;
  while (usedKeys.has(key) && flatText(key) !== text) key = `${base}${n++}`;
  usedKeys.add(key);
  newKeys[key] = text;
  byValue.set(text, key);
  return key;
};
const flatText = (k) => newKeys[k];

const looksTranslatable = (text, strict) => {
  if (/[\u0D80-\u0DFF]/.test(text)) return false; // Sinhala copy is handled by hand (needs t(key, { lng }))
  if (!/[A-Za-z]{2,}/.test(text)) return false;
  if (/^INV-?$/.test(text.trim())) return false;
  if (!/[A-Za-z]{3,}/.test(text.replace(/\{\{[^}]*\}\}/g, " ").replace(/\b(INV|EXP|PAY|Rs|LKR)\b\.?-?/g, " ").replace(/\b\d*mm\b|\b\d+d\b/g, " "))) return false;
  if (/^[\s+\-−–—·•]*(Rs\.?|LKR)\s*$/.test(text)) return false; // sign + currency prefix is formatting, not copy
  if (SKIP_TOKENS.has(text.trim()) || NEVER.has(text.trim()) || NEVER_RE.test(text.trim())) return false;
  if (/^[A-Z0-9_]+$/.test(text) && !/\s/.test(text)) return false; // ENUM_CONSTANTS
  if (strict && !(/\s/.test(text) || /^[A-Z]/.test(text))) return false; // identifiers
  if (/^(https?:|\/|#|\.|[a-z]+:\/\/)/.test(text)) return false;
  if (/^[DMYHhmsSAaZ:\/\-., ]+$/.test(text.trim())) return false; // dayjs/Intl format tokens
  if (/^[\w.-]+\/[\w./-]+$/.test(text.trim())) return false; // Asia/Colombo, text/csv
  return true;
};

const isFn = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n);
const fnName = (fn) => {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
  if (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) return "default";
  let p = fn.parent;
  while (p && (ts.isCallExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p))) p = p.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isExportAssignment(p)) return "default";
  return null;
};
const isOwnerFn = (fn) => {
  const n = fnName(fn);
  return !!n && (/^[A-Z]/.test(n) || /^use[A-Z]/.test(n) || n === "default");
};
const findOwner = (node) => {
  for (let p = node.parent; p; p = p.parent) if (isFn(p) && isOwnerFn(p)) return p;
  return null;
};
const bindingHasT = (name) => {
  if (ts.isIdentifier(name)) return name.text === "t";
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
    return name.elements.some((el) => !ts.isOmittedExpression(el) && bindingHasT(el.name));
  return false;
};
const isHookDecl = (d) => d.initializer && ts.isCallExpression(d.initializer) && ts.isIdentifier(d.initializer.expression) && d.initializer.expression.text === "useTranslation";
const declsOf = (stmts) => stmts.filter(ts.isVariableStatement).flatMap((s) => [...s.declarationList.declarations]);
const shadowsT = (p, owner) => {
  if (isFn(p)) {
    if (p.parameters.some((x) => bindingHasT(x.name))) return true;
    if (p.body && ts.isBlock(p.body) && declsOf(p.body.statements).some((d) => !isHookDecl(d) && bindingHasT(d.name))) return true;
  } else if (ts.isBlock(p) && p.parent && !isFn(p.parent)) {
    if (declsOf(p.statements).some((d) => !isHookDecl(d) && bindingHasT(d.name))) return true;
  } else if (ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isForStatement(p)) {
    const init = p.initializer;
    if (init && ts.isVariableDeclarationList(init) && init.declarations.some((d) => bindingHasT(d.name))) return true;
  } else if (ts.isCatchClause(p)) {
    if (p.variableDeclaration && bindingHasT(p.variableDeclaration.name)) return true;
  }
  return false;
};
const conflicts = (node, owner) => {
  for (let p = node.parent; p; p = p.parent) {
    if (shadowsT(p, owner)) return true;
    if (p === owner) break;
  }
  return false;
};
const ownerHasHook = (owner) =>
  owner.body && ts.isBlock(owner.body) && declsOf(owner.body.statements).some((d) => isHookDecl(d) && bindingHasT(d.name));

const inFunction = (node) => {
  for (let p = node.parent; p; p = p.parent) if (isFn(p)) return true;
  return false;
};
const walkDir = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!["__tests__", "test", "node_modules"].includes(e.name)) walkDir(p, out);
    } else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
};

const manual = [];
const stats = { files: 0, converted: 0, manual: 0 };

const processFile = (file) => {
  const rel = path.relative(SRC, file);
  if (rel === "App.tsx") return; // unused Vite scaffold, not a real screen
  if (ONLY.length && !ONLY.some((o) => rel.startsWith(o))) return;
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const owners = new Set();
  let needsMarker = false;
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const flag = (pos, kind, t, reason) => manual.push({ file: rel, line: lineOf(pos), kind, text: t, reason });

  const accept = (node, str, replaceStart, replaceEnd, wrap) => {
    const owner = findOwner(node);
    if (!owner && MODULE_LEVEL && !inFunction(node)) {
      edits.push({ start: replaceStart, end: replaceEnd, text: `tk("${keyFor(str, rel)}")` });
      needsMarker = true;
      stats.converted++;
      return;
    }
    if (!owner) return flag(node.pos, "module-level", str, "outside component/hook");
    if (conflicts(node, owner)) return flag(node.pos, "shadow", str, "`t` is shadowed in this scope");
    const key = keyFor(str, rel);
    edits.push({ start: replaceStart, end: replaceEnd, text: wrap(key) });
    doneStarts.add(replaceStart);
    owners.add(owner);
    stats.converted++;
  };

  // ── Mixed text + {values} → one interpolated key: "{{count}} items" ───────
  const handled = new Set();
  const jsxTextValue = (raw) => {
    const lines = raw.split(/\r?\n/);
    let out = "";
    lines.forEach((line, i) => {
      let l = line.replace(/\t/g, " ");
      if (i !== 0) l = l.replace(/^ +/, "");
      if (i !== lines.length - 1) l = l.replace(/ +$/, "");
      if (l) out += l + (i !== lines.length - 1 ? " " : "");
    });
    return decode(out);
  };
  const unwrap = (e) => {
    while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
    return e;
  };
  const unsafeExpr = (e) => {
    let bad = false;
    const walk = (x) => {
      if (ts.isConditionalExpression(x) || ts.isTemplateExpression(x) || ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x) || isFn(x)) bad = true;
      if (ts.isBinaryExpression(x) && (x.operatorToken.kind === ts.SyntaxKind.BarBarToken || x.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) {
        for (const side of [x.left, x.right]) if (ts.isStringLiteral(side) && /[A-Za-z]{3,}/.test(side.text)) bad = true;
      }
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === "t") bad = true; // already translated piece
      ts.forEachChild(x, walk);
    };
    walk(e);
    return bad;
  };
  const placeholderName = (e) => {
    e = unwrap(e);
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && /^(toLocaleString|toFixed|toUpperCase|toLowerCase|toString)$/.test(e.expression.name.text)) return placeholderName(e.expression.expression);
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && /^(Number|String|Math\.abs|parseFloat|parseInt)$/.test(e.expression.text) && e.arguments[0]) return placeholderName(e.arguments[0]);
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.expression.getText(sf) === "Math") return e.arguments[0] ? placeholderName(e.arguments[0]) : "value";
    if (ts.isIdentifier(e)) return e.text;
    if (ts.isPropertyAccessExpression(e)) {
      const last = e.name.text;
      if (last === "length") {
        const base = unwrap(e.expression);
        const b = ts.isIdentifier(base) ? base.text : ts.isPropertyAccessExpression(base) ? base.name.text : "";
        return b ? `${b}Count` : "count";
      }
      return last;
    }
    if (ts.isElementAccessExpression(e)) return placeholderName(e.expression);
    return "value";
  };
  const tryMixedRun = (el) => {
    const kids = el.children;
    const meaningful = kids.filter((k) => !(ts.isJsxText(k) && !k.text.trim()));
    // Only icons (self-closing elements) and JSX-rendering conditionals such as
    // {loading ? <Spinner/> : null} are safe sentence boundaries. Anything that
    // is itself part of the sentence — <b>…</b>, {n === 1 ? "item" : "items"},
    // template strings, t() pieces — means the whole element needs a hand-written
    // key (plural forms / <Trans>), so we convert nothing here.
    const hasJsx = (e) => {
      let f = false;
      const w = (x) => { if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) f = true; ts.forEachChild(x, w); };
      w(e);
      return f;
    };
    const isPart = (k) => ts.isJsxText(k) || (ts.isJsxExpression(k) && k.expression && !k.dotDotDotToken && !unsafeExpr(k.expression));
    const isBoundary = (k) => ts.isJsxSelfClosingElement(k) || (ts.isJsxExpression(k) && k.expression && hasJsx(k.expression));
    if (meaningful.some((k) => !isPart(k) && !isBoundary(k))) return false;
    const groups = [];
    let cur = [];
    for (const k of meaningful) {
      if (isPart(k)) cur.push(k);
      else { if (cur.length) groups.push(cur); cur = []; }
    }
    if (cur.length) groups.push(cur);
    let any = false;
    for (const g of groups) if (convertGroup(el, g)) any = true;
    return any;
  };
  const convertGroup = (el, group) => {
    if (!group.some((k) => ts.isJsxExpression(k))) return false;
    if (!group.some((k) => ts.isJsxText(k))) return false;
    const exprs = group.filter((k) => ts.isJsxExpression(k));
    if (exprs.length > 4) return false;
    let str = "";
    const vals = [];
    const used = new Set();
    for (const k of group) {
      if (ts.isJsxText(k)) str += jsxTextValue(text.slice(k.pos, k.end));
      else {
        const ex = unwrap(k.expression);
        if (ts.isStringLiteral(ex) || ts.isNoSubstitutionTemplateLiteral(ex)) { str += ex.text; continue; }
        let name = placeholderName(ex);
        let n = 2;
        const base = name;
        while (used.has(name)) name = base + n++;
        used.add(name);
        vals.push([name, k.expression.getText(sf)]);
        str += `{{${name}}}`;
      }
    }
    str = str.replace(/\s+/g, " ").trim();
    const plain = str.replace(/\{\{[^}]+\}\}/g, "").replace(/\bINV-?\b|\bRs\.?/g, "");
    if (!/[A-Za-z]{2,}/.test(plain) || !vals.length) return false;
    const first = group[0];
    const last = group[group.length - 1];
    const start = ts.isJsxText(first) ? first.pos + text.slice(first.pos, first.end).search(/\S/) : first.getStart(sf);
    const lastRaw = text.slice(last.pos, last.end);
    const end = ts.isJsxText(last) ? last.pos + lastRaw.replace(/\s+$/, "").length : last.getEnd();
    const owner = findOwner(el);
    if (!owner || conflicts(el, owner)) return false;
    const key = keyFor(str, rel);
    const opts = `, { ${vals.map(([n, e]) => (n === e ? n : `${n}: ${e}`)).join(", ")} }`;
    edits.push({ start, end, text: `{t("${key}"${opts})}` });
    owners.add(owner);
    stats.converted++;
    group.forEach((k) => handled.add(k));
    return true;
  };

  // ── Expression mode ──────────────────────────────────────────────────────
  const doneStarts = new Set();
  const COMPARE = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
  const calleeName = (call) => {
    const e = call.expression;
    return ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.getText(sf) : "";
  };
  // Is this literal (or a conditional/|| expression containing it) rendered to the user?
  const flowsToUi = (lit) => {
    let top = lit;
    for (let p = lit.parent; p; p = p.parent) {
      if (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p)) { top = p; continue; }
      if (ts.isConditionalExpression(p) && p.condition !== top) {
        if (/\b(language|lang|activeLang)\b/.test(p.condition.getText(sf))) return false;
        top = p; continue;
      }
      if (ts.isBinaryExpression(p)) {
        const k = p.operatorToken.kind;
        if (COMPARE.has(k)) return false;
        if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) { top = p; continue; }
        return false;
      }
      if (ts.isJsxExpression(p)) {
        const host = p.parent;
        if (ts.isJsxAttribute(host)) return ATTRS.has(host.name.getText(sf)) && !IGNORE_ATTR.has(host.name.getText(sf));
        return ts.isJsxElement(host) || ts.isJsxFragment(host);
      }
      if (ts.isCallExpression(p)) return p.arguments.includes(top) && UI_CALL.test(calleeName(p));
      if (ts.isPropertyAssignment(p)) return p.initializer === top && PROPS.has(p.name.getText(sf));
      if (ts.isVariableDeclaration(p)) return p.initializer === top && /(label|title|text|message|msg|error|heading|caption|tooltip|hint|description|subtitle|placeholder|note|reason)$/i.test(p.name.getText(sf));
      return false;
    }
    return false;
  };
  const tryExpr = (n) => {
    if (doneStarts.has(n.getStart(sf))) return;
    const par = n.parent;
    if (ts.isPropertyAssignment(par) && par.name === n) return; // object key
    if (ts.isImportDeclaration(par) || ts.isLiteralTypeNode(par) || ts.isCaseClause(par) || ts.isElementAccessExpression(par)) return;
    if (!flowsToUi(n)) return;
    let str;
    let opts = "";
    if (ts.isTemplateExpression(n)) {
      let out = n.head.text;
      const vals = [];
      const used = new Set();
      for (const span of n.templateSpans) {
        const ex = unwrap(span.expression);
        if (unsafeExpr(ex)) return flag(n.pos, "tmpl", n.getText(sf).slice(0, 60), "template has conditional/markup — hand-write (plural?)");
        let name = placeholderName(ex), base = name, i = 2;
        while (used.has(name)) name = base + i++;
        used.add(name);
        vals.push([name, span.expression.getText(sf)]);
        out += `{{${name}}}` + span.literal.text;
      }
      str = out;
      opts = `, { ${vals.map(([a, b]) => (a === b ? a : `${a}: ${b}`)).join(", ")} }`;
    } else str = decode(n.text);
    if (!looksTranslatable(str.replace(/\{\{[^}]+\}\}/g, "").trim() || "x", true) && !/^[A-Z][a-z]+/.test(str)) return;
    if (!/[A-Za-z]{2,}/.test(str.replace(/\{\{[^}]+\}\}/g, ""))) return;
    if (!ts.isTemplateExpression(n) && !looksTranslatable(str, true)) return;
    const owner = findOwner(n);
    if (!owner) return flag(n.pos, "module-level", str, "outside component/hook");
    if (conflicts(n, owner)) return flag(n.pos, "shadow", str, "`t` is shadowed in this scope");
    const key = keyFor(str, rel);
    edits.push({ start: n.getStart(sf), end: n.getEnd(), text: `t("${key}"${opts})` });
    doneStarts.add(n.getStart(sf));
    owners.add(owner);
    stats.converted++;
  };

  const visit = (n) => {
    if (ts.isJsxElement(n) && SKIP_ELEMENTS.has(n.openingElement.tagName.getText(sf))) return;
    if (MIXED && (ts.isJsxElement(n) || ts.isJsxFragment(n))) tryMixedRun(n);
    if (handled.has(n)) return;
    if (ts.isJsxText(n)) {
      const raw = text.slice(n.pos, n.end);
      const m = raw.match(/\S[\s\S]*\S|\S/);
      if (m) {
        const s = n.pos + m.index;
        const e = s + m[0].length;
        const str = decode(m[0].split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(" "));
        if (looksTranslatable(str, false)) {
          const kids = n.parent.children;
          const i = kids.indexOf(n);
          const near = (dir) => {
            for (let j = i + dir; j >= 0 && j < kids.length; j += dir) {
              const k = kids[j];
              if (ts.isJsxText(k) && !k.text.trim()) continue;
              return k;
            }
            return null;
          };
          const blocked = [near(-1), near(1)].some(
            (k) => k && ((ts.isJsxExpression(k) && k.expression) || (ts.isJsxElement(k) && k.children.length > 0) || (ts.isJsxText(k) && k.text.trim())),
          );
          if (blocked && !str.endsWith(":")) flag(n.pos, "jsx-mixed", str, "text mixed with expression/markup — needs {{interpolation}}");
          else accept(n, str, s, e, (k) => `{t("${k}")}`);
        }
      }
    } else if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText(sf))) {
      const str = decode(n.initializer.text);
      if (looksTranslatable(str, true)) accept(n, str, n.initializer.getStart(sf), n.initializer.getEnd(), (k) => `{t("${k}")}`);
    } else if (ts.isPropertyAssignment(n) && PROPS.has(n.name.getText(sf)) && (ts.isStringLiteral(n.initializer) || ts.isNoSubstitutionTemplateLiteral(n.initializer))) {
      const str = n.initializer.text;
      if (looksTranslatable(str, true)) accept(n, str, n.initializer.getStart(sf), n.initializer.getEnd(), (k) => `t("${k}")`);
    }
    if (EXPR && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n))) tryExpr(n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!edits.length) return;
  stats.files++;
  if (needsMarker && !/i18n\/marker/.test(text)) {
    const imps = sf.statements.filter(ts.isImportDeclaration);
    const at = imps.length ? imps[imps.length - 1].getEnd() : 0;
    edits.push({ start: at, end: at, text: `\nimport { tk } from "@/i18n/marker";` });
  }

  // Hook insertion
  for (const owner of owners) {
    if (ownerHasHook(owner)) continue;
    if (ts.isBlock(owner.body)) {
      const first = owner.body.statements[0];
      const indent = first ? text.slice(text.lastIndexOf("\n", first.getStart(sf)) + 1, first.getStart(sf)).match(/^\s*/)[0] : "  ";
      const at = owner.body.getStart(sf) + 1;
      edits.push({ start: at, end: at, text: `\n${indent}const { t } = useTranslation();` });
    } else {
      edits.push({ start: owner.body.getStart(sf), end: owner.body.getStart(sf), text: "{ const { t } = useTranslation(); return " });
      edits.push({ start: owner.body.getEnd(), end: owner.body.getEnd(), text: "; }" });
    }
  }

  // Dependency arrays: add `t` to useMemo/useCallback that now call t()
  const ranges = edits.filter((e) => e.text.startsWith("t(") || e.text.startsWith('{t(')).map((e) => e.start);
  const patchDeps = (n) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(sf);
      if ((callee === "useMemo" || callee === "useCallback" || callee === "React.useMemo" || callee === "React.useCallback") && n.arguments.length >= 1) {
        const cb = n.arguments[0];
        if (ranges.some((p) => p >= cb.pos && p <= cb.end)) {
          const deps = n.arguments[1];
          if (deps && ts.isArrayLiteralExpression(deps)) {
            if (!deps.elements.some((el) => el.getText(sf) === "t")) {
              if (deps.elements.length === 0) edits.push({ start: deps.getStart(sf), end: deps.getEnd(), text: "[t]" });
              else edits.push({ start: deps.elements[deps.elements.length - 1].getEnd(), end: deps.elements[deps.elements.length - 1].getEnd(), text: ", t" });
            }
          } else flag(n.pos, "deps", callee, "no deps array — add `t` manually");
        }
      }
    }
    ts.forEachChild(n, patchDeps);
  };
  patchDeps(sf);

  // Import
  if (!/from\s+["']react-i18next["']/.test(text) || !/useTranslation/.test(text.match(/import[^;]*react-i18next[^;]*;/)?.[0] || "")) {
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const at = imports.length ? imports[imports.length - 1].getEnd() : 0;
    edits.push({ start: at, end: at, text: `${imports.length ? "\n" : ""}import { useTranslation } from "react-i18next";${imports.length ? "" : "\n"}` });
  }

  if (!WRITE) return;
  let out = text;
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(file, out);
};

for (const f of walkDir(SRC)) processFile(f);
stats.manual = manual.length;

if (WRITE && Object.keys(newKeys).length) {
  for (const [k, v] of Object.entries(newKeys)) {
    const parts = k.split(".");
    let o = en;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof o[parts[i]] === "string") throw new Error(`key path collides with string: ${k}`);
      o = o[parts[i]] ??= {};
    }
    o[parts[parts.length - 1]] = v;
  }
  fs.writeFileSync(EN_FILE, JSON.stringify(en, null, INDENT) + "\n");
}
if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ stats, newKeys, manual }, null, 1));

const byReason = {};
manual.forEach((m) => (byReason[m.kind] = (byReason[m.kind] || 0) + 1));
console.log(`${WRITE ? "WROTE" : "DRY RUN"} — files: ${stats.files}  converted: ${stats.converted}  new keys: ${Object.keys(newKeys).length}  needs manual: ${manual.length}`);
console.log("manual by kind:", byReason);
