import { useMemo } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { DataGrid, GridColDef, GridFooterContainer, GridPagination } from "@mui/x-data-grid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ListPageShell } from "@/components/layout/ListPageShell";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";
import { KpiTile } from "@/components/reports/KpiTile";
import AccountingFilterBar from "./AccountingFilterBar";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { useAccountingInvoices } from "../hooks/useAccountingQueries";
import { useCurrencyFormatter } from "../utils/currency";
import { formatDisplayDate } from "@/lib/dates";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";

const STATUS_OPTIONS = [
  { value: "Active", label: tk("common.active") },
  { value: "Completed", label: tk("invoices.completed") },
  { value: "Settled", label: tk("orders.settled") },
  { value: "Overdue", label: tk("invoices.overdue") },
];

const STATUS_COLORS: Record<string, "primary" | "success" | "error" | "default" | "warning"> = {
  Active: "primary",
  Completed: "success",
  Settled: "default",
  Overdue: "error",
};

interface InvoicesTableFooterProps {
  summary?: {
    total_amount: number;
    total_paid: number;
    outstanding: number;
  };
  totalCount: number;
}

function InvoicesTableFooter({ summary, totalCount }: InvoicesTableFooterProps) {
  const { format } = useCurrencyFormatter();

  return (
    <GridFooterContainer
      sx={{
        flexDirection: "column",
        alignItems: "stretch",
        p: 0,
        bgcolor: (t) => (t.palette.mode === "dark" ? "#0f172a" : "#ffffff"),
      }}
    >
      {/* ── Tier 1: Pinned Database-Wide Totals Row ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: (t) => (t.palette.mode === "dark" ? "#1e293b" : "#f8fafc"),
          borderTop: (t) => `1px solid ${t.palette.divider}`,
          borderBottom: (t) => `1px solid ${t.palette.divider}`,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Grand Totals ({totalCount} Matching {totalCount === 1 ? "Invoice" : "Invoices"}):
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, sm: 3 },
            fontVariantNumeric: "tabular-nums",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em" }}
            >
              TOTAL BILLED
            </Typography>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "inherit" }}>
              {format(summary?.total_amount || 0)}
            </span>
          </Box>

          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em" }}
            >
              TOTAL PAID
            </Typography>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#16a34a" }}>
              {format(summary?.total_paid || 0)}
            </span>
          </Box>

          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em" }}
            >
              OUTSTANDING
            </Typography>
            <span
              style={{
                fontWeight: 800,
                fontSize: "0.88rem",
                color: (summary?.outstanding || 0) > 0 ? "#dc2626" : "#16a34a",
              }}
            >
              {format(summary?.outstanding || 0)}
            </span>
          </Box>
        </Box>
      </Box>

      {/* ── Tier 2: Server-Side Pagination Bar ── */}
      <GridPagination />
    </GridFooterContainer>
  );
}

