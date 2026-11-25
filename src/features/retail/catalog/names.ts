// Item names are generated, never typed (plan §5.7): "{brand} {item} {variant}{unit}", where item is the
// category's own item_name (sub "Steel" under Drill bits -> "Steel Drill Bit"), e.g. "SALI Steel Drill Bit 6mm". This mirrors the server's generateName so the preview is the
// same as what gets saved; the pattern comes from the shop's retail settings (`namePattern`).

export const DEFAULT_NAME_PATTERN = "{brand} {item} {variant}{unit}";

export interface NameParts {
  brand?: string | null;
  /** The category's item_name (or, when it has none, the category name as it is). */
  item?: string | null;
  variant?: string | null;
  unit?: string | null;
  pattern?: string | null;
}

const KEY_ALIASES: Record<string, string> = {
  brand: "brand",
  item: "item",
  itemname: "item",
  itemword: "item",
  subcategory: "item",
  variant: "variant",
  size: "variant",
  unit: "unit",
};

/** True when a size label is a bare number ("6", "1.5"): only then a unit is appended ("6" + "mm"). */
export const isBareNumber = (label: string) => /^\d+(?:\.\d+)?$/.test(label.trim());

export const formatVariant = (label: string | null | undefined, unit?: string | null) => {
  const l = (label ?? "").trim();
  if (!l) return "";
  return unit && isBareNumber(l) ? `${l}${unit}` : l;
};

export function generateName({ brand, item, variant, unit, pattern }: NameParts): string {
  const values: Record<string, string> = {
    brand: (brand ?? "").trim(),
    item: (item ?? "").trim(),
    variant: (variant ?? "").trim(),
    // The unit only follows a plain number; a size typed with its own unit ("1/2\"") stays as typed.
    unit: variant && isBareNumber(variant) ? (unit ?? "").trim() : "",
  };
  const source = pattern && pattern.trim() ? pattern : DEFAULT_NAME_PATTERN;
  const out = source.replace(/\{\s*([A-Za-z_]+)\s*\}/g, (_m, raw: string) => {
    const key = KEY_ALIASES[raw.replace(/_/g, "").toLowerCase()];
    return key ? values[key] : "";
  });
  return out.replace(/\s+/g, " ").trim();
}

/** The name shared by every size of a family: the pattern without the variant. */
export const generateFamilyName = (parts: Omit<NameParts, "variant" | "unit">) => generateName({ ...parts, variant: "", unit: "" });

/** "Drill bits" -> "Drill Bit": a default item word from a category name (the user can change it). */
export function singularTitle(name: string): string {
  const words = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      let s = w;
      if (/ies$/i.test(s) && s.length > 4) s = s.replace(/ies$/i, "y");
      else if (/(ches|shes|sses|xes)$/i.test(s)) s = s.replace(/es$/i, "");
      else if (/s$/i.test(s) && !/(ss|us|is)$/i.test(s) && s.length > 3) s = s.slice(0, -1);
      return s.charAt(0).toUpperCase() + s.slice(1);
    });
  // "Drill Bit Steel" style names keep only the last noun phrase: use the whole name for short ones.
  return words.join(" ");
}

/** A size written several ways, so "6 mm", "6mm" and "6" all find it (same idea as the server's search text). */
export function sizeVariants(label: string): string[] {
  const l = label.trim().toLowerCase();
  if (!l) return [];
  const out = new Set<string>([l]);
  const m = l.match(/^(\d+(?:\.\d+)?)\s*([a-z"']*)$/);
  if (m) {
    const [, n, unit] = m;
    out.add(n);
    if (!n.includes(".")) out.add(`${n}.0`);
    else if (/\.0+$/.test(n)) out.add(n.replace(/\.0+$/, ""));
    if (unit) {
      out.add(`${n}${unit}`);
      out.add(`${n} ${unit}`);
    }
  }
  return [...out];
}

/** Sorts size labels the way a person reads them: 3, 4, 10, 12 (not 10, 12, 3, 4). */
export const compareVariantLabels = (a: string | null | undefined, b: string | null | undefined) => {
  const x = parseFloat(a ?? "");
  const y = parseFloat(b ?? "");
  if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return x - y;
  return (a ?? "").localeCompare(b ?? "", undefined, { numeric: true });
};
