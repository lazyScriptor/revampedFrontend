import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ClipboardEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { parsePaste } from "../lib/equipmentNumbering";
import { SheetCellEditor, type EditorMove } from "./SheetCellEditor";
import { SheetRowView, type RowLabels } from "./SheetRowView";
import {
  NUMERIC_KINDS, alignsRight, blankValues, displayValue, parseInput, selectionStats,
  type Column, type ColumnKey, type Field, type Lookups, type RowErrors, type SheetRow, type SortState, type Values,
} from "./sheetModel";

const ROW_H = 24;
const HEAD_H = 26;
const NUM_W = 38;
const PHOTO_W = 28;
const ACTS_W = 46;
const DEFAULT_FROZEN: string[] = ["equipment_name"];

export interface CellRef {
  row: string;
  col: ColumnKey;
}

export interface GridRange {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SheetSelectionStats {
  count: number;
  numeric: number;
  sum: number;
  rows: number;
  cols: number;
}

export interface SheetGridHandle {
  focusGrid: () => void;
  focusCell: (rowKey: string, colKey: ColumnKey, openEditor?: boolean) => void;
  scrollToTop: () => void;
  clearSelection: () => void;
}

interface Editing extends CellRef {
  initial?: string;
}

export interface SheetGridProps {
  rows: SheetRow[];
  columns: Column[];
  lookups: Lookups;
  errors: Record<string, RowErrors>;
  labels: RowLabels;
  isEditable: (row: SheetRow | undefined, col: Column | undefined) => boolean;
  onEditCells: (edits: { key: string; field: Field; value: string }[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveShortcut?: () => void;
  sort?: SortState | null;
  onToggleSort?: (key: ColumnKey) => void;
  onResizeColumn?: (key: ColumnKey, width: number, commit?: boolean) => void;
  onPasteNewRows?: (valuesList: Values[]) => void;
  onPasteSkipped?: (count: number) => void;
  onInvalidEdit?: () => void;
  defaultNewRowValues?: () => Values;
  onPhotoClick?: (row: SheetRow) => void;
  onDuplicateRow?: (row: SheetRow) => void;
  onDeleteRows?: (keys: string[]) => void;
  canEdit?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  suggestions?: SheetRow[];
  onPickMachine?: (rowKey: string, machine: SheetRow) => void;
  renderRowStatus?: (row: SheetRow) => ReactNode;
  rowStatusWidth?: number;
  rowStatusLabel?: string;
  cellNote?: (row: SheetRow, field: Field) => string | undefined;
  cellBadge?: (row: SheetRow, field: Field) => ReactNode;
  onRowContextMenu?: (
    e: ReactMouseEvent,
    row: SheetRow,
    colKey: ColumnKey | null,
    selectedRowKeys: string[],
    range: GridRange | null,
  ) => void;
  showPhotoColumn?: boolean;
  showActionsColumn?: boolean;
  frozenColumns?: string[];
  ariaLabel?: string;
  emptyMessage?: string;
  fullscreen?: boolean;
  onSelectionChange?: (info: {
    selectedRowKeys: string[];
    stats: SheetSelectionStats | null;
    focus: CellRef | null;
    range: GridRange | null;
  }) => void;
}

export const SheetGrid = forwardRef<SheetGridHandle, SheetGridProps>(function SheetGrid(
  {
    rows,
    columns,
    lookups,
    errors,
    labels,
    isEditable,
    onEditCells,
    onUndo,
    onRedo,
    onSaveShortcut,
    sort = null,
    onToggleSort,
    onResizeColumn,
    onPasteNewRows,
    onPasteSkipped,
    onInvalidEdit,
    defaultNewRowValues,
    onPhotoClick,
    onDuplicateRow,
    onDeleteRows,
    canEdit = true,
    canCreate = true,
    canDelete = true,
    suggestions,
    onPickMachine,
    renderRowStatus,
    rowStatusWidth = 128,
    rowStatusLabel = "",
    cellNote,
    cellBadge,
    onRowContextMenu,
    showPhotoColumn = true,
    showActionsColumn = true,
    frozenColumns = DEFAULT_FROZEN,
    ariaLabel,
    emptyMessage,
    fullscreen = false,
    onSelectionChange,
  },
  ref,
) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const [focus, setFocus] = useState<CellRef | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(800);

  const scroller = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const rowIndex = useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);
  const colIndex = useMemo(() => new Map(columns.map((c, i) => [c.key as string, i])), [columns]);

  const lefts = useMemo(() => {
    const out: Record<string, number> = {};
    let left = NUM_W;
    if (renderRowStatus) {
      out.__status = left;
      left += rowStatusWidth;
    }
    if (showPhotoColumn) {
      out.__photo = left;
      left += PHOTO_W;
    }
    for (const c of columns) {
      if (frozenColumns.includes(c.key)) {
        out[c.key] = left;
        left += c.width;
      }
    }
    out.__end = left;
    return out;
  }, [columns, frozenColumns, renderRowStatus, rowStatusWidth, showPhotoColumn]);

  const range: GridRange | null = useMemo(() => {
    if (!anchor || !focus) return null;
    const r1 = rowIndex.get(anchor.row);
    const r2 = rowIndex.get(focus.row);
    const c1 = colIndex.get(anchor.col);
    const c2 = colIndex.get(focus.col);
    if (r1 === undefined || r2 === undefined || c1 === undefined || c2 === undefined) return null;
    return { top: Math.min(r1, r2), bottom: Math.max(r1, r2), left: Math.min(c1, c2), right: Math.max(c1, c2) };
  }, [anchor, focus, rowIndex, colIndex]);

  const wholeRows = !!range && range.left === 0 && range.right === columns.length - 1;
  const selectedRowKeys = useMemo(
    () => (range && (wholeRows || range.bottom > range.top) ? rows.slice(range.top, range.bottom + 1).map((r) => r.key) : []),
    [range, wholeRows, rows],
  );

  const stats: SheetSelectionStats | null = useMemo(() => {
    if (!range || (range.bottom === range.top && range.left === range.right)) return null;
    const cells: string[] = [];
    for (let r = range.top; r <= range.bottom && cells.length < 20000; r++) {
      for (let c = range.left; c <= range.right; c++) {
        if (NUMERIC_KINDS.includes(columns[c].kind) || columns[c].kind === "readonly") {
          cells.push(displayValue(columns[c], rows[r], lookups));
        }
      }
    }
    return { ...selectionStats(cells), rows: range.bottom - range.top + 1, cols: range.right - range.left + 1 };
  }, [range, columns, rows, lookups]);

  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const lastSelSigRef = useRef("");

  useEffect(() => {
    const sig = `${focus?.row ?? ""}|${focus?.col ?? ""}|${selectedRowKeys.join(",")}|${stats?.count ?? ""}|${stats?.sum ?? ""}|${range ? `${range.top},${range.bottom},${range.left},${range.right}` : ""}`;
    if (sig === lastSelSigRef.current) return;
    lastSelSigRef.current = sig;
    onSelectionChangeRef.current?.({ selectedRowKeys, stats, focus, range });
  }, [selectedRowKeys, stats, focus, range]);

  const refocus = useCallback(() => scroller.current?.focus({ preventScroll: true }), []);

  useImperativeHandle(
    ref,
    () => ({
      focusGrid: refocus,
      focusCell: (rowKey: string, colKey: ColumnKey, openEditor = false) => {
        const cellRef = { row: rowKey, col: colKey };
        setAnchor(cellRef);
        setFocus(cellRef);
        if (openEditor) setEditing(cellRef);
      },
      scrollToTop: () => {
        if (scroller.current) scroller.current.scrollTop = 0;
      },
      clearSelection: () => {
        setAnchor(null);
        setFocus(null);
        setEditing(null);
      },
    }),
    [refocus],
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
      for (let i = 0; i < c; i++) if (!frozenColumns.includes(columns[i].key)) x += columns[i].width;
      const cw = columns[c]?.width ?? 0;
      if (frozenColumns.includes(columns[c]?.key)) return;
      const rightPad = showActionsColumn ? ACTS_W : 0;
      if (x - lefts.__end < el.scrollLeft) el.scrollLeft = x - lefts.__end;
      else if (x + cw + rightPad > el.scrollLeft + el.clientWidth) el.scrollLeft = x + cw + rightPad - el.clientWidth;
    },
    [columns, lefts, frozenColumns, showActionsColumn],
  );

