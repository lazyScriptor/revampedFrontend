import { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { useDeleteCategory } from "../hooks/useCategoryHooks";

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
          // Show success toast and close the dialog
          setToast({
            open: true,
            message: "Category successfully deleted.",
            severity: "success",
          });
          setDeleteId(null);
        },
        onError: (error: any) => {
          // Extract the exact custom message from our Express backend (e.g., "Cannot delete... equipment attached")
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Failed to delete category.";

          // Show error toast and close the dialog
          setToast({ open: true, message: errorMessage, severity: "error" });
          setDeleteId(null);
        },
      });
    }
  };

  const columns: GridColDef[] = [
    { field: "category_id", headerName: "ID", width: 90 },
    {
      field: "category_name",
      headerName: "Category Name",
      flex: 1,
      minWidth: 200,
      fontWeight: "bold",
    },
    {
      field: "description",
      headerName: "Description",
      flex: 2,
      minWidth: 300,
      sortable: false,
    },
    {
      field: "createdAt",
      headerName: "Date Created",
      width: 150,
      valueFormatter: (value) =>
        value ? new Date(value).toLocaleDateString() : "N/A",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
          <Tooltip title="Edit Category">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Category">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteId(params.row.category_id)}
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
      <Box sx={{ height: 600, width: "100%", bgcolor: "background.paper" }}>
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
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          disableRowSelectionOnClick
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle className="font-bold text-slate-800">
          Delete Category
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this category? If there is equipment
          attached to it, this action might fail depending on your database
          rules.
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
          sx={{ width: "100%", fontWeight: 500, boxShadow: 3 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
