import type { ImportSavePayload } from "@/features/equipment/api/equipment.api";
import {
  COLUMNS,
  blankValues,
  parseInput,
  validateRows,
  viewNewRow,
  type Column,
  type Field,
  type Lookups,
  type RowErrors,
  type SheetRow,
  type Values,
} from "@/features/equipment/sheet/sheetModel";
import { cleanAsciiKey, normalizeText } from "./columnMatching";

export type ExistingMatchAction = "new_number" | "update" | "skip";

export interface ExistingEquipmentRef {
  equipment_id: number;
  serial_number: string;
  equipment_name: string;
  equipment_name_si?: string | null;
  category_id?: number;
  warehouse_id?: number | null;
}

export type CategoryResolution =
  | { action: "unresolved" }
  | { action: "use_existing"; categoryId: number }
  | { action: "create_new"; ref: string; name: string };

export type WarehouseResolution =
  | { action: "unresolved" }
  | { action: "use_existing"; warehouseId: number };

export interface AutoNoteInfo {
  kind: "format" | "bulk_from_total";
  rawValue: string;
}

export interface ImportRow {
  key: string;
  sourceRowNumber: number;
  values: Values;
  /** Fields provided by mapped columns, sameForAll defaults, or manual grid edits (preserved on updates). */
  touchedFields: Field[];
  rawCategory: string;
  rawWarehouse: string;
  existingMatch: ExistingEquipmentRef | null;
  existingAction: ExistingMatchAction;
  autoNotes: Partial<Record<Field, AutoNoteInfo>>;
  rawAutoValues: Partial<Record<Field, string>>;
  autoChanged: boolean;
}

export interface ImportState {
  rows: ImportRow[];
  strippedEmptyCount: number;
  autoFixCount: number;
  categoryResolutions: Record<string, CategoryResolution>;
  warehouseResolutions: Record<string, WarehouseResolution>;
  /** Preserves original display names for unknown keys keyed by lowercase trim. */
  unknownCategoryNames: Record<string, string>;
  unknownWarehouseNames: Record<string, string>;
}

export interface BuildImportInput {
  dataRows: string[][];
  sourceRowNumbers: number[];
  mapping: (Field | null)[];
  sameForAll: Partial<Record<Field, string>>;
  lookups: Lookups;
  existingEquipment: ExistingEquipmentRef[];
}

const COL_BY_KEY = new Map<Field, Column>(COLUMNS.filter((c) => c.kind !== "readonly").map((c) => [c.key as Field, c]));

let rowSeq = 1;
const nextRowKey = () => `imp-${rowSeq++}`;

export const trimCollapse = (raw: string): string => raw.trim().replace(/[ \t]{2,}/g, " ");

const isValidIsoDate = (s: string): boolean => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};

const indexExistingBySerial = (existingEquipment: ExistingEquipmentRef[]): Map<string, ExistingEquipmentRef> => {
  const map = new Map<string, ExistingEquipmentRef>();
  for (const item of existingEquipment) {
    const key = (item.serial_number ?? "").trim().toLowerCase();
    if (key) map.set(key, item);
  }
  return map;
};

/** Return map of row.key -> existing shop equipment matching its serial number. */
export const findExistingNumberMatches = (
  rows: ImportRow[],
  existingEquipment: ExistingEquipmentRef[],
): Map<string, ExistingEquipmentRef> => {
  const bySerial = indexExistingBySerial(existingEquipment);
  const matches = new Map<string, ExistingEquipmentRef>();
  for (const r of rows) {
    const k = r.values.serial_number.trim().toLowerCase();
    const match = k ? bySerial.get(k) : undefined;
    if (match) matches.set(r.key, match);
  }
  return matches;
};

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
};

const singularize = (s: string): string => {
  if (s.endsWith("ies") && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith("es") && s.length > 3) return s.slice(0, -2);
  if (s.endsWith("s") && s.length > 2) return s.slice(0, -1);
  return s;
};

