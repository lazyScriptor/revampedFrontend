import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { Trans, useTranslation } from "react-i18next";

import { tk } from "@/i18n/marker";
import { useStartImport } from "../hooks/useBulkJobs";
import { EquipmentImportWizard } from "../import/EquipmentImportWizard";

type ImportEntity = "equipment" | "customers";

const ENTITIES: { key: ImportEntity; label: string; description: string }[] = [
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
  const [entity, setEntity] = useState<ImportEntity>("equipment");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successJobId, setSuccessJobId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startImport = useStartImport();
  const current = ENTITIES.find((e) => e.key === entity) ?? ENTITIES[0];

  const handleFile = (picked: File | null) => {
    setError(null);
    setSuccessJobId(null);
    setFile(picked);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t("dataArena.ImportPanel.chooseACsvFileFirst"));
      return;
    }
    setError(null);
    setSuccessJobId(null);
    try {
      const res: any = await startImport.mutateAsync({ entity, file });
      const id = res?.job?.job_id ?? res?.data?.job?.job_id ?? res?.job_id ?? null;
      if (id != null) setSuccessJobId(Number(id));
      setFile(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t("dataArena.ImportPanel.importFailedToStart"));
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        border: 1,
        borderColor: "divider",
        borderRadius: 2.5,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box>
          {entity === "customers" && (
            <Typography
              variant="overline"
              sx={{ fontWeight: 800, letterSpacing: 1.4, color: "text.secondary", display: "block", lineHeight: 1.2 }}
            >
              {t("dataArena.ImportPanel.uploadCsv")}
            </Typography>
          )}
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
            {t("dataArena.ImportPanel.bulkImportTo", { label: t(current.label) })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(current.description)}
          </Typography>
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={entity}
          onChange={(_, v) => {
            if (!v) return;
            setEntity(v);
            setFile(null);
            setError(null);
            setSuccessJobId(null);
          }}
        >
          {ENTITIES.map((item) => (
            <ToggleButton key={item.key} value={item.key} sx={{ textTransform: "none", fontWeight: 700, px: 2 }}>
              {t(item.label)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {entity === "equipment" ? (
        <EquipmentImportWizard />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              handleFile(f);
            }}
          />

          <Box
            onClick={() => fileRef.current?.click()}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            sx={{
              p: 3.5,
              border: "2px dashed",
              borderColor: dragging ? "primary.main" : "divider",
              borderRadius: 2,
              bgcolor: dragging ? "action.hover" : "background.default",
              textAlign: "center",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            {file ? <InsertDriveFileOutlinedIcon color="primary" fontSize="large" /> : <CloudUploadIcon color="action" fontSize="large" />}
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
              {file ? file.name : t("dataArena.ImportPanel.clickToChooseACsv")}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {successJobId != null && (
            <Alert severity="success">
              <Trans
                i18nKey="dataArena.ImportPanel.jobQueued"
                values={{ id: successJobId }}
                components={{ strong: <strong /> }}
              />
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="inherit"
              disabled={!file && !error}
              onClick={() => handleFile(null)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {t("common.reset", { defaultValue: "Reset" })}
            </Button>
            <Button
              variant="contained"
              disableElevation
              disabled={!file || startImport.isPending}
              onClick={handleSubmit}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {startImport.isPending ? t("dataArena.ExportPanel.queueing") : t("dataArena.ImportPanel.queueImport")}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
