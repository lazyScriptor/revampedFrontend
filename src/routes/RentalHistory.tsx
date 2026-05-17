import { useState, useMemo, useEffect } from "react";
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

// Icons
import PrintIcon from "@mui/icons-material/Print";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined"; // Fixed import name
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";

// Feature Imports
import { useInvoiceList } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";
import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import { handlePrintInvoice } from "@/features/invoices/hooks/useInvoiceHooks";

export default function RentalHistoryRoute() {
  // --- 1. STATE MANAGEMENT ---
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Interaction States
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<
    any | null
  >(null);
  const [viewInvoiceDetails, setViewInvoiceDetails] = useState<any | null>(
    null,
  );

  // NEW: Dedicated state for printing to prevent timing issues
  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // --- 2. DATA FETCHING ---
  const { data, isLoading } = useInvoiceList(
    paginationModel.page + 1,
    paginationModel.pageSize,
    statusFilter,
  );

  const showToast = (
    message: string,
    severity: "success" | "error" = "success",
  ) => setToast({ open: true, message, severity });

  // --- 3. PRINT ENGINE TRIGGER ---
  // Senior Move: Watch the print state. When it's set, the DOM renders the receipt,
  // and we trigger the print function once React finishes the paint cycle.
  useEffect(() => {
    if (invoiceToPrint) {
      handlePrintInvoice("printable-invoice");
      // Reset the state so the same invoice can be printed again if needed
      setInvoiceToPrint(null);
    }
  }, [invoiceToPrint]);

  // --- 4. ANALYTICS ENGINE (KPIs) ---
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
        const hasOverdue = inv.InvoiceLines?.some((line: any) => {
          if (line.line_status !== "Active") return false;
          return new Date(line.expected_return_date).getTime() < today;
        });
        if (hasOverdue) overdue++;
      }
    });

    return { active, completed, overdue };
  }, [data?.invoices]);

  // --- 5. DATAGRID COLUMN DEFINITIONS ---
  const columns: GridColDef[] = [
    { field: "invoice_id", headerName: "INV #", width: 90 },
    {
      field: "customer",
      headerName: "Client",
      flex: 1,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams) => {
        const cust = params.row.Customer;
        const name =
          cust?.customer_type === "Business"
            ? cust.company_name
            : `${cust?.first_name} ${cust?.last_name}`;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "primary.light",
                fontSize: "0.85rem",
              }}
            >
              {name?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="600" lineHeight={1.2}>
                {name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cust?.phone_number}
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
        <Typography fontWeight="700" color="primary.dark">
          Rs. {Number(params.value).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const today = new Date().getTime();
        const isOverdue =
          params.row.status === "Active" &&
          params.row.InvoiceLines?.some(
            (l: any) =>
              l.line_status === "Active" &&
              new Date(l.expected_return_date).getTime() < today,
          );

        if (isOverdue)
          return (
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label="Overdue"
              size="small"
              color="error"
              sx={{ fontWeight: "bold" }}
            />
          );
        if (params.value === "Completed")
          return (
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label="Completed"
              size="small"
              color="success"
              variant="outlined"
            />
          );
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
          <Tooltip title="Inspect Details">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setViewInvoiceDetails(params.row)}
              sx={{ bgcolor: "primary.50" }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Print POS Bill">
            <IconButton
              size="small"
              onClick={() => setInvoiceToPrint(params.row)} // SUCCESS: This triggers the useEffect above
              sx={{ color: "slate.500", bgcolor: "slate.100" }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "Active" && (
            <Tooltip title="Process Handover">
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
        gap: { xs: 2, md: 3 },
        height: { xs: "auto", md: "calc(100vh - 100px)" },
        minHeight: { xs: "calc(100vh - 100px)", md: "auto" },
      }}
    >
      {/* HEADER SECTION */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "flex-end" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary">
            Rental History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor fleet status and manage physical returns.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          sx={{ bgcolor: "white", borderRadius: 2 }}
        >
          Export CSV
        </Button>
      </Box>

      {/* KPI WIDGETS */}
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        {[
          {
            label: "Active Orders",
            val: kpis.active,
            icon: <AccessTimeIcon />,
            color: "#d97706",
            bg: "#fffbeb",
          },
          {
            label: "Overdue Items",
            val: kpis.overdue,
            icon: <WarningAmberIcon />,
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            label: "Completed",
            val: kpis.completed,
            icon: <CheckCircleOutlineIcon />,
            color: "#16a34a",
            bg: "#f0fdf4",
          },
        ].map((kpi, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Card
              elevation={0}
              sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: "24px !important",
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: kpi.bg,
                    color: kpi.color,
                    borderRadius: 2,
                  }}
                >
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight="bold"
                    textTransform="uppercase"
                  >
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {kpi.val}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* DATA TABLE */}
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
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
            display: "flex",
            gap: 2,
            overflowX: "auto",
          }}
        >
          <ToggleButtonGroup
            color="primary"
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
            size="small"
            sx={{ bgcolor: "white", flexShrink: 0 }}
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
        </Box>

        <Box sx={{ width: "100%", overflowX: "auto", minHeight: 0, flexGrow: 1 }}>
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
              minWidth: 720,
              "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
            }}
          />
        </Box>
      </Card>

      {/* DETAIL DRAWER */}
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
              <Typography variant="h6" fontWeight="bold">
                Invoice #{viewInvoiceDetails?.invoice_id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
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
            {/* ... (Client and Items code here remains the same) */}
          </Box>
        </Box>
      </Drawer>

      {/* MODALS & HIDDEN PRINTABLES */}
      <ReturnSettlementDialog
        open={!!selectedInvoiceForReturn}
        onClose={() => setSelectedInvoiceForReturn(null)}
        invoice={selectedInvoiceForReturn}
        showToast={showToast}
      />

      {/* 
        IMPORTANT: This component must be in the DOM to be printed.
        We pass 'invoiceToPrint' OR 'viewInvoiceDetails' as a fallback.
      */}
      <InvoiceReceipt
        id="printable-invoice"
        invoice={
          invoiceToPrint || viewInvoiceDetails || selectedInvoiceForReturn
        }
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
