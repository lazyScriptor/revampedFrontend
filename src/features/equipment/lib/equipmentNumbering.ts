// Automatic machine numbers (EQ-110) and names ("Battery Drill - 6"). The server has the final say on
// EQ numbers; these keep what the grid shows ahead of rows that aren't saved yet.

export const serialValue = (s: unknown): number | null => {
  const m = String(s ?? "").trim().match(/^EQ\s*-\s*(\d+)$/i);
  return m ? Number(m[1]) : null;
};
export const formatSerial = (n: number) => `EQ-${String(n).padStart(3, "0")}`;

/** The next free EQ number: after the server's next and after every number already in the grid. */
export const nextGridSerial = (serverNext: string | null | undefined, serials: unknown[]) => {
  const fromServer = serialValue(serverNext) ?? 1;
  const highest = serials.reduce<number>((max, s) => Math.max(max, serialValue(s) ?? 0), 0);
  return Math.max(fromServer, highest + 1);
};

// Keep these name rules the same as revampedBackend_Geargrid/src/services/equipmentNumberService.js.
const SEPARATORS = "\\s\\-–—_.:#/,";
const EDGES = new RegExp(`^[${SEPARATORS}]+|[${SEPARATORS}]+$`, "g");
const clean = (s: string) => s.replace(EDGES, "");
const cleanBefore = (s: string) => clean(clean(s.replace(/\s*\(\s*$/, "")).replace(/(^|[\s\-–—_])(?:no|num|number)\.?$/i, "$1"));

export interface ParsedName {
  before: string | null;
  digits: string;
  after: string;
  number: number | null;
  leftText: string;
  /** The name without its number. */
  text: string;
  /** Same key = same machine text, however the number is written. */
  key: string;
}

/** Find a name's number and the text around it. A size is not a number: "Grinder 4 inch" has none. */
export const parseName = (name: unknown): ParsedName => {
  const s = String(name ?? "").trim();
  const m =
    s.match(/^(.*\(\s*)(\d+)(\s*\))$/su) ||
    s.match(/^(.*[^\p{L}\p{M}\d])(\d+)()$/su) ||
    s.match(/^((?:no\.?\s*|#\s*)?)(\d+)(\s*[-–—.:)_/]\s*)(?=[^\s\d])(.*)$/isu) ||
    s.match(/^((?:no\.?\s*|#\s*))(\d+)(\s+)(.+)$/isu) ||
    s.match(/^(.+?\s[-–—]\s*)(\d+)(\s*[-–—(].*)$/su);
  const sized = !!m && /\d[.,/:]$/.test(m[1]);
  // "Chainsaw 445" is a model; a machine number that large would have a separator.
  const model = !!m && m[2].length >= 3 && !m[2].startsWith("0") && /[\p{L}\p{M}\d)]\s+$/u.test(m[1]) && !/(?:^|\s)(?:no|num|number)\.?\s+$/i.test(m[1]);
  const before = m && !sized && !model ? m[1] : null;
  const after = before === null || !m ? "" : `${m[3]}${m[4] ?? ""}`;
  const leftText = before === null ? clean(s) : cleanBefore(before);
  const rightText = clean(after.replace(/^\s*\)/, ""));
  const text = [leftText, rightText].filter(Boolean).join(" ");
  if (before !== null && !text) return { before: null, digits: "", after: "", number: null, leftText: s, text: s, key: `${s.toLowerCase()}|` };
  return {
    before,
    digits: before === null || !m ? "" : m[2],
    after,
    number: before === null || !m ? null : Number(m[2]),
    leftText,
    text,
    key: (leftText ? `${leftText}|${rightText}` : `${rightText}|`).toLowerCase().replace(/\s+/g, " "),
  };
};

const padded = (digits: string, n: number) => (digits.length > 1 && digits.startsWith("0") ? String(n).padStart(digits.length, "0") : String(n));

/** Same format, new number. A name without a number gets " - n". Blank stays blank. */
export const renumberName = (name: unknown, n: number) => {
  const p = parseName(name);
  if (!p.text) return "";
  return p.before === null ? `${p.text} - ${n}` : `${p.before}${padded(p.digits, n)}${p.after}`;
};

/** A Sinhala name with number n: in its own format, or the English name's when it has no number. */
export const renumberSinhala = (si: unknown, name: unknown, n: number) => {
  const own = parseName(si);
  if (!own.text) return "";
  if (own.before !== null) return renumberName(si, n);
  const like = parseName(name);
  if (like.before === null) return `${own.text} - ${n}`;
  const num = padded(like.digits, n);
  if (!like.leftText) return `${like.before}${num}${like.after.match(/^[^\p{L}\p{M}\d]*/u)?.[0] ?? ""}${own.text}`;
  const sep = like.before.slice(like.before.lastIndexOf(like.leftText) + like.leftText.length);
  return `${own.text}${sep}${num}${/[\p{L}\d]/u.test(like.after) ? "" : like.after}`;
};

/** The next number for a name, after `floor` and after the same text in the grid. */
export const nextGridNameNumber = (name: unknown, floor: number, names: unknown[]) => {
  const { key } = parseName(name);
  return names.reduce<number>((next, other) => {
    const p = parseName(other);
    return p.text && p.key === key ? Math.max(next, (p.number ?? 1) + 1) : next;
  }, floor);
};

/**
 * Split text pasted from Excel: rows by line, cells by tab. Null when it is one plain value, so
 * normal pasting into a cell is left alone.
 */
export const parsePaste = (text: string): string[][] | null => {
  const clean = text.replace(/\r/g, "").replace(/\n$/, "");
  if (!clean.includes("\t") && !clean.includes("\n")) return null;
  return clean.split("\n").map((line) => line.split("\t").map((c) => c.trim()));
};
