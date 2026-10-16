import { useMemo, useState } from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BusinessIcon from "@mui/icons-material/Business";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useOutstandingBalancesReport } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal, formatDisplayDate } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OutstandingBalancesReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark" || true;

  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -90),
    to: todayLocalStr(),
  });

  const { data, isLoading, isFetching } = useOutstandingBalancesReport({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
  });

  const buckets = data?.buckets;
  const rows = useMemo(() => data?.rows || [], [data]);

  const downloadCsv = () => {
    const headers = ["Customer", "Phone", "Balance", "Days Since Last Rental", "Bucket"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      const name =
        r.customer_type === "Business" && r.company_name
          ? r.company_name
          : `${r.first_name || ""} ${r.last_name || ""}`.trim();
      const bucket =
        r.days_since_last <= 30
          ? "0-30"
          : r.days_since_last <= 60
          ? "31-60"
          : r.days_since_last <= 90
          ? "61-90"
          : "90+";
      lines.push(
        [
          `"${name}"`,
          r.phone_number || "",
          Number(r.balance_due || 0).toFixed(2),
          r.days_since_last,
          bucket,
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outstanding-balances-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Customer",
      flex: 1.4,
      minWidth: 240,
      renderCell: (p: GridRenderCellParams) => {
        const r = p.row;
        const isBusiness = r.customer_type === "Business";
        const name =
          isBusiness && r.company_name
            ? r.company_name
            : `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: isBusiness ? "#f59e0b" : "#334155",
                color: isBusiness ? "#0f172a" : "#f8fafc",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {isBusiness ? <BusinessIcon fontSize="small" /> : (r.first_name?.[0] || "?")}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
                noWrap
              >
                {name || "—"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "#94a3b8" : "text.secondary",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: "0.72rem",
                }}
                noWrap
              >
                {r.phone_number || "No contact"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "balance_due",
      headerName: "Balance",
      width: 160,
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
      field: "days_since_last",
      headerName: "Aging Duration",
      width: 160,
      type: "number",
      renderCell: (p) => {
        const days = Number(p.value) || 0;
        const isOver90 = days > 90;
        const isOver60 = days > 60;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums border ${
              isOver90
                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                : isOver60
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                : "bg-sky-500/10 text-sky-400 border-sky-500/25"
            }`}
          >
            <AccessTimeIcon sx={{ fontSize: 13 }} />
            {days} days
          </span>
        );
      },
    },
    {
      field: "last_rental_date",
      headerName: "Last Rental",
      width: 140,
      renderCell: (p) => (
        <span className="tabular-nums text-xs font-mono text-slate-400">
          {formatDisplayDate(p.value)}
        </span>
      ),
    },
    {
      field: "invoice_count",
      headerName: "Invoices",
      width: 100,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            color: isDark ? "#f8fafc" : "inherit",
          }}
        >
          {p.value}
        </Typography>
      ),
    },
  ];

  return (
    <ReportShell
      title="Outstanding Balances"
      subtitle="Customers with unpaid balances categorized into aging time buckets"
      actionsSlot={
        <ExportMenu onExport={(f) => (f === "csv" ? downloadCsv() : undefined)} />
      }
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
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
          hint={`${buckets?.current?.rows?.length || 0} customers`}
          tone="info"
          loading={isLoading}
        />
        <KpiTile
          label="31-60 Days"
          value={formatCurrency(buckets?.thirtyToSixty?.total || 0)}
          hint={`${buckets?.thirtyToSixty?.rows?.length || 0} customers`}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="61-90 Days"
          value={formatCurrency(buckets?.sixtyToNinety?.total || 0)}
          hint={`${buckets?.sixtyToNinety?.rows?.length || 0} customers`}
          icon={<WarningAmberIcon />}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="90+ Days (Critical)"
          value={formatCurrency(buckets?.overNinety?.total || 0)}
          hint={`${buckets?.overNinety?.rows?.length || 0} customers`}
          icon={<AccountBalanceWalletIcon />}
          tone="error"
          loading={isLoading}
        />
      </Box>

      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.customer_id}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
