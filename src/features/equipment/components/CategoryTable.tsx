import { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";

import { useDeleteCategory } from "../hooks/useCategoryHooks";
import { formatDisplayDate } from "@/lib/dates";
import { useTranslation } from "react-i18next";

interface CategoryTableProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (categoryRow: any) => void;
}

export function CategoryTable({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit,
}: CategoryTableProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const deleteMutation = useDeleteCategory();

  // Dialog State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseToast = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => {
          setToast({
            open: true,
            message: t("equipment.CategoryTable.categorySuccessfullyDeleted"),
            severity: "success",
          });
          setDeleteId(null);
        },
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            t("equipment.CategoryTable.failedToDeleteCategory");
          setToast({ open: true, message: errorMessage, severity: "error" });
          setDeleteId(null);
        },
      });
    }
  };

  const columns: GridColDef[] = [
    {
      field: "category_id",
      headerName: "ID",
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="caption"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            color: "text.secondary",
            bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
            px: 1,
            py: 0.35,
            borderRadius: 1,
          }}
        >
          #{params.value}
        </Typography>
      ),
    },
    {
      field: "category_name",
      headerName: t("equipment.CategoryTable.categoryName"),
      flex: 1.2,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, py: 0.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: isDark ? "rgba(99, 102, 241, 0.15)" : "#eef2ff",
              color: isDark ? "#818cf8" : "#4f46e5",
              flexShrink: 0,
            }}
          >
            <CategoryOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: 1.3,
              }}
            >
              {params.value}
            </Typography>
            {params.row.equipment_count !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 500,
                }}
              >
                {t("equipment.CategoryTable.assets", { count: params.row.equipment_count })}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      field: "description",
      headerName: t("common.description"),
      flex: 2,
      minWidth: 280,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            color: params.value ? "text.secondary" : "text.disabled",
            fontStyle: params.value ? "normal" : "italic",
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: 1.4,
            py: 0.5,
          }}
        >
          {params.value || t("equipment.CategoryTable.noDescriptionProvided")}
        </Typography>
      ),
    },
    {
      field: "createdAt",
      headerName: t("equipment.CategoryTable.dateCreated"),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
          <Typography
            variant="body2"
            sx={{
              fontVariantNumeric: "tabular-nums",
              color: "text.secondary",
              fontSize: "0.82rem",
            }}
          >
            {params.value ? formatDisplayDate(params.value) : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title={t("equipment.CategoryTable.editCategory")}>
            <IconButton
              size="small"
              onClick={() => onEdit(params.row)}
              aria-label={t("equipment.CategoryTable.edit", { category_name: params.row.category_name })}
              sx={{
                color: isDark ? "#93c5fd" : "#2563eb",
                "&:hover": {
                  bgcolor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("equipment.CategoryTable.deleteCategory")}>
            <IconButton
              size="small"
              onClick={() => setDeleteId(params.row.category_id)}
              aria-label={t("equipment.CategoryTable.delete", { category_name: params.row.category_name })}
              sx={{
                color: isDark ? "#fca5a5" : "#dc2626",
                "&:hover": {
                  bgcolor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fef2f2",
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <Box sx={{ flex: 1, minHeight: 0, height: "100%", width: "100%", bgcolor: "background.paper" }}>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row.category_id}
          loading={isLoading}
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          getEstimatedRowHeight={() => 56}
          sx={{
            border: "none",
            "& .MuiDataGrid-row": {
              minHeight: "56px !important",
              transition: "background-color 150ms ease",
              "&:hover": {
                bgcolor: isDark ? "rgba(255, 255, 255, 0.04) !important" : "rgba(248, 250, 252, 0.9) !important",
              },
              "&:nth-of-type(even)": {
                bgcolor: isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(241, 245, 249, 0.35)",
              },
            },
            "& .MuiDataGrid-cell": {
              borderColor: (theme.palette as any).border?.subtle || theme.palette.divider,
              py: 1.25,
              px: 1.5,
              whiteSpace: "normal",
              wordBreak: "break-word",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : "#f8fafc",
              borderBottom: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
              textTransform: "uppercase",
              fontSize: "0.6875rem",
              letterSpacing: "0.05em",
              fontWeight: 700,
              color: "text.secondary",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
            },
          }}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: theme.palette.background.paper,
              border: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "text.primary" }}>
          {t("equipment.CategoryTable.deleteCategory")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
            {t("equipment.CategoryTable.areYouSureYouWant")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            disableElevation
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            {deleteMutation.isPending ? t("customers.CustomerTable.deleting") : t("equipment.CategoryTable.deleteCategory")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dynamic Toast Notification (Success / Error) */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600, boxShadow: 3, borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
