import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

import {
  downloadEquipmentTemplate,
  exportEquipmentData,
} from "../api/bulkEquipment.api";
import {
  useImportEquipment,
  triggerFileDownload,
} from "../hooks/useBulkEquipment";

export function EquipmentDataPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportEquipment();

  // --- Handlers ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== "text/csv") {
        setToast({
          open: true,
          message: "Please upload a valid CSV file.",
          severity: "error",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImportSubmit = () => {
    if (!file) return;
    importMutation.mutate(file, {
      onSuccess: (data) => {
        setToast({
          open: true,
          message: `Successfully imported ${data.successCount} items!`,
          severity: "success",
        });
        setFile(null); // Clear the file after success
      },
      onError: (error: any) => {
        const msg =
          error.response?.data?.message || "Failed to import equipment data.";
        setToast({ open: true, message: msg, severity: "error" });
      },
    });
  };

  const handleExport = async (type: "template" | "full") => {
    setIsExporting(true);
    try {
      const blob =
        type === "template"
          ? await downloadEquipmentTemplate()
          : await exportEquipmentData();
      const filename =
        type === "template"
          ? "geargrid_equipment_template.csv"
          : `geargrid_equipment_export_${new Date().toISOString().split("T")[0]}.csv`;
      triggerFileDownload(blob, filename);
      setToast({
        open: true,
        message: "Download started successfully.",
        severity: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: "Failed to download file.",
        severity: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* SECTION 1: Export & Templates */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
      >
        <Typography variant="h6" fontWeight="600" mb={1}>
          Export & Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Download a blank template to ensure your columns are formatted
          perfectly, or export your entire existing inventory.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<InsertDriveFileIcon />}
            onClick={() => handleExport("template")}
            disabled={isExporting}
            sx={{ borderRadius: 2, textTransform: "none", px: 3, py: 1 }}
          >
            Download CSV Template
          </Button>
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
              px: 3,
              py: 1,
              bgcolor: "slate.800",
              "&:hover": { bgcolor: "slate.900" },
            }}
          >
            Export All Equipment
          </Button>
        </Box>
      </Paper>

      {/* SECTION 2: Bulk Import Zone */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
      >
        <Typography variant="h6" fontWeight="600" mb={1}>
          Bulk Import
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Upload a properly formatted CSV to add or update multiple equipment
          records at once.
        </Typography>

        {/* Hidden File Input */}
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* Drag and Drop Styling Box */}
        <Box
          sx={{
            border: "2px dashed #cbd5e1",
            borderRadius: 2,
            p: 5,
            textAlign: "center",
            bgcolor: file ? "#f0fdf4" : "#f8fafc",
            transition: "all 0.2s ease",
            cursor: file ? "default" : "pointer",
            "&:hover": {
              borderColor: "#94a3b8",
              bgcolor: file ? "#f0fdf4" : "#f1f5f9",
            },
          }}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          {file ? (
            <Box>
              <InsertDriveFileIcon
                sx={{ fontSize: 48, color: "#16a34a", mb: 1 }}
              />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(file.size / 1024).toFixed(2)} KB
              </Typography>

              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={importMutation.isPending}
                >
                  Remove File
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportSubmit();
                  }}
                  disabled={importMutation.isPending}
                  disableElevation
                  startIcon={
                    importMutation.isPending && (
                      <CircularProgress size={20} color="inherit" />
                    )
                  }
                >
                  {importMutation.isPending
                    ? "Syncing Data..."
                    : "Upload & Sync"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <CloudUploadOutlinedIcon
                sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }}
              />
              <Typography
                variant="subtitle1"
                fontWeight="600"
                color="text.primary"
              >
                Click to upload or drag and drop
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV files only (Max 5MB)
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