/** Suggest an existing category/location when an uploaded name looks like a typo or plural. */
export const suggestClosestMatch = <T extends { name: string }>(unknown: string, options: T[]): T | null => {
  const target = normalizeText(unknown);
  const targetAscii = cleanAsciiKey(unknown);
  const targetSing = singularize(target);
  if (!target || !options.length) return null;

  let best: { item: T; score: number } | null = null;
  for (const opt of options) {
    const cand = normalizeText(opt.name);
    const candAscii = cleanAsciiKey(opt.name);
    const candSing = singularize(cand);
    if (!cand) continue;

    if (cand === target || (candAscii && candAscii === targetAscii) || candSing === targetSing) {
      return opt;
    }

    const dist = Math.min(levenshtein(target, cand), levenshtein(targetSing, candSing));
    const maxLen = Math.max(target.length, cand.length);
    const threshold = Math.max(2, Math.floor(maxLen * 0.35));
    const substringMatch = target.length >= 4 && cand.length >= 4 && (cand.includes(target) || target.includes(cand));

    if (dist <= threshold || substringMatch) {
      const score = (dist <= threshold ? (threshold - dist + 1) * 10 : 0) + (substringMatch ? 8 : 0);
      if (!best || score > best.score) best = { item: opt, score };
    }
  }
  return best?.item ?? null;
};

const findLookupMatch = <T>(items: T[], getName: (x: T) => string, rawName: string): T | null => {
  const norm = normalizeText(rawName);
  if (!norm) return null;
  return items.find((x) => normalizeText(getName(x)) === norm) ?? null;
};

