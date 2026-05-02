import { useState, useMemo } from "react";
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
  Grid,
  CardContent,
  Avatar,
  Drawer,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";

import { useInvoiceList } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";

export default function RentalHistoryRoute() {
  // --- STATE ---
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modals & Drawers
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<
    any | null
  >(null);
  const [viewInvoiceDetails, setViewInvoiceDetails] = useState<any | null>(
    null,
  );

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // --- DATA FETCHING ---
  // Pass the statusFilter state right here!
  const { data, isLoading } = useInvoiceList(
    paginationModel.page + 1,
    paginationModel.pageSize,
    statusFilter,
  );

  const showToast = (
    message: string,
    severity: "success" | "error" = "success",
  ) => setToast({ open: true, message, severity });

  // --- KPI CALCULATION (Derived from current view) ---
  const kpis = useMemo(() => {
    const invoices = data?.invoices || [];
    let active = 0;
    let completed = 0;
    let overdue = 0;

    const today = new Date().getTime();

    invoices.forEach((inv: any) => {
      if (inv.status === "Completed") {
        completed++;
      } else {
        active++;
        // Check if any line item is past expected return date
        const hasOverdue = inv.InvoiceLines?.some((line: any) => {
          if (line.line_status !== "Active") return false;
          return new Date(line.expected_return_date).getTime() < today;
        });
        if (hasOverdue) overdue++;
      }
    });

    return { active, completed, overdue, total: invoices.length };
  }, [data?.invoices]);

  // --- DATAGRID COLUMNS ---
  const columns: GridColDef[] = [
    { field: "invoice_id", headerName: "INV #", width: 90, fontWeight: "bold" },
    {
      field: "customer",
      headerName: "Client",
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => {
        const customer = params.row.Customer;
        const isBusiness = customer?.customer_type === "Business";
        const name = isBusiness
          ? customer.company_name
          : `${customer.first_name} ${customer.last_name}`;

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: isBusiness ? "primary.main" : "slate.500",
                fontSize: "0.8rem",
              }}
            >
              {name?.charAt(0) || "U"}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="600">
                {name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {customer?.phone_number}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "issued_date",
      headerName: "Date Issued",
      width: 150,
      valueFormatter: (value) => new Date(value).toLocaleDateString(),
    },
    {
      field: "total_amount",
      headerName: "Grand Total",
      width: 130,
      renderCell: (params) => (
        <Typography fontWeight="600" color="primary.dark">
          Rs. {Number(params.value).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        // Advanced Status Logic: Check if it's Active AND Overdue
        let isOverdue = false;
        if (params.value === "Active") {
          const today = new Date().getTime();
          isOverdue = params.row.InvoiceLines?.some(
            (l: any) =>
              l.line_status === "Active" &&
              new Date(l.expected_return_date).getTime() < today,
          );
        }

        if (isOverdue) {
          return (
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label="Overdue"
              size="small"
              color="error"
              sx={{ fontWeight: "bold" }}
            />
          );
        }
        if (params.value === "Completed") {
          return (
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label="Completed"
              size="small"
              color="success"
              variant="outlined"
            />
          );
        }
        return (
          <Chip
            icon={<AccessTimeIcon fontSize="small" />}
            label="Active"
            size="small"
            color="warning"
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1, pt: 0.5 }}>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setViewInvoiceDetails(params.row)}
              sx={{ bgcolor: "primary.50" }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print Receipt">
            <IconButton
              size="small"
              sx={{ color: "slate.500", bgcolor: "slate.100" }}
            >
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
                sx={{ minWidth: 0, px: 1 }}
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
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "calc(100vh - 100px)",
      }}
    >
      {/* 1. HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary">
            Rental History & Returns
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Command center for historical receipts, active rentals, and
            handovers.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          sx={{ bgcolor: "white" }}
        >
          Export Ledger
        </Button>
      </Box>

      {/* 2. KPI STRIP */}
      <Grid container spacing={3} sx={{ flexShrink: 0 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "20px !important",
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "#fffbeb",
                  color: "#d97706",
                  borderRadius: 2,
                }}
              >
                <AccessTimeIcon fontSize="large" />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="bold"
                >
                  ACTIVE RENTALS
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {kpis.active}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "20px !important",
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 2,
                }}
              >
                <WarningAmberIcon fontSize="large" />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="error.main"
                  fontWeight="bold"
                >
                  OVERDUE RETURNS
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.main">
                  {kpis.overdue}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: "20px !important",
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "#f0fdf4",
                  color: "#16a34a",
                  borderRadius: 2,
                }}
              >
                <CheckCircleOutlineIcon fontSize="large" />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="bold"
                >
                  COMPLETED (THIS VIEW)
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {kpis.completed}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. DATAGRID WRAPPER */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Filter Strip */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            display: "flex",
            gap: 2,
          }}
        >
          <ToggleButtonGroup
            color="primary"
            value={statusFilter}
            exclusive
            onChange={(e, v) => {
              if (v) setStatusFilter(v);
            }}
            size="small"
            sx={{ bgcolor: "white" }}
          >
            <ToggleButton value="All" sx={{ px: 3 }}>
              All Orders
            </ToggleButton>
            <ToggleButton value="Active" sx={{ px: 3 }}>
              Active Only
            </ToggleButton>
            <ToggleButton value="Completed" sx={{ px: 3 }}>
              Completed
            </ToggleButton>
          </ToggleButtonGroup>
          {/* You can add a Search Input or Date Range picker here later */}
        </Box>

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
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
          }}
        />
      </Card>

      {/* --- SLIDE-OUT DRAWER FOR INVOICE DETAILS --- */}
      <Drawer
        anchor="right"
        open={!!viewInvoiceDetails}
        onClose={() => setViewInvoiceDetails(null)}
      >
        <Box
          sx={{
            width: { xs: "100vw", sm: 500 },
            display: "flex",
            flexDirection: "column",
            height: "100%",
            bgcolor: "#f8fafc",
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: "white",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                display="flex"
                alignItems="center"
                gap={1}
              >
                <ReceiptLongIcon color="primary" /> Invoice #
                {viewInvoiceDetails?.invoice_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Issued:{" "}
                {new Date(viewInvoiceDetails?.issued_date).toLocaleString()}
              </Typography>
            </Box>
            <IconButton onClick={() => setViewInvoiceDetails(null)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              p: 3,
              flexGrow: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Client Snapshot */}
            <Box
              sx={{
                p: 2,
                bgcolor: "white",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="bold"
                textTransform="uppercase"
              >
                Client Information
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="primary.main"
                mt={1}
              >
                {viewInvoiceDetails?.Customer?.customer_type === "Business"
                  ? viewInvoiceDetails?.Customer?.company_name
                  : `${viewInvoiceDetails?.Customer?.first_name} ${viewInvoiceDetails?.Customer?.last_name}`}
              </Typography>
              <Typography variant="body2">
                Phone: {viewInvoiceDetails?.Customer?.phone_number}
              </Typography>
              <Typography variant="body2">
                NIC: {viewInvoiceDetails?.Customer?.nic_number}
              </Typography>
            </Box>

            {/* Rented Items List */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight="bold"
                textTransform="uppercase"
                mb={1}
                display="block"
              >
                Equipment Rented (
                {viewInvoiceDetails?.InvoiceLines?.length || 0})
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {viewInvoiceDetails?.InvoiceLines?.map((line: any) => (
                  <Box
                    key={line.line_id}
                    sx={{
                      p: 1.5,
                      bgcolor: "white",
                      borderRadius: 2,
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {line.Equipment?.equipment_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Qty: {line.borrow_quantity} | Due:{" "}
                        {new Date(
                          line.expected_return_date,
                        ).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={line.line_status}
                      size="small"
                      color={
                        line.line_status === "Active" ? "warning" : "success"
                      }
                      variant={
                        line.line_status === "Active" ? "filled" : "outlined"
                      }
                    />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Financial Summary */}
            <Box
              sx={{
                p: 2,
                bgcolor: "#0f172a",
                color: "white",
                borderRadius: 2,
                mt: "auto",
              }}
            >
              <Typography
                variant="caption"
                color="#94a3b8"
                fontWeight="bold"
                textTransform="uppercase"
              >
                Financial Summary
              </Typography>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Typography variant="body2" color="#cbd5e1">
                  Subtotal
                </Typography>
                <Typography variant="body2">
                  Rs. {Number(viewInvoiceDetails?.sub_total).toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 0.5,
                }}
              >
                <Typography variant="body2" color="#cbd5e1">
                  Transport
                </Typography>
                <Typography variant="body2">
                  + Rs.{" "}
                  {Number(viewInvoiceDetails?.transport_fee).toLocaleString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: "#334155" }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Grand Total
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="#4ade80">
                  Rs.{" "}
                  {Number(viewInvoiceDetails?.total_amount).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* --- RETURN MODAL --- */}
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
