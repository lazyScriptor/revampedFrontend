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
  Chip,
  Avatar,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BusinessIcon from "@mui/icons-material/Business";

import { useDeleteCustomer } from "../hooks/useCustomerHooks";

interface CustomerTableProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (customerRow: any) => void;
}

export function CustomerTable({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit,
}: CustomerTableProps) {
  const deleteMutation = useDeleteCustomer();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "client_details",
      headerName: "Client Name",
      flex: 1,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams) => {
        const isBusiness = params.row.customer_type === "Business";
        const name = isBusiness
          ? params.row.company_name
          : `${params.row.first_name} ${params.row.last_name}`;

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: isBusiness ? "primary.main" : "slate.400",
                fontSize: "0.875rem",
              }}
            >
              {isBusiness ? <BusinessIcon fontSize="small" /> : name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="600" color="text.primary">
                {name}
              </Typography>
              {/* Hierarchical Worker Badge */}
              {params.row.ParentCompany && (
                <Typography
                  variant="caption"
                  color="primary.main"
                  fontWeight="500"
                >
                  @ {params.row.ParentCompany.company_name}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    { field: "nic_number", headerName: "NIC / Passport", width: 140 },
    { field: "phone_number", headerName: "Phone", width: 130 },

    // --- COLLATERAL & FINANCE COLUMNS ---
    {
      field: "collateral",
      headerName: "Collateral",
      width: 140,
      renderCell: (params: GridRenderCellParams) => {
        if (params.row.is_id_retained_currently) {
          return (
            <Chip
              icon={<VerifiedUserIcon sx={{ fontSize: "14px !important" }} />}
              label="ID in Vault"
              color="error"
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 600,
                bgcolor: "#fef2f2",
                border: "1px solid #fca5a5",
              }}
            />
          );
        }
        return (
          <Typography variant="body2" color="text.secondary">
            -
          </Typography>
        );
      },
    },
    {
      field: "deposit_balance",
      headerName: "Advance Held",
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          fontWeight="600"
          color={Number(params.value) > 0 ? "success.main" : "text.secondary"}
        >
          Rs. {Number(params.value || 0).toLocaleString()}
        </Typography>
      ),
    },

    // --- STATUS ---
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const isBlacklisted = params.value === "Blacklisted";
        return (
          <Chip
            icon={
              isBlacklisted ? (
                <WarningAmberIcon sx={{ fontSize: "14px !important" }} />
              ) : undefined
            }
            label={params.value}
            color={isBlacklisted ? "error" : "success"}
            size="small"
            sx={{ fontWeight: 500, borderRadius: 1.5 }}
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
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
          <Tooltip title="Edit Profile">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteId(params.row.customer_id)}
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
      <Box sx={{ height: 650, width: "100%", bgcolor: "background.paper" }}>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(row) => row.customer_id}
          loading={isLoading}
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 20, 50]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true } }}
          disableRowSelectionOnClick
          sx={{ border: "none" }}
        />
      </Box>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle className="font-bold text-slate-800">
          Delete Customer
        </DialogTitle>
        <DialogContent>
          Are you sure you want to delete this customer? This may affect
          historical invoices.
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