/** Build initial editable step-3 import state from mapped file rows. */
export const buildInitialImportState = ({
  dataRows,
  sourceRowNumbers,
  mapping,
  sameForAll,
  lookups,
  existingEquipment,
}: BuildImportInput): ImportState => {
  const mappedFields = new Set<Field>(mapping.filter((f): f is Field => f !== null));
  const fieldColIndices = new Map<Field, number>();
  mapping.forEach((f, idx) => {
    if (f !== null) fieldColIndices.set(f, idx);
  });

  const existingBySerial = indexExistingBySerial(existingEquipment);
  const rows: ImportRow[] = [];
  const unknownCategoryNames: Record<string, string> = {};
  const unknownWarehouseNames: Record<string, string> = {};
  const categoryResolutions: Record<string, CategoryResolution> = {};
  const warehouseResolutions: Record<string, WarehouseResolution> = {};

  let strippedEmptyCount = 0;
  let autoFixCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i] ?? [];
    const hasAnyMappedContent = Array.from(fieldColIndices.values()).some((colIdx) => (rawRow[colIdx] ?? "").trim() !== "");
    if (!hasAnyMappedContent) {
      strippedEmptyCount++;
      continue;
    }

    const values = blankValues();
    const touchedSet = new Set<Field>();
    const autoNotes: Partial<Record<Field, AutoNoteInfo>> = {};
    const rawAutoValues: Partial<Record<Field, string>> = {};
    let rowAutoChanged = false;
    let rawCategory = "";
    let rawWarehouse = "";

    // Apply "Use the same value for every row" defaults for unmapped fields
    for (const [fKey, val] of Object.entries(sameForAll) as [Field, string][]) {
      if (!mappedFields.has(fKey) && val !== undefined && val !== "") {
        values[fKey] = val;
        touchedSet.add(fKey);
      }
    }

    for (const [field, colIdx] of fieldColIndices.entries()) {
      const col = COL_BY_KEY.get(field);
      if (!col) continue;
      touchedSet.add(field);
      const originalRaw = (rawRow[colIdx] ?? "").trim();
      if (!originalRaw) {
        if (sameForAll[field]) values[field] = sameForAll[field]!;
        continue;
      }

      const collapsed = trimCollapse(originalRaw);
      if (collapsed !== originalRaw) {
        autoNotes[field] = { kind: "format", rawValue: originalRaw };
        rawAutoValues[field] = originalRaw;
        rowAutoChanged = true;
        autoFixCount++;
      }

      if (field === "category_id") {
        const match = findLookupMatch(lookups.categories, (c) => c.category_name, collapsed);
        if (match) {
          values.category_id = String(match.category_id);
        } else {
          values.category_id = "";
          rawCategory = collapsed;
          const k = normalizeText(collapsed);
          if (!unknownCategoryNames[k]) {
            unknownCategoryNames[k] = collapsed;
            categoryResolutions[k] = { action: "unresolved" };
          }
        }
        continue;
      }

      if (field === "warehouse_id") {
        const match = findLookupMatch(lookups.warehouses, (w) => w.location_name, collapsed);
        if (match) {
          values.warehouse_id = String(match.warehouse_id);
        } else {
          values.warehouse_id = "";
          rawWarehouse = collapsed;
          const k = normalizeText(collapsed);
          if (!unknownWarehouseNames[k]) {
            unknownWarehouseNames[k] = collapsed;
            warehouseResolutions[k] = { action: "unresolved" };
          }
        }
        continue;
      }

      if (col.kind === "text") {
        values[field] = collapsed;
        continue;
      }

      const parsed = parseInput(col, collapsed, lookups);
      if (parsed !== null) {
        values[field] = parsed;
        if (parsed !== collapsed) {
          autoNotes[field] = { kind: "format", rawValue: originalRaw };
          rawAutoValues[field] = originalRaw;
          rowAutoChanged = true;
          autoFixCount++;
        }
      } else {
        // Keep unreadable values verbatim (e.g. "free" in rate) so validation marks them red instead of zeroing.
        values[field] = collapsed;
      }
    }

    // Turn on Qty (bulk) automatically when Total > 1
    const totalNum = Number(values.total_owned_qty);
    if (Number.isFinite(totalNum) && totalNum > 1 && values.is_bulk_item !== "true") {
      rawAutoValues.is_bulk_item = values.is_bulk_item;
      values.is_bulk_item = "true";
      touchedSet.add("is_bulk_item");
      autoNotes.is_bulk_item = { kind: "bulk_from_total", rawValue: values.total_owned_qty };
      rowAutoChanged = true;
      autoFixCount++;
    }

    const serialKey = values.serial_number.trim().toLowerCase();
    const existingMatch = serialKey ? existingBySerial.get(serialKey) ?? null : null;

    rows.push({
      key: nextRowKey(),
      sourceRowNumber: sourceRowNumbers[i] ?? i + 1,
      values,
      touchedFields: Array.from(touchedSet),
      rawCategory,
      rawWarehouse,
      existingMatch,
      existingAction: "new_number",
      autoNotes,
      rawAutoValues,
      autoChanged: rowAutoChanged,
    });
  }

  return {
    rows,
    strippedEmptyCount,
    autoFixCount,
    categoryResolutions,
    warehouseResolutions,
    unknownCategoryNames,
    unknownWarehouseNames,
  };
};

/** Create an editable empty grid for users choosing "Start with an empty sheet". */
export const buildEmptyImportState = (defaultWarehouseId = "", rowCount = 20): ImportState => ({
  rows: Array.from({ length: rowCount }, (_, i) => ({
    key: nextRowKey(),
    sourceRowNumber: i + 1,
    values: blankValues({ warehouse_id: defaultWarehouseId }),
    touchedFields: defaultWarehouseId ? ["warehouse_id"] : [],
    rawCategory: "",
    rawWarehouse: "",
    existingMatch: null,
    existingAction: "new_number",
    autoNotes: {},
    rawAutoValues: {},
    autoChanged: false,
  })),
  strippedEmptyCount: 0,
  autoFixCount: 0,
  categoryResolutions: {},
  warehouseResolutions: {},
  unknownCategoryNames: {},
  unknownWarehouseNames: {},
});

