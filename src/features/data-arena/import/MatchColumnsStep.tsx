import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import { useTranslation } from "react-i18next";

import type { Field, Lookups } from "@/features/equipment/sheet/sheetModel";
import {
  EDITABLE_IMPORT_COLUMNS,
  REQUIRED_IMPORT_FIELDS,
  getColumnSamples,
  reassignColumnMapping,
} from "./columnMatching";
import type { ParsedSheet, SheetTable } from "./parseFile";

interface MatchColumnsStepProps {
  sheet: ParsedSheet;
  table: SheetTable;
  mapping: (Field | null)[];
  sameForAll: Partial<Record<Field, string>>;
  lookups: Lookups;
  singleLocationName?: string | null;
  onChangeHeaderRow: (headerRowIndex: number) => void;
  onChangeMapping: (next: (Field | null)[]) => void;
  onChangeSameForAll: (next: Partial<Record<Field, string>>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const REQUIRED_LIST: Field[] = ["equipment_name", "category_id", "warehouse_id", "base_rental_price"];

export function MatchColumnsStep({
  sheet,
  table,
  mapping,
  sameForAll,
  lookups,
  singleLocationName,
  onChangeHeaderRow,
  onChangeMapping,
  onChangeSameForAll,
  onBack,
  onContinue,
}: MatchColumnsStepProps) {
  const { t } = useTranslation();

  const mappedFields = new Set<Field>(mapping.filter((f): f is Field => f !== null));
  const fieldToHeader = new Map<Field, string>();
  mapping.forEach((f, idx) => {
    if (f) fieldToHeader.set(f, table.headers[idx] || `Column ${idx + 1}`);
  });

  const colByField = new Map(EDITABLE_IMPORT_COLUMNS.map((c) => [c.key as Field, c]));
  const isFieldSatisfied = (f: Field) => {
    if (mappedFields.has(f)) return true;
    const same = (sameForAll[f] ?? "").trim();
    return same !== "";
  };

  const missingRequired = REQUIRED_LIST.filter((f) => !isFieldSatisfied(f));
  const missingLabels = missingRequired.map((f) => {
    const col = colByField.get(f);
    return col ? t(col.label) : f;
  });

  const ignoredColumns = table.headers
    .map((h, idx) => ({ idx, header: h || `Column ${idx + 1}` }))
    .filter((item) => mapping[item.idx] === null);

  const maxHeaderChoices = Math.min(sheet.rows.length, 10);
  const showSameForAllSection =
    !mappedFields.has("category_id") ||
    !mappedFields.has("warehouse_id") ||
    !mappedFields.has("minimum_rental_days") ||
    !mappedFields.has("is_bulk_item");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Top Bar: Header row picker + progress */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label={t("dataArena.equipmentImport.headerRow")}
            value={table.headerRowIndex}
            onChange={(e) => onChangeHeaderRow(Number(e.target.value))}
            sx={{ minWidth: 160 }}
          >
            {Array.from({ length: maxHeaderChoices }, (_, i) => (
              <MenuItem key={i} value={i}>
                {t("dataArena.equipmentImport.rowNumber", { n: i + 1 })}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {t("dataArena.equipmentImport.matchedSummary", {
              matched: mappedFields.size,
              total: table.headers.length,
            })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {REQUIRED_LIST.map((f) => {
            const col = colByField.get(f);
            const ok = isFieldSatisfied(f);
            return (
              <Chip
                key={f}
                size="small"
                color={ok ? "success" : "error"}
                variant={ok ? "filled" : "outlined"}
                icon={ok ? <CheckCircleOutlinedIcon /> : <ErrorOutlinedIcon />}
                label={col ? t(col.label) : f}
                sx={{ fontWeight: 700 }}
              />
            );
          })}
        </Box>
      </Paper>

      {/* Column Mapping Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {table.headers.map((rawHeader, colIdx) => {
          const matchedField = mapping[colIdx];
          const samples = getColumnSamples(table.dataRows, colIdx, 3);
          const displayHeader = rawHeader || `Column ${colIdx + 1}`;
          const isReq = matchedField !== null && REQUIRED_IMPORT_FIELDS.has(matchedField);

          return (
            <Paper
              key={`${colIdx}-${rawHeader}`}
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 2,
                bgcolor: "background.paper",
                borderColor: matchedField ? "primary.main" : "divider",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
                  {displayHeader}
                </Typography>
                {isReq && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label={t("dataArena.equipmentImport.requiredBadge")}
                    sx={{ height: 20, fontSize: 10, fontWeight: 800 }}
                  />
                )}
              </Box>

              <TextField
                select
                size="small"
                fullWidth
                label={t("dataArena.equipmentImport.geargridField")}
                value={matchedField ?? "__ignore__"}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeMapping(reassignColumnMapping(mapping, colIdx, val === "__ignore__" ? null : (val as Field)));
                }}
              >
                <MenuItem value="__ignore__">{t("dataArena.equipmentImport.ignoreColumn")}</MenuItem>
                {EDITABLE_IMPORT_COLUMNS.map((col) => {
                  const f = col.key as Field;
                  const usedOn = fieldToHeader.get(f);
                  const usedElsewhere = usedOn !== undefined && matchedField !== f;
                  const label = t(col.label);
                  return (
                    <MenuItem key={f} value={f}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}>
                        <span>
                          {label}
                          {REQUIRED_IMPORT_FIELDS.has(f) ? ` (${t("dataArena.equipmentImport.requiredBadge")})` : ""}
                        </span>
                        {usedElsewhere && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({t("dataArena.equipmentImport.alreadyUsedTag")})
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>

              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {samples.length
                  ? `${t("dataArena.equipmentImport.samples")}: ${samples.join(" · ")}`
                  : t("dataArena.equipmentImport.noSamples")}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* "Use the same value for every row" defaults for unmapped fields */}
      {showSameForAllSection && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "background.paper" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t("dataArena.equipmentImport.sameForAllTitle")}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {t("dataArena.equipmentImport.sameForAllHint")}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            {!mappedFields.has("category_id") && (
              <TextField
                select
                size="small"
                required
                error={!sameForAll.category_id}
                label={t("equipment.sheet.cols.category")}
                value={sameForAll.category_id ?? ""}
                onChange={(e) => onChangeSameForAll({ ...sameForAll, category_id: e.target.value })}
              >
                <MenuItem value="">—</MenuItem>
                {lookups.categories.map((c) => (
                  <MenuItem key={c.category_id} value={String(c.category_id)}>
                    {c.category_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {!mappedFields.has("warehouse_id") &&
              (singleLocationName ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {t("dataArena.equipmentImport.singleLocationAuto", { name: singleLocationName })}
                </Alert>
              ) : (
                <TextField
                  select
                  size="small"
                  required
                  error={!sameForAll.warehouse_id}
                  label={t("equipment.sheet.cols.location")}
                  value={sameForAll.warehouse_id ?? ""}
                  onChange={(e) => onChangeSameForAll({ ...sameForAll, warehouse_id: e.target.value })}
                >
                  <MenuItem value="">—</MenuItem>
                  {lookups.warehouses.map((w) => (
                    <MenuItem key={w.warehouse_id} value={String(w.warehouse_id)}>
                      {w.location_name}
                    </MenuItem>
                  ))}
                </TextField>
              ))}

            {!mappedFields.has("minimum_rental_days") && (
              <TextField
                size="small"
                type="number"
                label={t("equipment.sheet.cols.minDays")}
                value={sameForAll.minimum_rental_days ?? "1"}
                onChange={(e) => onChangeSameForAll({ ...sameForAll, minimum_rental_days: e.target.value })}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            )}

            {!mappedFields.has("is_bulk_item") && (
              <FormControlLabel
                control={
                  <Switch
                    checked={sameForAll.is_bulk_item === "true"}
                    onChange={(e) =>
                      onChangeSameForAll({ ...sameForAll, is_bulk_item: e.target.checked ? "true" : "false" })
                    }
                  />
                }
                label={t("equipment.sheet.cols.bulk")}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Ignored columns list */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "background.paper" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t("dataArena.equipmentImport.ignoredColumnsTitle", { count: ignoredColumns.length })}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: ignoredColumns.length ? 1 : 0 }}>
          {ignoredColumns.length
            ? t("dataArena.equipmentImport.ignoredColumnsHint")
            : t("dataArena.equipmentImport.allColumnsMapped")}
        </Typography>
        {ignoredColumns.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {ignoredColumns.map((item) => (
              <Chip key={item.idx} size="small" variant="outlined" label={item.header} />
            ))}
          </Box>
        )}
      </Paper>

      {/* Explanation when Continue is disabled + Nav actions */}
      {missingRequired.length > 0 && (
        <Alert severity="warning">
          {t("dataArena.equipmentImport.missingRequiredExplain", { fields: missingLabels.join(", ") })}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: { xs: "column-reverse", sm: "row" }, justifyContent: "space-between", gap: 1.5 }}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {t("dataArena.equipmentImport.back")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          endIcon={<ArrowForwardIcon />}
          disabled={missingRequired.length > 0}
          onClick={onContinue}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {t("dataArena.equipmentImport.continueToCheck")}
        </Button>
      </Box>
    </Box>
  );
}
