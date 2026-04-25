import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";

import { useInvoiceList } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";

export default function RentalHistoryRoute() {
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const { data, isLoading } = useInvoiceList(
    paginationModel.page + 1,
    paginationModel.pageSize,
  );
  useEffect(() => {
    console.log(data);
  }, [data]);

  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<
    any | null
  >(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const showToast = (
    message: string,
    severity: "success" | "error" = "success",
  ) => setToast({ open: true, message, severity });

  const columns: GridColDef[] = [
    { field: "invoice_id", headerName: "INV #", width: 90 },
    {
      field: "customer",
      headerName: "Client",
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="600">
          {params.row.Customer.customer_type === "Business"
            ? params.row.Customer.company_name
            : `${params.row.Customer.first_name} ${params.row.Customer.last_name}`}
        </Typography>
      ),
    },
    {
      field: "issued_date",
      headerName: "Issued Date",
      width: 150,
      valueFormatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      field: "total_amount",
      headerName: "Grand Total",
      width: 130,
      renderCell: (params) => (
        <Typography fontWeight="600">
          Rs. {Number(params.value).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === "Completed" ? "success" : "warning"}
          variant={params.value === "Completed" ? "outlined" : "filled"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Print Receipt">
            <IconButton size="small" color="primary">
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "Active" && (
            <Tooltip title="Process Return">
              <Button
                size="small"
                variant="contained"
                color="success"
                disableElevation
                onClick={() => setSelectedInvoiceForReturn(params.row)}
                sx={{ minWidth: 0, p: 0.5 }}
              >
                <AssignmentReturnedIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}
    >
      <Box>
        <Typography variant="h4" fontWeight="bold">
          Rental History & Returns
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View historical receipts and process active check-ins.
        </Typography>
      </Box>

      <Card
        elevation={0}
        sx={{ border: "1px solid #e2e8f0", borderRadius: 3, flexGrow: 1 }}
      >
        <DataGrid
          rows={data?.invoices || []}
          columns={columns}
          getRowId={(row) => row.invoice_id}
          loading={isLoading}
          paginationMode="server"
          rowCount={data?.totalItems || 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
          sx={{ border: "none" }}
        />
      </Card>

      <ReturnSettlementDialog
        open={!!selectedInvoiceForReturn}
        onClose={() => setSelectedInvoiceForReturn(null)}
        invoice={selectedInvoiceForReturn}
        showToast={showToast}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 500, boxShadow: 3 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
