import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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
import { formatSerial, nextGridSerial, parseName, renumberName, renumberSinhala } from "../lib/equipmentNumbering";
import { SheetGrid, type CellRef, type SheetGridHandle, type SheetSelectionStats } from "./SheetGrid";
import type { RowLabels } from "./SheetRowView";
import {
  COLUMNS, EMPTY_STATE, baseRow, blankValues, buildPayload, countChanges, isDirty, nextNameNumberIn,
  setCells, toggleDeleted, validateRows, viewNewRow, viewRow, visibleRows,
  type Column, type ColumnKey, type Field, type Lookups, type NewRow, type RowErrors, type SheetRow, type SheetState, type SheetView, type SortState, type Values,
} from "./sheetModel";
import { POS_CATALOG_KEY } from "@/features/invoices/hooks/usePosEquipmentCatalog";

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

/** Warns before leaving with unsaved changes, for this app's links and for closing the tab. */
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
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
  const [selectionInfo, setSelectionInfo] = useState<{
    selectedRowKeys: string[];
    stats: SheetSelectionStats | null;
    focus: CellRef | null;
  }>({ selectedRowKeys: [], stats: null, focus: null });

  const gridRef = useRef<SheetGridHandle>(null);
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

  const oneLocation = warehouses.length === 1;
  const columns = useMemo(
    () => COLUMNS.filter((c) => !hidden.includes(c.key) && !(oneLocation && c.key === "warehouse_id")).map((c) => ({ ...c, width: widths[c.key] ?? c.width })),
    [hidden, widths, oneLocation],
  );
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

  const isEditable = useCallback(
    (row: SheetRow | undefined, col: Column | undefined) => !!row && !!col && col.kind !== "readonly" && !row.isDeleted && (row.isNew ? canCreate : canEdit),
    [canCreate, canEdit],
  );

  const refocus = () => gridRef.current?.focusGrid();

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
        gridRef.current?.focusCell(made[0].key, "equipment_name");
        gridRef.current?.scrollToTop();
      }
    },
    [commit],
  );

  const addRow = () => {
    const key = `n${newSeq++}`;
    insertRows([{ key, values: blankValues({ serial_number: nextSerial(), warehouse_id: defaultWarehouse }) }]);
    gridRef.current?.focusCell(key, "equipment_name", true);
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

  const handlePasteNewRows = useCallback(
    (valuesList: Values[]) => {
      const serials: string[] = [];
      const made: NewRow[] = valuesList.map((vals) => {
        const serial = vals.serial_number || nextSerial(serials);
        serials.push(serial);
        return { key: `n${newSeq++}`, values: { ...vals, serial_number: serial } };
      });
      insertRows(made, false);
    },
    [insertRows, nextSerial],
  );

  // ── header ──
  const toggleSort = useCallback(
    (key: ColumnKey) => setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null)),
    [],
  );

  const handleResizeColumn = useCallback((key: ColumnKey, width: number, shouldCommit?: boolean) => {
    setWidths((w) => {
      const next = { ...w, [key]: width };
      if (shouldCommit) writeStored(WIDTHS_KEY, next);
      return next;
    });
  }, []);

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
    gridRef.current?.focusCell(key, (colIndex.has(field) ? field : "equipment_name") as ColumnKey);
    gridRef.current?.scrollToTop();
  };

  const requestSave = useCallback(() => {
    if (!dirty || saving) return;
    if (errorCount) {
      toast.showError(t("equipment.sheet.fixFirst", { count: errorCount }));
      goToFirstError();
      return;
    }
    if (counts.deleted) setConfirmSave(true);
    else save();
  }, [dirty, saving, errorCount, counts.deleted]);

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
        qc.invalidateQueries({ queryKey: POS_CATALOG_KEY }),
      ]);
      setHist({ past: [], present: EMPTY_STATE, future: [] });
      setServerErrors({});
      setView("all");
      gridRef.current?.clearSelection();
      toast.showSuccess(t("equipment.sheet.saved", { edited: res.updated, added: res.created.length, deleted: res.deleted }));
      if (photoFails) toast.showWarning(t("equipment.bulkGrid.photosFailed", { count: photoFails }));
      fetchNextEquipment().then((n) => setServerSerial(n.serial_number)).catch(() => {});
    } catch (err: any) {
      toast.showError(err?.message || t("equipment.bulkGrid.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

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
  const { selectedRowKeys, stats, focus } = selectionInfo;
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
          {COLUMNS.filter((c) => !FROZEN.includes(c.key) && !(oneLocation && c.key === "warehouse_id")).map((c) => (
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
        <SheetGrid
          ref={gridRef}
          rows={rows}
          columns={columns}
          lookups={lookups}
          errors={errors}
          labels={labels}
          isEditable={isEditable}
          onEditCells={applyEdits}
          onUndo={undo}
          onRedo={redo}
          onSaveShortcut={requestSave}
          sort={sort}
          onToggleSort={toggleSort}
          onResizeColumn={handleResizeColumn}
          onPasteNewRows={handlePasteNewRows}
          onPasteSkipped={(count) => toast.showWarning(t("equipment.sheet.pasteSkipped", { count }))}
          onInvalidEdit={() => toast.showWarning(t("equipment.sheet.notValid"))}
          defaultNewRowValues={() => blankValues({ warehouse_id: defaultWarehouse })}
          onPhotoClick={(row) => {
            if (row.isNew) {
              photoFor.current = row.key;
              fileInput.current?.click();
            } else setPhotoRow(row);
          }}
          onDuplicateRow={duplicateRow}
          onDeleteRows={deleteRows}
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
          suggestions={suggestions}
          onPickMachine={(rowKey, machine) => followMachine(rowKey, machine.id!)}
          fullscreen={fullscreen}
          onSelectionChange={({ selectedRowKeys: sKeys, stats: sStats, focus: sFocus }) =>
            setSelectionInfo({ selectedRowKeys: sKeys, stats: sStats, focus: sFocus })
          }
        />
      )}

      {/* Status */}
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
