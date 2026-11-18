import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import RedoIcon from "@mui/icons-material/Redo";
import SearchIcon from "@mui/icons-material/Search";
import UndoIcon from "@mui/icons-material/Undo";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { tk } from "@/i18n/marker";
import { useToast } from "@/components/ui/AppToast";
import { importEquipmentSave } from "@/features/equipment/api/equipment.api";
import { SheetGrid, type CellRef, type SheetGridHandle, type SheetSelectionStats } from "@/features/equipment/sheet/SheetGrid";
import type { RowLabels } from "@/features/equipment/sheet/SheetRowView";
import {
  blankValues,
  viewNewRow,
  type ColumnKey,
  type Field,
  type Lookups,
  type RowErrors,
  type SheetRow,
  type Values,
} from "@/features/equipment/sheet/sheetModel";
import { POS_CATALOG_KEY } from "@/features/invoices/hooks/usePosEquipmentCatalog";
import { useAuthStore } from "@/stores/useAuthStore";
import { EDITABLE_IMPORT_COLUMNS } from "./columnMatching";
import type { ImportDoneSummary } from "./ImportDoneStep";
import { NamesToSortOutPanel } from "./NamesToSortOutPanel";
import {
  applyCategoryResolution,
  applyWarehouseResolution,
  buildImportPayload,
  clearNumbersInSelection,
  copyRateToBlankExtraRate,
  deleteRowsByKeys,
  fillDownSelection,
  findAndReplaceInColumn,
  findDuplicateRows,
  getUnknownCategories,
  getUnknownWarehouses,
  removeDuplicateRows,
  removeEmptyRows,
  revertAutoCleanFixes,
  setAllExistingAction,
  setRowExistingAction,
  updateImportCells,
  validateImportState,
  type ExistingEquipmentRef,
  type ExistingMatchAction,
  type ImportRow,
  type ImportState,
} from "./importModel";

export type ImportViewFilter = "all" | "problems" | "changed" | "duplicates" | "existing";

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  number_invalid: tk("equipment.sheet.errors.number_invalid"),
  bulk_total: tk("equipment.sheet.errors.bulk_total"),
  still_rented: tk("equipment.sheet.errors.still_rented"),
  category_required: tk("equipment.bulkGrid.errors.category_required"),
  warehouse_required: tk("equipment.bulkGrid.errors.warehouse_required"),
  price_required: tk("equipment.bulkGrid.errors.price_required"),
  qty_invalid: tk("equipment.bulkGrid.errors.qty_invalid"),
  name_required: tk("equipment.bulkGrid.errors.name_required"),
  number_required: tk("equipment.bulkGrid.errors.number_required"),
  number_taken: tk("equipment.bulkGrid.errors.number_taken"),
  machine_missing: tk("equipment.bulkGrid.errors.machine_missing"),
  qty_below_out: tk("equipment.bulkGrid.errors.qty_below_out"),
  date_invalid: tk("dataArena.equipmentImport.extraErrors.date_invalid"),
  category_create_denied: tk("dataArena.equipmentImport.extraErrors.category_create_denied"),
  equipment_limit_reached: tk("dataArena.equipmentImport.extraErrors.equipment_limit_reached"),
};

interface History {
  past: ImportState[];
  present: ImportState;
  future: ImportState[];
}

interface CheckAndFixStepProps {
  initialState: ImportState;
  lookups: Lookups;
  existingEquipment: ExistingEquipmentRef[];
  existingTotalCount?: number;
  defaultWarehouseId?: string;
  onBack: () => void;
  onDone: (summary: ImportDoneSummary) => void;
}

let manualRowSeq = 1;

