// Finds user-visible English string literals that are still NOT going through t().
// Looser than i18n-extract: looks at ANY string/template literal with 2+ words.
import ts from "typescript"; import fs from "node:fs"; import path from "node:path";
const SRC = path.resolve("src");
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!["__tests__","test","node_modules","i18n"].includes(e.name)) walk(p, o); } else if (/\.tsx?$/.test(p) && !p.endsWith(".d.ts") && !p.endsWith("routeTree.gen.ts")) o.push(p); } return o; };
const IGNORE_ATTR = new Set(["className","sx","style","key","id","name","type","variant","color","size","severity","href","src","to","component","role","target","rel","fontFamily","width","height","display","position","value","field","testid","data-testid","aria-hidden","autoComplete","inputMode","spellCheck","borderColor","border","background","boxShadow","transition","gridTemplateColumns","fontSize","fontWeight","textTransform","content","mimeType","accept","lang","dir","method","path","format","pattern","queryKey","status","kind","mode","align","justifyContent","alignItems","flexDirection","overflow","cursor","animation","transform","gap","margin","padding","minWidth","maxWidth","icon","tone","key","as","tag","scope"]);
const CMP = new Set(["===","!==","==","!="]);
// single words are only reported when they are NOT data values (comparisons, switch/case, array of enum values, lookups)
const dataCtx = (n) => { const p = n.parent;
  if (ts.isBinaryExpression(p) && CMP.has(p.operatorToken.getText())) return true;
  if (ts.isCaseClause(p) || ts.isElementAccessExpression(p) || ts.isArrayLiteralExpression(p) || ts.isLiteralTypeNode(p)) return true;
  if (ts.isPropertyAssignment(p) && p.name === n) return true;
  if (ts.isCallExpression(p) && /(\.(includes|startsWith|endsWith|indexOf|has|get|set|getItem|setItem|removeItem|enum|literal|nativeEnum)|^(z\.|Object\.|Symbol))/.test(p.expression.getText())) return true;
  if (ts.isVariableDeclaration(p) && /^[A-Z_]+$/.test(p.name.getText())) return true;
  return false; };
const out = {};
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file); const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits = [];
  const inT = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isCallExpression(p) && /^(t|tk|i18n\.t)$/.test(p.expression.getText(sf))) return true; if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isTypeNode(p) || ts.isLiteralTypeNode(p)) return true; if (ts.isJsxAttribute(p) && IGNORE_ATTR.has(p.name.getText(sf))) return true; if (ts.isPropertyAssignment(p) && IGNORE_ATTR.has(p.name.getText(sf))) return true; } return false; };
  const visit = (n) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) && !inT(n)) {
      const s = ts.isTemplateExpression(n) ? n.getText(sf).slice(1, -1).replace(/\$\{[^}]*\}/g, "{}") : n.text;
      const words = s.trim().split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
      const single = words.length === 1 && /^[A-Z][a-z]{3,}$/.test(s.trim()) && !dataCtx(n);
      const isCss = /^[\w\s.#:>,\[\]="'%()-]+$/.test(s) && /(px|rem|flex|grid|solid|rgba|#[0-9a-f]{3,}|bg-|text-|border|rounded|items-|justify-|inline|w-\d|h-\d|p[xy]?-\d|gap-)/.test(s);
      if ((words.length >= 2 || single) && !isCss && !/^(https?:|\/|@\/|\.\/|\.\.\/)/.test(s) && !/^[A-Z_]+$/.test(s) && !/^[a-z]+([A-Z][a-z]+)+$/.test(s)) {
        const par = n.parent; let ctx = par.kind === ts.SyntaxKind.CallExpression ? "call:" + par.expression.getText(sf).slice(0, 24) : ts.isPropertyAssignment(par) ? "prop:" + par.name.getText(sf) : ts.isJsxExpression(par) ? "jsx-expr" : ts.isConditionalExpression(par) ? "ternary" : ts.isBinaryExpression(par) ? "binary" : ts.SyntaxKind[par.kind];
        hits.push([sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, ctx, s.trim().slice(0, 70)]);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (hits.length) out[rel] = hits;
}
const files = Object.entries(out).sort((a, b) => b[1].length - a[1].length);
const total = files.reduce((s, [, h]) => s + h.length, 0);
console.log(`leftover literals: ${total} in ${files.length} files`);
const ctxCount = {}; files.forEach(([, h]) => h.forEach(([, c]) => (ctxCount[c] = (ctxCount[c] || 0) + 1)));
console.log("by context:", Object.entries(ctxCount).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}=${v}`).join("  "));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
