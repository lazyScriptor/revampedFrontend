import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { tk } from "@/i18n/marker";
import { useToast } from "@/components/ui/AppToast";
import { fetchEquipment } from "@/features/equipment/api/equipment.api";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { UnsavedGuard } from "@/features/equipment/sheet/EquipmentSheet";
import type { Field, Lookups } from "@/features/equipment/sheet/sheetModel";
import { useSingleLocation, useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { CheckAndFixStep } from "./CheckAndFixStep";
import {
  EDITABLE_IMPORT_COLUMNS,
  autoMatchColumns,
  loadSavedColumnMapping,
  saveColumnMapping,
} from "./columnMatching";
import { downloadCsvTemplateFile, downloadXlsxTemplateFile } from "./equipmentTemplate";
import { ImportDoneStep, type ImportDoneSummary } from "./ImportDoneStep";
import {
  buildEmptyImportState,
  buildInitialImportState,
  type ExistingEquipmentRef,
  type ImportState,
} from "./importModel";
import { MatchColumnsStep } from "./MatchColumnsStep";
import {
  ImportParseError,
  detectHeaderRowIndex,
  extractSheetTable,
  parseImportFile,
  type ImportParseErrorCode,
  type ParsedWorkbook,
} from "./parseFile";

const PARSE_ERROR_KEYS: Record<Exclude<ImportParseErrorCode, "too_many_rows">, string> = {
  file_too_large: tk("dataArena.equipmentImport.parseErrors.file_too_large"),
  unsupported_type: tk("dataArena.equipmentImport.parseErrors.unsupported_type"),
  xls_binary_unsupported: tk("dataArena.equipmentImport.parseErrors.xls_binary_unsupported"),
  empty_file: tk("dataArena.equipmentImport.parseErrors.empty_file"),
  corrupt_file: tk("dataArena.equipmentImport.parseErrors.corrupt_file"),
};

type WizardStep = 0 | 1 | 2 | 3;

export function EquipmentImportWizard() {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useCategoryOptions();
  const { data: warehouses = [] } = useWarehouseOptions();
  const { single, only } = useSingleLocation();
  const defaultWarehouseId = single && only ? String(only.warehouse_id) : "";

  const lookups: Lookups = useMemo(() => ({ categories, warehouses }), [categories, warehouses]);

  const { data: existingData } = useQuery({
    queryKey: ["equipment", "sheet"],
    queryFn: () => fetchEquipment(1, 5000),
    refetchOnWindowFocus: false,
  });

  const existingEquipment: ExistingEquipmentRef[] = useMemo(
    () =>
      (existingData?.equipment ?? []).map((e) => ({
        equipment_id: e.equipment_id,
        serial_number: e.serial_number,
        equipment_name: e.equipment_name,
        equipment_name_si: e.equipment_name_si,
        category_id: e.category_id,
        warehouse_id: e.warehouse_id,
      })),
    [existingData],
  );

  const [step, setStep] = useState<WizardStep>(0);
  const [dragging, setDragging] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRowIdx, setHeaderRowIdx] = useState(0);
  const [mapping, setMapping] = useState<(Field | null)[]>([]);
  const [sameForAll, setSameForAll] = useState<Partial<Record<Field, string>>>({
    minimum_rental_days: "1",
    is_bulk_item: "false",
  });

  const [checkState, setCheckState] = useState<ImportState | null>(null);
  const [doneSummary, setDoneSummary] = useState<ImportDoneSummary | null>(null);

  const translatedFieldLabels = useMemo(() => {
    const out: Partial<Record<Field, string>> = {};
    for (const col of EDITABLE_IMPORT_COLUMNS) {
      out[col.key as Field] = t(col.label);
    }
    return out;
  }, [t]);

  const activeSheet = workbook?.sheets[sheetIdx] ?? null;

  const activeTable = useMemo(() => {
    if (!activeSheet) return null;
    try {
      return extractSheetTable(activeSheet, headerRowIdx);
    } catch {
      return null;
    }
  }, [activeSheet, headerRowIdx]);

  const initializeMappingForSheet = (wb: ParsedWorkbook, sIdx: number, hIdx?: number) => {
    const sheet = wb.sheets[sIdx];
    if (!sheet) return;
    const chosenHeaderIdx = hIdx ?? detectHeaderRowIndex(sheet.rows);
    const table = extractSheetTable(sheet, chosenHeaderIdx);
    const saved = loadSavedColumnMapping(table.headers);
    const nextMapping = saved ?? autoMatchColumns(table.headers, translatedFieldLabels);

    setSheetIdx(sIdx);
    setHeaderRowIdx(chosenHeaderIdx);
    setMapping(nextMapping);
    setSameForAll((prev) => ({
      ...prev,
      warehouse_id: defaultWarehouseId || prev.warehouse_id || "",
      minimum_rental_days: prev.minimum_rental_days || "1",
      is_bulk_item: prev.is_bulk_item || "false",
    }));
  };

  const formatParseError = (err: unknown): string => {
    if (err instanceof ImportParseError) {
      if (err.code === "too_many_rows") {
        return t("dataArena.equipmentImport.parseErrors.too_many_rows", {
          count: Number(err.meta?.count ?? 0),
        });
      }
      return t(PARSE_ERROR_KEYS[err.code]);
    }
    return t("dataArena.equipmentImport.parseErrors.corrupt_file");
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setReadingFile(true);
    try {
      const parsed = await parseImportFile(file);
      const preferredIdx = Math.max(
        0,
        parsed.sheets.findIndex((s) => s.name.trim().toLowerCase() === "equipment"),
      );
      setWorkbook(parsed);
      initializeMappingForSheet(parsed, preferredIdx);
      if (parsed.sheets.length === 1) {
        setStep(1);
      }
    } catch (err) {
      setWorkbook(null);
      setParseError(formatParseError(err));
    } finally {
      setReadingFile(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSelectSheet = (idx: number) => {
    if (!workbook) return;
    setParseError(null);
    try {
      initializeMappingForSheet(workbook, idx);
    } catch (err) {
      setParseError(formatParseError(err));
    }
  };

  const handleChangeHeaderRow = (nextHeaderIdx: number) => {
    if (!workbook || !activeSheet) return;
    try {
      initializeMappingForSheet(workbook, sheetIdx, nextHeaderIdx);
      setParseError(null);
    } catch (err) {
      setParseError(formatParseError(err));
    }
  };

  const handleContinueFromMatch = () => {
    if (!activeTable) return;
    saveColumnMapping(activeTable.headers, mapping);
    const mergedSame: Partial<Record<Field, string>> = {
      ...sameForAll,
      warehouse_id: sameForAll.warehouse_id || defaultWarehouseId,
    };
    const nextState = buildInitialImportState({
      dataRows: activeTable.dataRows,
      sourceRowNumbers: activeTable.sourceRowNumbers,
      mapping,
      sameForAll: mergedSame,
      lookups,
      existingEquipment,
    });
    setCheckState(nextState);
    setStep(2);
  };

  const handleStartEmptySheet = () => {
    setWorkbook(null);
    setParseError(null);
    setCheckState(buildEmptyImportState(defaultWarehouseId, 20));
    setStep(2);
  };

  const handleDownloadXlsx = async () => {
    setDownloadingXlsx(true);
    try {
      await downloadXlsxTemplateFile();
    } catch {
      toast.showError(t("dataArena.equipmentImport.templateDownloadFailed"));
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const handleDownloadCsv = () => {
    downloadCsvTemplateFile({
      category: categories[0]?.category_name,
      warehouse: warehouses[0]?.location_name,
    });
  };

  const handleResetWizard = () => {
    setWorkbook(null);
    setCheckState(null);
    setDoneSummary(null);
    setParseError(null);
    setStep(0);
  };

  const stepLabels = [
    t("dataArena.equipmentImport.steps.file"),
    t("dataArena.equipmentImport.steps.match"),
    t("dataArena.equipmentImport.steps.check"),
    t("dataArena.equipmentImport.steps.done"),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <UnsavedGuard dirty={step === 1 || step === 2} />

      <Stepper
        activeStep={step}
        alternativeLabel
        sx={{
          "& .MuiStepLabel-label": {
            fontSize: { xs: 11, sm: 13 },
            fontWeight: 700,
          },
        }}
      >
        {stepLabels.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1: File */}
      {step === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            hidden
            aria-label={t("dataArena.equipmentImport.chooseFile")}
            onChange={onFileInputChange}
          />

          {/* Dropzone */}
          <Paper
            variant="outlined"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !readingFile && fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !readingFile) {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 2.5,
              border: "2px dashed",
              borderColor: dragging ? "primary.main" : "divider",
              bgcolor: dragging ? "action.hover" : "background.default",
              textAlign: "center",
              cursor: readingFile ? "wait" : "pointer",
              transition: "border-color 150ms ease, background-color 150ms ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            {readingFile ? <CircularProgress size={36} /> : <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} />}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {readingFile ? t("dataArena.equipmentImport.readingFile") : t("dataArena.equipmentImport.dropzoneTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
              {t("dataArena.equipmentImport.dropzoneHint")}
            </Typography>
            <Button
              variant="contained"
              disableElevation
              size="small"
              disabled={readingFile}
              sx={{ mt: 0.5, textTransform: "none", fontWeight: 800 }}
            >
              {t("dataArena.equipmentImport.chooseFile")}
            </Button>
          </Paper>

          {parseError && <Alert severity="error">{parseError}</Alert>}

          {/* Multi-sheet picker for .xlsx files with multiple sheets */}
          {workbook && workbook.sheets.length > 1 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "background.paper", display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t("dataArena.equipmentImport.chooseSheetTitle", { count: workbook.sheets.length })}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { xs: "stretch", sm: "center" } }}>
                <TextField
                  select
                  size="small"
                  value={sheetIdx}
                  onChange={(e) => handleSelectSheet(Number(e.target.value))}
                  sx={{ minWidth: { xs: "100%", sm: 260 } }}
                >
                  {workbook.sheets.map((s, idx) => (
                    <MenuItem key={`${idx}-${s.name}`} value={idx}>
                      {s.name} ({t("dataArena.equipmentImport.sheetRowsCount", { count: Math.max(0, s.rows.length - 1) })})
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={!activeTable}
                  onClick={() => setStep(1)}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  {t("dataArena.equipmentImport.useSelectedSheet")}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Templates + Start with empty sheet */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "center" },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                disabled={downloadingXlsx}
                onClick={handleDownloadXlsx}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {t("dataArena.equipmentImport.downloadXlsxTemplate")}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadCsv}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {t("dataArena.equipmentImport.downloadCsvTemplate")}
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: { xs: "space-between", md: "flex-end" } }}>
              <Typography variant="caption" color="text.secondary">
                {t("dataArena.equipmentImport.orStartEmpty")}
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<TableChartOutlinedIcon />}
                onClick={handleStartEmptySheet}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                {t("dataArena.equipmentImport.startEmptySheet")}
              </Button>
            </Box>
          </Paper>

          {/* What your file needs */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "background.paper" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t("dataArena.equipmentImport.whatFileNeeds")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
              {t("dataArena.equipmentImport.whatFileNeedsHint")}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="error" label={t("dataArena.equipmentImport.colRequired")} sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                <Typography variant="body2">{t("dataArena.equipmentImport.needName")}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="error" label={t("dataArena.equipmentImport.colRequired")} sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                <Typography variant="body2">{t("dataArena.equipmentImport.needCategory")}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="error" label={t("dataArena.equipmentImport.colRequired")} sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                <Typography variant="body2">{t("dataArena.equipmentImport.needLocation")}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="error" label={t("dataArena.equipmentImport.colRequired")} sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                <Typography variant="body2">{t("dataArena.equipmentImport.needRate")}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" variant="outlined" label={t("dataArena.equipmentImport.colOptional")} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                <Typography variant="body2" color="text.secondary">{t("dataArena.equipmentImport.needNumber")}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                {t("dataArena.equipmentImport.needFormats")}
              </Typography>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Step 2: Match columns */}
      {step === 1 && activeSheet && activeTable && (
        <MatchColumnsStep
          sheet={activeSheet}
          table={activeTable}
          mapping={mapping}
          sameForAll={sameForAll}
          lookups={lookups}
          singleLocationName={single && only ? only.location_name : null}
          onChangeHeaderRow={handleChangeHeaderRow}
          onChangeMapping={setMapping}
          onChangeSameForAll={setSameForAll}
          onBack={() => setStep(0)}
          onContinue={handleContinueFromMatch}
        />
      )}

      {/* Step 3: Check & fix */}
      {step === 2 && checkState && (
        <CheckAndFixStep
          initialState={checkState}
          lookups={lookups}
          existingEquipment={existingEquipment}
          existingTotalCount={existingData?.total}
          defaultWarehouseId={defaultWarehouseId}
          onBack={() => setStep(workbook ? 1 : 0)}
          onDone={(summary) => {
            setDoneSummary(summary);
            setStep(3);
          }}
        />
      )}

      {/* Step 4: Done */}
      {step === 3 && doneSummary && (
        <ImportDoneStep summary={doneSummary} onImportAnother={handleResetWizard} />
      )}
    </Box>
  );
}