export function CheckAndFixStep({
  initialState,
  lookups,
  existingEquipment,
  existingTotalCount,
  defaultWarehouseId = "",
  onBack,
  onDone,
}: CheckAndFixStepProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();

  const canCreateCategory = useAuthStore((s) => s.hasPermission("category:create"));
  const canEditEquipment = useAuthStore((s) => s.hasPermission("equipment:edit"));
  const maxEquipmentLimit = useAuthStore((s) => s.user?.plan?.limits?.max_equipment ?? null);

  const [hist, setHist] = useState<History>({ past: [], present: initialState, future: [] });
  useEffect(() => {
    setHist({ past: [], present: initialState, future: [] });
  }, [initialState]);

  const state = hist.present;
  const commit = useCallback((fn: (s: ImportState) => ImportState) => {
    setHist((h) => {
      const next = fn(h.present);
      return next === h.present ? h : { past: [...h.past.slice(-99), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(
    () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)),
    [],
  );
  const redo = useCallback(
    () => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)),
    [],
  );

  const [search, setSearch] = useState("");
  const [view, setView] = useState<ImportViewFilter>("all");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [namesOpen, setNamesOpen] = useState(false);
  const [cleanAnchor, setCleanAnchor] = useState<HTMLElement | null>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [replaceField, setReplaceField] = useState<Field>("equipment_name");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);

  const [serverErrors, setServerErrors] = useState<Record<string, RowErrors>>({});
  const [submitErrorBanner, setSubmitErrorBanner] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const [selectionInfo, setSelectionInfo] = useState<{
    selectedRowKeys: string[];
    stats: SheetSelectionStats | null;
    focus: CellRef | null;
  }>({ selectedRowKeys: [], stats: null, focus: null });

  const [ctxMenu, setCtxMenu] = useState<{
    mouseX: number;
    mouseY: number;
    row: ImportRow;
    colKey: ColumnKey | null;
    selectedKeys: string[];
  } | null>(null);

  const gridRef = useRef<SheetGridHandle>(null);

  const unknownCategories = useMemo(() => getUnknownCategories(state), [state]);
  const unknownWarehouses = useMemo(() => getUnknownWarehouses(state), [state]);
  const unresolvedUnknownCount = useMemo(() => {
    let n = 0;
    for (const c of unknownCategories) {
      const res = state.categoryResolutions[c.key];
      if (!res || res.action === "unresolved") n++;
    }
    for (const w of unknownWarehouses) {
      const res = state.warehouseResolutions[w.key];
      if (!res || res.action === "unresolved") n++;
    }
    return n;
  }, [state.categoryResolutions, state.warehouseResolutions, unknownCategories, unknownWarehouses]);

  const duplicateMap = useMemo(() => findDuplicateRows(state.rows), [state.rows]);
  const validation = useMemo(() => validateImportState(state, lookups, serverErrors), [state, lookups, serverErrors]);

  const rowByKey = useMemo(() => new Map(state.rows.map((r) => [r.key, r])), [state.rows]);
  const existingRowsCount = useMemo(() => state.rows.filter((r) => r.existingMatch !== null).length, [state.rows]);
  const changedAutoCount = useMemo(() => state.rows.filter((r) => r.autoChanged).length, [state.rows]);

  const filteredImportRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.rows.filter((row) => {
      if (view === "problems" && !validation.problemRowKeys.has(row.key)) return false;
      if (view === "changed" && !row.autoChanged) return false;
      if (view === "duplicates" && !duplicateMap.has(row.key)) return false;
      if (view === "existing" && !row.existingMatch) return false;
      if (!q) return true;
      return (
        row.values.equipment_name.toLowerCase().includes(q) ||
        row.values.equipment_name_si.toLowerCase().includes(q) ||
        row.values.serial_number.toLowerCase().includes(q) ||
        row.rawCategory.toLowerCase().includes(q) ||
        row.rawWarehouse.toLowerCase().includes(q)
      );
    });
  }, [duplicateMap, search, state.rows, validation.problemRowKeys, view]);

  const visibleSheetRows: SheetRow[] = useMemo(
    () => filteredImportRows.map((r) => viewNewRow({ key: r.key, values: r.values })),
    [filteredImportRows],
  );

  // Summary counts for active payload
  const summaryCounts = useMemo(() => {
    let creates = 0;
    let updates = 0;
    let skipped = 0;
    const newCatRefs = new Set<string>();
    for (const r of state.rows) {
      if (r.existingMatch && r.existingAction === "skip") {
        skipped++;
        continue;
      }
      if (r.existingMatch && r.existingAction === "update") updates++;
      else creates++;
      if (r.values.category_id.startsWith("newcat:")) newCatRefs.add(r.values.category_id);
    }
    return { creates, updates, skipped, newCats: newCatRefs.size, totalActive: creates + updates };
  }, [state.rows]);

  const currentShopCount = existingTotalCount ?? existingEquipment.length;
  const projectedShopCount = currentShopCount + summaryCounts.creates;
  const overLimitBy = typeof maxEquipmentLimit === "number" && maxEquipmentLimit >= 0 ? Math.max(0, projectedShopCount - maxEquipmentLimit) : 0;

  const newCategoryNamesPreview = useMemo(() => {
    const names: string[] = [];
    const usedRefs = new Set(
      state.rows
        .filter((r) => !(r.existingMatch && r.existingAction === "skip") && r.values.category_id.startsWith("newcat:"))
        .map((r) => r.values.category_id),
    );
    for (const res of Object.values(state.categoryResolutions)) {
      if (res.action === "create_new" && usedRefs.has(res.ref) && !names.includes(res.name)) {
        names.push(res.name);
      }
    }
    return names;
  }, [state.categoryResolutions, state.rows]);

  const translateError = useCallback(
    (code: string) => {
      const key = ERROR_MESSAGE_KEYS[code];
      return key ? t(key) : code;
    },
    [t],
  );

  const labels: RowLabels = useMemo(
    () => ({
      was: (val) => t("equipment.sheet.was", { value: val || "—" }),
      error: translateError,
      photo: t("equipment.photo.addPhoto"),
      duplicate: t("equipment.sheet.duplicate"),
      remove: t("equipment.sheet.deleteRow"),
      restore: t("equipment.sheet.restoreRow"),
    }),
    [t, translateError],
  );

  const cellNote = useCallback(
    (sheetRow: SheetRow, field: Field): string | undefined => {
      const imp = rowByKey.get(sheetRow.key);
      if (!imp) return undefined;
      if (field === "serial_number" && imp.existingMatch) {
        return t("dataArena.equipmentImport.existingTooltip", {
          serial: imp.existingMatch.serial_number,
          name: imp.existingMatch.equipment_name,
        });
      }
      const note = imp.autoNotes[field];
      if (!note) return undefined;
      if (note.kind === "bulk_from_total") return t("dataArena.equipmentImport.noteBulkFromTotal");
      return t("dataArena.equipmentImport.noteChangedFrom", { value: note.rawValue });
    },
    [rowByKey, t],
  );

  const cellBadge = useCallback(
    (sheetRow: SheetRow, field: Field) => {
      if (field !== "category_id" || !sheetRow.values.category_id.startsWith("newcat:")) return null;
      return (
        <Box
          component="span"
          sx={(theme) => ({
            ml: 0.5,
            px: 0.6,
            py: 0.1,
            borderRadius: 1,
            fontSize: 10,
            fontWeight: 800,
            bgcolor: alpha(theme.palette.info.main, 0.16),
            color: "info.main",
            flexShrink: 0,
          })}
        >
          {t("dataArena.equipmentImport.newBadge")}
        </Box>
      );
    },
    [t],
  );

  const renderRowStatus = useCallback(
    (sheetRow: SheetRow) => {
      const imp = rowByKey.get(sheetRow.key);
      if (!imp) return null;

      if (imp.existingMatch) {
        return (
          <Box
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            sx={{ display: "flex", alignItems: "center", width: "100%", px: 0.5 }}
          >
            <Box
              component="select"
              aria-label={t("dataArena.equipmentImport.existingTooltip", {
                serial: imp.existingMatch.serial_number,
                name: imp.existingMatch.equipment_name,
              })}
              value={imp.existingAction}
              onChange={(e: any) =>
                commit((s) => setRowExistingAction(s, [imp.key], e.target.value as ExistingMatchAction))
              }
              sx={{
                width: "100%",
                fontSize: 11,
                fontWeight: 700,
                border: 1,
                borderColor:
                  imp.existingAction === "skip"
                    ? "divider"
                    : imp.existingAction === "update"
                      ? "warning.main"
                      : "info.main",
                borderRadius: 1,
                px: 0.5,
                py: 0.25,
                bgcolor: "background.paper",
                color: "text.primary",
                cursor: "pointer",
              }}
            >
              <option value="new_number">{t("dataArena.equipmentImport.existingNewNumber")}</option>
              {canEditEquipment && (
                <option value="update">
                  {t("dataArena.equipmentImport.statusUpdatesMachine", { serial: imp.existingMatch.serial_number })}
                </option>
              )}
              <option value="skip">{t("dataArena.equipmentImport.statusSkipped")}</option>
            </Box>
          </Box>
        );
      }

      const dupRowNum = duplicateMap.get(imp.key);
      if (dupRowNum !== undefined) {
        return (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={t("dataArena.equipmentImport.statusSameAsRow", { row: dupRowNum })}
            sx={{ height: 22, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          />
        );
      }

      if (validation.problemRowKeys.has(imp.key)) {
        return (
          <Chip
            size="small"
            color="error"
            label={t("dataArena.equipmentImport.statusNeedsFix")}
            sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
          />
        );
      }

      if (imp.values.category_id.startsWith("newcat:")) {
        return (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={t("dataArena.equipmentImport.statusReadyNewCat")}
            sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
          />
        );
      }

      return (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<CheckCircleOutlinedIcon />}
          label={t("dataArena.equipmentImport.statusReady")}
          sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
        />
      );
    },
    [canEditEquipment, commit, duplicateMap, rowByKey, t, validation.problemRowKeys],
  );

  const handleEditCells = useCallback(
    (edits: { key: string; field: Field; value: string }[]) => {
      if (!edits.length) return;
      setServerErrors((prev) => {
        if (!Object.keys(prev).length) return prev;
        const copy = { ...prev };
        for (const e of edits) {
          if (copy[e.key]?.[e.field]) {
            const nextRowErr = { ...copy[e.key] };
            delete nextRowErr[e.field];
            if (Object.keys(nextRowErr).length) copy[e.key] = nextRowErr;
            else delete copy[e.key];
          }
        }
        return copy;
      });
      commit((s) => updateImportCells(s, edits, existingEquipment));
    },
    [commit, existingEquipment],
  );

  const handlePasteNewRows = useCallback(
    (valuesList: Values[]) => {
      commit((s) => {
        const added: ImportRow[] = valuesList.map((vals, idx) => ({
          key: `imp-add-${manualRowSeq++}`,
          sourceRowNumber: s.rows.length + idx + 1,
          values: vals,
          touchedFields: Object.keys(vals).filter((k) => (vals as any)[k] !== "") as Field[],
          rawCategory: "",
          rawWarehouse: "",
          existingMatch: null,
          existingAction: "new_number",
          autoNotes: {},
          rawAutoValues: {},
          autoChanged: false,
        }));
        return { ...s, rows: [...s.rows, ...added] };
      });
    },
    [commit],
  );

  const addBlankRow = () => {
    commit((s) => ({
      ...s,
      rows: [
        ...s.rows,
        {
          key: `imp-add-${manualRowSeq++}`,
          sourceRowNumber: s.rows.length + 1,
          values: blankValues({ warehouse_id: defaultWarehouseId }),
          touchedFields: defaultWarehouseId ? ["warehouse_id"] : [],
          rawCategory: "",
          rawWarehouse: "",
          existingMatch: null,
          existingAction: "new_number",
          autoNotes: {},
          rawAutoValues: {},
          autoChanged: false,
        },
      ],
    }));
  };

  const goToFirstError = useCallback(
    (errMap: Record<string, RowErrors> = validation.errors) => {
      setView("problems");
      const firstKey = Object.keys(errMap)[0];
      if (!firstKey) return;
      const firstField = Object.keys(errMap[firstKey])[0];
      const hasCol = EDITABLE_IMPORT_COLUMNS.some((c) => c.key === firstField);
      gridRef.current?.focusCell(firstKey, (hasCol ? firstField : "equipment_name") as ColumnKey);
    },
    [validation.errors],
  );

  const handleRequestImport = () => {
    setSubmitErrorBanner(null);
    if (validation.errorCount > 0) {
      toast.showError(t("equipment.sheet.fixFirst", { count: validation.errorCount }));
      goToFirstError();
      return;
    }
    if (!summaryCounts.totalActive || overLimitBy > 0) return;
    setConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    setConfirmOpen(false);
    setImporting(true);
    setSubmitErrorBanner(null);
    try {
      const payload = buildImportPayload(state);
      const res = await importEquipmentSave(payload);
      if (!res.saved) {
        const next: Record<string, RowErrors> = {};
        for (const err of res.errors) {
          next[err.key] = { ...next[err.key], [err.field]: err.code };
        }
        setServerErrors(next);
        setView("problems");
        const count = Object.keys(next).length;
        toast.showError(t("dataArena.equipmentImport.fixServerErrors", { count }));
        setSubmitErrorBanner(t("dataArena.equipmentImport.fixServerErrors", { count }));
        goToFirstError(next);
        return;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["equipment"] }),
        qc.invalidateQueries({ queryKey: ["equipment-stats"] }),
        qc.invalidateQueries({ queryKey: ["categories"] }),
        qc.invalidateQueries({ queryKey: ["category-options"] }),
        qc.invalidateQueries({ queryKey: ["bulk-jobs"] }),
        qc.invalidateQueries({ queryKey: POS_CATALOG_KEY }),
      ]);

      onDone({
        created: res.created,
        updated: res.updated,
        categoriesCreated: res.categoriesCreated,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t("dataArena.equipmentImport.importFailed");
      setSubmitErrorBanner(msg);
      toast.showError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleFindReplaceApply = () => {
    const res = findAndReplaceInColumn(state, replaceField, findText, replaceText, {
      matchCase,
      wholeCell,
      lookups,
      existingEquipment,
    });
    if (!res.replacedCount) {
      toast.showWarning(t("dataArena.equipmentImport.noMatchesFound"));
      return;
    }
    commit(() => res.state);
    toast.showSuccess(t("dataArena.equipmentImport.replacedCount", { count: res.replacedCount }));
    setFindReplaceOpen(false);
  };

  const { selectedRowKeys, stats, focus } = selectionInfo;
  const activeErrorCode = focus
    ? validation.errors[focus.row]?.[focus.col as Field] ?? validation.errors[focus.row]?.row
    : undefined;

  const colIndexSet = useMemo(() => new Set<string>(EDITABLE_IMPORT_COLUMNS.map((c) => c.key)), []);

  const handleRowContextMenu = useCallback(
    (e: MouseEvent, sheetRow: SheetRow, colKey: ColumnKey | null, selectedKeys: string[]) => {
      e.preventDefault();
      const imp = rowByKey.get(sheetRow.key);
      if (!imp) return;
      const targetKeys = selectedKeys.includes(sheetRow.key) ? selectedKeys : [sheetRow.key];
      setCtxMenu({ mouseX: e.clientX, mouseY: e.clientY, row: imp, colKey, selectedKeys: targetKeys });
    },
    [rowByKey],
  );

  const showAutoCleanBanner = !bannerDismissed && (state.autoFixCount > 0 || state.strippedEmptyCount > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {/* Narrow screen hint */}
      <Alert severity="info" sx={{ display: { xs: "flex", md: "none" } }}>
        {t("dataArena.equipmentImport.narrowScreenHint")}
      </Alert>

      {/* Auto-clean notification banner */}
      {showAutoCleanBanner && (
        <Alert
          severity="info"
          icon={<AutoFixHighIcon fontSize="small" />}
          action={
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              {state.autoFixCount > 0 && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    commit(revertAutoCleanFixes);
                    setBannerDismissed(true);
                  }}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {t("dataArena.equipmentImport.undoAutoClean")}
                </Button>
              )}
              <Button size="small" color="inherit" onClick={() => setBannerDismissed(true)} sx={{ textTransform: "none" }}>
                {t("dataArena.equipmentImport.dismiss")}
              </Button>
            </Box>
          }
        >
          {t("dataArena.equipmentImport.autoCleanBanner", { count: state.autoFixCount })}
          {state.strippedEmptyCount > 0 ? ` ${t("dataArena.equipmentImport.strippedEmptyNote", { count: state.strippedEmptyCount })}` : ""}
        </Alert>
      )}

      {/* Existing EQ numbers bar */}
      {existingRowsCount > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.25,
            borderRadius: 2,
            borderColor: "info.main",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {t("dataArena.equipmentImport.existingMatchBanner", { count: existingRowsCount })}
            </Typography>
            {!canEditEquipment && (
              <Typography variant="caption" color="text.secondary">
                {t("dataArena.equipmentImport.existingUpdateNoPerm")}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => commit((s) => setAllExistingAction(s, "new_number"))}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("dataArena.equipmentImport.existingNewNumber")}
            </Button>
            {canEditEquipment && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => commit((s) => setAllExistingAction(s, "update"))}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {t("dataArena.equipmentImport.existingUpdate")}
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => commit((s) => setAllExistingAction(s, "skip"))}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("dataArena.equipmentImport.existingSkip")}
            </Button>
          </Box>
        </Paper>
      )}

      {submitErrorBanner && <Alert severity="error">{submitErrorBanner}</Alert>}

      {/* Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "stretch", lg: "center" },
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder={t("equipment.sheet.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 200 }, "& .MuiOutlinedInput-input": { py: 0.5, fontSize: 12 } }}
            slotProps={{
              htmlInput: { "aria-label": t("equipment.sheet.search") },
              input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15 }} /></InputAdornment> },
            }}
          />

          <Box sx={{ display: "flex", gap: 0.5, overflowX: "auto", flexWrap: { xs: "nowrap", sm: "wrap" }, pb: { xs: 0.25, sm: 0 } }}>
            <Chip
              size="small"
              label={`${t("dataArena.equipmentImport.viewAll")} ${state.rows.length}`}
              color={view === "all" ? "primary" : "default"}
              variant={view === "all" ? "filled" : "outlined"}
              onClick={() => setView("all")}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            />
            <Chip
              size="small"
              label={`${t("dataArena.equipmentImport.viewProblems")} (${validation.errorCount})`}
              color={view === "problems" ? "error" : validation.errorCount > 0 ? "error" : "default"}
              variant={view === "problems" ? "filled" : "outlined"}
              onClick={() => setView("problems")}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            />
            <Chip
              size="small"
              label={`${t("dataArena.equipmentImport.viewChanged")} (${changedAutoCount})`}
              color={view === "changed" ? "primary" : "default"}
              variant={view === "changed" ? "filled" : "outlined"}
              onClick={() => setView("changed")}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            />
            <Chip
              size="small"
              label={`${t("dataArena.equipmentImport.viewDuplicates")} (${duplicateMap.size})`}
              color={view === "duplicates" ? "warning" : duplicateMap.size > 0 ? "warning" : "default"}
              variant={view === "duplicates" ? "filled" : "outlined"}
              onClick={() => setView("duplicates")}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            />
            {existingRowsCount > 0 && (
              <Chip
                size="small"
                label={`${t("dataArena.equipmentImport.viewExisting")} (${existingRowsCount})`}
                color={view === "existing" ? "info" : "default"}
                variant={view === "existing" ? "filled" : "outlined"}
                onClick={() => setView("existing")}
                sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          {(unknownCategories.length > 0 || unknownWarehouses.length > 0) && (
            <Button
              size="small"
              variant={unresolvedUnknownCount > 0 ? "contained" : "outlined"}
              color={unresolvedUnknownCount > 0 ? "warning" : "inherit"}
              disableElevation
              startIcon={<CategoryOutlinedIcon fontSize="small" />}
              onClick={() => setNamesOpen(true)}
              sx={{ textTransform: "none", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              {t("dataArena.equipmentImport.namesToSortOut")}
              {unresolvedUnknownCount > 0 ? ` (${unresolvedUnknownCount})` : ""}
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<CleaningServicesOutlinedIcon fontSize="small" />}
            onClick={(e) => setCleanAnchor(e.currentTarget)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("dataArena.equipmentImport.cleanUpMenu")}
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={addBlankRow}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("dataArena.equipmentImport.addBlankRow")}
          </Button>

          <Tooltip title={t("equipment.sheet.undo")}>
            <span>
              <Button size="small" color="inherit" disabled={!hist.past.length} onClick={undo} aria-label={t("equipment.sheet.undo")} sx={{ minWidth: 34, px: 1 }}>
                <UndoIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t("equipment.sheet.redo")}>
            <span>
              <Button size="small" color="inherit" disabled={!hist.future.length} onClick={redo} aria-label={t("equipment.sheet.redo")} sx={{ minWidth: 34, px: 1 }}>
                <RedoIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {/* Main Sheet Grid */}
      <Box sx={{ height: { xs: 420, md: "calc(100vh - 370px)" }, minHeight: 360, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <SheetGrid
          ref={gridRef}
          rows={visibleSheetRows}
          columns={EDITABLE_IMPORT_COLUMNS}
          lookups={validation.extendedLookups}
          errors={validation.errors}
          labels={labels}
          isEditable={(r, col) => {
            if (!r || !col || col.kind === "readonly") return false;
            const imp = rowByKey.get(r.key);
            return !(imp?.existingMatch && imp.existingAction === "skip");
          }}
          onEditCells={handleEditCells}
          onUndo={undo}
          onRedo={redo}
          onSaveShortcut={handleRequestImport}
          onPasteNewRows={handlePasteNewRows}
          onPasteSkipped={(count) => toast.showWarning(t("equipment.sheet.pasteSkipped", { count }))}
          onInvalidEdit={() => toast.showWarning(t("equipment.sheet.notValid"))}
          defaultNewRowValues={() => blankValues({ warehouse_id: defaultWarehouseId })}
          onDeleteRows={(keys) => commit((s) => deleteRowsByKeys(s, keys))}
          canEdit={true}
          canCreate={true}
          canDelete={true}
          renderRowStatus={renderRowStatus}
          rowStatusWidth={165}
          rowStatusLabel={t("dataArena.equipmentImport.statusCol")}
          cellNote={cellNote}
          cellBadge={cellBadge}
          onRowContextMenu={handleRowContextMenu}
          showPhotoColumn={false}
          showActionsColumn={false}
          emptyMessage={t("dataArena.equipmentImport.nothingHere")}
          onSelectionChange={({ selectedRowKeys: sKeys, stats: sStats, focus: sFocus }) =>
            setSelectionInfo({ selectedRowKeys: sKeys, stats: sStats, focus: sFocus })
          }
        />
      </Box>

      {/* Active Cell Error & Stats Line */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", minHeight: 22, fontSize: 12 }}>
        {activeErrorCode && (
          <Typography component="span" color="error" sx={{ fontSize: 12, fontWeight: 700 }}>
            {translateError(activeErrorCode)}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {stats && (
          <Typography component="span" color="text.secondary" sx={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {t("equipment.sheet.selection", { rows: stats.rows, cols: stats.cols })}
            {stats.numeric > 0 ? ` · ${t("equipment.sheet.sum", { sum: stats.sum.toLocaleString() })}` : ""}
          </Typography>
        )}
      </Box>

      {/* Plan limit warning */}
      {overLimitBy > 0 && (
        <Alert severity="error">
          {t("dataArena.equipmentImport.planLimitExceeded", {
            max: maxEquipmentLimit,
            current: currentShopCount,
            add: summaryCounts.creates,
            projected: projectedShopCount,
            over: overLimitBy,
          })}
        </Alert>
      )}

      {/* Footer: Live counts + Import button */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("dataArena.equipmentImport.back")}
          </Button>

          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={t("dataArena.equipmentImport.willAdd", { count: summaryCounts.creates })}
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          />
          {summaryCounts.updates > 0 && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={t("dataArena.equipmentImport.willUpdate", { count: summaryCounts.updates })}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            />
          )}
          {summaryCounts.skipped > 0 && (
            <Chip
              size="small"
              variant="outlined"
              label={t("dataArena.equipmentImport.willSkip", { count: summaryCounts.skipped })}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            />
          )}
          {summaryCounts.newCats > 0 && (
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={t("dataArena.equipmentImport.newCategoriesSummary", { count: summaryCounts.newCats })}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            />
          )}
          {validation.errorCount > 0 && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => goToFirstError()}
              sx={{ textTransform: "none", fontWeight: 800, fontVariantNumeric: "tabular-nums", height: 24 }}
            >
              {t("equipment.sheet.legendErrors", { count: validation.errorCount })}
            </Button>
          )}
        </Box>

        <Button
          variant="contained"
          disableElevation
          startIcon={<UploadFileIcon />}
          disabled={importing || summaryCounts.totalActive === 0 || overLimitBy > 0}
          onClick={handleRequestImport}
          sx={{ textTransform: "none", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        >
          {importing
            ? t("dataArena.equipmentImport.importing")
            : summaryCounts.totalActive > 0
              ? t("dataArena.equipmentImport.importButton", { count: summaryCounts.totalActive })
              : t("dataArena.equipmentImport.importButtonEmpty")}
        </Button>
      </Paper>

      {/* Clean up menu */}
      <Menu anchorEl={cleanAnchor} open={Boolean(cleanAnchor)} onClose={() => setCleanAnchor(null)}>
        <MenuItem
          onClick={() => {
            setCleanAnchor(null);
            if (focus && colIndexSet.has(focus.col)) setReplaceField(focus.col as Field);
            setFindReplaceOpen(true);
          }}
        >
          {t("dataArena.equipmentImport.cleanFindReplace")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCleanAnchor(null);
            commit(removeEmptyRows);
          }}
        >
          {t("dataArena.equipmentImport.cleanRemoveEmpty")}
        </MenuItem>
        <MenuItem
          disabled={duplicateMap.size === 0}
          onClick={() => {
            setCleanAnchor(null);
            commit(removeDuplicateRows);
          }}
        >
          {t("dataArena.equipmentImport.cleanRemoveDuplicates", { count: duplicateMap.size })}
        </MenuItem>
        <MenuItem
          disabled={selectedRowKeys.length === 0}
          onClick={() => {
            setCleanAnchor(null);
            commit((s) => deleteRowsByKeys(s, selectedRowKeys));
            gridRef.current?.clearSelection();
          }}
        >
          {t("dataArena.equipmentImport.cleanDeleteSelected", { count: selectedRowKeys.length })}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCleanAnchor(null);
            commit((s) => clearNumbersInSelection(s, selectedRowKeys));
          }}
        >
          {selectedRowKeys.length > 0
            ? t("dataArena.equipmentImport.cleanClearNumbersSelected", { count: selectedRowKeys.length })
            : t("dataArena.equipmentImport.cleanClearNumbersAll")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCleanAnchor(null);
            const res = copyRateToBlankExtraRate(state);
            if (res.updatedCount > 0) commit(() => res.state);
          }}
        >
          {t("dataArena.equipmentImport.cleanCopyRateToExtra")}
        </MenuItem>
      </Menu>

      {/* Right-click grid context menu */}
      <Menu
        open={Boolean(ctxMenu)}
        onClose={() => setCtxMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={ctxMenu ? { top: ctxMenu.mouseY, left: ctxMenu.mouseX } : undefined}
      >
        {ctxMenu?.colKey && ctxMenu.selectedKeys.length >= 2 && colIndexSet.has(ctxMenu.colKey) && (
          <MenuItem
            onClick={() => {
              const target = ctxMenu;
              setCtxMenu(null);
              commit((s) => fillDownSelection(s, target.selectedKeys, target.colKey as Field));
            }}
          >
            {t("dataArena.equipmentImport.cleanFillDown", {
              field: t(EDITABLE_IMPORT_COLUMNS.find((c) => c.key === ctxMenu.colKey)?.label ?? "equipment.sheet.cols.name"),
            })}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const keys = ctxMenu?.selectedKeys ?? [];
            setCtxMenu(null);
            commit((s) => clearNumbersInSelection(s, keys));
          }}
        >
          {t("dataArena.equipmentImport.cleanClearNumbersSelected", { count: ctxMenu?.selectedKeys.length ?? 0 })}
        </MenuItem>
        {ctxMenu?.row.existingMatch && (
          <MenuItem
            onClick={() => {
              const keys = ctxMenu.selectedKeys;
              setCtxMenu(null);
              commit((s) => setRowExistingAction(s, keys, "new_number"));
            }}
          >
            {t("dataArena.equipmentImport.existingNewNumber")}
          </MenuItem>
        )}
        {ctxMenu?.row.existingMatch && canEditEquipment && (
          <MenuItem
            onClick={() => {
              const keys = ctxMenu.selectedKeys;
              setCtxMenu(null);
              commit((s) => setRowExistingAction(s, keys, "update"));
            }}
          >
            {t("dataArena.equipmentImport.existingUpdate")}
          </MenuItem>
        )}
        {ctxMenu?.row.existingMatch && (
          <MenuItem
            onClick={() => {
              const keys = ctxMenu.selectedKeys;
              setCtxMenu(null);
              commit((s) => setRowExistingAction(s, keys, "skip"));
            }}
          >
            {t("dataArena.equipmentImport.existingSkip")}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const keys = ctxMenu?.selectedKeys ?? [];
            setCtxMenu(null);
            commit((s) => deleteRowsByKeys(s, keys));
          }}
        >
          {t("dataArena.equipmentImport.cleanDeleteSelected", { count: ctxMenu?.selectedKeys.length ?? 0 })}
        </MenuItem>
      </Menu>

      {/* Find & Replace Dialog */}
      <Dialog open={findReplaceOpen} onClose={() => setFindReplaceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("dataArena.equipmentImport.findReplaceTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
          <TextField
            select
            size="small"
            fullWidth
            label={t("dataArena.equipmentImport.findReplaceCol")}
            value={replaceField}
            onChange={(e) => setReplaceField(e.target.value as Field)}
            sx={{ mt: 0.5 }}
          >
            {EDITABLE_IMPORT_COLUMNS.map((c) => (
              <MenuItem key={c.key} value={c.key}>
                {t(c.label)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            label={t("dataArena.equipmentImport.findText")}
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            label={t("dataArena.equipmentImport.replaceText")}
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />}
            label={t("dataArena.equipmentImport.matchCase")}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={wholeCell} onChange={(e) => setWholeCell(e.target.checked)} />}
            label={t("dataArena.equipmentImport.wholeCell")}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setFindReplaceOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" disableElevation disabled={!findText} onClick={handleFindReplaceApply} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("dataArena.equipmentImport.applyReplace")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Import Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("dataArena.equipmentImport.confirmTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {summaryCounts.creates > 0 && (
            <DialogContentText sx={{ color: "text.primary", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              • {t("dataArena.equipmentImport.confirmCreates", { count: summaryCounts.creates })}
            </DialogContentText>
          )}
          {summaryCounts.updates > 0 && (
            <DialogContentText sx={{ color: "text.primary", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              • {t("dataArena.equipmentImport.confirmUpdates", { count: summaryCounts.updates })}
            </DialogContentText>
          )}
          {newCategoryNamesPreview.length > 0 && (
            <DialogContentText sx={{ color: "info.main", fontWeight: 700 }}>
              • {t("dataArena.equipmentImport.confirmNewCategories", { count: newCategoryNamesPreview.length, names: newCategoryNamesPreview.join(", ") })}
            </DialogContentText>
          )}
          <DialogContentText sx={{ mt: 1, fontSize: 13 }}>
            {t("dataArena.equipmentImport.confirmAtomic")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" disableElevation onClick={handleConfirmImport} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("dataArena.equipmentImport.confirmProceed")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Names to sort out Drawer */}
      <NamesToSortOutPanel
        open={namesOpen}
        onClose={() => setNamesOpen(false)}
        lookups={lookups}
        unknownCategories={unknownCategories}
        unknownWarehouses={unknownWarehouses}
        categoryResolutions={state.categoryResolutions}
        warehouseResolutions={state.warehouseResolutions}
        canCreateCategory={canCreateCategory}
        onResolveCategory={(key, res) => commit((s) => applyCategoryResolution(s, key, res))}
        onResolveWarehouse={(key, res) => commit((s) => applyWarehouseResolution(s, key, res))}
      />
    </Box>
  );
}
