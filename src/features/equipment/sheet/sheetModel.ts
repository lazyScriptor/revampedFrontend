// The equipment sheet's logic, kept apart from the screen. The server's rows never change here:
// edits, added rows and deleted rows sit beside them until Save, so a refetch (a photo changed by
// the phone, say) never loses what is being typed, and undo is just the previous state.
import { tk } from "@/i18n/marker";
import { parseName } from "../lib/equipmentNumbering";
import type { Equipment } from "../schemas/equipment.schema";

export type Field =
  | "equipment_name" | "equipment_name_si" | "serial_number" | "category_id" | "warehouse_id" | "base_rental_price" | "extra_daily_rate"
  | "minimum_rental_days" | "is_bulk_item" | "total_owned_qty" | "purchase_cost" | "warranty_period_months" | "end_of_warranty_date";
export type ReadOnlyField = "available_qty" | "rented_qty" | "defective_qty" | "createdAt";
export type ColumnKey = Field | ReadOnlyField;
export type CellKind = "text" | "money" | "int" | "category" | "warehouse" | "bool" | "date" | "readonly";
export type Values = Record<Field, string>;

export interface Column {
  key: ColumnKey;
  label: string;
  width: number;
  kind: CellKind;
}

export const COLUMNS: Column[] = [
  { key: "equipment_name", label: tk("equipment.sheet.cols.name"), width: 200, kind: "text" },
  { key: "equipment_name_si", label: tk("equipment.sheet.cols.nameSi"), width: 170, kind: "text" },
  { key: "serial_number", label: tk("equipment.sheet.cols.number"), width: 84, kind: "text" },
  { key: "category_id", label: tk("equipment.sheet.cols.category"), width: 130, kind: "category" },
  { key: "warehouse_id", label: tk("equipment.sheet.cols.location"), width: 120, kind: "warehouse" },
  { key: "base_rental_price", label: tk("equipment.sheet.cols.rate"), width: 74, kind: "money" },
  { key: "extra_daily_rate", label: tk("equipment.sheet.cols.extraRate"), width: 74, kind: "money" },
  { key: "minimum_rental_days", label: tk("equipment.sheet.cols.minDays"), width: 54, kind: "int" },
  { key: "is_bulk_item", label: tk("equipment.sheet.cols.bulk"), width: 44, kind: "bool" },
  { key: "total_owned_qty", label: tk("equipment.sheet.cols.total"), width: 52, kind: "int" },
  { key: "available_qty", label: tk("equipment.sheet.cols.available"), width: 52, kind: "readonly" },
  { key: "rented_qty", label: tk("equipment.sheet.cols.rented"), width: 52, kind: "readonly" },
  { key: "defective_qty", label: tk("equipment.sheet.cols.repair"), width: 52, kind: "readonly" },
  { key: "purchase_cost", label: tk("equipment.sheet.cols.cost"), width: 80, kind: "money" },
  { key: "warranty_period_months", label: tk("equipment.sheet.cols.warrantyMonths"), width: 60, kind: "int" },
  { key: "end_of_warranty_date", label: tk("equipment.sheet.cols.warrantyEnd"), width: 104, kind: "date" },
  { key: "createdAt", label: tk("equipment.sheet.cols.added"), width: 84, kind: "readonly" },
];

export const NUMERIC_KINDS: CellKind[] = ["money", "int"];
const isNumericColumn = (c: Column) => NUMERIC_KINDS.includes(c.kind) || ["available_qty", "rented_qty", "defective_qty"].includes(c.key);
export const alignsRight = isNumericColumn;

export interface SheetRow {
  key: string;
  id?: number;
  isNew: boolean;
  isDeleted: boolean;
  values: Values;
  /** Server values: blank for a new row. */
  base?: Values;
  edited: Partial<Record<Field, true>>;
  machine?: Equipment;
  photoUrl?: string | null;
}

export interface NewRow {
  key: string;
  values: Values;
  photo?: Blob | null;
  photoUrl?: string | null;
}

export interface SheetState {
  changes: Record<string, Partial<Values>>;
  added: NewRow[];
  deleted: string[];
}
export const EMPTY_STATE: SheetState = { changes: {}, added: [], deleted: [] };

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(Number(v)));

