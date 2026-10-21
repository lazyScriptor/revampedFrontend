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
  ToggleButtonGroup,
  ToggleButton,
  Tabs,
  Tab,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";

// Icons
import PrintIcon from "@mui/icons-material/Print";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined"; // Fixed import name
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";

// Feature Imports
import { useInvoiceList } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";
import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import { ReceiptPrintDialog } from "@/features/invoices/components/ReceiptPrintDialog";
import { InvoicePrintHistoryDialog } from "@/features/invoices/components/InvoicePrintHistoryDialog";
import { Can } from "@/components/auth/Can";
import { formatDisplayDate } from "@/lib/dates";
import { useInvoiceReviews } from "@/features/reviews/hooks/useInvoiceReviews";
import { ReviewThread } from "@/features/reviews/components/ReviewThread";
import { ReviewComposer } from "@/features/reviews/components/ReviewComposer";
import { useTranslation } from "react-i18next";

export default function RentalHistoryRoute() {
  const { t } = useTranslation();
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
  const [drawerTab, setDrawerTab] = useState<"details" | "reviews">("details");

  // Dedicated state for POS receipt preview & print dialog and print history modal
  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);
  const [invoiceForPrintHistory, setInvoiceForPrintHistory] = useState<any | null>(null);

  // Fetch reviews for the open invoice (skips until something's selected).
  const { data: drawerReviews = [], isLoading: drawerReviewsLoading } =
    useInvoiceReviews(viewInvoiceDetails?.invoice_id || null);

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
    { field: "invoice_id", headerName: t("pages.RentalHistory.inv"), width: 90 },
    {
      field: "customer",
      headerName: t("pages.Invoices.client"),
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
      headerName: t("pages.RentalHistory.dateIssued"),
      width: 150,
      valueFormatter: (value) => formatDisplayDate(value),
    },
    {
      field: "total_amount",
      headerName: t("invoices.grandTotal"),
      width: 130,
      renderCell: (params) => (
        <Typography fontWeight="700" color="primary.dark">
          Rs. {Number(params.value).toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: t("common.status"),
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
              label={t("invoices.overdue")}
              size="small"
              color="error"
              sx={{ fontWeight: "bold" }}
            />
          );
        if (params.value === "Completed")
          return (
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label={t("invoices.completed")}
              size="small"
              color="success"
              variant="outlined"
            />
          );
        return (
          <Chip
            icon={<AccessTimeIcon fontSize="small" />}
            label={t("common.active")}
            size="small"
            color="warning"
          />
        );
      },
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.75, pt: 0.5 }}>
          <Tooltip title={t("pages.RentalHistory.inspectDetails")}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setViewInvoiceDetails(params.row)}
              sx={{ bgcolor: "primary.50" }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("pages.RentalHistory.printPosBill")}>
            <IconButton
              size="small"
              onClick={() => setInvoiceToPrint(params.row)}
              sx={{ color: "slate.500", bgcolor: "slate.100" }}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Can perform="invoice:print_log:view">
            <Tooltip title={t("pages.RentalHistory.billPrintHistory")}>
              <IconButton
                size="small"
                onClick={() => setInvoiceForPrintHistory(params.row)}
                sx={{ color: "#2563eb", bgcolor: "#eff6ff" }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Can>
          {params.row.status === "Active" && (
            <Tooltip title={t("invoices.ManageInvoiceViews.processHandover")}>
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
            {t("reports.rentalHistory")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("pages.RentalHistory.monitorFleetStatusAndManage")}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          sx={{ bgcolor: "white", borderRadius: 2 }}
        >
          {t("reports.exportCsv")}
        </Button>
      </Box>

      {/* KPI WIDGETS */}
      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        {[
          {
            label: t("pages.RentalHistory.activeOrders"),
            val: kpis.active,
            icon: <AccessTimeIcon />,
            color: "#d97706",
            bg: "#fffbeb",
          },
          {
            label: t("pages.RentalHistory.overdueItems"),
            val: kpis.overdue,
            icon: <WarningAmberIcon />,
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            label: t("invoices.completed"),
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
              {t("pages.RentalHistory.allOrders")}
            </ToggleButton>
            <ToggleButton value="Active" sx={{ px: 3 }}>
              {t("pages.RentalHistory.activeOnly")}
            </ToggleButton>
            <ToggleButton value="Completed" sx={{ px: 3 }}>
              {t("invoices.completed")}
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
            getRowHeight={() => "auto"}
            getEstimatedRowHeight={() => 62}
            sx={{
              border: "none",
              minWidth: 720,
              "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
              "& .MuiDataGrid-row": {
                minHeight: "56px !important",
              },
              "& .MuiDataGrid-cell": {
                py: 1.25,
              },
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
                {t("profile.ActivitySection.invoice", { invoice_id: viewInvoiceDetails?.invoice_id })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("invoices.ReadOnlyInvoiceModal.issued")}{" "}
                {viewInvoiceDetails?.issued_date
                  ? new Date(viewInvoiceDetails.issued_date).toLocaleString()
                  : "—"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Can perform="invoice:print_log:view">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<HistoryIcon fontSize="small" />}
                  onClick={() => setInvoiceForPrintHistory(viewInvoiceDetails)}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                >
                  {t("pages.RentalHistory.printHistory")}
                </Button>
              </Can>
              <Button
                size="small"
                variant="contained"
                startIcon={<PrintIcon fontSize="small" />}
                onClick={() => setInvoiceToPrint(viewInvoiceDetails)}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                {t("pages.RentalHistory.printBill")}
              </Button>
              <IconButton onClick={() => setViewInvoiceDetails(null)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Tabs
            value={drawerTab}
            onChange={(_, v) => setDrawerTab(v)}
            variant="fullWidth"
            sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}
          >
            <Tab value="details" label={t("pages.RentalHistory.receiptPreview")} />
            <Tab value="reviews" label={`${t("pages.RentalHistory.reviews")}${drawerReviews.length ? ` (${drawerReviews.length})` : ""}`} />
          </Tabs>

          <Box
            sx={{
              p: 3,
              flexGrow: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {drawerTab === "details" && viewInvoiceDetails && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <InvoiceReceipt isPreview={true} invoice={viewInvoiceDetails} />
              </Box>
            )}
            {drawerTab === "reviews" && viewInvoiceDetails && (
              <>
                <ReviewThread
                  invoiceId={viewInvoiceDetails.invoice_id}
                  reviews={drawerReviews}
                  isLoading={drawerReviewsLoading}
                />
                <ReviewComposer invoiceId={viewInvoiceDetails.invoice_id} />
              </>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* MODALS & PRINT DIALOGS */}
      <ReturnSettlementDialog
        open={!!selectedInvoiceForReturn}
        onClose={() => setSelectedInvoiceForReturn(null)}
        invoice={selectedInvoiceForReturn}
        showToast={showToast}
      />

      <ReceiptPrintDialog
        open={!!invoiceToPrint}
        onClose={() => setInvoiceToPrint(null)}
        invoice={invoiceToPrint}
        onPrinted={(msg, sev) => showToast(msg, sev)}
      />

      {invoiceForPrintHistory && (
        <InvoicePrintHistoryDialog
          open={!!invoiceForPrintHistory}
          onClose={() => setInvoiceForPrintHistory(null)}
          invoiceId={invoiceForPrintHistory.invoice_id}
          docNumber={`INV-${invoiceForPrintHistory.invoice_id}`}
        />
      )}

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
