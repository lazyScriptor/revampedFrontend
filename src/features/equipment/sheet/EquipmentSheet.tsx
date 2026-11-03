import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  FormControlLabel, IconButton, InputAdornment, Menu, MenuItem, TextField, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import RedoIcon from "@mui/icons-material/Redo";
import SearchIcon from "@mui/icons-material/Search";
import UndoIcon from "@mui/icons-material/Undo";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { resolveAssetUrl } from "@/lib/assetUrl";
import { useToast } from "@/components/ui/AppToast";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { fetchEquipment, fetchNextEquipment, saveEquipmentSheet } from "../api/equipment.api";
import { EquipmentPhotoDialog } from "../components/EquipmentPhotoDialog";
import { useCategoryOptions } from "../hooks/useCategoryHooks";
import { useUploadEquipmentImage } from "../hooks/useEquipmentPhoto";
import { CompressError, assertImageFile, compressImage } from "../lib/compressImage";
import { formatSerial, nextGridSerial, parseName, parsePaste, renumberName, renumberSinhala } from "../lib/equipmentNumbering";
import { SheetCellEditor, type EditorMove } from "./SheetCellEditor";
import { SheetRowView, type RowLabels } from "./SheetRowView";
import {
  COLUMNS, EMPTY_STATE, NUMERIC_KINDS, alignsRight, baseRow, blankValues, buildPayload, countChanges, displayValue, isDirty, nextNameNumberIn, parseInput,
  selectionStats, setCells, toggleDeleted, validateRows, viewNewRow, viewRow, visibleRows,
  type Column, type ColumnKey, type Field, type Lookups, type NewRow, type RowErrors, type SheetRow, type SheetState, type SheetView, type SortState, type Values,
} from "./sheetModel";

const ROW_H = 24;
const HEAD_H = 26;
const NUM_W = 38;
const PHOTO_W = 28;
const ACTS_W = 46;
const FROZEN: string[] = ["equipment_name"];
const COLUMNS_KEY = "geargrid-equipment-sheet-columns";
const WIDTHS_KEY = "geargrid-equipment-sheet-widths";

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(key) || "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* the choice just isn't remembered */
  }
};

let newSeq = 1;
interface History {
  past: SheetState[];
  present: SheetState;
  future: SheetState[];
}
interface CellRef {
  row: string;
  col: ColumnKey;
}
interface Editing extends CellRef {
  initial?: string;
}

