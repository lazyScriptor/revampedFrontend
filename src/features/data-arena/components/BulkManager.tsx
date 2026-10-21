import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Chip,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SecurityIcon from "@mui/icons-material/Security";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";

interface BulkManagerProps {
  entityTitle: string;
  exportDesc: string;
  importDesc: string;
  onDownloadTemplate?: () => Promise<void>;
  onExportAll: () => Promise<void>;
  onImportSubmit: (file: File) => Promise<any>;
  allowImport?: boolean;
}

export function BulkManager({
  entityTitle,
  exportDesc,
  importDesc,
  onDownloadTemplate,
  onExportAll,
  onImportSubmit,
  allowImport = true,
}: BulkManagerProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (type: "template" | "full") => {
    setIsExporting(true);
    try {
      if (type === "template" && onDownloadTemplate) await onDownloadTemplate();
      if (type === "full") await onExportAll();
      setToast({
        open: true,
        message: t("dataArena.BulkManager.downloadStartedSuccessfully"),
        severity: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: t("dataArena.BulkManager.failedToDownloadFile"),
        severity: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const data = await onImportSubmit(file);

      const count = data?.successCount ?? data?.inserted ?? 0;
      const errList = data?.errors || [];

      if (count === 0 && errList.length > 0) {
        setToast({
          open: true,
          message: t("dataArena.BulkManager.importFailed", { reason: errList[0]?.message || t("dataArena.BulkManager.invalidData") }),
          severity: "error",
        });
        console.error("⚠️ CSV IMPORT ERRORS:", errList);
      } else if (count === 0) {
        setToast({
          open: true,
          message: t("dataArena.BulkManager.noRecordsWereImportedPlease"),
          severity: "error",
        });
      } else if (errList.length > 0) {
        setToast({
          open: true,
          message: t("dataArena.BulkManager.importedRowsFailedCheckConsole", { count, errListCount: errList.length }),
          severity: "warning",
        });
        console.error("⚠️ CSV IMPORT ERRORS:", errList);
        setFile(null);
      } else {
        setToast({
          open: true,
          message: t("dataArena.BulkManager.successfullyImportedRecords", { count }),
          severity: "success",
        });
        setFile(null);
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        t("dataArena.BulkManager.failedToImportData");
      setToast({ open: true, message: msg, severity: "error" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* --- EXPORT ZONE --- */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{ p: 3, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {t("dataArena.BulkManager.exportDataTemplates")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {exportDesc}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 3,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {onDownloadTemplate && (
            <Button
              variant="outlined"
              startIcon={<InsertDriveFileIcon />}
              onClick={() => handleExport("template")}
              disabled={isExporting}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                px: 3,
                py: 1.2,
                fontWeight: "bold",
              }}
            >
              {t("dataArena.BulkManager.downloadCsvTemplate")}
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              isExporting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
            onClick={() => handleExport("full")}
            disabled={isExporting}
            disableElevation
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 4,
              py: 1.2,
              fontWeight: "bold",
              bgcolor: "slate.800",
              "&:hover": { bgcolor: "slate.900" },
            }}
          >
            {t("dataArena.BulkManager.exportAllRecords")}
          </Button>
        </Box>
      </Paper>

      {/* --- IMPORT ZONE --- */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{ p: 3, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {t("dataArena.BulkManager.massImportRecords")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {importDesc}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {!allowImport ? (
            <Box
              sx={{
                p: 5,
                textAlign: "center",
                bgcolor: "#f8fafc",
                borderRadius: 3,
                border: "2px dashed #cbd5e1",
              }}
            >
              <SecurityIcon sx={{ fontSize: 50, color: "#94a3b8", mb: 2 }} />
              <Typography
                variant="h6"
                fontWeight="bold"
                color="text.primary"
                mb={1}
              >
                {t("dataArena.BulkManager.importRestricted")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("dataArena.BulkManager.toPreserveFinancialAndAuditing")}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip
                  label={t("dataArena.BulkManager.step1")}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: "bold", borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight="500">
                  {t("dataArena.BulkManager.ensureYourCsvMatchesThe")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip
                  label={t("dataArena.BulkManager.step2")}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: "bold", borderRadius: 1 }}
                />
                <Typography variant="body2" fontWeight="500">
                  {t("dataArena.BulkManager.uploadTheCsvFileBelow")}
                </Typography>
              </Box>

              <Divider sx={{ my: 1, borderStyle: "dashed" }} />

              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    if (e.target.files[0].type !== "text/csv")
                      return setToast({
                        open: true,
                        message: t("dataArena.BulkManager.onlyCsvFilesAreAllowed"),
                        severity: "error",
                      });
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <Box
                sx={{
                  border: "2px dashed",
                  borderColor: file ? "#10b981" : "#cbd5e1",
                  borderRadius: 3,
                  p: file ? 4 : 6,
                  textAlign: "center",
                  bgcolor: file ? "#f0fdf4" : "#f8fafc",
                  transition: "all 0.2s ease",
                  cursor: file ? "default" : "pointer",
                  "&:hover": {
                    borderColor: file ? "#10b981" : "#94a3b8",
                    bgcolor: file ? "#f0fdf4" : "#f1f5f9",
                  },
                }}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                {file ? (
                  <Box>
                    <CheckCircleIcon
                      sx={{ fontSize: 50, color: "#10b981", mb: 2 }}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="success.dark"
                    >
                      {file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={4}>
                      {t("dataArena.BulkManager.fileSize")} {t("dataArena.BulkManager.kb", { value: (file.size / 1024).toFixed(2) })}
                    </Typography>
                    <Box
                      sx={{ display: "flex", justifyContent: "center", gap: 2 }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        disabled={isImporting}
                        sx={{ borderRadius: 2, fontWeight: "bold" }}
                      >
                        {t("dataArena.BulkManager.removeFile")}
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportSubmit();
                        }}
                        disabled={isImporting}
                        disableElevation
                        startIcon={
                          isImporting && (
                            <CircularProgress size={20} color="inherit" />
                          )
                        }
                        sx={{ borderRadius: 2, px: 4, fontWeight: "bold" }}
                      >
                        {isImporting
                          ? t("dataArena.BulkManager.processingSync")
                          : t("dataArena.BulkManager.confirmImportData")}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <CloudUploadOutlinedIcon
                      sx={{ fontSize: 56, color: "#94a3b8", mb: 2 }}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color="text.primary"
                      mb={1}
                    >
                      {t("dataArena.BulkManager.clickToSelectFileOr")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("dataArena.BulkManager.acceptedFormatCsvOnlyMaximum")}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={8000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: "bold" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
