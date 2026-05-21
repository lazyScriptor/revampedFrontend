import { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";

import { useDeleteEquipment } from "../hooks/useEquipmentHooks";
import { formatDisplayDate } from "@/lib/dates";

interface EquipmentTableProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (equipmentRow: any) => void; // <--- ADD THIS
}

export function EquipmentTable({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit, // <--- ADD THIS RIGHT HERE
}: EquipmentTableProps) {
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
    { field: "equipment_id", headerName: "ID", width: 70 },
    {
      field: "image_url",
      headerName: "Image",
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
      headerName: "SKU / Serial",
      width: 140,
      fontWeight: "bold",
    },
    {
      field: "equipment_name",
      headerName: "Equipment Name",
      flex: 1,
      minWidth: 200,
    },

    // --- Relationships ---
    {
      field: "category",
      headerName: "Category",
      width: 150,
      valueGetter: (value, row) =>
        row?.EquipmentCategory?.category_name || "N/A",
    },
    {
      field: "warehouse",
      headerName: "Location",
      width: 160,
      valueGetter: (value, row) => row?.Warehouse?.location_name || "N/A",
    },

    // --- Pricing ---
    {
      field: "base_rental_price",
      headerName: "Daily Rate",
      width: 110,
      renderCell: (params) => (
        <span className="font-medium">
          ${Number(params.value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      field: "extra_daily_rate",
      headerName: "Extra/Overdue Rate",
      width: 150,
      renderCell: (params) => (
        <span>${Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "minimum_rental_days",
      headerName: "Min Days",
      width: 100,
      type: "number",
    },
    {
      field: "purchase_cost",
      headerName: "Purchase Cost",
      width: 130,
      renderCell: (params) =>
        params.value ? `$${Number(params.value).toFixed(2)}` : "N/A",
    },

    // --- Inventory Quantities ---
    {
      field: "total_owned_qty",
      headerName: "Total Qty",
      width: 100,
      type: "number",
    },
    { field: "rented_qty", headerName: "Rented", width: 100, type: "number" },
    {
      field: "available_qty",
      headerName: "Available",
      width: 100,
      type: "number",
      renderCell: (params) => (
        <span className="font-bold text-slate-800">{params.value}</span>
      ),
    },
    {
      field: "is_bulk_item",
      headerName: "Bulk Item",
      width: 100,
      type: "boolean",
    },

    // --- Warranty & Dates ---
    {
      field: "warranty_period_months",
      headerName: "Warranty (Mo)",
      width: 120,
      type: "number",
    },
    {
      field: "end_of_warranty_date",
      headerName: "Warranty Expiry",
      width: 140,
      valueFormatter: (value) => (value ? formatDisplayDate(value) : "N/A"),
    },
    {
      field: "createdAt",
      headerName: "Date Added",
      width: 120,
      valueFormatter: (value) => (value ? formatDisplayDate(value) : "N/A"),
    },

    // --- Status & Actions ---
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => {
        const isAvailable = params.row.available_qty > 0;
        return (
          <Chip
            label={isAvailable ? "Available" : "Out of Stock"}
            color={isAvailable ? "success" : "warning"}
            size="small"
            variant="filled"
            sx={{ fontWeight: 600, borderRadius: 1.5 }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      pinned: "right", // Pins the actions to the right side
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
          <Tooltip title="Edit Item">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Item">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteId(params.row.equipment_id)}
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
      <Box sx={{ height: { xs: 520, md: 650 }, width: "100%", bgcolor: "background.paper" }}>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row.equipment_id}
          loading={isLoading}
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 20, 50]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          disableRowSelectionOnClick
          // 🚀 HIDE NON-ESSENTIAL COLUMNS BY DEFAULT
          initialState={{
            columns: {
              columnVisibilityModel: {
                equipment_id: false,
                image_url: false,
                extra_daily_rate: false,
                minimum_rental_days: false,
                purchase_cost: false,
                is_bulk_item: false,
                warranty_period_months: false,
                end_of_warranty_date: false,
                createdAt: false,
                total_owned_qty: false,
                rented_qty: false,
              },
            },
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-cell": { borderColor: "#f1f5f9" },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            },
            "& .MuiDataGrid-toolbarContainer": {
              p: 2,
              borderBottom: "1px solid #f1f5f9",
            },
          }}
        />
      </Box>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle className="font-bold text-slate-800">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this equipment? This action cannot be
          undone.
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            disableElevation
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