export const toValues = (m: Equipment): Values => ({
  equipment_name: str(m.equipment_name),
  equipment_name_si: str(m.equipment_name_si),
  serial_number: str(m.serial_number),
  category_id: str(m.category_id),
  warehouse_id: str(m.warehouse_id),
  base_rental_price: num(m.base_rental_price),
  extra_daily_rate: num(m.extra_daily_rate),
  minimum_rental_days: num(m.minimum_rental_days),
  is_bulk_item: m.is_bulk_item ? "true" : "false",
  total_owned_qty: num(m.total_owned_qty),
  purchase_cost: num(m.purchase_cost),
  warranty_period_months: num(m.warranty_period_months),
  end_of_warranty_date: str(m.end_of_warranty_date).slice(0, 10),
});

export const blankValues = (over: Partial<Values> = {}): Values => ({
  equipment_name: "",
  equipment_name_si: "",
  serial_number: "",
  category_id: "",
  warehouse_id: "",
  base_rental_price: "",
  extra_daily_rate: "",
  minimum_rental_days: "1",
  is_bulk_item: "false",
  total_owned_qty: "1",
  purchase_cost: "",
  warranty_period_months: "",
  end_of_warranty_date: "",
  ...over,
});

export const baseRow = (m: Equipment, resolveUrl: (u?: string | null) => string | null | undefined = (u) => u): SheetRow => ({
  key: `m${m.equipment_id}`,
  id: m.equipment_id,
  isNew: false,
  isDeleted: false,
  values: toValues(m),
  base: toValues(m),
  edited: {},
  machine: m,
  photoUrl: resolveUrl(m.image_url) ?? null,
});

/** A row's current look: the same object when nothing changed, so untouched rows don't redraw. */
export const viewRow = (row: SheetRow, change: Partial<Values> | undefined, deleted: boolean): SheetRow => {
  if (!change && !deleted) return row;
  const edited: SheetRow["edited"] = {};
  for (const f of Object.keys(change ?? {}) as Field[]) edited[f] = true;
  return { ...row, isDeleted: deleted, values: { ...row.values, ...change }, edited };
};
export const viewNewRow = (r: NewRow): SheetRow => ({ key: r.key, isNew: true, isDeleted: false, values: r.values, edited: {}, photoUrl: r.photoUrl ?? null });

const sameValue = (kind: CellKind, a: string, b: string) => {
  if (a === b) return true;
  if (!NUMERIC_KINDS.includes(kind) || a.trim() === "" || b.trim() === "") return false;
  return Number(a) === Number(b);
};

const kindOf = (field: Field) => COLUMNS.find((c) => c.key === field)!.kind;

/** Change cells. A cell put back to the server's value stops counting as edited. */
export const setCells = (state: SheetState, bases: Map<string, SheetRow>, edits: { key: string; field: Field; value: string }[]): SheetState => {
  const changes = { ...state.changes };
  let added = state.added;
  for (const { key, field, value } of edits) {
    if (key.startsWith("n")) {
      added = added.map((r) => (r.key === key ? { ...r, values: { ...r.values, [field]: value } } : r));
      continue;
    }
    const base = bases.get(key)?.base;
    if (!base) continue;
    const next = { ...changes[key] };
    if (sameValue(kindOf(field), value, base[field])) delete next[field];
    else next[field] = value;
    if (Object.keys(next).length) changes[key] = next;
    else delete changes[key];
  }
  return { ...state, changes, added };
};

export const toggleDeleted = (state: SheetState, keys: string[]): SheetState => {
  const newOnes = new Set(keys.filter((k) => k.startsWith("n")));
  const saved = keys.filter((k) => !k.startsWith("n"));
  const allDeleted = saved.length > 0 && saved.every((k) => state.deleted.includes(k));
  return {
    ...state,
    added: state.added.filter((r) => !newOnes.has(r.key)),
    deleted: allDeleted ? state.deleted.filter((k) => !saved.includes(k)) : [...new Set([...state.deleted, ...saved])],
  };
};

