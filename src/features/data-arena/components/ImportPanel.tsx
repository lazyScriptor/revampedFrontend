import { useRef, useState } from "react";
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
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useStartImport } from "../hooks/useBulkJobs";
import { Trans, useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

const ENTITIES: { key: string; label: string; description: string }[] = [
  {
    key: "equipment",
    label: tk("nav.equipment"),
    description: tk("dataArena.ImportPanel.uploadACsvOfInventory"),
  },
  {
    key: "customers",
    label: tk("nav.customers"),
    description: tk("dataArena.ImportPanel.uploadACsvOfCustomers"),
  },
];

export function ImportPanel() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<string>("equipment");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startImport = useStartImport();

  const current = ENTITIES.find((e) => e.key === entity)!;

  const handleSubmit = async () => {
    if (!file) {
      setError(t("dataArena.ImportPanel.chooseACsvFileFirst"));
      return;
    }
    setError(null);
    setSuccessJobId(null);
    try {
      const job = await startImport.mutateAsync({ entity, file });
      setSuccessJobId(job.job_id);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t("dataArena.ImportPanel.importFailedToStart"));
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
          {t("dataArena.ImportPanel.uploadCsv")}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("dataArena.ImportPanel.bulkImportTo", { label: current.label })}
        </Typography>
      </Box>

      {/* Entity picker */}
      <Box>
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "#475569" }}>
          {t("dataArena.ExportPanel.entity")}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={entity}
          onChange={(_, v) => v && setEntity(v)}
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

      <Alert severity="info" variant="outlined" sx={{ alignItems: "flex-start" }}>
        {t(current.description)}
      </Alert>

      {/* File dropzone */}
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          border: "2px dashed #cbd5e1",
          borderRadius: 2,
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          bgcolor: "#f8fafc",
          "&:hover": { borderColor: "primary.main", bgcolor: "#f1f5f9" },
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 36, color: "#94a3b8" }} />
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
          {file ? file.name : t("dataArena.ImportPanel.clickToChooseACsv")}
        </Typography>
        <Typography variant="caption" sx={{ color: "#64748b" }}>
          .csv up to 50 MB
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setError(null);
          }}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successJobId && (
        <Alert severity="success">
          <Trans i18nKey="dataArena.ImportPanel.jobQueued" values={{ id: successJobId }} components={{ strong: <strong /> }} />
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button
          onClick={() => {
            setFile(null);
            setError(null);
            setSuccessJobId(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          color="inherit"
          disabled={startImport.isPending}
        >
          {t("common.reset")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSubmit}
          disabled={!file || startImport.isPending}
          startIcon={
            startImport.isPending ? (
              <CircularProgress size={14} sx={{ color: "white" }} />
            ) : (
              <InsertDriveFileIcon />
            )
          }
          sx={{ fontWeight: 800 }}
        >
          {startImport.isPending ? t("dataArena.ExportPanel.queueing") : t("dataArena.ImportPanel.queueImport")}
        </Button>
      </Stack>
    </Paper>
  );
}
