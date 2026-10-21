#!/usr/bin/env node
/**
 * Translate new / changed English UI strings into Sinhala.
 *
 *   npm run i18n:translate                 # dry run: list keys that have no Sinhala yet
 *   npm run i18n:translate -- --write      # call Claude, write results into si.json
 *   npm run i18n:translate -- --write --keys=orders.   # only keys with this prefix
 *   npm run i18n:translate -- --write --redo=orders.   # re-translate existing keys too
 *
 * Needs ANTHROPIC_API_KEY (or `ant auth login`) for --write. Uses src/i18n/glossary.json
 * so the same English term always gets the same Sinhala word. Placeholders ({{x}}, <b>…</b>)
 * are validated; a batch that breaks them is rejected and retried once.
 * Always run `npm run i18n:check` afterwards and have a Sinhala speaker skim the diff.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src/i18n");
const enPath = path.join(dir, "locales/en.json");
const siPath = path.join(dir, "locales/si.json");
const glossary = JSON.parse(fs.readFileSync(path.join(dir, "glossary.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const write = args.includes("--write");
const only = flag("keys");
const redo = flag("redo");
const model = flag("model") || "claude-opus-5-5";
const BATCH = 60;

const flatten = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    typeof v === "object" && v !== null ? flatten(v, key, out) : (out[key] = v);
  }
  return out;
};
const unflatten = (flat) => {
  const out = {};
  for (const [key, v] of Object.entries(flat)) {
    key.split(".").reduce((o, part, i, arr) => (o[part] ??= i === arr.length - 1 ? v : {}), out);
  }
  return out;
};
const tokens = (s) => (String(s).match(/\{\{[^}]+\}\}|<\/?[a-z]+>/gi) || []).sort().join("|");

const en = flatten(JSON.parse(fs.readFileSync(enPath, "utf8")));
const si = flatten(JSON.parse(fs.readFileSync(siPath, "utf8")));
const todo = Object.keys(en).filter((k) => {
  if (only && !k.startsWith(only)) return false;
  if (redo && k.startsWith(redo)) return true;
  return !(k in si) || si[k] === "";
});

if (!todo.length) {
  console.log("Nothing to translate: every English key already has Sinhala.");
  process.exit(0);
}
if (!write) {
  console.log(`${todo.length} key(s) need Sinhala:`);
  todo.slice(0, 200).forEach((k) => console.log(`  ${k} ¦ ${en[k]}`));
  if (todo.length > 200) console.log(`  … and ${todo.length - 200} more`);
  console.log("\nRun with --write to translate them with Claude.");
  process.exit(0);
}

const { default: Anthropic } = await import("@anthropic-ai/sdk");
const client = new Anthropic();
const system = [
  "You translate UI strings of an equipment-rental / POS system into natural Sinhala.",
  `Audience: ${glossary.audience}`,
  "Style rules:\n- " + glossary.style.join("\n- "),
  `Keep these in Latin script: ${glossary.keepEnglish.join(", ")}.`,
  "Use exactly these Sinhala terms for these English terms:\n" +
    Object.entries(glossary.terms).map(([e, s]) => `${e} = ${s}`).join("\n"),
  'Reply with ONLY a JSON object mapping each key to its Sinhala string. Keep every {{placeholder}} and tag unchanged.',
].join("\n\n");

const translateBatch = async (keys) => {
  const payload = Object.fromEntries(keys.map((k) => [k, en[k]]));
  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: JSON.stringify(payload, null, 1) }],
  });
  const msg = await stream.finalMessage();
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
};

let done = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const keys = todo.slice(i, i + BATCH);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await translateBatch(keys);
      const bad = keys.filter((k) => typeof out[k] !== "string" || tokens(out[k]) !== tokens(en[k]));
      keys.filter((k) => !bad.includes(k)).forEach((k) => (si[k] = out[k]));
      done += keys.length - bad.length;
      if (bad.length && attempt === 2) console.warn(`skipped (placeholder mismatch): ${bad.join(", ")}`);
      if (!bad.length) break;
      keys.splice(0, keys.length, ...bad);
    } catch (e) {
      console.warn(`batch ${i / BATCH + 1} attempt ${attempt} failed: ${e.message}`);
    }
  }
}

// keep si.json in the same key order as en.json
const ordered = Object.fromEntries(Object.keys(en).filter((k) => k in si).map((k) => [k, si[k]]));
fs.writeFileSync(siPath, JSON.stringify(unflatten(ordered), null, 4) + "\n");
console.log(`Translated ${done}/${todo.length} keys into ${path.relative(root, siPath)}. Now run: npm run i18n:check`);