export const countChanges = (state: SheetState) => ({
  editedCells: Object.values(state.changes).reduce((n, c) => n + Object.keys(c).length, 0),
  editedRows: Object.keys(state.changes).filter((k) => !state.deleted.includes(k)).length,
  added: state.added.length,
  deleted: state.deleted.length,
});
export const isDirty = (state: SheetState) => {
  const c = countChanges(state);
  return c.editedCells + c.added + c.deleted > 0;
};

export type RowErrors = Partial<Record<Field | "row", string>>;

const isAmount = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;
const isWhole = (v: string, min: number) => /^\d+$/.test(v.trim()) && Number(v) >= min;

/** Problems in edited and added rows, by row key. Rows nobody touched are never flagged. */
export const validateRows = (rows: SheetRow[]): Record<string, RowErrors> => {
  const out: Record<string, RowErrors> = {};
  const serials = new Map<string, number>();
  for (const r of rows) {
    const s = r.values.serial_number.trim().toLowerCase();
    if (s) serials.set(s, (serials.get(s) ?? 0) + 1);
  }
  for (const r of rows) {
    if (r.isDeleted || (!r.isNew && !Object.keys(r.edited).length)) continue;
    const v = r.values;
    // A new row stays calm until a name goes in; saving it blank still comes back as a problem.
    if (r.isNew && !v.equipment_name.trim()) continue;
    const e: RowErrors = {};
    if (v.equipment_name.trim().length < 2) e.equipment_name = "name_required";
    if (!r.isNew && !v.serial_number.trim()) e.serial_number = "number_required";
    if ((serials.get(v.serial_number.trim().toLowerCase()) ?? 0) > 1) e.serial_number = "number_taken";
    if (!v.category_id) e.category_id = "category_required";
    if (!v.warehouse_id) e.warehouse_id = "warehouse_required";
    if (!isAmount(v.base_rental_price)) e.base_rental_price = "price_required";
    if (v.extra_daily_rate.trim() && !isAmount(v.extra_daily_rate)) e.extra_daily_rate = "number_invalid";
    if (!isWhole(v.minimum_rental_days, 1)) e.minimum_rental_days = "qty_invalid";
    if (!isWhole(v.total_owned_qty, 1)) e.total_owned_qty = "qty_invalid";
    else if (r.machine && Number(v.total_owned_qty) < Number(r.machine.rented_qty) + Number(r.machine.defective_qty)) e.total_owned_qty = "qty_below_out";
    else if (v.is_bulk_item !== "true" && Number(v.total_owned_qty) > 1) e.total_owned_qty = "bulk_total";
    if (v.purchase_cost.trim() && !isAmount(v.purchase_cost)) e.purchase_cost = "number_invalid";
    if (v.warranty_period_months.trim() && !isWhole(v.warranty_period_months, 0)) e.warranty_period_months = "number_invalid";
    if (Object.keys(e).length) out[r.key] = e;
  }
  return out;
};

const toServer = (field: Field, value: string): unknown => {
  if (field === "is_bulk_item") return value === "true";
  if (field === "category_id" || field === "warehouse_id") return value ? Number(value) : "";
  return value.trim();
};

export const buildPayload = (state: SheetState, bases: Map<string, SheetRow>) => ({
  updates: Object.entries(state.changes)
    .filter(([key]) => !state.deleted.includes(key) && bases.has(key))
    .map(([key, change]) => ({
      key,
      equipment_id: bases.get(key)!.id!,
      changes: Object.fromEntries(Object.entries(change).map(([f, v]) => [f, toServer(f as Field, v as string)])),
    })),
  creates: state.added.map((r) => ({
    key: r.key,
    values: Object.fromEntries(Object.entries(r.values).map(([f, v]) => [f, toServer(f as Field, v)])),
  })),
  deletes: state.deleted.filter((k) => bases.has(k)).map((key) => ({ key, equipment_id: bases.get(key)!.id! })),
});

export interface Lookups {
  categories: { category_id: number; category_name: string }[];
  warehouses: { warehouse_id: number; location_name: string }[];
}

export const displayValue = (col: Column, row: SheetRow, lookups: Lookups): string => {
  const m = row.machine as any;
  if (col.kind === "readonly") {
    if (!m) return "";
    return col.key === "createdAt" ? str(m.createdAt).slice(0, 10) : str(m[col.key]);
  }
  const value = row.values[col.key as Field];
  if (col.kind === "category") return lookups.categories.find((c) => String(c.category_id) === value)?.category_name ?? "";
  if (col.kind === "warehouse") return lookups.warehouses.find((w) => String(w.warehouse_id) === value)?.location_name ?? "";
  return value;
};