/** Warns before leaving with unsaved changes, for this app's links and for closing the tab. */
function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const { t } = useTranslation();
  const blocker = useBlocker({ shouldBlockFn: () => dirty, enableBeforeUnload: dirty, withResolver: true });
  return (
    <Dialog open={blocker.status === "blocked"} onClose={() => blocker.reset?.()}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t("equipment.sheet.leaveTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t("equipment.sheet.leaveBody")}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => blocker.proceed?.()} sx={{ textTransform: "none", fontWeight: 700 }}>
          {t("equipment.sheet.leaveAnyway")}
        </Button>
        <Button variant="contained" disableElevation onClick={() => blocker.reset?.()} sx={{ textTransform: "none", fontWeight: 800 }}>
          {t("equipment.sheet.keepEditing")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Every machine in one spreadsheet: edit in place, see what changed, save it all together. */
export function EquipmentSheet() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const canEdit = useAuthStore((s) => s.hasPermission("equipment:edit"));
  const canCreate = useAuthStore((s) => s.hasPermission("equipment:create"));
  const canDelete = useAuthStore((s) => s.hasPermission("equipment:delete"));
  const upload = useUploadEquipmentImage();
  const { data: categories = [] } = useCategoryOptions();
  const { data: warehouses = [] } = useWarehouseOptions();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["equipment", "sheet"],
    queryFn: () => fetchEquipment(1, 5000),
    refetchOnWindowFocus: false,
  });

  const lookups: Lookups = useMemo(() => ({ categories, warehouses }), [categories, warehouses]);
  const [hist, setHist] = useState<History>({ past: [], present: EMPTY_STATE, future: [] });
  const state = hist.present;
  const commit = useCallback((fn: (s: SheetState) => SheetState) => {
    setHist((h) => {
      const next = fn(h.present);
      return next === h.present ? h : { past: [...h.past.slice(-99), h.present], present: next, future: [] };
    });
  }, []);
  const undo = useCallback(() => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)), []);
  const redo = useCallback(() => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)), []);

  const [serverErrors, setServerErrors] = useState<Record<string, RowErrors>>({});
  const [serverSerial, setServerSerial] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [view, setView] = useState<SheetView>("all");
  const [sort, setSort] = useState<SortState | null>(null);
  const [hidden, setHidden] = useState<string[]>(() => readStored<string[]>(COLUMNS_KEY, []));
  const [widths, setWidths] = useState<Record<string, number>>(() => readStored<Record<string, number>>(WIDTHS_KEY, {}));
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [photoRow, setPhotoRow] = useState<SheetRow | null>(null);
  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [focus, setFocus] = useState<CellRef | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(800);

  const scroller = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const photoFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNextEquipment().then((n) => setServerSerial(n.serial_number)).catch(() => {});
  }, []);

  // ── rows ──
  const base = useMemo(() => (data?.equipment ?? []).map((m) => baseRow(m, resolveAssetUrl)), [data]);
  const bases = useMemo(() => new Map(base.map((r) => [r.key, r])), [base]);
  const allRows = useMemo(
    () => [...state.added.map(viewNewRow), ...base.map((r) => viewRow(r, state.changes[r.key], state.deleted.includes(r.key)))],
    [base, state],
  );
  const errors = useMemo(() => {
    const merged: Record<string, RowErrors> = { ...validateRows(allRows) };
    for (const [key, e] of Object.entries(serverErrors)) merged[key] = { ...e, ...merged[key] };
    return merged;
  }, [allRows, serverErrors]);
  const rows = useMemo(() => visibleRows(allRows, { search, categoryId: categoryFilter, view, sort, errors }, lookups), [allRows, search, categoryFilter, view, sort, errors, lookups]);
  const columns = useMemo(() => COLUMNS.filter((c) => !hidden.includes(c.key)).map((c) => ({ ...c, width: widths[c.key] ?? c.width })), [hidden, widths]);
  const rowIndex = useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);
  const colIndex = useMemo(() => new Map(columns.map((c, i) => [c.key as string, i])), [columns]);

  const counts = countChanges(state);
  const dirty = isDirty(state);
  const errorCount = Object.keys(errors).length;
  const viewCounts = useMemo(
    () => ({
      noPhoto: base.filter((r) => !r.machine?.image_url).length,
      noSinhala: base.filter((r) => !r.values.equipment_name_si.trim()).length,
      changed: counts.editedRows + counts.added + counts.deleted,
    }),
    [base, counts.editedRows, counts.added, counts.deleted],
  );

  const lefts = useMemo(() => {
    const out: Record<string, number> = { __photo: NUM_W };
    let left = NUM_W + PHOTO_W;
    for (const c of columns) {
      if (FROZEN.includes(c.key)) {
        out[c.key] = left;
        left += c.width;
      }
    }
    out.__end = left;
    return out;
  }, [columns]);

  // ── selection ──
  const range = useMemo(() => {
    if (!anchor || !focus) return null;
    const r1 = rowIndex.get(anchor.row);
    const r2 = rowIndex.get(focus.row);
    const c1 = colIndex.get(anchor.col);
    const c2 = colIndex.get(focus.col);
    if (r1 === undefined || r2 === undefined || c1 === undefined || c2 === undefined) return null;
    return { top: Math.min(r1, r2), bottom: Math.max(r1, r2), left: Math.min(c1, c2), right: Math.max(c1, c2) };
  }, [anchor, focus, rowIndex, colIndex]);
  const wholeRows = !!range && range.left === 0 && range.right === columns.length - 1;
  const selectedRowKeys = useMemo(() => (range && (wholeRows || range.bottom > range.top) ? rows.slice(range.top, range.bottom + 1).map((r) => r.key) : []), [range, wholeRows, rows]);

  const stats = useMemo(() => {
    if (!range || range.bottom === range.top && range.left === range.right) return null;
    const cells: string[] = [];
    for (let r = range.top; r <= range.bottom && cells.length < 20000; r++) {
      for (let c = range.left; c <= range.right; c++) {
        if (NUMERIC_KINDS.includes(columns[c].kind) || columns[c].kind === "readonly") cells.push(displayValue(columns[c], rows[r], lookups));
      }
    }
    return { ...selectionStats(cells), rows: range.bottom - range.top + 1, cols: range.right - range.left + 1 };
  }, [range, columns, rows, lookups]);

  const isEditable = useCallback(
    (row: SheetRow | undefined, col: Column | undefined) => !!row && !!col && col.kind !== "readonly" && !row.isDeleted && (row.isNew ? canCreate : canEdit),
    [canCreate, canEdit],
  );

  const reveal = useCallback(
    (r: number, c: number) => {
      const el = scroller.current;
      if (!el) return;
      const top = r * ROW_H;
      const bodyH = el.clientHeight - HEAD_H;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + ROW_H > el.scrollTop + bodyH) el.scrollTop = top + ROW_H - bodyH;
      let x = lefts.__end;
      for (let i = 0; i < c; i++) if (!FROZEN.includes(columns[i].key)) x += columns[i].width;
      const cw = columns[c]?.width ?? 0;
      if (FROZEN.includes(columns[c]?.key)) return;
      if (x - lefts.__end < el.scrollLeft) el.scrollLeft = x - lefts.__end;
      else if (x + cw + ACTS_W > el.scrollLeft + el.clientWidth) el.scrollLeft = x + cw + ACTS_W - el.clientWidth;
    },
    [columns, lefts],
  );

  const moveTo = useCallback(
    (r: number, c: number, extend = false) => {
      const nr = Math.max(0, Math.min(rows.length - 1, r));
      const nc = Math.max(0, Math.min(columns.length - 1, c));
      const row = rows[nr];
      const col = columns[nc];
      if (!row || !col) return;
      const ref = { row: row.key, col: col.key };
      setFocus(ref);
      if (!extend) setAnchor(ref);
      reveal(nr, nc);
    },
    [rows, columns, reveal],
  );

  const refocus = () => scroller.current?.focus({ preventScroll: true });

  // ── writing ──
  const applyEdits = useCallback(
    (edits: { key: string; field: Field; value: string }[]) => {
      if (!edits.length) return;
      commit((s) => setCells(s, bases, edits));
      setServerErrors((prev) => {
        const touched = edits.filter((e) => prev[e.key]);
        if (!touched.length) return prev;
        const next = { ...prev };
        for (const e of touched) delete next[e.key];
        return next;
      });
    },
    [commit, bases],
  );

  const nextSerial = useCallback(
    (extra: string[] = []) => formatSerial(nextGridSerial(serverSerial, [...allRows.map((r) => r.values.serial_number), ...extra])),
    [serverSerial, allRows],
  );
  const defaultWarehouse = warehouses.length === 1 ? String(warehouses[0].warehouse_id) : "";

  const insertRows = useCallback(
    (made: NewRow[], select = true) => {
      commit((s) => ({ ...s, added: [...made, ...s.added] }));
      setView("all");
      if (select && made[0]) {
        const ref = { row: made[0].key, col: "equipment_name" as ColumnKey };
        setAnchor(ref);
        setFocus(ref);
        if (scroller.current) scroller.current.scrollTop = 0;
      }
    },
    [commit],
  );

  const addRow = () => {
    const key = `n${newSeq++}`;
    insertRows([{ key, values: blankValues({ serial_number: nextSerial(), warehouse_id: defaultWarehouse }) }]);
    setEditing({ row: key, col: "equipment_name" });
  };

  /** A new row picked a machine: it becomes the next after it, in that machine's format. */
  const followMachine = useCallback(
    async (key: string, machineId: number) => {
      const next = await fetchNextEquipment(machineId).catch(() => null);
      refocus();
      if (!next) {
        toast.showError(t("equipment.bulkGrid.nextFailed"));
        return;
      }
      setServerSerial(next.serial_number);
      if (next.is_bulk_item) toast.showInfo(t("equipment.bulkGrid.quantityMachine", { name: next.base_name, total: next.total_owned_qty }));
      commit((s) => {
        const others = allRows.filter((r) => r.key !== key).map((r) => r.values.equipment_name);
        const n = nextNameNumberIn(next.equipment_name ?? "", others, next.name_number ?? 2);
        return {
          ...s,
          added: s.added.map((r) => {
            if (r.key !== key) return r;
            const values: Values = {
              ...r.values,
              equipment_name: next.is_bulk_item ? next.base_name ?? "" : renumberName(next.equipment_name, n),
              equipment_name_si: next.is_bulk_item ? next.base_name_si ?? "" : renumberSinhala(next.equipment_name_si, next.equipment_name, n),
              category_id: next.category_id ? String(next.category_id) : r.values.category_id,
              warehouse_id: next.warehouse_id ? String(next.warehouse_id) : r.values.warehouse_id,
              base_rental_price: next.base_rental_price === null || next.base_rental_price === undefined ? "" : String(next.base_rental_price),
              extra_daily_rate: next.extra_daily_rate === null || next.extra_daily_rate === undefined ? "" : String(next.extra_daily_rate),
              minimum_rental_days: String(next.minimum_rental_days ?? 1),
              is_bulk_item: next.is_bulk_item ? "true" : "false",
            };
            return { ...r, values };
          }),
        };
      });
    },
    [allRows, commit, t, toast],
  );

  const duplicateRow = async (row: SheetRow) => {
    const next = row.id ? await fetchNextEquipment(row.id).catch(() => null) : null;
    const names = allRows.map((r) => r.values.equipment_name);
    const quantity = row.values.is_bulk_item === "true";
    const n = nextNameNumberIn(row.values.equipment_name, names, next?.name_number ?? 2);
    const source = state.added.find((a) => a.key === row.key);
    const made: NewRow = {
      key: `n${newSeq++}`,
      photo: source?.photo ?? null,
      photoUrl: source?.photoUrl ?? null,
      values: {
        ...row.values,
        serial_number: nextSerial(),
        equipment_name: quantity ? parseName(row.values.equipment_name).text : renumberName(row.values.equipment_name, n),
        equipment_name_si: quantity ? parseName(row.values.equipment_name_si).text : renumberSinhala(row.values.equipment_name_si, row.values.equipment_name, n),
      },
    };
    insertRows([made]);
    refocus();
  };

  const deleteRows = useCallback(
    (keys: string[]) => {
      const blocked = keys.filter((k) => Number(bases.get(k)?.machine?.rented_qty) > 0 && !state.deleted.includes(k));
      const allowed = keys.filter((k) => !blocked.includes(k));
      if (blocked.length) toast.showWarning(t("equipment.sheet.cantDeleteRented", { count: blocked.length }));
      if (allowed.length) commit((s) => toggleDeleted(s, allowed));
    },
    [bases, commit, state.deleted, t, toast],
  );

  const finishEdit = (value: string, move: EditorMove, fill: boolean) => {
    const target = editing;
    setEditing(null);
    if (!target) return;
    const r = rowIndex.get(target.row);
    const c = colIndex.get(target.col);
    if (r === undefined || c === undefined) return;
    const col = columns[c];
    const parsed = col.kind === "category" || col.kind === "warehouse" ? value : parseInput(col, value, lookups);
    if (parsed === null) toast.showWarning(t("equipment.sheet.notValid"));
    else if (fill && range) {
      const edits: { key: string; field: Field; value: string }[] = [];
      for (let y = range.top; y <= range.bottom; y++) {
        for (let x = range.left; x <= range.right; x++) {
          if (isEditable(rows[y], columns[x])) {
            const v = columns[x].kind === col.kind ? parsed : parseInput(columns[x], value, lookups);
            if (v !== null) edits.push({ key: rows[y].key, field: columns[x].key as Field, value: v });
          }
        }
      }
      applyEdits(edits);
    } else applyEdits([{ key: target.row, field: col.key as Field, value: parsed }]);
    refocus();
    if (move === "down") moveTo(r + 1, c);
    else if (move === "up") moveTo(r - 1, c);
    else if (move === "right") moveTo(r, c + 1);
    else if (move === "left") moveTo(r, c - 1);
  };

  // ── clipboard ──
  const onCopy = (e: ClipboardEvent) => {
    if (editing || !range) return;
    e.preventDefault();
    const lines: string[] = [];
    for (let y = range.top; y <= range.bottom; y++) {
      const cells: string[] = [];
      for (let x = range.left; x <= range.right; x++) cells.push(displayValue(columns[x], rows[y], lookups));
      lines.push(cells.join("\t"));
    }
    e.clipboardData.setData("text/plain", lines.join("\n"));
  };

  const onPaste = (e: ClipboardEvent) => {
    if (editing || !range) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const grid = parsePaste(text) ?? [[text]];
    const edits: { key: string; field: Field; value: string }[] = [];
    let skipped = 0;
    const put = (row: SheetRow, col: Column | undefined, raw: string) => {
      if (!col) return;
      if (!isEditable(row, col)) return;
      const v = parseInput(col, raw, lookups);
      if (v === null) skipped++;
      else edits.push({ key: row.key, field: col.key as Field, value: v });
    };
    if (grid.length === 1 && grid[0].length === 1) {
      // One value into a selection fills all of it.
      for (let y = range.top; y <= range.bottom; y++) for (let x = range.left; x <= range.right; x++) put(rows[y], columns[x], grid[0][0]);
    } else {
      const made: NewRow[] = [];
      const serials: string[] = [];
      grid.forEach((cells, dy) => {
        const row = rows[range.top + dy];
        if (row) {
          cells.forEach((value, dx) => put(row, columns[range.left + dx], value));
        } else if (canCreate) {
          // Past the last row: spreadsheet rows become new machines.
          const serial = nextSerial(serials);
          serials.push(serial);
          const values = blankValues({ serial_number: serial, warehouse_id: defaultWarehouse });
          cells.forEach((value, dx) => {
            const col = columns[range.left + dx];
            if (!col || col.kind === "readonly") return;
            const v = parseInput(col, value, lookups);
            if (v === null) skipped++;
            else values[col.key as Field] = v;
          });
          made.push({ key: `n${newSeq++}`, values });
        }
      });
      if (made.length) insertRows(made, false);
    }
    applyEdits(edits);
    if (skipped) toast.showWarning(t("equipment.sheet.pasteSkipped", { count: skipped }));
  };

  // ── keyboard ──
  const onKeyDown = (e: KeyboardEvent) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && key === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && key === "s") {
      e.preventDefault();
      requestSave();
      return;
    }
    if (!focus) return;
    const r = rowIndex.get(focus.row);
    const c = colIndex.get(focus.col);
    if (r === undefined || c === undefined) return;
    const row = rows[r];
    const col = columns[c];
    const pageRows = Math.max(1, Math.floor((viewH - HEAD_H) / ROW_H) - 1);
    const go = (nr: number, nc: number) => {
      e.preventDefault();
      moveTo(nr, nc, e.shiftKey);
    };
    if (mod && key === "a") {
      e.preventDefault();
      setAnchor({ row: rows[0].key, col: columns[0].key });
      setFocus({ row: rows[rows.length - 1].key, col: columns[columns.length - 1].key });
      return;
    }
    if (mod && key === "d" && range) {
      // Fill down from the top of the selection.
      e.preventDefault();
      const edits: { key: string; field: Field; value: string }[] = [];
      for (let x = range.left; x <= range.right; x++) {
        const field = columns[x].key as Field;
        const from = rows[range.top].values[field];
        for (let y = range.top + 1; y <= range.bottom; y++) if (isEditable(rows[y], columns[x])) edits.push({ key: rows[y].key, field, value: from });
      }
      applyEdits(edits);
      return;
    }
    switch (e.key) {
      case "ArrowUp":
        return go(mod ? 0 : r - 1, c);
      case "ArrowDown":
        return go(mod ? rows.length - 1 : r + 1, c);
      case "ArrowLeft":
        return go(r, mod ? 0 : c - 1);
      case "ArrowRight":
        return go(r, mod ? columns.length - 1 : c + 1);
      case "PageUp":
        return go(r - pageRows, c);
      case "PageDown":
        return go(r + pageRows, c);
      case "Home":
        return go(mod ? 0 : r, 0);
      case "End":
        return go(mod ? rows.length - 1 : r, columns.length - 1);
      case "Tab":
        e.preventDefault();
        moveTo(r, c + (e.shiftKey ? -1 : 1));
        return;
      case "Enter":
      case "F2":
        e.preventDefault();
        if (col.kind === "bool" && isEditable(row, col)) applyEdits([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
        else if (isEditable(row, col)) setEditing({ row: row.key, col: col.key });
        return;
      case "Delete":
      case "Backspace":
        if (range) {
          e.preventDefault();
          const edits: { key: string; field: Field; value: string }[] = [];
          for (let y = range.top; y <= range.bottom; y++) {
            for (let x = range.left; x <= range.right; x++) {
              if (isEditable(rows[y], columns[x]) && columns[x].kind !== "bool") edits.push({ key: rows[y].key, field: columns[x].key as Field, value: "" });
            }
          }
          applyEdits(edits);
        }
        return;
      case " ":
        if (col.kind === "bool" && isEditable(row, col)) {
          e.preventDefault();
          applyEdits([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
          return;
        }
    }
    // Open the cell before the key lands and leave the key alone, so the browser types it into the
    // input: that way Sinhala keyboards and the app's Sinhala typing see it like any other field.
    const opensCell = (e.key.length === 1 && !mod && !e.altKey) || e.key === "Process" || e.key === "Unidentified" || e.nativeEvent.isComposing;
    if (opensCell && isEditable(row, col) && col.kind !== "bool") {
      const types = col.kind === "text" || NUMERIC_KINDS.includes(col.kind);
      if (!types) e.preventDefault();
      flushSync(() => setEditing({ row: row.key, col: col.key, initial: types ? "" : undefined }));
    }
  };

  // ── mouse: handled once on the table, so the cells stay plain ──
  const cellAt = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    const td = el?.closest?.("td");
    const tr = td?.closest("tr");
    const key = tr?.getAttribute("data-k");
    if (!td || !key) return null;
    const c = td.getAttribute("data-c");
    return { key, col: c === null ? null : Number(c), isRowHead: td.hasAttribute("data-rowh") };
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input,select")) return;
    const cell = cellAt(target);
    if (!cell) return;
    e.preventDefault();
    if (editing) (document.activeElement as HTMLElement | null)?.blur();
    refocus();
    if (cell.isRowHead) {
      const ref = { row: cell.key, col: columns[columns.length - 1].key };
      if (e.shiftKey && anchor) setFocus(ref);
      else {
        setAnchor({ row: cell.key, col: columns[0].key });
        setFocus(ref);
      }
      dragging.current = true;
      return;
    }
    if (cell.col === null) return;
    const ref = { row: cell.key, col: columns[cell.col].key };
    setFocus(ref);
    if (!(e.shiftKey && anchor)) setAnchor(ref);
    dragging.current = true;
  };
  const onMouseOver = (e: ReactMouseEvent) => {
    if (!dragging.current || !e.buttons) return;
    const cell = cellAt(e.target);
    if (!cell) return;
    if (cell.isRowHead) setFocus({ row: cell.key, col: columns[columns.length - 1].key });
    else if (cell.col !== null) setFocus({ row: cell.key, col: columns[cell.col].key });
  };
  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const onDoubleClick = (e: ReactMouseEvent) => {
    const cell = cellAt(e.target);
    if (!cell || cell.col === null) return;
    const row = rows[rowIndex.get(cell.key) ?? -1];
    const col = columns[cell.col];
    if (isEditable(row, col) && col.kind !== "bool") setEditing({ row: cell.key, col: col.key });
  };

  const onClick = (e: ReactMouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-act]");
    if (!el) return;
    const key = el.closest("tr")?.getAttribute("data-k");
    const row = key ? rows[rowIndex.get(key) ?? -1] : null;
    if (!row) return;
    const act = el.getAttribute("data-act");
    if (act === "photo") {
      if (row.isNew) {
        photoFor.current = row.key;
        fileInput.current?.click();
      } else setPhotoRow(row);
    } else if (act === "duplicate") duplicateRow(row);
    else if (act === "delete") deleteRows([row.key]);
    else if (act === "toggle") {
      const c = (el.closest("td") as HTMLElement).getAttribute("data-c");
      const col = columns[Number(c)];
      if (isEditable(row, col)) applyEdits([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
      e.preventDefault();
    }
  };

  const onNewRowPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const key = photoFor.current;
    if (!file || !key) return;
    try {
      assertImageFile(file);
      const image = await compressImage(file);
      const url = URL.createObjectURL(image.blob);
      commit((s) => ({ ...s, added: s.added.map((r) => (r.key === key ? { ...r, photo: image.blob, photoUrl: url } : r)) }));
    } catch (err) {
      toast.showError(err instanceof CompressError ? t(`equipment.photo.errors.${err.code}`) : t("equipment.photo.errors.unreadable"));
    }
  };

  // ── header ──
  const toggleSort = (key: ColumnKey) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const startResize = (e: ReactMouseEvent, col: Column) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = col.width;
    const move = (ev: MouseEvent) => setWidths((w) => ({ ...w, [col.key]: Math.max(36, startW + ev.clientX - startX) }));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setWidths((w) => {
        writeStored(WIDTHS_KEY, w);
        return w;
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const toggleColumn = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    writeStored(COLUMNS_KEY, next);
  };

  // ── saving ──
  const goToFirstError = () => {
    setView("errors");
    const key = Object.keys(errors)[0];
    if (!key) return;
    const field = Object.keys(errors[key])[0];
    const ref = { row: key, col: (colIndex.has(field) ? field : "equipment_name") as ColumnKey };
    setAnchor(ref);
    setFocus(ref);
    if (scroller.current) scroller.current.scrollTop = 0;
  };

  const requestSave = () => {
    if (!dirty || saving) return;
    if (errorCount) {
      toast.showError(t("equipment.sheet.fixFirst", { count: errorCount }));
      goToFirstError();
      return;
    }
    if (counts.deleted) setConfirmSave(true);
    else save();
  };

  const save = async () => {
    setConfirmSave(false);
    setSaving(true);
    try {
      const res = await saveEquipmentSheet(buildPayload(state, bases));
      if (!res.saved) {
        const next: Record<string, RowErrors> = {};
        for (const err of res.errors) next[err.key] = { ...next[err.key], [err.field]: err.code };
        setServerErrors(next);
        setView("errors");
        toast.showError(t("equipment.sheet.fixFirst", { count: Object.keys(next).length }));
        return;
      }
      // The machines are saved; a photo that fails must not read as a failed save.
      let photoFails = 0;
      for (const created of res.created) {
        const blob = state.added.find((r) => r.key === created.key)?.photo;
        if (!blob) continue;
        await upload.mutateAsync({ equipmentId: created.equipment_id, blob }).catch(() => {
          photoFails++;
        });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["equipment"] }),
        qc.invalidateQueries({ queryKey: ["equipment-stats"] }),
        qc.invalidateQueries({ queryKey: ["pos-equipment-catalog"] }),
      ]);
      setHist({ past: [], present: EMPTY_STATE, future: [] });
      setServerErrors({});
      setView("all");
      setAnchor(null);
      setFocus(null);
      toast.showSuccess(t("equipment.sheet.saved", { edited: res.updated, added: res.created.length, deleted: res.deleted }));
      if (photoFails) toast.showWarning(t("equipment.bulkGrid.photosFailed", { count: photoFails }));
      fetchNextEquipment().then((n) => setServerSerial(n.serial_number)).catch(() => {});
    } catch (err: any) {
      toast.showError(err?.message || t("equipment.bulkGrid.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ── scrolling: only rows on screen are drawn ──
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight || 800);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading, fullscreen]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewH) / ROW_H) + 8);

  const labels: RowLabels = useMemo(
    () => ({
      was: (value) => t("equipment.sheet.was", { value: value || "—" }),
      error: (code) => t(`equipment.sheet.errors.${code}`, { defaultValue: t(`equipment.bulkGrid.errors.${code}`) }),
      photo: t("equipment.photo.addPhoto"),
      duplicate: t("equipment.sheet.duplicate"),
      remove: t("equipment.sheet.deleteRow"),
      restore: t("equipment.sheet.restoreRow"),
    }),
    [t],
  );

  const suggestions = useMemo(() => base, [base]);
  const activeError = focus ? errors[focus.row]?.[focus.col as Field] ?? (colIndex.get(focus.col) === 0 ? errors[focus.row]?.row : undefined) : undefined;

  const viewChip = (key: SheetView, label: string, count?: number) => (
    <Chip
      key={key}
      size="small"
      label={count === undefined ? label : `${label} ${count}`}
      color={view === key ? "primary" : "default"}
      variant={view === key ? "filled" : "outlined"}
      onClick={() => setView(key)}
      sx={{ height: 22, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
    />
  );

  if (isError) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>{t("common.retry", { defaultValue: "Retry" })}</Button>}>
        {(error as any)?.message || t("equipment.sheet.loadFailed")}
      </Alert>
    );
  }

  const totalWidth = NUM_W + PHOTO_W + ACTS_W + columns.reduce((n, c) => n + c.width, 0);

  return (
    <Box
      sx={
        fullscreen
          ? { position: "fixed", inset: 0, zIndex: 1250, bgcolor: "background.default", display: "flex", flexDirection: "column", p: 1, gap: 0.75 }
          : { height: { xs: "calc(100dvh - 92px)", md: "calc(100vh - 96px)" }, minHeight: 320, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75 }
      }
    >
      <UnsavedGuard dirty={dirty} />
      <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden aria-label={t("equipment.photo.addPhoto")} onChange={onNewRowPhoto} />

      {/* Toolbar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: { xs: "wrap", md: "nowrap" }, minHeight: 32, flexShrink: 0 }}>
        <TextField
          size="small"
          placeholder={t("equipment.sheet.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 170, flexShrink: 0, "& .MuiOutlinedInput-input": { py: 0.4, fontSize: 12 } }}
          slotProps={{
            htmlInput: { "aria-label": t("equipment.sheet.search") },
            input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15 }} /></InputAdornment> },
          }}
        />
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ width: 130, flexShrink: 0, "& .MuiSelect-select": { py: 0.4, fontSize: 12 } }}
          slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": t("equipment.sheet.cols.category") } }}
        >
          <MenuItem value="" sx={{ fontSize: 12 }}>{t("equipment.sheet.allCategories")}</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.category_id} value={String(c.category_id)} sx={{ fontSize: 12 }}>
              {c.category_name}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", gap: 0.5, overflowX: "auto", flexWrap: "nowrap", minWidth: 0, flexShrink: 1 }}>
          {viewChip("all", t("equipment.sheet.viewAll"), base.length)}
          {viewChip("changed", t("equipment.sheet.viewChanged"), viewCounts.changed)}
          {errorCount > 0 && viewChip("errors", t("equipment.sheet.viewErrors"), errorCount)}
          {viewChip("noPhoto", t("equipment.sheet.viewNoPhoto"), viewCounts.noPhoto)}
          {viewChip("noSinhala", t("equipment.sheet.viewNoSinhala"), viewCounts.noSinhala)}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {/* These come and go, so they sit left of the buttons that must not move. */}
        {canDelete && selectedRowKeys.length > 0 && (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlinedIcon sx={{ fontSize: "15px !important" }} />} onClick={() => deleteRows(selectedRowKeys)} sx={{ height: 26, textTransform: "none", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
            {t("equipment.sheet.deleteRows", { count: selectedRowKeys.length })}
          </Button>
        )}
        {dirty && (
          <Button size="small" color="inherit" onClick={() => commit(() => EMPTY_STATE)} sx={{ height: 26, textTransform: "none", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {t("equipment.sheet.discard")}
          </Button>
        )}
        <Tooltip title={t("equipment.sheet.undo")}>
          <span>
            <IconButton size="small" aria-label={t("equipment.sheet.undo")} disabled={!hist.past.length} onClick={undo} sx={{ p: 0.5 }}>
              <UndoIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("equipment.sheet.redo")}>
          <span>
            <IconButton size="small" aria-label={t("equipment.sheet.redo")} disabled={!hist.future.length} onClick={redo} sx={{ p: 0.5 }}>
              <RedoIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("equipment.bulkGrid.columns")}>
          <IconButton size="small" aria-label={t("equipment.bulkGrid.columns")} onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            <ViewColumnIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} sx={{ zIndex: 1300 }}>
          {COLUMNS.filter((c) => !FROZEN.includes(c.key)).map((c) => (
            <MenuItem key={c.key} dense sx={{ py: 0 }}>
              <FormControlLabel control={<Checkbox size="small" checked={!hidden.includes(c.key)} onChange={() => toggleColumn(c.key)} />} label={t(c.label)} slotProps={{ typography: { sx: { fontSize: 12 } } }} />
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title={t(fullscreen ? "equipment.sheet.exitFullscreen" : "equipment.sheet.fullscreen")}>
          <IconButton size="small" aria-label={t(fullscreen ? "equipment.sheet.exitFullscreen" : "equipment.sheet.fullscreen")} onClick={() => setFullscreen((f) => !f)} sx={{ p: 0.5 }}>
            {fullscreen ? <FullscreenExitIcon sx={{ fontSize: 18 }} /> : <FullscreenIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
        {canCreate && (
          <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: "15px !important" }} />} onClick={addRow} sx={{ height: 26, textTransform: "none", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
            {t("equipment.bulkGrid.addRow")}
          </Button>
        )}
        <Button size="small" variant="contained" disableElevation disabled={!dirty || saving} startIcon={saving ? <CircularProgress size={13} color="inherit" /> : undefined} onClick={requestSave} sx={{ height: 26, minWidth: 124, textTransform: "none", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {t("equipment.sheet.save", { count: counts.editedRows + counts.added + counts.deleted })}
        </Button>
      </Box>

      {/* Grid */}
      {isLoading ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          ref={scroller}
          tabIndex={0}
          role="grid"
          aria-label={t("nav.equipmentSheet")}
          aria-rowcount={rows.length}
          onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onPaste={onPaste}
          sx={(theme) => ({
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            outline: "none",
            "--paper": theme.palette.background.paper,
            "--head": theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
            "--line": theme.palette.divider,
            "--edit": alpha(theme.palette.warning.main, 0.3),
            "--add": alpha(theme.palette.success.main, 0.14),
            "--del": alpha(theme.palette.error.main, 0.13),
            "--err": alpha(theme.palette.error.main, 0.24),
            "--ro": alpha(theme.palette.text.primary, 0.045),
            "--inr": alpha(theme.palette.text.primary, 0.1),
            "--accent": theme.palette.primary.main,
            "--okbar": theme.palette.success.main,
            "--delbar": theme.palette.error.main,
            "--errline": theme.palette.error.main,
            "& table": { borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", fontSize: 12, lineHeight: `${ROW_H - 1}px`, color: "text.primary", userSelect: "none" },
            "& th": { position: "sticky", top: 0, zIndex: 3, height: HEAD_H, background: "var(--head)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: 11, color: "text.secondary", textAlign: "left", padding: "0 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", boxSizing: "border-box" },
            "& th.num": { textAlign: "right" },
            "& th.fz, & th.hdc": { left: 0, zIndex: 4 },
            "& th .grip": { position: "absolute", top: 0, right: 0, bottom: 0, width: 5, cursor: "col-resize" },
            "& th .grip:hover": { background: "var(--accent)" },
            "& td": { "--tint": "transparent", "--range": "transparent", height: ROW_H, padding: "0 5px", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box", cursor: "cell", position: "relative", background: "linear-gradient(var(--range),var(--range)), linear-gradient(var(--tint),var(--tint)), var(--paper)" },
            "& tr.add td": { "--tint": "var(--add)" },
            "& tr.del td": { "--tint": "var(--del)", color: "text.disabled" },
            "& tr.del td.c": { textDecoration: "line-through" },
            "& tr.add td.rowh": { boxShadow: "inset 3px 0 0 var(--okbar)" },
            "& tr.del td.rowh": { boxShadow: "inset 3px 0 0 var(--delbar)" },
            "& td.ro": { "--tint": "var(--ro)", color: "text.secondary", cursor: "default" },
            "& td.num": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
            "& td.edit": { "--tint": "var(--edit)", fontWeight: 600 },
            "& td.edit::after": { content: '""', position: "absolute", top: 0, right: 0, width: 0, height: 0, borderTop: "6px solid var(--accent)", borderLeft: "6px solid transparent" },
            "& td.err": { "--tint": "var(--err)", boxShadow: "inset 0 0 0 1px var(--errline)" },
            "& td.inr": { "--range": "var(--inr)" },
            "& td.act": { boxShadow: "inset 0 0 0 2px var(--accent)" },
            "& td.editing": { padding: 0, overflow: "visible", boxShadow: "inset 0 0 0 2px var(--accent)", "--tint": "transparent", background: "var(--paper)", zIndex: 2 },
            "& td.fz": { position: "sticky", zIndex: 1, fontWeight: 600 },
            "& td.hd": { position: "sticky", zIndex: 1, background: "linear-gradient(var(--tint),var(--tint)), var(--head)", color: "text.secondary", padding: 0, textAlign: "center", cursor: "default" },
            "& td.rowh": { fontSize: 10.5, fontVariantNumeric: "tabular-nums", cursor: "e-resize" },
            "& td.rowsel": { background: "var(--accent)", color: theme.palette.primary.contrastText },
            "& td.acts": { right: 0, borderLeft: "1px solid var(--line)" },
            "& th.acts": { right: 0, zIndex: 4 },
            "& .thumb": { width: 20, height: 20, padding: 0, margin: "1px auto 0", display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 3, background: "#ffffff", color: theme.palette.text.disabled, cursor: "pointer", overflow: "hidden" },
            "& .thumb:hover:not(:disabled)": { color: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" },
            "& .thumb:disabled": { opacity: 0.5, cursor: "default" },
            "& .thumb img": { width: "100%", height: "100%", objectFit: "contain" },
            "& .ic": { width: 20, height: 20, padding: 0, margin: "0 1px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 3, background: "transparent", color: theme.palette.text.secondary, cursor: "pointer", verticalAlign: "middle" },
            "& .ic:hover": { background: "var(--ro)", color: theme.palette.text.primary },
            "& td input[type=checkbox]": { margin: "0 auto", display: "block", accentColor: theme.palette.primary.main },
            // On a phone, frozen columns would fill the screen and leave nothing to scroll.
            [theme.breakpoints.down("sm")]: {
              "& th.fz, & td.fz, & th.acts, & td.acts": { position: "static" },
              "& th.fz, & th.acts": { position: "sticky", left: "auto", right: "auto" },
            },
          })}
        >
          <table style={{ width: totalWidth }} onMouseDown={onMouseDown} onMouseOver={onMouseOver} onDoubleClick={onDoubleClick} onClick={onClick}>
            <colgroup>
              <col style={{ width: NUM_W }} />
              <col style={{ width: PHOTO_W }} />
              {columns.map((c) => (
                <col key={c.key} style={{ width: c.width }} />
              ))}
              <col style={{ width: ACTS_W }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="hdc"
                  style={{ left: 0 }}
                  aria-label={t("equipment.sheet.selectAll")}
                  onClick={() => {
                    if (!rows.length) return;
                    setAnchor({ row: rows[0].key, col: columns[0].key });
                    setFocus({ row: rows[rows.length - 1].key, col: columns[columns.length - 1].key });
                    refocus();
                  }}
                />
                <th className="hdc" style={{ left: lefts.__photo, cursor: "default" }} aria-label={t("equipment.image")} />
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${alignsRight(c) ? "num" : ""}${FROZEN.includes(c.key) ? " fz" : ""}`}
                    style={FROZEN.includes(c.key) ? { left: lefts[c.key] } : undefined}
                    title={t(c.label)}
                    aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                    onClick={() => toggleSort(c.key)}
                  >
                    {t(c.label)}
                    {sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                    <span className="grip" onMouseDown={(e) => startResize(e, c)} onClick={(e) => e.stopPropagation()} />
                  </th>
                ))}
                <th className="acts" style={{ cursor: "default" }} aria-label={t("common.actions", { defaultValue: "Actions" })} />
              </tr>
            </thead>
            <tbody>
              {start > 0 && (
                <tr style={{ height: start * ROW_H }} aria-hidden>
                  <td colSpan={columns.length + 3} style={{ padding: 0, border: 0, height: start * ROW_H }} />
                </tr>
              )}
              {rows.slice(start, end).map((row, i) => {
                const index = start + i;
                const inRange = !!range && index >= range.top && index <= range.bottom;
                const isFocusRow = focus?.row === row.key;
                const isEditRow = editing?.row === row.key;
                const editCol = isEditRow && editing ? colIndex.get(editing.col) ?? -1 : -1;
                return (
                  <SheetRowView
                    key={row.key}
                    row={row}
                    index={index}
                    columns={columns}
                    lefts={lefts}
                    frozen={FROZEN}
                    c1={inRange ? range!.left : -1}
                    c2={inRange ? range!.right : -1}
                    activeCol={isFocusRow && focus ? colIndex.get(focus.col) ?? -1 : -1}
                    editingCol={editCol}
                    editor={
                      isEditRow && editing && editCol >= 0 ? (
                        <SheetCellEditor
                          column={columns[editCol]}
                          value={row.values[editing.col as Field]}
                          initial={editing.initial}
                          lookups={lookups}
                          suggestions={row.isNew && editing.col === "equipment_name" ? suggestions : undefined}
                          onPickMachine={(machine) => {
                            setEditing(null);
                            followMachine(row.key, machine.id!);
                          }}
                          onCommit={finishEdit}
                          onCancel={() => {
                            setEditing(null);
                            refocus();
                          }}
                        />
                      ) : null
                    }
                    errors={errors[row.key]}
                    lookups={lookups}
                    labels={labels}
                    canEdit={canEdit}
                    canCreate={canCreate}
                    canDelete={canDelete}
                  />
                );
              })}
              {end < rows.length && (
                <tr aria-hidden>
                  <td colSpan={columns.length + 3} style={{ padding: 0, border: 0, height: (rows.length - end) * ROW_H }} />
                </tr>
              )}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              {t("equipment.sheet.nothingHere")}
            </Typography>
          )}
        </Box>
      )}

      {/* Status: what each colour means, and the numbers for what is selected */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minHeight: 20, flexShrink: 0, fontSize: 11, color: "text.secondary", overflowX: "auto", whiteSpace: "nowrap" }}>
        <Legend color="warning" label={t("equipment.sheet.legendEdited", { count: counts.editedCells })} />
        <Legend color="success" label={t("equipment.sheet.legendAdded", { count: counts.added })} />
        <Legend color="error" label={t("equipment.sheet.legendDeleted", { count: counts.deleted })} />
        {errorCount > 0 && (
          <Button size="small" color="error" onClick={goToFirstError} sx={{ minWidth: 0, p: 0, height: 18, fontSize: 11, fontWeight: 800, textTransform: "none" }}>
            {t("equipment.sheet.legendErrors", { count: errorCount })}
          </Button>
        )}
        {activeError && (
          <Typography component="span" color="error" sx={{ fontSize: 11, fontWeight: 700 }}>
            {labels.error(activeError)}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {stats && (
          <Typography component="span" sx={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
            {t("equipment.sheet.selection", { rows: stats.rows, cols: stats.cols })}
            {stats.numeric > 0 ? ` · ${t("equipment.sheet.sum", { sum: stats.sum.toLocaleString() })}` : ""}
          </Typography>
        )}
        <Typography component="span" sx={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
          {t("equipment.sheet.rowsShown", { shown: rows.length, total: allRows.length })}
        </Typography>
        <Tooltip title={<Box sx={{ whiteSpace: "pre-line", fontSize: 12 }}>{t("equipment.sheet.shortcuts")}</Box>}>
          <HelpOutlinedIcon aria-label={t("equipment.sheet.shortcutsTitle")} sx={{ fontSize: 15, cursor: "help" }} />
        </Tooltip>
      </Box>

      <Dialog open={confirmSave} onClose={() => setConfirmSave(false)} sx={{ zIndex: 1400 }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("equipment.sheet.confirmDeleteTitle", { count: counts.deleted })}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("equipment.sheet.confirmDeleteBody")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmSave(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" disableElevation onClick={save} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("equipment.sheet.confirmDeleteButton")}
          </Button>
        </DialogActions>
      </Dialog>

      <EquipmentPhotoDialog
        open={!!photoRow}
        onClose={() => {
          setPhotoRow(null);
          refocus();
        }}
        equipment={photoRow?.machine ? { equipment_id: photoRow.machine.equipment_id, equipment_name: photoRow.machine.equipment_name, serial_number: photoRow.machine.serial_number, image_url: photoRow.machine.image_url } : null}
      />
    </Box>
  );
}

function Legend({ color, label }: { color: "warning" | "success" | "error"; label: string }) {
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Box component="span" sx={(theme) => ({ width: 11, height: 11, borderRadius: 0.5, border: "1px solid", borderColor: `${color}.main`, bgcolor: alpha(theme.palette[color].main, 0.3) })} />
      <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {label}
      </Box>
    </Box>
  );
}
