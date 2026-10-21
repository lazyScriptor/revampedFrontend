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
import { useTranslation } from "react-i18next";

interface CustomerTableProps {
  data: any[];
  isLoading: boolean;
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onEdit: (customerRow: any) => void;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

export function CustomerTable({
  data,
  isLoading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  onEdit,
  selectedIds = [],
  onSelectionChange,
}: CustomerTableProps) {
  const { t } = useTranslation();
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
      headerName: t("customers.CustomerTable.clientName"),
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
    {
      field: "nic_number",
      headerName: t("customers.CustomerFormDialog.nicPassport"),
      flex: 0.7,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "text.primary",
            fontSize: "0.82rem",
          }}
        >
          {params.value || "-"}
        </Typography>
      ),
    },
    {
      field: "phone_number",
      headerName: t("common.phone"),
      flex: 0.6,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "text.secondary",
            fontSize: "0.82rem",
          }}
        >
          {params.value || "-"}
        </Typography>
      ),
    },

    // --- COLLATERAL & FINANCE COLUMNS ---
    {
      field: "collateral",
      headerName: t("customers.CustomerTable.collateral"),
      flex: 0.6,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => {
        if (params.row.is_id_retained_currently) {
          return (
            <Chip
              icon={<VerifiedUserIcon sx={{ fontSize: "14px !important" }} />}
              label={t("customers.CustomerFormDialog.idInVault")}
              color="error"
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fef2f2"),
                borderColor: (t) => (t.palette.mode === "dark" ? "rgba(239, 68, 68, 0.4)" : "#fca5a5"),
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
      headerName: t("customers.CustomerTable.advanceHeld"),
      flex: 0.6,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          fontWeight="700"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: Number(params.value) > 0 ? "success.main" : "text.secondary",
          }}
        >
          Rs. {Number(params.value || 0).toLocaleString()}
        </Typography>
      ),
    },

    // --- STATUS ---
    {
      field: "status",
      headerName: t("common.status"),
      flex: 0.5,
      minWidth: 120,
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
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", height: "100%" }}>
          <Tooltip title={t("customers.CustomerTable.editProfile")}>
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
              onClick={() => setDeleteId(params.row.customer_id)}
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
          getRowId={(row) => row.customer_id}
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
          getEstimatedRowHeight={() => 62}
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
              borderTop: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              flexShrink: 0,
            },
          }}
        />
      </Box>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle className="font-bold text-slate-800">
          {t("customers.CustomerTable.deleteCustomer")}
        </DialogTitle>
        <DialogContent>
          {t("customers.CustomerTable.areYouSureYouWant")}
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