/** Text typed or pasted into a cell, as the value that cell stores. Null when it makes no sense there. */
export const parseInput = (col: Column, text: string, lookups: Lookups): string | null => {
  const t = text.trim();
  switch (col.kind) {
    case "readonly":
      return null;
    case "category":
      return t === "" ? "" : (lookups.categories.find((c) => c.category_name.toLowerCase() === t.toLowerCase())?.category_id.toString() ?? null);
    case "warehouse":
      return t === "" ? "" : (lookups.warehouses.find((w) => w.location_name.toLowerCase() === t.toLowerCase())?.warehouse_id.toString() ?? null);
    case "bool":
      if (/^(1|true|yes|y|x)$/i.test(t)) return "true";
      if (/^(0|false|no|n|)$/i.test(t)) return "false";
      return null;
    case "money":
    case "int":
      return t.replace(/^rs\.?\s*/i, "").replace(/,/g, "");
    case "date": {
      if (t === "") return "";
      const iso = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
      const dmy = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      return dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : null;
    }
    default:
      return text;
  }
};

export type SheetView = "all" | "changed" | "errors" | "noPhoto" | "noSinhala";

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export interface SortState {
  key: ColumnKey;
  dir: 1 | -1;
}

/**
 * Which rows show, and in what order. Filters and sorting read the server's values, so a row
 * doesn't jump or vanish while it is being edited. New rows stay on top, where they were added.
 */
export const visibleRows = (
  rows: SheetRow[],
  opts: { search: string; categoryId: string; view: SheetView; sort: SortState | null; errors: Record<string, RowErrors> },
  lookups: Lookups,
): SheetRow[] => {
  const q = opts.search.trim().toLowerCase();
  const startValues = (r: SheetRow) => r.base ?? r.values;
  const keep = (r: SheetRow) => {
    if (opts.view === "changed") return r.isNew || r.isDeleted || Object.keys(r.edited).length > 0;
    if (opts.view === "errors") return !!opts.errors[r.key];
    if (r.isNew) return true;
    if (opts.view === "noPhoto" && r.machine?.image_url) return false;
    if (opts.view === "noSinhala" && startValues(r).equipment_name_si.trim()) return false;
    const v = startValues(r);
    if (opts.categoryId && v.category_id !== opts.categoryId) return false;
    if (!q) return true;
    const category = lookups.categories.find((c) => String(c.category_id) === v.category_id)?.category_name ?? "";
    return [v.equipment_name, v.equipment_name_si, v.serial_number, category].some((s) => s.toLowerCase().includes(q));
  };
  const shown = rows.filter(keep);
  const added = shown.filter((r) => r.isNew);
  const saved = shown.filter((r) => !r.isNew);
  const sort = opts.sort ?? { key: "equipment_name" as ColumnKey, dir: 1 as const };
  const col = COLUMNS.find((c) => c.key === sort.key)!;
  const read = (r: SheetRow) => displayValue(col, { ...r, values: startValues(r) }, lookups);
  const numeric = isNumericColumn(col);
  saved.sort((a, b) => {
    const x = read(a);
    const y = read(b);
    if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1; // blanks last
    return (numeric ? Number(x) - Number(y) : compareText(x, y)) * sort.dir;
  });
  return [...added, ...saved];
};

/** The next name after a row's, given every name in the sheet. */
export const nextNameNumberIn = (name: string, names: string[], floor = 2) => {
  const { key } = parseName(name);
  return names.reduce((next, n) => {
    const p = parseName(n);
    return p.text && p.key === key ? Math.max(next, (p.number ?? 1) + 1) : next;
  }, floor);
};

/** Add, count and average what is selected, like the bar under a spreadsheet. */
export const selectionStats = (cells: string[]) => {
  const numbers = cells.filter((c) => c.trim() !== "" && Number.isFinite(Number(c))).map(Number);
  const sum = numbers.reduce((a, b) => a + b, 0);
  return { count: cells.length, numeric: numbers.length, sum: Math.round(sum * 100) / 100 };
};
