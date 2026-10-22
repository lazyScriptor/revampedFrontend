import { useState, useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Typography,
  alpha,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";

import { useDeleteEquipment } from "../hooks/useEquipmentHooks";
import { formatDisplayDate } from "@/lib/dates";
import { useTranslation } from "react-i18next";

interface EquipmentTableProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (equipmentRow: any) => void;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

export function EquipmentTable({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit,
  selectedIds = [],
  onSelectionChange,
}: EquipmentTableProps) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteEquipment();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  // 🚀 THE COMPREHENSIVE COLUMN LIST
  const columns: GridColDef[] = [
    // --- Identifiers & Media ---
    { field: "equipment_id", headerName: t("invoices.invoiceId"), width: 70 },
    {
      field: "image_url",
      headerName: t("equipment.image"),
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <Avatar
          src={params.value}
          variant="rounded"
          sx={{ width: 32, height: 32, bgcolor: "grey.100" }}
        >
          {!params.value && (
            <ImageIcon sx={{ color: "grey.400", fontSize: 20 }} />
          )}
        </Avatar>
      ),
    },
    {
      field: "serial_number",
      headerName: t("equipment.sku"),
      width: 140,
      fontWeight: "bold",
    },
    {
      field: "equipment_name",
      headerName: t("equipment.equipmentName"),
      flex: 1,
      minWidth: 200,
    },

    // --- Relationships ---
    {
      field: "category",
      headerName: t("common.category"),
      width: 150,
      valueGetter: (value, row) =>
        row?.EquipmentCategory?.category_name || "N/A",
    },
    {
      field: "warehouse",
      headerName: t("equipment.location"),
      width: 160,
      valueGetter: (value, row) => row?.Warehouse?.location_name || "N/A",
    },

    // --- Pricing ---
    {
      field: "base_rental_price",
      headerName: t("equipment.dailyRate"),
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "text.primary",
          }}
        >
          Rs. {Number(params.value || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "extra_daily_rate",
      headerName: t("equipment.extraDailyRate"),
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
          }}
        >
          Rs. {Number(params.value || 0).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "minimum_rental_days",
      headerName: t("equipment.minRentalDays"),
      width: 110,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
          {t("equipment.EquipmentTable.days", { count: params.value || 1 })}
        </Typography>
      ),
    },
    {
      field: "purchase_cost",
      headerName: t("equipment.purchaseCost"),
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
          }}
        >
          {params.value ? t("equipment.EquipmentTable.rs", { value: Number(params.value).toLocaleString() }) : "N/A"}
        </Typography>
      ),
    },

    // --- Inventory Quantities ---
    {
      field: "total_owned_qty",
      headerName: t("equipment.totalOwned"),
      width: 110,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {params.value ?? 0}
        </Typography>
      ),
    },
    {
      field: "rented_qty",
      headerName: t("equipment.rented"),
      width: 100,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            color: Number(params.value) > 0 ? "info.main" : "text.secondary",
          }}
        >
          {params.value ?? 0}
        </Typography>
      ),
    },
    {
      field: "available_qty",
      headerName: t("equipment.availableQty"),
      width: 110,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 800,
            color: Number(params.value) > 0 ? "success.main" : "warning.main",
          }}
        >
          {params.value ?? 0}
        </Typography>
      ),
    },
    {
      field: "defective_qty",
      headerName: t("equipment.defectiveQty"),
      width: 110,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: Number(params.value) > 0 ? "#b91c1c" : undefined }}>
          {params.value ?? 0}
        </span>
      ),
    },
    {
      field: "is_bulk_item",
      headerName: t("equipment.isBulkItem"),
      width: 100,
      type: "boolean",
    },

    // --- Warranty & Dates ---
    {
      field: "warranty_period_months",
      headerName: t("equipment.warrantyMonths"),
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
          {params.value ? `${params.value} mo` : "-"}
        </Typography>
      ),
    },
    {
      field: "end_of_warranty_date",
      headerName: t("equipment.endOfWarranty"),
      width: 140,
      valueFormatter: (value) => (value ? formatDisplayDate(value) : "N/A"),
    },
    {
      field: "createdAt",
      headerName: t("common.createdAt"),
      width: 120,
      valueFormatter: (value) => (value ? formatDisplayDate(value) : "N/A"),
    },

    // --- Status & Actions ---
    {
      field: "status",
      headerName: t("common.status"),
      width: 130,
      renderCell: (params) => {
        const isAvailable = params.row.available_qty > 0;
        return (
          <Chip
            label={isAvailable ? t("common.available") : t("equipment.outOfStock")}
            color={isAvailable ? "success" : "warning"}
            size="small"
            variant="filled"
            sx={{ fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 100,
      sortable: false,
      filterable: false,
      pinned: "right",
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", height: "100%" }}>
          <Tooltip title={t("common.edit")}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(params.row)}
              sx={{
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)"),
                "&:hover": {
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.22)" : "rgba(245, 158, 11, 0.16)"),
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("common.delete")}>
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteId(params.row.equipment_id)}
              sx={{
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)"),
                "&:hover": {
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.22)" : "rgba(239, 68, 68, 0.16)"),
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

  const gridRowSelectionModel: GridRowSelectionModel = useMemo(
    () => ({
      type: "include",
      ids: new Set(selectedIds || []),
    }),
    [selectedIds],
  );

  const safePageSizeOptions = useMemo(() => {
    const set = new Set([10, 20, 50, 100]);
    if (paginationModel?.pageSize) {
      set.add(paginationModel.pageSize);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [paginationModel?.pageSize]);

  return (
    <>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row.equipment_id}
          loading={isLoading}
          paginationMode="server"
          rowCount={Math.max(0, rowCount ?? data.length)}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={safePageSizeOptions}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          checkboxSelection
          rowSelectionModel={gridRowSelectionModel}
          onRowSelectionModelChange={(newModel: GridRowSelectionModel) => {
            if (newModel && newModel.ids instanceof Set) {
              onSelectionChange?.(Array.from(newModel.ids).map(Number));
            } else if (Array.isArray(newModel)) {
              onSelectionChange?.((newModel as any[]).map(Number));
            } else {
              onSelectionChange?.([]);
            }
          }}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          getEstimatedRowHeight={() => 56}
          // Everything is visible by default (scroll sideways); only the internal ID and
          // created-at stay tucked away in the Columns menu.
          initialState={{
            columns: {
              columnVisibilityModel: {
                equipment_id: false,
                createdAt: false,
              },
            },
          }}
          sx={{
            flex: 1,
            minHeight: 0,
            border: "none",
            "& .MuiDataGrid-main": {
              flex: 1,
              minHeight: 0,
            },
            "& .MuiDataGrid-columnHeaders": {
              position: "sticky",
              top: 0,
              zIndex: 3,
              bgcolor: (t) => (t.palette.mode === "dark" ? "#1e293b" : "#f8fafc"),
              color: (t) => (t.palette.mode === "dark" ? "#94a3b8" : "#475569"),
              fontWeight: 700,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderBottom: (t) => `1px solid ${(t.palette as any).border?.subtle || t.palette.divider}`,
            },
            "& .MuiDataGrid-row": {
              minHeight: "56px !important",
              borderBottom: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(51, 65, 85, 0.4)" : "#f1f5f9"}`,
              transition: "background-color 120ms ease",
              "&:nth-of-type(even)": {
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(30, 41, 59, 0.3)" : "#fafbfc"),
              },
              "&:hover": {
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(30, 41, 59, 0.7)" : "#f1f5f9"),
              },
              "&.Mui-selected": {
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.15)" : "#fef3c7"),
                "&:hover": {
                  bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.25)" : "#fde68a"),
                },
              },
            },
            "& .MuiDataGrid-virtualScroller": {
              overflowY: "auto !important",
            },
            "& .MuiDataGrid-cell": {
              borderColor: (t) => (t.palette.mode === "dark" ? "rgba(51, 65, 85, 0.4)" : "#f1f5f9"),
              py: 1.25,
            },
            "& .MuiDataGrid-toolbarContainer": {
              p: 1.5,
              borderBottom: (t) => `1px solid ${(t.palette as any).border?.subtle || t.palette.divider}`,
              flexShrink: 0,
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: (t) => `1px solid ${(t.palette as any).border?.subtle || t.palette.divider}`,
              bgcolor: (t) => t.palette.background.paper,
              flexShrink: 0,
            },
          }}
        />
      </Box>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle className="font-bold text-slate-800">
          {t("equipment.EquipmentTable.confirmDeletion")}
        </DialogTitle>
        <DialogContent>
          {t("equipment.EquipmentTable.areYouSureYouWant")}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            disableElevation
          >
            {deleteMutation.isPending ? t("customers.CustomerTable.deleting") : t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