/** Revert automatic formatting tidies back to the raw strings from the file. */
export const revertAutoCleanFixes = (state: ImportState): ImportState => {
  let reverted = false;
  const rows = state.rows.map((row) => {
    const rawEntries = Object.entries(row.rawAutoValues) as [Field, string][];
    if (!rawEntries.length) return row;
    reverted = true;
    const nextValues = { ...row.values };
    for (const [field, rawVal] of rawEntries) {
      nextValues[field] = rawVal;
    }
    return {
      ...row,
      values: nextValues,
      autoNotes: {},
      rawAutoValues: {},
      autoChanged: false,
    };
  });
  return reverted ? { ...state, rows, autoFixCount: 0 } : state;
};

export interface UnknownNameEntry {
  key: string;
  rawName: string;
  rowCount: number;
}

const collectRemainingUnknowns = (
  rows: ImportRow[],
  kind: "category" | "warehouse",
  knownNames: Record<string, string>,
): UnknownNameEntry[] => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.existingMatch && row.existingAction === "skip") continue;
    const raw = kind === "category" ? row.rawCategory : row.rawWarehouse;
    if (!raw) continue;
    const k = normalizeText(raw);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, rowCount]) => ({
    key,
    rawName: knownNames[key] ?? key,
    rowCount,
  }));
};

export const getUnknownCategories = (state: ImportState): UnknownNameEntry[] =>
  collectRemainingUnknowns(state.rows, "category", state.unknownCategoryNames);

export const getUnknownWarehouses = (state: ImportState): UnknownNameEntry[] =>
  collectRemainingUnknowns(state.rows, "warehouse", state.unknownWarehouseNames);

export const nextNewCategoryRef = (resolutions: Record<string, CategoryResolution>): string => {
  let maxId = 0;
  for (const res of Object.values(resolutions)) {
    if (res.action === "create_new") {
      const m = res.ref.match(/^newcat:(\d+)$/);
      if (m) maxId = Math.max(maxId, Number(m[1]));
    }
  }
  return `newcat:${maxId + 1}`;
};

export const applyCategoryResolution = (
  state: ImportState,
  unknownKey: string,
  resolution: CategoryResolution,
): ImportState => {
  const valueToApply =
    resolution.action === "use_existing"
      ? String(resolution.categoryId)
      : resolution.action === "create_new"
        ? resolution.ref
        : "";

  const rows = state.rows.map((row) => {
    if (normalizeText(row.rawCategory) !== unknownKey) return row;
    return {
      ...row,
      values: { ...row.values, category_id: valueToApply },
    };
  });

  return {
    ...state,
    rows,
    categoryResolutions: { ...state.categoryResolutions, [unknownKey]: resolution },
  };
};

export const applyWarehouseResolution = (
  state: ImportState,
  unknownKey: string,
  resolution: WarehouseResolution,
): ImportState => {
  const valueToApply = resolution.action === "use_existing" ? String(resolution.warehouseId) : "";
  const rows = state.rows.map((row) => {
    if (normalizeText(row.rawWarehouse) !== unknownKey) return row;
    return {
      ...row,
      values: { ...row.values, warehouse_id: valueToApply },
    };
  });
  return {
    ...state,
    rows,
    warehouseResolutions: { ...state.warehouseResolutions, [unknownKey]: resolution },
  };
};

/** Extend shop lookups with approved pending `newcat:*` entries so SheetGrid displays & edits them natively. */
export const buildExtendedLookups = (
  lookups: Lookups,
  categoryResolutions: Record<string, CategoryResolution>,
): Lookups => {
  const extraCats: Lookups["categories"] = [];
  const seenRefs = new Set<string>();
  for (const res of Object.values(categoryResolutions)) {
    if (res.action === "create_new" && !seenRefs.has(res.ref)) {
      seenRefs.add(res.ref);
      extraCats.push({
        category_id: res.ref as unknown as number,
        category_name: res.name,
      });
    }
  }
  if (!extraCats.length) return lookups;
  return {
    categories: [...lookups.categories, ...extraCats],
    warehouses: lookups.warehouses,
  };
};

export const setRowExistingAction = (
  state: ImportState,
  rowKeys: string[],
  action: ExistingMatchAction,
): ImportState => {
  const keySet = new Set(rowKeys);
  const rows = state.rows.map((row) => {
    if (!keySet.has(row.key) || !row.existingMatch) return row;
    return { ...row, existingAction: action };
  });
  return { ...state, rows };
};

