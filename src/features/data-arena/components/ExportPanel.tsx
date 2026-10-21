import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Stack,
  CircularProgress,
  TextField,
  MenuItem,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useStartExport } from "../hooks/useBulkJobs";
import { Trans, useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

type ExportEntity = "equipment" | "customers" | "invoices";

const ENTITIES: { key: ExportEntity; label: string; formats: ("xlsx" | "csv")[]; description: string }[] = [
  { key: "equipment", label: tk("nav.equipment"), formats: ["xlsx", "csv"], description: tk("dataArena.ExportPanel.allNonDeletedEquipmentWith") },
  { key: "customers", label: tk("nav.customers"), formats: ["xlsx", "csv"], description: tk("dataArena.ExportPanel.allNonDeletedCustomerRecords") },
  { key: "invoices", label: tk("nav.invoices"), formats: ["xlsx"], description: tk("dataArena.ExportPanel.invoicesWithCustomerTotalsFilter") },
];

export function ExportPanel() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<ExportEntity>("equipment");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [status, setStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [successJobId, setSuccessJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startExport = useStartExport();
  const current = ENTITIES.find((e) => e.key === entity)!;

  const handleSubmit = async () => {
    setError(null);
    setSuccessJobId(null);
    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (entity === "invoices") {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    try {
      const job = await startExport.mutateAsync({ entity, format, filters });
      setSuccessJobId(job.job_id);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t("dataArena.ExportPanel.exportFailedToStart"));
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
        bgcolor: "white",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          {t("dataArena.ExportPanel.generateFile")}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("dataArena.ExportPanel.export", { label: current.label })}
        </Typography>
        <Typography variant="caption" sx={{ color: "#475569" }}>
          {t(current.description)}
        </Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "#475569" }}>
          {t("dataArena.ExportPanel.entity")}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={entity}
          onChange={(_, v) => {
            if (!v) return;
            setEntity(v);
            const next = ENTITIES.find((e) => e.key === v)!;
            if (!next.formats.includes(format)) setFormat(next.formats[0]);
          }}
          sx={{
            flexWrap: "wrap",
            gap: 0.5,
            "& .MuiToggleButton-root": {
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "999px !important",
              border: "1px solid #e2e8f0",
              px: 2,
            },
          }}
        >
          {ENTITIES.map((e) => (
            <ToggleButton key={e.key} value={e.key}>
              {t(e.label)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
        <TextField
          select
          size="small"
          label={t("dataArena.ExportPanel.format")}
          value={format}
          onChange={(e) => setFormat(e.target.value as any)}
          sx={{ minWidth: 140 }}
        >
          {current.formats.map((f) => (
            <MenuItem key={f} value={f}>
              {f.toUpperCase()}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          label={t("dataArena.ExportPanel.statusOptional")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 160 }}
        />

        {entity === "invoices" && (
          <>
            <TextField
              type="date"
              size="small"
              label={t("common.dateFrom")}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              size="small"
              label={t("common.dateTo")}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ minWidth: 160 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successJobId && (
        <Alert severity="success">
          <Trans i18nKey="dataArena.ExportPanel.jobQueued" values={{ id: successJobId, downloads: t("nav.downloads") }} components={{ strong: <strong /> }} />
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={startExport.isPending}
          startIcon={
            startExport.isPending ? (
              <CircularProgress size={14} sx={{ color: "white" }} />
            ) : (
              <DownloadIcon />
            )
          }
          sx={{ fontWeight: 800 }}
        >
          {startExport.isPending ? t("dataArena.ExportPanel.queueing") : t("dataArena.ExportPanel.queueExport")}
        </Button>
      </Stack>
    </Paper>
  );
}
