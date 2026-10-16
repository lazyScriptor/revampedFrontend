import { useMemo } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BusinessIcon from "@mui/icons-material/Business";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { ReportShell } from "@/components/reports/ReportShell";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useInvoiceAging } from "../hooks/useReportsHooks";
import { formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AgingReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { data, isLoading, isFetching } = useInvoiceAging();

  const buckets = data?.buckets;
  const rows = useMemo(() => data?.rows || [], [data]);

  const downloadCsv = () => {
    const headers = ["Invoice", "Customer", "Issued", "Total", "Paid", "Balance", "Days Overdue"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const name =
        r.customer_type === "Business" && r.company_name
          ? r.company_name
          : `${r.first_name || ""} ${r.last_name || ""}`.trim();
      lines.push(
        [
          `INV-${r.invoice_id}`,
          `"${name}"`,
          r.issued_date,
          Number(r.total_amount || 0).toFixed(2),
          Number(r.total_paid || 0).toFixed(2),
          Number(r.balance_due || 0).toFixed(2),
          r.days_overdue,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-aging-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: "Invoice #",
      width: 125,
      renderCell: (p) => (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
            isDark
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-amber-800 bg-amber-50 border-amber-200"
          }`}
        >
          INV-{p.value}
        </span>
      ),
    },
    {
      field: "customer",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p) => {
        const r = p.row;
        const isBusiness = r.customer_type === "Business";
        const name =
          isBusiness && r.company_name
            ? r.company_name
            : `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.5 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: isBusiness ? "#f59e0b" : isDark ? "#334155" : "#e2e8f0",
                color: isBusiness ? "#0f172a" : isDark ? "#f8fafc" : "#334155",
                fontSize: "0.82rem",
                fontWeight: 700,
                border: "1px solid",
                borderColor: isBusiness ? "#d97706" : isDark ? "#475569" : "#cbd5e1",
              }}
            >
              {isBusiness ? <BusinessIcon fontSize="small" /> : (r.first_name?.[0] || "?")}
            </Avatar>
            <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
                noWrap
              >
                {name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "0.72rem",
                }}
              >
                {r.phone_number || "No phone"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "issued_date",
      headerName: "Issued",
      width: 130,
      renderCell: (p) => (
        <span className={`tabular-nums font-mono text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {formatDisplayDate(p.value)}
        </span>
      ),
    },
    {
      field: "total_amount",
      headerName: "Total",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "total_paid",
      headerName: "Paid",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "#10b981",
            fontWeight: 600,
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "balance_due",
      headerName: "Balance",
      width: 145,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "#ef4444",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "days_overdue",
      headerName: "Days Overdue",
      width: 145,
      type: "number",
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        const isCritical = v > 90;
        const isWarning = v > 60;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums border ${
              isCritical
                ? isDark
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                  : "bg-rose-50 text-rose-700 border-rose-200"
                : isWarning
                ? isDark
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                  : "bg-amber-50 text-amber-700 border-amber-200"
                : isDark
                ? "bg-slate-500/10 text-slate-300 border-slate-500/25"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <WarningAmberIcon sx={{ fontSize: 13 }} />
            {v} days
          </span>
        );
      },
    },
  ];

  return (
    <ReportShell
      title="Invoice Aging"
      subtitle="Outstanding receivable invoices categorized by overdue aging buckets"
      actionsSlot={
        <ExportMenu onExport={(f) => (f === "csv" ? downloadCsv() : undefined)} />
      }
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiTile
          label="0-30 Days"
          value={formatCurrency(buckets?.current?.total || 0)}
          hint={`${buckets?.current?.rows?.length || 0} invoices`}
          tone="info"
          loading={isLoading}
        />
        <KpiTile
          label="31-60 Days"
          value={formatCurrency(buckets?.thirtyToSixty?.total || 0)}
          hint={`${buckets?.thirtyToSixty?.rows?.length || 0} invoices`}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="61-90 Days"
          value={formatCurrency(buckets?.sixtyToNinety?.total || 0)}
          hint={`${buckets?.sixtyToNinety?.rows?.length || 0} invoices`}
          icon={<WarningAmberIcon />}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="90+ Days (High Risk)"
          value={formatCurrency(buckets?.overNinety?.total || 0)}
          hint={`${buckets?.overNinety?.rows?.length || 0} invoices`}
          icon={<AccountBalanceWalletIcon />}
          tone="error"
          loading={isLoading}
        />
      </Box>

      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.invoice_id}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