export const setAllExistingAction = (state: ImportState, action: ExistingMatchAction): ImportState => ({
  ...state,
  rows: state.rows.map((row) => (row.existingMatch ? { ...row, existingAction: action } : row)),
});

/** Apply manual cell edits from SheetGrid, updating existing-number matches and clearing manual category/location raw keys. */
export const updateImportCells = (
  state: ImportState,
  edits: { key: string; field: Field; value: string }[],
  existingEquipment: ExistingEquipmentRef[],
): ImportState => {
  if (!edits.length) return state;
  const existingBySerial = indexExistingBySerial(existingEquipment);
  const byRow = new Map<string, { field: Field; value: string }[]>();
  for (const e of edits) {
    const list = byRow.get(e.key) ?? [];
    list.push({ field: e.field, value: e.value });
    byRow.set(e.key, list);
  }

  const rows = state.rows.map((row) => {
    const list = byRow.get(row.key);
    if (!list) return row;
    const nextValues = { ...row.values };
    const touchedSet = new Set<Field>(row.touchedFields);
    let rawCategory = row.rawCategory;
    let rawWarehouse = row.rawWarehouse;
    let existingMatch = row.existingMatch;
    let existingAction = row.existingAction;

    for (const { field, value } of list) {
      nextValues[field] = value;
      touchedSet.add(field);
      if (field === "category_id") rawCategory = "";
      if (field === "warehouse_id") rawWarehouse = "";
      if (field === "serial_number") {
        const found = value.trim() ? existingBySerial.get(value.trim().toLowerCase()) ?? null : null;
        existingMatch = found;
        existingAction = "new_number";
      }
    }

    return {
      ...row,
      values: nextValues,
      touchedFields: Array.from(touchedSet),
      rawCategory,
      rawWarehouse,
      existingMatch,
      existingAction,
    };
  });

  return { ...state, rows };
};

/** Detect duplicate active rows inside the uploaded list (same name + category + base rate). Returns duplicateKey -> first source row number. */
export const findDuplicateRows = (rows: ImportRow[]): Map<string, number> => {
  const firstSeen = new Map<string, number>();
  const duplicates = new Map<string, number>();

  for (const row of rows) {
    if (row.existingMatch && row.existingAction === "skip") continue;
    const name = normalizeText(row.values.equipment_name);
    if (!name) continue;
    const catKey = row.values.category_id || `raw:${normalizeText(row.rawCategory)}`;
    const rateRaw = row.values.base_rental_price.trim();
    const rateNum = Number(rateRaw);
    const rateKey = rateRaw !== "" && Number.isFinite(rateNum) ? String(rateNum) : normalizeText(rateRaw);
    const sig = `${name}\u001f${catKey}\u001f${rateKey}`;

    const firstRow = firstSeen.get(sig);
    if (firstRow !== undefined) {
      duplicates.set(row.key, firstRow);
    } else {
      firstSeen.set(sig, row.sourceRowNumber);
    }
  }

  return duplicates;
};

export interface ImportValidationSummary {
  errors: Record<string, RowErrors>;
  extendedLookups: Lookups;
  problemRowKeys: Set<string>;
  errorCount: number;
}

