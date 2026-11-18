import { COLUMNS, type Column, type Field } from "@/features/equipment/sheet/sheetModel";

export const EDITABLE_IMPORT_COLUMNS: Column[] = COLUMNS.filter((c) => c.kind !== "readonly");

export const REQUIRED_IMPORT_FIELDS: ReadonlySet<Field> = new Set<Field>([
  "equipment_name",
  "category_id",
  "warehouse_id",
  "base_rental_price",
]);

export const SAME_FOR_ALL_FIELDS: Field[] = ["category_id", "warehouse_id", "minimum_rental_days", "is_bulk_item"];

const SHEET_EN_LABELS: Record<Field, string> = {
  equipment_name: "Name",
  equipment_name_si: "Name (Sinhala)",
  serial_number: "EQ No.",
  category_id: "Category",
  warehouse_id: "Location",
  base_rental_price: "Base price",
  extra_daily_rate: "Extra/day",
  minimum_rental_days: "Min days",
  // The sheet labels this column "Qty" (quantity-tracked), but in a shop's file "Qty" almost always
  // means how many they own, so the Bulk flag only matches by its own name.
  is_bulk_item: "Bulk item",
  total_owned_qty: "Total",
  purchase_cost: "Cost",
  warranty_period_months: "Warr. mo",
  end_of_warranty_date: "Warranty end",
};

const SHEET_SI_LABELS: Record<Field, string> = {
  equipment_name: "නම",
  equipment_name_si: "නම (සිංහල)",
  serial_number: "EQ අංකය",
  category_id: "කාණ්ඩය",
  warehouse_id: "ස්ථානය",
  base_rental_price: "මූලික ගාස්තුව",
  extra_daily_rate: "අමතර/දින",
  minimum_rental_days: "අවම දින",
  is_bulk_item: "තොග භාණ්ඩය",
  total_owned_qty: "මුළු",
  purchase_cost: "මිල",
  warranty_period_months: "වගකීම් මාස",
  end_of_warranty_date: "වගකීම අවසන්",
};

// Known aliases ported from legacy importEquipment.js + common messy spreadsheet headers
const FIELD_ALIASES: Record<Field, string[]> = {
  equipment_name: ["equipment_name", "equipment", "name", "item_name", "item", "title", "machine", "machine_name", "tool"],
  equipment_name_si: ["equipment_name_si", "name_si", "sinhala_name", "name_sinhala", "sinhala"],
  serial_number: ["serial_number", "serial", "serial_no", "serial_#", "sku", "number", "eq_no", "eq_number", "eqno", "asset_no", "code"],
  category_id: ["category_id", "category_name", "category", "cat", "group", "type"],
  warehouse_id: ["warehouse_id", "warehouse_name", "warehouse", "location", "depot", "branch", "store"],
  base_rental_price: [
    "base_rental_price",
    "rental_price_per_day",
    "rate_per_day",
    "rate_day",
    "rate/day",
    "rateday",
    "daily_rate",
    "day_rate",
    "base_price",
    "rate",
    "price",
  ],
  extra_daily_rate: ["extra_daily_rate", "extra_rate", "extra_price", "extra_day", "extra"],
  minimum_rental_days: ["minimum_rental_days", "min_rental_days", "min_days", "min days", "min_rent_days", "min_period"],
  is_bulk_item: ["is_bulk_item", "bulk_item", "bulk", "is_bulk"],
  total_owned_qty: ["total_owned_qty", "total_quantity", "total", "quantity", "qty", "units", "stock", "count"],
  purchase_cost: ["purchase_cost", "cost", "buying_price", "purchase_price"],
  warranty_period_months: ["warranty_period_months", "warranty_months", "warranty"],
  end_of_warranty_date: ["end_of_warranty_date", "warranty_date", "warranty_end"],
};

export const normalizeText = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();
export const cleanAsciiKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface MatchCandidate {
  colIndex: number;
  field: Field;
  score: number;
}