  const moveTo = useCallback(
    (r: number, c: number, extend = false) => {
      const nr = Math.max(0, Math.min(rows.length - 1, r));
      const nc = Math.max(0, Math.min(columns.length - 1, c));
      const row = rows[nr];
      const col = columns[nc];
      if (!row || !col) return;
      const cellRef = { row: row.key, col: col.key };
      setFocus(cellRef);
      if (!extend) setAnchor(cellRef);
      reveal(nr, nc);
    },
    [rows, columns, reveal],
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
    if (parsed === null) onInvalidEdit?.();
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
      onEditCells(edits);
    } else onEditCells([{ key: target.row, field: col.key as Field, value: parsed }]);
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
      if (!col || !isEditable(row, col)) return;
      const v = parseInput(col, raw, lookups);
      if (v === null) skipped++;
      else edits.push({ key: row.key, field: col.key as Field, value: v });
    };
    if (grid.length === 1 && grid[0].length === 1) {
      // One value into a selection fills all of it.
      for (let y = range.top; y <= range.bottom; y++) {
        for (let x = range.left; x <= range.right; x++) put(rows[y], columns[x], grid[0][0]);
      }
    } else {
      const made: Values[] = [];
      grid.forEach((cells, dy) => {
        const row = rows[range.top + dy];
        if (row) {
          cells.forEach((value, dx) => put(row, columns[range.left + dx], value));
        } else if (canCreate && onPasteNewRows) {
          const values = defaultNewRowValues ? defaultNewRowValues() : blankValues();
          cells.forEach((value, dx) => {
            const col = columns[range.left + dx];
            if (!col || col.kind === "readonly") return;
            const v = parseInput(col, value, lookups);
            if (v === null) skipped++;
            else values[col.key as Field] = v;
          });
          made.push(values);
        }
      });
      if (made.length && onPasteNewRows) onPasteNewRows(made);
    }
    if (edits.length) onEditCells(edits);
    if (skipped) onPasteSkipped?.(skipped);
  };

  // ── keyboard ──
  const onKeyDown = (e: KeyboardEvent) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) onRedo();
      else onUndo();
      return;
    }
    if (mod && key === "y") {
      e.preventDefault();
      onRedo();
      return;
    }
    if (mod && key === "s" && onSaveShortcut) {
      e.preventDefault();
      onSaveShortcut();
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
      if (!rows.length || !columns.length) return;
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
        for (let y = range.top + 1; y <= range.bottom; y++) {
          if (isEditable(rows[y], columns[x])) edits.push({ key: rows[y].key, field, value: from });
        }
      }
      if (edits.length) onEditCells(edits);
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
        if (col.kind === "bool" && isEditable(row, col)) {
          onEditCells([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
        } else if (isEditable(row, col)) setEditing({ row: row.key, col: col.key });
        return;
      case "Delete":
      case "Backspace":
        if (range) {
          e.preventDefault();
          const edits: { key: string; field: Field; value: string }[] = [];
          for (let y = range.top; y <= range.bottom; y++) {
            for (let x = range.left; x <= range.right; x++) {
              if (isEditable(rows[y], columns[x]) && columns[x].kind !== "bool") {
                edits.push({ key: rows[y].key, field: columns[x].key as Field, value: "" });
              }
            }
          }
          if (edits.length) onEditCells(edits);
        }
        return;
      case " ":
        if (col.kind === "bool" && isEditable(row, col)) {
          e.preventDefault();
          onEditCells([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
          return;
        }
    }
    const opensCell =
      (e.key.length === 1 && !mod && !e.altKey) ||
      e.key === "Process" ||
      e.key === "Unidentified" ||
      e.nativeEvent.isComposing;
    if (opensCell && isEditable(row, col) && col.kind !== "bool") {
      const types = col.kind === "text" || NUMERIC_KINDS.includes(col.kind);
      if (!types) e.preventDefault();
      flushSync(() => setEditing({ row: row.key, col: col.key, initial: types ? "" : undefined }));
    }
  };

  // ── mouse ──
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
      const cellRef = { row: cell.key, col: columns[columns.length - 1].key };
      if (e.shiftKey && anchor) setFocus(cellRef);
      else {
        setAnchor({ row: cell.key, col: columns[0].key });
        setFocus(cellRef);
      }
      dragging.current = true;
      return;
    }
    if (cell.col === null) return;
    const cellRef = { row: cell.key, col: columns[cell.col].key };
    setFocus(cellRef);
    if (!(e.shiftKey && anchor)) setAnchor(cellRef);
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
    if (act === "photo") onPhotoClick?.(row);
    else if (act === "duplicate") onDuplicateRow?.(row);
    else if (act === "delete") onDeleteRows?.([row.key]);
    else if (act === "toggle") {
      const c = (el.closest("td") as HTMLElement).getAttribute("data-c");
      const col = columns[Number(c)];
      if (isEditable(row, col)) {
        onEditCells([{ key: row.key, field: col.key as Field, value: row.values[col.key as Field] === "true" ? "false" : "true" }]);
      }
      e.preventDefault();
    }
  };

  const onContextMenu = (e: ReactMouseEvent) => {
    if (!onRowContextMenu) return;
    const cell = cellAt(e.target);
    if (!cell) return;
    const row = rows[rowIndex.get(cell.key) ?? -1];
    if (!row) return;
    e.preventDefault();
    const colKey = cell.col !== null ? columns[cell.col]?.key ?? null : null;
    if (colKey && (!range || (rowIndex.get(cell.key) ?? -1) < range.top || (rowIndex.get(cell.key) ?? -1) > range.bottom)) {
      const cellRef = { row: row.key, col: colKey };
      setAnchor(cellRef);
      setFocus(cellRef);
    }
    onRowContextMenu(e, row, colKey, selectedRowKeys, range);
  };

  const startResize = (e: ReactMouseEvent, col: Column) => {
    if (!onResizeColumn) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = col.width;
    let latestW = startW;
    const move = (ev: MouseEvent) => {
      latestW = Math.max(36, startW + ev.clientX - startX);
      onResizeColumn(col.key, latestW, false);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      onResizeColumn(col.key, latestW, true);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
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
  }, [fullscreen]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const end = Math.min(rows.length, Math.ceil((scrollTop + viewH) / ROW_H) + 8);

  const totalWidth =
    NUM_W +
    (renderRowStatus ? rowStatusWidth : 0) +
    (showPhotoColumn ? PHOTO_W : 0) +
    (showActionsColumn ? ACTS_W : 0) +
    columns.reduce((n, c) => n + c.width, 0);

  const extraColCount =
    1 + (renderRowStatus ? 1 : 0) + (showPhotoColumn ? 1 : 0) + (showActionsColumn ? 1 : 0);

  return (
    <Box
      ref={scroller}
      tabIndex={0}
      role="grid"
      aria-label={ariaLabel ?? t("nav.equipmentSheet")}
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
        "--note": alpha(theme.palette.warning.main, 0.2),
        "--add": alpha(theme.palette.success.main, 0.14),
        "--del": alpha(theme.palette.error.main, 0.13),
        "--err": alpha(theme.palette.error.main, 0.24),
        "--ro": alpha(theme.palette.text.primary, 0.045),
        "--inr": alpha(theme.palette.text.primary, 0.1),
        "--accent": theme.palette.primary.main,
        "--okbar": theme.palette.success.main,
        "--delbar": theme.palette.error.main,
        "--errline": theme.palette.error.main,
        "--notebar": theme.palette.warning.main,
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
        "& td.note": { "--tint": "var(--note)" },
        "& td.note::after": { content: '""', position: "absolute", top: 0, right: 0, width: 0, height: 0, borderTop: "6px solid var(--notebar)", borderLeft: "6px solid transparent" },
        "& td.err": { "--tint": "var(--err)", boxShadow: "inset 0 0 0 1px var(--errline)" },
        "& td.inr": { "--range": "var(--inr)" },
        "& td.act": { boxShadow: "inset 0 0 0 2px var(--accent)" },
        "& td.editing": { padding: 0, overflow: "visible", boxShadow: "inset 0 0 0 2px var(--accent)", "--tint": "transparent", background: "var(--paper)", zIndex: 2 },
        "& td.fz": { position: "sticky", zIndex: 1, fontWeight: 600 },
        "& td.hd": { position: "sticky", zIndex: 1, background: "linear-gradient(var(--tint),var(--tint)), var(--head)", color: "text.secondary", padding: 0, textAlign: "center", cursor: "default" },
        "& td.st": { padding: "0 4px", textAlign: "left", fontSize: 11, fontVariantNumeric: "tabular-nums" },
        "& td.rowh": { fontSize: 10.5, fontVariantNumeric: "tabular-nums", cursor: "e-resize" },
        "& td.rowsel": { background: "var(--accent)", color: theme.palette.primary.contrastText },
        "& td.acts": { right: 0, borderLeft: "1px solid var(--line)" },
        "& th.acts": { right: 0, zIndex: 4 },
        "& .thumb": { width: 20, height: 20, padding: 0, margin: "1px auto 0", display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 3, background: theme.palette.background.paper, color: theme.palette.text.disabled, cursor: "pointer", overflow: "hidden" },
        "& .thumb:hover:not(:disabled)": { color: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" },
        "& .thumb:disabled": { opacity: 0.5, cursor: "default" },
        "& .thumb img": { width: "100%", height: "100%", objectFit: "contain" },
        "& .ic": { width: 20, height: 20, padding: 0, margin: "0 1px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 3, background: "transparent", color: theme.palette.text.secondary, cursor: "pointer", verticalAlign: "middle" },
        "& .ic:hover": { background: "var(--ro)", color: theme.palette.text.primary },
        "& td input[type=checkbox]": { margin: "0 auto", display: "block", accentColor: theme.palette.primary.main },
        [theme.breakpoints.down("sm")]: {
          "& th.fz, & td.fz, & th.acts, & td.acts, & td.st, & th.st": { position: "static" },
          "& th.fz, & th.acts": { position: "sticky", left: "auto", right: "auto" },
        },
      })}
    >
      <table style={{ width: totalWidth }} onMouseDown={onMouseDown} onMouseOver={onMouseOver} onDoubleClick={onDoubleClick} onClick={onClick} onContextMenu={onContextMenu}>
        <colgroup>
          <col style={{ width: NUM_W }} />
          {renderRowStatus && <col style={{ width: rowStatusWidth }} />}
          {showPhotoColumn && <col style={{ width: PHOTO_W }} />}
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
          {showActionsColumn && <col style={{ width: ACTS_W }} />}
        </colgroup>
        <thead>
          <tr>
            <th
              className="hdc"
              style={{ left: 0 }}
              aria-label={t("equipment.sheet.selectAll")}
              onClick={() => {
                if (!rows.length || !columns.length) return;
                setAnchor({ row: rows[0].key, col: columns[0].key });
                setFocus({ row: rows[rows.length - 1].key, col: columns[columns.length - 1].key });
                refocus();
              }}
            />
            {renderRowStatus && (
              <th className="hdc st" style={{ left: lefts.__status, cursor: "default" }}>
                {rowStatusLabel}
              </th>
            )}
            {showPhotoColumn && (
              <th className="hdc" style={{ left: lefts.__photo, cursor: "default" }} aria-label={t("equipment.image")} />
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${alignsRight(c) ? "num" : ""}${frozenColumns.includes(c.key) ? " fz" : ""}`}
                style={frozenColumns.includes(c.key) ? { left: lefts[c.key] } : undefined}
                title={t(c.label)}
                aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                onClick={() => onToggleSort?.(c.key)}
              >
                {t(c.label)}
                {sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                {onResizeColumn && (
                  <span className="grip" onMouseDown={(e) => startResize(e, c)} onClick={(e) => e.stopPropagation()} />
                )}
              </th>
            ))}
            {showActionsColumn && (
              <th className="acts" style={{ cursor: "default" }} aria-label={t("common.actions", { defaultValue: "Actions" })} />
            )}
          </tr>
        </thead>
        <tbody>
          {start > 0 && (
            <tr style={{ height: start * ROW_H }} aria-hidden>
              <td colSpan={columns.length + extraColCount} style={{ padding: 0, border: 0, height: start * ROW_H }} />
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
                frozen={frozenColumns}
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
                        onPickMachine?.(row.key, machine);
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
                renderRowStatus={renderRowStatus}
                cellNote={cellNote}
                cellBadge={cellBadge}
                showPhotoColumn={showPhotoColumn}
                showActionsColumn={showActionsColumn}
              />
            );
          })}
          {end < rows.length && (
            <tr aria-hidden>
              <td colSpan={columns.length + extraColCount} style={{ padding: 0, border: 0, height: (rows.length - end) * ROW_H }} />
            </tr>
          )}
        </tbody>
      </table>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          {emptyMessage ?? t("equipment.sheet.nothingHere")}
        </Typography>
      )}
    </Box>
  );
});