export const validateImportState = (
  state: ImportState,
  lookups: Lookups,
  serverErrors: Record<string, RowErrors> = {},
): ImportValidationSummary => {
  const extendedLookups = buildExtendedLookups(lookups, state.categoryResolutions);
  const activeRows = state.rows.filter((r) => !(r.existingMatch && r.existingAction === "skip"));

  const validationSheetRows: SheetRow[] = activeRows.map((row) => {
    // When user chooses to give an existing match a fresh number, exclude its old serial from uniqueness collision here.
    const values =
      row.existingMatch && row.existingAction === "new_number" ? { ...row.values, serial_number: "" } : row.values;
    return viewNewRow({ key: row.key, values });
  });

  const errors: Record<string, RowErrors> = validateRows(validationSheetRows, { flagUnnamedNewRows: true });

  // Additional import checks: date format + multiple update rows targeting same existing machine
  const seenUpdateTarget = new Map<number, string>();
  for (const row of activeRows) {
    const dateVal = row.values.end_of_warranty_date.trim();
    if (dateVal && !isValidIsoDate(dateVal)) {
      errors[row.key] = { ...errors[row.key], end_of_warranty_date: "date_invalid" };
    }
    if (row.existingMatch && row.existingAction === "update") {
      const id = row.existingMatch.equipment_id;
      const firstKey = seenUpdateTarget.get(id);
      if (firstKey) {
        errors[firstKey] = { ...errors[firstKey], serial_number: "number_taken" };
        errors[row.key] = { ...errors[row.key], serial_number: "number_taken" };
      } else {
        seenUpdateTarget.set(id, row.key);
      }
    }
    if (serverErrors[row.key]) {
      errors[row.key] = { ...errors[row.key], ...serverErrors[row.key] };
    }
  }

  const problemRowKeys = new Set(Object.keys(errors));
  return {
    errors,
    extendedLookups,
    problemRowKeys,
    errorCount: problemRowKeys.size,
  };
};

// ── Undoable clean-up actions ──

const IMPORT_VALUE_FIELDS = Array.from(COL_BY_KEY.keys());

const isImportRowEmpty = (row: ImportRow): boolean =>
  IMPORT_VALUE_FIELDS.every((f) => {
    if (f === "minimum_rental_days" || f === "is_bulk_item" || f === "total_owned_qty") return true;
    return (row.values[f] ?? "").trim() === "";
  }) &&
  !row.rawCategory &&
  !row.rawWarehouse;

export const removeEmptyRows = (state: ImportState): ImportState => {
  const rows = state.rows.filter((r) => !isImportRowEmpty(r));
  return rows.length === state.rows.length ? state : { ...state, rows };
};

export const removeDuplicateRows = (state: ImportState): ImportState => {
  const dups = findDuplicateRows(state.rows);
  if (!dups.size) return state;
  return { ...state, rows: state.rows.filter((r) => !dups.has(r.key)) };
};

export const deleteRowsByKeys = (state: ImportState, keys: string[]): ImportState => {
  if (!keys.length) return state;
  const set = new Set(keys);
  const rows = state.rows.filter((r) => !set.has(r.key));
  return rows.length === state.rows.length ? state : { ...state, rows };
};

export const fillDownSelection = (state: ImportState, keys: string[], field: Field): ImportState => {
  if (keys.length < 2) return state;
  const set = new Set(keys);
  const ordered = state.rows.filter((r) => set.has(r.key));
  if (ordered.length < 2) return state;
  const source = ordered[0];
  const val = source.values[field];
  const rawCat = source.rawCategory;
  const rawWh = source.rawWarehouse;

  const rows = state.rows.map((r) => {
    if (!set.has(r.key) || r.key === source.key) return r;
    const touchedFields = r.touchedFields.includes(field) ? r.touchedFields : [...r.touchedFields, field];
    return {
      ...r,
      values: { ...r.values, [field]: val },
      touchedFields,
      rawCategory: field === "category_id" ? rawCat : r.rawCategory,
      rawWarehouse: field === "warehouse_id" ? rawWh : r.rawWarehouse,
    };
  });
  return { ...state, rows };
};