const scoreHeaderAgainstField = (
  header: string,
  field: Field,
  translatedLabels?: Partial<Record<Field, string>>,
): number => {
  const exact = normalizeText(header);
  const ascii = cleanAsciiKey(header);
  if (!exact && !ascii) return 0;

  const enLabel = SHEET_EN_LABELS[field];
  const siLabel = SHEET_SI_LABELS[field];
  // The on-screen label for the Bulk flag is "Qty"/"ප්‍රමාණ", which would steal quantity columns.
  const dynLabel = field === "is_bulk_item" ? undefined : translatedLabels?.[field];

  // 1. Exact Sheet English label
  if (exact === normalizeText(enLabel) || (ascii && ascii === cleanAsciiKey(enLabel))) {
    return 1000 + exact.length;
  }
  // 2. Exact Sheet Sinhala or current UI label
  if (exact === normalizeText(siLabel) || (dynLabel && exact === normalizeText(dynLabel))) {
    return 950 + exact.length;
  }

  // 3. Known aliases (exact normalized match)
  const aliases = FIELD_ALIASES[field] ?? [];
  for (let i = 0; i < aliases.length; i++) {
    const alias = aliases[i];
    const aliasExact = normalizeText(alias);
    const aliasAscii = cleanAsciiKey(alias);
    if (exact === aliasExact || (ascii && aliasAscii && ascii === aliasAscii)) {
      return 850 - i + aliasExact.length;
    }
  }

  // 4. Substring contains fallback (longer aliases score higher so "extra/day" beats "rate")
  let bestSub = 0;
  for (const alias of aliases) {
    const aliasExact = normalizeText(alias);
    const aliasAscii = cleanAsciiKey(alias);
    if (aliasAscii.length >= 3 && ascii.includes(aliasAscii)) {
      bestSub = Math.max(bestSub, 600 + aliasAscii.length * 5);
    } else if (aliasExact.length >= 3 && exact.includes(aliasExact)) {
      bestSub = Math.max(bestSub, 580 + aliasExact.length * 5);
    }
  }
  return bestSub;
};

/**
 * Automatically map raw file headers to GearGrid fields (1-to-1: each field used at most once).
 * Priority: Sheet English -> Sheet Sinhala -> importEquipment aliases -> substring fallback.
 */
export const autoMatchColumns = (
  headers: string[],
  translatedLabels?: Partial<Record<Field, string>>,
): (Field | null)[] => {
  const candidates: MatchCandidate[] = [];

  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const header = headers[colIndex] ?? "";
    if (!header.trim()) continue;
    for (const col of EDITABLE_IMPORT_COLUMNS) {
      const field = col.key as Field;
      const score = scoreHeaderAgainstField(header, field, translatedLabels);
      if (score > 0) {
        candidates.push({ colIndex, field, score });
      }
    }
  }

  // Prefer higher score first, then earlier column
  candidates.sort((a, b) => b.score - a.score || a.colIndex - b.colIndex);

  const mapping: (Field | null)[] = headers.map(() => null);
  const usedFields = new Set<Field>();
  const usedCols = new Set<number>();

  for (const c of candidates) {
    if (usedCols.has(c.colIndex) || usedFields.has(c.field)) continue;
    mapping[c.colIndex] = c.field;
    usedCols.add(c.colIndex);
    usedFields.add(c.field);
  }

  return mapping;
};

/** Assign `field` to `colIndex` strictly 1-to-1, clearing any previous column mapped to `field`. */
export const reassignColumnMapping = (
  mapping: (Field | null)[],
  colIndex: number,
  field: Field | null,
): (Field | null)[] =>
  mapping.map((existing, idx) => {
    if (idx === colIndex) return field;
    if (field !== null && existing === field) return null;
    return existing;
  });

const VALID_FIELD_SET = new Set<string>(EDITABLE_IMPORT_COLUMNS.map((c) => c.key));

export const headerSignature = (headers: string[]): string => {
  const canonical = headers.map((h) => normalizeText(h)).join("\u001f");
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const STORAGE_PREFIX = "geargrid-equipment-import-mapping:";

export const loadSavedColumnMapping = (headers: string[]): (Field | null)[] | null => {
  if (!headers.length) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${headerSignature(headers)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== headers.length) return null;
    const seen = new Set<Field>();
    const clean: (Field | null)[] = parsed.map((item) => {
      if (item === null) return null;
      if (typeof item !== "string" || !VALID_FIELD_SET.has(item)) return null;
      const f = item as Field;
      if (seen.has(f)) return null;
      seen.add(f);
      return f;
    });
    return clean;
  } catch {
    return null;
  }
};

export const saveColumnMapping = (headers: string[], mapping: (Field | null)[]): void => {
  if (!headers.length) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${headerSignature(headers)}`, JSON.stringify(mapping));
  } catch {
    // Storage quota or private mode: simply skip persisting mapping
  }
};

/** Return up to `limit` non-empty sample cell values for column preview in Match Columns. */
export const getColumnSamples = (dataRows: string[][], colIndex: number, limit = 3): string[] => {
  const samples: string[] = [];
  for (const row of dataRows) {
    const val = (row[colIndex] ?? "").trim();
    if (!val) continue;
    if (!samples.includes(val)) samples.push(val);
    if (samples.length >= limit) break;
  }
  return samples;
};