export default function InvoicesTab() {
  const { t } = useTranslation();
  const {
    filters,
    updateFilter,
    updateMultiple,
    resetFilters,
    toQueryParams,
  } = useAccountingFilters({ sortField: "issued_date" });
  const { format } = useCurrencyFormatter();
  const { data, isLoading } = useAccountingInvoices(toQueryParams());

  // Resilient financial summary: uses backend database-wide summary when available;
  // gracefully falls back to summing active page rows if server hasn't reloaded yet.
  const summary = useMemo(() => {
    if (data?.summary && (data.summary.total_amount > 0 || data.summary.total_paid > 0 || data.totalCount === 0)) {
      return data.summary;
    }
    const rows = data?.rows || [];
    if (rows.length === 0) return { total_amount: 0, total_paid: 0, outstanding: 0 };
    const totalAmount = rows.reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0);
    const totalPaid = rows.reduce((s: number, r: any) => s + (Number(r.total_paid) || 0), 0);
    const outstanding = rows.reduce((s: number, r: any) => s + (Number(r.outstanding) || 0), 0);
    return {
      total_amount: Math.round(totalAmount * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
    };
  }, [data]);

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: t("invoices.invoiceNumber"),
      width: 110,
      renderCell: (p) => (
        <Chip
          label={`INV-${p.value}`}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: "0.72rem", fontVariantNumeric: "tabular-nums" }}
        />
      ),
    },
    {
      field: "issued_date",
      headerName: t("common.date"),
      width: 120,
      valueFormatter: (value: string) => formatDisplayDate(value),
    },
    {
      field: "Customer",
      headerName: t("invoices.customer"),
      flex: 1,
      minWidth: 180,
      sortable: false,
      valueGetter: (_value: any, row: any) => {
        const c = row.Customer;
        if (!c) return "—";
        return c.customer_type === "Business" ? c.company_name : `${c.first_name} ${c.last_name}`;
      },
    },
    {
      field: "number_of_days_of_the_bill",
      headerName: t("accounting.InvoicesTab.days"),
      width: 80,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "total_amount",
      headerName: t("common.total"),
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "total_paid",
      headerName: t("invoices.paid"),
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span style={{ fontVariantNumeric: "tabular-nums", color: "#16a34a", fontWeight: 600 }}>
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "outstanding",
      headerName: t("accounting.InvoicesTab.outstanding"),
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            color: p.value > 0 ? "#dc2626" : "#16a34a",
          }}
        >
          {format(p.value)}
        </span>
      ),
    },
    {
      field: "status",
      headerName: t("common.status"),
      width: 120,
      renderCell: (p) => (
        <Chip
          label={p.value}
          color={STATUS_COLORS[p.value] || "default"}
          size="small"
          sx={{ fontSize: "0.7rem", fontWeight: 600, height: 24 }}
        />
      ),
    },
  ];

  return (
    <ListPageShell
      icon={<ReceiptLongIcon sx={{ fontSize: 22 }} />}
      title={t("accounting.invoices")}
      subtitle={t("accounting.subtitles.invoices")}
      kpis={
        <ResponsiveKpiStrip mobileLabel={t("accounting.invoices")}>
          <KpiTile
            label={t("common.total")}
            value={format(summary.total_amount)}
            hint={`${data?.totalCount || 0} ${t("accounting.invoices").toLowerCase()}`}
            icon={<ReceiptLongIcon />}
            tone="default"
          />
          <KpiTile
            label={t("invoices.paid")}
            value={format(summary.total_paid)}
            hint={t("orders.settled")}
            icon={<TrendingUpIcon />}
            tone="success"
          />
          <KpiTile
            label={t("accounting.InvoicesTab.outstanding")}
            value={format(summary.outstanding)}
            hint={t("invoices.overdue")}
            icon={<WarningAmberIcon />}
            tone={summary.outstanding > 0 ? "error" : "success"}
          />
        </ResponsiveKpiStrip>
      }
      filters={
        <AccountingFilterBar
          filters={filters}
          onUpdate={updateFilter}
          onUpdateMultiple={updateMultiple}
          onReset={resetFilters}
          show={{
            search: true,
            dateRange: true,
            datePresets: true,
            status: true,
            amountRange: true,
          }}
          statusOptions={STATUS_OPTIONS}
          sx={{ border: 0, p: 0, bgcolor: "transparent", width: "100%" }}
        />
      }
    >
      <DataGrid
        rows={data?.rows || []}
        columns={columns}
        getRowId={(row) => row.invoice_id}
        loading={isLoading}
        rowCount={data?.totalCount || 0}
        paginationMode="server"
        paginationModel={{
          page: filters.page - 1,
          pageSize: filters.pageSize,
        }}
        onPaginationModelChange={(model) => {
          updateMultiple({ page: model.page + 1, pageSize: model.pageSize });
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        getRowHeight={() => "auto"}
        getEstimatedRowHeight={() => 56}
        slots={{
          footer: () => (
            <InvoicesTableFooter
              summary={summary}
              totalCount={data?.totalCount || 0}
            />
          ),
        }}
        sx={{
          border: 0,
          height: "100%",
          width: "100%",
          "& .MuiDataGrid-columnHeaders": { bgcolor: "#f8fafc" },
          "& .MuiDataGrid-row": { minHeight: "56px !important" },
          "& .MuiDataGrid-cell": { fontSize: "0.84rem", py: 1 },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
          },
        }}
      />
    </ListPageShell>
  );
}