export const findAndReplaceInColumn = (
  state: ImportState,
  field: Field,
  findText: string,
  replaceText: string,
  opts: { matchCase?: boolean; wholeCell?: boolean; lookups: Lookups; existingEquipment: ExistingEquipmentRef[] },
): { state: ImportState; replacedCount: number } => {
  if (!findText) return { state, replacedCount: 0 };
  const col = COL_BY_KEY.get(field);
  if (!col) return { state, replacedCount: 0 };

  const needle = opts.matchCase ? findText : findText.toLowerCase();
  const existingBySerial = indexExistingBySerial(opts.existingEquipment);
  let replacedCount = 0;

  const rows = state.rows.map((row) => {
    // For category/warehouse, also match raw text if still unresolved
    let current = row.values[field];
    if (field === "category_id" && !current && row.rawCategory) {
      current = row.rawCategory;
    } else if (field === "warehouse_id" && !current && row.rawWarehouse) {
      current = row.rawWarehouse;
    } else if (field === "category_id" && current) {
      const cat = opts.lookups.categories.find((c) => String(c.category_id) === current);
      if (cat) current = cat.category_name;
    } else if (field === "warehouse_id" && current) {
      const wh = opts.lookups.warehouses.find((w) => String(w.warehouse_id) === current);
      if (wh) current = wh.location_name;
    }

    const hay = opts.matchCase ? current : current.toLowerCase();
    const matches = opts.wholeCell ? hay === needle : hay.includes(needle);
    if (!matches) return row;

    const updatedText = opts.wholeCell
      ? replaceText
      : opts.matchCase
        ? current.split(findText).join(replaceText)
        : current.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replaceText);

    if (updatedText === current) return row;
    replacedCount++;

    const nextValues = { ...row.values };
    let rawCategory = row.rawCategory;
    let rawWarehouse = row.rawWarehouse;
    let existingMatch = row.existingMatch;
    let existingAction = row.existingAction;

    if (field === "category_id") {
      const cat = findLookupMatch(opts.lookups.categories, (c) => c.category_name, updatedText);
      if (cat) {
        nextValues.category_id = String(cat.category_id);
        rawCategory = "";
      } else {
        nextValues.category_id = "";
        rawCategory = trimCollapse(updatedText);
      }
    } else if (field === "warehouse_id") {
      const wh = findLookupMatch(opts.lookups.warehouses, (w) => w.location_name, updatedText);
      if (wh) {
        nextValues.warehouse_id = String(wh.warehouse_id);
        rawWarehouse = "";
      } else {
        nextValues.warehouse_id = "";
        rawWarehouse = trimCollapse(updatedText);
      }
    } else if (col.kind === "text") {
      nextValues[field] = trimCollapse(updatedText);
      if (field === "serial_number") {
        existingMatch = nextValues.serial_number ? existingBySerial.get(nextValues.serial_number.toLowerCase()) ?? null : null;
        existingAction = "new_number";
      }
    } else {
      const parsed = parseInput(col, updatedText, opts.lookups);
      nextValues[field] = parsed !== null ? parsed : trimCollapse(updatedText);
    }

    return {
      ...row,
      values: nextValues,
      touchedFields: row.touchedFields.includes(field) ? row.touchedFields : [...row.touchedFields, field],
      rawCategory,
      rawWarehouse,
      existingMatch,
      existingAction,
    };
  });

  if (!replacedCount) return { state, replacedCount: 0 };

  // Ensure any newly introduced unknown categories/warehouses are tracked
  const unknownCategoryNames = { ...state.unknownCategoryNames };
  const categoryResolutions = { ...state.categoryResolutions };
  const unknownWarehouseNames = { ...state.unknownWarehouseNames };
  const warehouseResolutions = { ...state.warehouseResolutions };

  for (const r of rows) {
    if (r.rawCategory) {
      const k = normalizeText(r.rawCategory);
      if (!unknownCategoryNames[k]) {
        unknownCategoryNames[k] = r.rawCategory;
        categoryResolutions[k] = { action: "unresolved" };
      }
    }
    if (r.rawWarehouse) {
      const k = normalizeText(r.rawWarehouse);
      if (!unknownWarehouseNames[k]) {
        unknownWarehouseNames[k] = r.rawWarehouse;
        warehouseResolutions[k] = { action: "unresolved" };
      }
    }
  }

  return {
    state: {
      ...state,
      rows,
      unknownCategoryNames,
      categoryResolutions,
      unknownWarehouseNames,
      warehouseResolutions,
    },
    replacedCount,
  };
};

export const clearNumbersInSelection = (state: ImportState, keys: string[]): ImportState => {
  const targetAll = !keys.length;
  const set = new Set(keys);
  let changed = false;
  const rows = state.rows.map((r) => {
    if (!targetAll && !set.has(r.key)) return r;
    if (!r.values.serial_number && !r.existingMatch) return r;
    changed = true;
    return {
      ...r,
      values: { ...r.values, serial_number: "" },
      existingMatch: null,
      existingAction: "new_number" as ExistingMatchAction,
    };
  });
  return changed ? { ...state, rows } : state;
};

export const copyRateToBlankExtraRate = (state: ImportState): { state: ImportState; updatedCount: number } => {
  let updatedCount = 0;
  const rows = state.rows.map((r) => {
    if (r.existingMatch && r.existingAction === "skip") return r;
    const base = r.values.base_rental_price.trim();
    const extra = r.values.extra_daily_rate.trim();
    const num = Number(base);
    if (!base || !Number.isFinite(num) || num <= 0 || extra !== "") return r;
    updatedCount++;
    const touchedFields = r.touchedFields.includes("extra_daily_rate") ? r.touchedFields : [...r.touchedFields, "extra_daily_rate" as Field];
    return { ...r, values: { ...r.values, extra_daily_rate: base }, touchedFields };
  });
  return { state: updatedCount ? { ...state, rows } : state, updatedCount };
};

const serializeFieldValue = (field: Field, raw: string, keepNumberForUpdate = false): unknown => {
  const s = raw.trim();
  switch (field) {
    case "base_rental_price":
    case "extra_daily_rate":
    case "purchase_cost":
    case "minimum_rental_days":
    case "total_owned_qty":
    case "warranty_period_months":
      return s === "" ? null : Number(s);
    case "is_bulk_item":
      return s === "true";
    case "category_id":
      return s.startsWith("newcat:") ? s : s === "" ? null : Number(s);
    case "warehouse_id":
      return s === "" ? null : Number(s);
    case "serial_number":
      return keepNumberForUpdate ? s : s || undefined;
    case "equipment_name_si":
    case "end_of_warranty_date":
      return s === "" ? null : s;
    default:
      return s;
  }
};

/** Serialize active creates, updates, and used pending categories into POST /api/equipment/import-save payload. */
export const buildImportPayload = (state: ImportState): ImportSavePayload => {
  const creates: ImportSavePayload["creates"] = [];
  const updates: ImportSavePayload["updates"] = [];
  const usedRefs = new Set<string>();

  for (const row of state.rows) {
    if (row.existingMatch && row.existingAction === "skip") continue;

    if (row.values.category_id.startsWith("newcat:")) {
      usedRefs.add(row.values.category_id);
    }

    if (row.existingMatch && row.existingAction === "update") {
      const changes: Record<string, unknown> = {};
      const fieldsToSend = row.touchedFields.length ? row.touchedFields : IMPORT_VALUE_FIELDS;
      for (const field of fieldsToSend) {
        if (field === "serial_number") continue;
        const val = row.values[field];
        if (val !== "" || row.touchedFields.includes(field)) {
          changes[field] = serializeFieldValue(field, val, true);
        }
      }
      updates.push({
        key: row.key,
        equipment_id: row.existingMatch.equipment_id,
        changes,
      });
    } else {
      const values: Record<string, unknown> = {};
      for (const field of IMPORT_VALUE_FIELDS) {
        if (field === "serial_number" && row.existingMatch && row.existingAction === "new_number") {
          continue; // Omit duplicate serial so backend auto-generates next EQ-###
        }
        const serialized = serializeFieldValue(field, row.values[field]);
        if (serialized !== undefined && serialized !== null) {
          values[field] = serialized;
        }
      }
      creates.push({ key: row.key, values });
    }
  }

  const newCategories: ImportSavePayload["newCategories"] = [];
  const seenRefs = new Set<string>();
  for (const res of Object.values(state.categoryResolutions)) {
    if (res.action === "create_new" && usedRefs.has(res.ref) && !seenRefs.has(res.ref)) {
      seenRefs.add(res.ref);
      newCategories.push({ ref: res.ref, name: res.name });
    }
  }

  return { newCategories, creates, updates };
};
